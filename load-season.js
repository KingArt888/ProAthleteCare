// ==========================================================
// 1. НАЛАШТУВАННЯ ТА FIREBASE
// ==========================================================
const LOAD_COLLECTION = 'training_loads';
let currentUserId = null;
let trainingData = [];

// Авторизація
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log("Атлет в системі:", currentUserId);
            loadDataFromFirebase();
        } else {
            firebase.auth().signInAnonymously().catch(e => console.error("Помилка входу:", e));
        }
    });
}

// ==========================================================
// 2. ЗАВАНТАЖЕННЯ ДАНИХ ТА ОБЧИСЛЕННЯ ACWR
// ==========================================================
async function loadDataFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(LOAD_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        trainingData = [];
        snapshot.forEach(doc => trainingData.push({ id: doc.id, ...doc.data() }));
        
        // Сортування за датою для правильних розрахунків
        trainingData.sort((a, b) => new Date(a.date) - new Date(b.date));

        updateDashboard();
    } catch (e) {
        console.error("Помилка завантаження навантажень:", e); //
    }
}

function calculateMetrics() {
    if (trainingData.length === 0) return { acute: 0, chronic: 0, acwr: 0 };

    const today = new Date();
    const msInDay = 24 * 60 * 60 * 1000;

    const getLoadForPeriod = (days) => {
        const cutoff = new Date(today.getTime() - (days * msInDay));
        const periodData = trainingData.filter(d => new Date(d.date) >= cutoff);
        const totalLoad = periodData.reduce((sum, d) => sum + (d.duration * d.rpe), 0);
        return totalLoad / days;
    };

    const acute = getLoadForPeriod(7);    // Гостре (тиждень)
    const chronic = getLoadForPeriod(28); // Хронічне (місяць)
    const acwr = chronic > 0 ? (acute / chronic).toFixed(2) : 0;

    return { acute: Math.round(acute), chronic: Math.round(chronic), acwr: parseFloat(acwr) };
}

// ==========================================================
// 3. ОНОВЛЕННЯ ІНТЕРФЕЙСУ ТА ГРАФІКІВ
// ==========================================================
function updateDashboard() {
    const metrics = calculateMetrics();
    updateACWRGauge(metrics.acwr);
    renderLoadChart(metrics.acute, metrics.chronic);
    renderDistanceChart();
}

// Спідометр ACWR
function updateACWRGauge(val) {
    const needle = document.getElementById('gauge-needle');
    const valueDisplay = document.getElementById('acwr-value');
    const statusText = document.getElementById('acwr-status');

    if (!needle || !valueDisplay) return;

    // Розрахунок кута нахилу стрілки
    let degree = (val - 1) * 90; 
    degree = Math.min(90, Math.max(-90, degree));

    needle.style.transform = `translateX(-50%) rotate(${degree}deg)`;
    valueDisplay.textContent = val.toFixed(2);

    // Кольорова логіка зон
    if (val >= 0.8 && val <= 1.3) {
        statusText.textContent = "Безпечна зона (Оптимально)";
        statusText.style.color = "#4CAF50";
    } else if (val > 1.5) {
        statusText.textContent = "Високий ризик травм!";
        statusText.style.color = "#DA3E52";
    } else {
        statusText.textContent = "Потрібна адаптація";
        statusText.style.color = "#FFC72C";
    }
}

// Графік дистанції
let distChartInstance = null;
function renderDistanceChart() {
    const ctx = document.getElementById('distanceChart');
    if (!ctx) return;
    if (distChartInstance) distChartInstance.destroy();

    const last7Days = trainingData.slice(-7);

    distChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last7Days.map(d => d.date.split('-').slice(1).join('.')),
            datasets: [{
                label: 'Дистанція (км)',
                data: last7Days.map(d => d.distance),
                backgroundColor: '#FFC72C'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { color: '#fff' } }, x: { ticks: { color: '#fff' } } }
        }
    });
}

// ==========================================================
// 4. ОБРОБКА ФОРМИ ТА СКРОЛУ
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('load-form');
    const dateInput = document.getElementById('load-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            if (!currentUserId) return alert("Зачекайте авторизації...");

            const formData = {
                userId: currentUserId,
                date: form.date.value,
                duration: parseInt(form.duration.value),
                distance: parseFloat(form.distance.value),
                rpe: parseInt(form.querySelector('input[name="rpe"]:checked')?.value || 5),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                // Запобігаємо стрибку скролу при відправці
                const scrollPos = window.scrollY;
                
                await db.collection(LOAD_COLLECTION).add(formData);
                
                // Очищення та оновлення
                form.reset();
                if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
                await loadDataFromFirebase();
                
                window.scrollTo(0, scrollPos); // Повертаємо скрол на місце
                alert("Навантаження збережено!");
            } catch (err) {
                console.error("Помилка запису:", err); //
            }
        };
    }
});
