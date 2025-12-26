// ==========================================================
// 1. НАЛАШТУВАННЯ ТА FIREBASE
// ==========================================================
const LOAD_COLLECTION = 'training_loads';
let currentUserId = null;
let trainingData = [];
let distChartInstance = null;
let loadChartInstance = null;

// Авторизація
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            loadDataFromFirebase();
        } else {
            firebase.auth().signInAnonymously().catch(e => console.error("Помилка входу:", e));
        }
    });
}

// ==========================================================
// 2. ЗАВАНТАЖЕННЯ (БЕЗ СТРИБКІВ ЕКРАНУ)
// ==========================================================
async function loadDataFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(LOAD_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        trainingData = [];
        snapshot.forEach(doc => trainingData.push({ id: doc.id, ...doc.data() }));
        trainingData.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Використовуємо анімаційний фрейм для плавності
        window.requestAnimationFrame(() => {
            updateDashboard();
        });
    } catch (e) {
        console.error("Помилка завантаження:", e);
    }
}

function updateDashboard() {
    const metrics = calculateMetrics();
    updateACWRGauge(metrics.acwr);
    
    // Оновлюємо графіки з фіксацією висоти
    renderLoadChart(metrics.acute, metrics.chronic);
    renderDistanceChart();
}

function calculateMetrics() {
    if (trainingData.length === 0) return { acute: 0, chronic: 0, acwr: 0 };
    const today = new Date();
    const msInDay = 24 * 60 * 60 * 1000;

    const getLoadForPeriod = (days) => {
        const cutoff = new Date(today.getTime() - (days * msInDay));
        const periodData = trainingData.filter(d => new Date(d.date) >= cutoff);
        const totalLoad = periodData.reduce((sum, d) => sum + (Number(d.duration) * Number(d.rpe)), 0);
        return totalLoad / 7; // Acute Load рахується як середнє за тиждень
    };

    const acute = getLoadForPeriod(7);
    const chronic = getLoadForPeriod(28) / 4; // Середнє тижневе за місяць
    const acwr = chronic > 0 ? (acute / chronic).toFixed(2) : 0;

    return { acute: Math.round(acute), chronic: Math.round(chronic), acwr: parseFloat(acwr) };
}

// ==========================================================
// 3. ГРАФІКИ (З ФІКСАЦІЄЮ ВІЗУАЛУ)
// ==========================================================
function renderDistanceChart() {
    const ctx = document.getElementById('distanceChart');
    if (!ctx) return;
    
    // Фіксуємо висоту батьківського контейнера, щоб не було «заліпання»
    ctx.parentElement.style.height = '250px';

    if (distChartInstance) distChartInstance.destroy();

    const last7Days = trainingData.slice(-7);

    distChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last7Days.map(d => d.date.split('-').reverse().slice(0,2).join('.')),
            datasets: [{
                label: 'Дистанція (км)',
                data: last7Days.map(d => d.distance),
                backgroundColor: '#FFC72C',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 }, // Вимикаємо анімацію для запобігання лагам скролу
            scales: {
                y: { beginAtZero: true, ticks: { color: '#888' }, grid: { color: '#333' } },
                x: { ticks: { color: '#888' }, grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function renderLoadChart(acute, chronic) {
    const ctx = document.getElementById('loadChart');
    if (!ctx) return;
    ctx.parentElement.style.height = '250px';

    if (loadChartInstance) loadChartInstance.destroy();

    loadChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Хронічне (28д)', 'Гостре (7д)'],
            datasets: [{
                label: 'Навантаження',
                data: [chronic, acute],
                borderColor: '#FFC72C',
                backgroundColor: 'rgba(255, 199, 44, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            scales: {
                y: { ticks: { color: '#888' }, grid: { color: '#333' } },
                x: { ticks: { color: '#888' } }
            }
        }
    });
}

function updateACWRGauge(val) {
    const needle = document.getElementById('gauge-needle');
    const valueDisplay = document.getElementById('acwr-value');
    if (!needle || !valueDisplay) return;

    let degree = (val - 1) * 90; 
    degree = Math.min(90, Math.max(-90, degree));
    
    needle.style.transform = `translateX(-50%) rotate(${degree}deg)`;
    valueDisplay.textContent = val.toFixed(2);
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
            const btn = e.submitter;
            if (btn) btn.disabled = true; // Блокуємо кнопку від подвійного кліку

            const formData = {
                userId: currentUserId,
                date: form.date.value,
                duration: parseInt(form.duration.value),
                distance: parseFloat(form.distance.value),
                rpe: parseInt(form.querySelector('input[name="rpe"]:checked')?.value || 5),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                // Зберігаємо поточну позицію скролу
                const currentScroll = window.scrollY;

                await db.collection(LOAD_COLLECTION).add(formData);
                
                // Оновлюємо дані
                await loadDataFromFirebase();
                
                // Скидаємо форму, але повертаємо дату
                form.reset();
                if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
                
                // Повертаємо скрол на місце
                window.scrollTo({ top: currentScroll, behavior: 'instant' });
                
                alert("ProAtletCare: Навантаження додано!");
            } catch (err) {
                console.error("Помилка:", err);
            } finally {
                if (btn) btn.disabled = false;
            }
        };
    }
});
