// ==============================================
// --- КОНФІГУРАЦІЯ ТА ІНІЦІАЛІЗАЦІЯ ---
// ==============================================
const db = firebase.firestore();
const WELLNESS_COLLECTION = 'wellness_reports';
let currentUserId = null;

const WELLNESS_FIELDS = ['sleep', 'soreness', 'mood', 'water', 'stress', 'ready'];
const FIELD_LABELS = { 
    sleep: 'Сон', soreness: 'Біль', mood: 'Настрій', 
    water: 'Гідратація', stress: 'Стрес', ready: 'Готовність' 
};

// Кольори (Золото та акценти)
const GOLD_COLOR = 'rgb(255, 215, 0)', GOLD_AREA = 'rgba(255, 215, 0, 0.3)';
const LIME_COLOR = 'rgb(50, 205, 50)', ORANGE_COLOR = 'rgb(255, 159, 64)', RED_COLOR = 'rgb(255, 99, 132)';

// Поточна дата
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

// ==============================================
// --- FIREBASE LOGIC ---
// ==============================================

firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        currentUserId = user.uid;
        console.log("Wellness: Авторизовано", currentUserId);
        await initCharts();
        checkDailyRestriction();
    } else {
        console.warn("Wellness: Користувач не увійшов!");
    }
});

async function loadWellnessHistoryFromFirebase() {
    if (!currentUserId) return {};
    const history = {};
    try {
        const snapshot = await db.collection(WELLNESS_COLLECTION)
            .where("userId", "==", currentUserId)
            .orderBy("date", "asc")
            .get();

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.date && data.scores) history[data.date] = data.scores;
        });
    } catch (error) {
        console.error("Помилка завантаження:", error);
    }
    return history;
}

async function saveWellnessToFirebase(date, scores) {
    if (!currentUserId) return;
    try {
        await db.collection(WELLNESS_COLLECTION).add({
            userId: currentUserId,
            date: date,
            scores: scores,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Помилка збереження:", error);
    }
}

// ==============================================
// --- ГРАФІКИ ТА СТАТИСТИКА ---
// ==============================================

async function initCharts() {
    const history = await loadWellnessHistoryFromFirebase();
    const sortedDates = Object.keys(history).sort();
    
    if (sortedDates.length === 0) return;

    const latestData = history[sortedDates[sortedDates.length - 1]];
    updateWellnessStats(latestData);

    const mainCtx = document.getElementById('wellnessChart');
    if (mainCtx) {
        if (window.wellnessChart instanceof Chart) window.wellnessChart.destroy();
        window.wellnessChart = new Chart(mainCtx, {
            type: 'radar',
            data: {
                labels: Object.values(FIELD_LABELS),
                datasets: [{
                    label: 'Сьогоднішній стан',
                    data: WELLNESS_FIELDS.map(f => latestData[f]),
                    backgroundColor: GOLD_AREA,
                    borderColor: GOLD_COLOR,
                    borderWidth: 3,
                    pointBackgroundColor: GOLD_COLOR
                }]
            },
            options: {
                scales: {
                    r: {
                        min: 0, max: 10,
                        angleLines: { color: 'rgba(255,255,255,0.2)' },
                        grid: { color: 'rgba(255,255,255,0.2)' },
                        pointLabels: { color: '#FFFFFF', font: { size: 12, weight: 'bold' } },
                        ticks: { display: false }
                    }
                },
                plugins: { legend: { labels: { color: 'white' } } }
            }
        });
    }
}

function updateWellnessStats(latestData) {
    WELLNESS_FIELDS.forEach(field => {
        const el = document.getElementById(`stat-${field}`);
        if (el) {
            const val = latestData[field] || 0;
            el.textContent = `Оцінка: ${val} / 10`;
            el.style.color = val >= 7 ? LIME_COLOR : (val >= 4 ? ORANGE_COLOR : RED_COLOR);
        }
    });
}

function checkDailyRestriction() {
    const lastSub = localStorage.getItem('lastWellnessSubmissionDate');
    const today = getTodayDateString();
    const btn = document.querySelector('.gold-button');
    if (btn && lastSub === today) {
        btn.disabled = true;
        btn.textContent = "Звіт на сьогодні подано!";
        btn.style.opacity = "0.5";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('wellness-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const scores = {};
            WELLNESS_FIELDS.forEach(f => {
                scores[f] = parseInt(form.querySelector(`input[name="${f}"]:checked`)?.value || 0);
            });
            
            const today = getTodayDateString();
            await saveWellnessToFirebase(today, scores);
            localStorage.setItem('lastWellnessSubmissionDate', today);
            alert("Дані збережено!");
            location.reload();
        });
    }
});
