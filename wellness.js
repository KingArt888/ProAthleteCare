// ==============================================
// --- 1. ФУНКЦІЇ ДЛЯ РОБОТИ З ДАНИМИ ---
// ==============================================

(function() {
    // Використовуємо глобальну db, яку ви ініціалізували в HTML
    const COLLECTION_NAME = 'wellness_reports';

    function getTodayDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function loadWellnessHistory() {
        const data = localStorage.getItem('wellnessHistory');
        return data ? JSON.parse(data) : {};
    }

    function saveWellnessHistory(date, scores) {
        const history = loadWellnessHistory();
        history[date] = scores;
        localStorage.setItem('wellnessHistory', JSON.stringify(history));
    }

    // --- СИНХРОНІЗАЦІЯ З FIREBASE ---
    async function syncWithFirebase(uid) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("timestamp", "asc")
                .get();

            const history = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.date && data.scores) history[data.date] = data.scores;
            });

            localStorage.setItem('wellnessHistory', JSON.stringify(history));
            initCharts(); // Оновлюємо графіки після отримання даних з хмари
        } catch (e) {
            console.error("Помилка завантаження з Firebase:", e);
        }
    }

    // ==============================================
    // 2. КОНСТАНТИ ТА ГРАФІКИ (ВАШ ОРИГІНАЛЬНИЙ СТИЛЬ)
    // ==============================================
    const GOLD_COLOR = 'rgb(255, 215, 0)';
    const GOLD_AREA = 'rgba(255, 215, 0, 0.4)';
    const WELLNESS_FIELDS = ['sleep', 'soreness', 'mood', 'water', 'stress', 'ready'];
    const FIELD_LABELS = { sleep: 'Сон', soreness: 'Біль', mood: 'Настрій', water: 'Гідратація', stress: 'Стрес', ready: 'Готовність' };

    const colorsMap = {
        sleep: { color: GOLD_COLOR, area: GOLD_AREA },
        soreness: { color: 'rgb(255, 99, 132)', area: 'rgba(255, 99, 132, 0.4)' },
        mood: { color: 'rgb(147, 112, 219)', area: 'rgba(147, 112, 219, 0.4)' },
        water: { color: 'rgb(0, 191, 255)', area: 'rgba(0, 191, 255, 0.4)' },
        stress: { color: 'rgb(255, 159, 64)', area: 'rgba(255, 159, 64, 0.4)' },
        ready: { color: 'rgb(50, 205, 50)', area: 'rgba(50, 205, 50, 0.4)' },
    };

    function updateWellnessStats(latestData) {
        WELLNESS_FIELDS.forEach(field => {
            const statElement = document.getElementById(`stat-${field}`);
            if (statElement) {
                const score = latestData[field] || 0;
                statElement.textContent = `Оцінка: ${score} / 10`;
                statElement.style.color = score >= 7 ? 'rgb(50, 205, 50)' : (score >= 4 ? 'rgb(255, 159, 64)' : 'rgb(255, 99, 132)');
            }
        });
    }

    function initCharts() {
        const history = loadWellnessHistory();
        const sortedDates = Object.keys(history).sort(); 

        WELLNESS_FIELDS.forEach(field => {
            if (window[`chart_${field}`] instanceof Chart) window[`chart_${field}`].destroy();
        });
        if (window.wellnessChart instanceof Chart) window.wellnessChart.destroy();

        if (sortedDates.length === 0) return;

        const chartLabels = sortedDates.map(date => date.split('-').slice(1).join('/'));
        const latestData = history[sortedDates[sortedDates.length - 1]];
        updateWellnessStats(latestData);

        const mainCtx = document.getElementById('wellnessChart');
        if (mainCtx) {
            window.wellnessChart = new Chart(mainCtx, {
                type: 'radar',
                data: {
                    labels: Object.values(FIELD_LABELS),
                    datasets: [{
                        label: 'Поточний стан',
                        data: WELLNESS_FIELDS.map(f => latestData[f]),
                        backgroundColor: GOLD_AREA,
                        borderColor: '#333'
                    }]
                },
                options: {
                    scales: { r: { min: 0, max: 10, grid: { color: '#ccc' }, pointLabels: { color: 'white' }, ticks: { display: false } } }
                }
            });
        }

        WELLNESS_FIELDS.forEach(field => {
            const ctx = document.getElementById(`chart-${field}`);
            if (ctx) {
                window[`chart_${field}`] = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: chartLabels,
                        datasets: [{ data: chartData[field], borderColor: colorsMap[field].color, fill: true, backgroundColor: colorsMap[field].area }]
                    },
                    options: { scales: { y: { display: false }, x: { display: false } }, plugins: { legend: { display: false } } }
                });
            }
        });
    }

    // ==============================================
    // 3. ЛОГІКА КНОПКИ ТА FIREBASE AUTH
    // ==============================================
    function checkDailyRestriction() {
        const lastDate = localStorage.getItem('lastWellnessSubmissionDate');
        const today = getTodayDateString(); 
        const button = document.querySelector('.gold-button');
        if (button && lastDate === today) {
            button.disabled = true;
            button.textContent = "Дані на сьогодні вже записані.";
            return true;
        }
        return false;
    }

    document.addEventListener('DOMContentLoaded', function() {
        // Чекаємо, поки Firebase Auth завантажиться
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                console.log("Користувач увійшов:", user.uid);
                syncWithFirebase(user.uid);
                checkDailyRestriction();
            }
        });

        const form = document.getElementById('wellness-form');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const user = firebase.auth().currentUser;
                if (!user) {
                    alert("Будь ласка, увійдіть в систему!");
                    return;
                }

                const submissionData = {};
                let allChecked = true;
                WELLNESS_FIELDS.forEach(f => {
                    const input = form.querySelector(`input[name="${f}"]:checked`);
                    if (input) submissionData[f] = parseInt(input.value, 10);
                    else allChecked = false;
                });

                if (!allChecked) {
                    alert("Будь ласка, заповніть усі 6 точок даних.");
                    return;
                }

                try {
                    const todayDate = getTodayDateString();
                    
                    // ЗБЕРЕЖЕННЯ В FIREBASE
                    await db.collection(COLLECTION_NAME).add({
                        userId: user.uid,
                        date: todayDate,
                        scores: submissionData,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    saveWellnessHistory(todayDate, submissionData);
                    localStorage.setItem('lastWellnessSubmissionDate', todayDate);
                    
                    initCharts();
                    checkDailyRestriction();
                    alert("Дані збережено в хмару!");
                } catch (err) {
                    console.error("Помилка збереження:", err);
                    alert("Помилка бази даних: " + err.message);
                }
            });
        }
    });
})();
