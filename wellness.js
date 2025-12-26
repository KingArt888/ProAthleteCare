// wellness.js — ProAtletCare (СТАБІЛЬНА ВЕРСІЯ З FIREBASE)

(function() {
    // МИ НЕ ОГОЛОШУЄМО const db, бо вона вже є у вашому HTML.
    // Використовуємо існуючу змінну db для Firestore.
    const COLLECTION_NAME = 'wellness_reports';

    // --- 1. ФУНКЦІЇ СИНХРОНІЗАЦІЇ З FIREBASE ---

    async function syncWithFirebase(uid) {
        try {
            // Отримуємо всі записи атлета з хмари
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("timestamp", "asc")
                .get();

            const history = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.date && data.scores) {
                    history[data.date] = data.scores;
                }
            });

            // Оновлюємо локальну пам'ять завантаженими даними
            localStorage.setItem('wellnessHistory', JSON.stringify(history));
            
            // Перемальовуємо графіки з новими даними
            initCharts();
        } catch (e) {
            console.error("Помилка синхронізації з Firebase:", e);
        }
    }

    // --- 2. ДОПОМІЖНІ ФУНКЦІЇ ---

    function getTodayDateString() {
        const today = new Date();
        return today.toISOString().split('T')[0];
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

    // --- 3. КОНСТАНТИ ТА СТИЛІСТИКА ---
    const GOLD_COLOR = 'rgb(255, 215, 0)';
    const GOLD_AREA = 'rgba(255, 215, 0, 0.4)';
    const WELLNESS_FIELDS = ['sleep', 'soreness', 'mood', 'water', 'stress', 'ready'];
    const FIELD_LABELS = {
        sleep: 'Сон', soreness: 'Біль', mood: 'Настрій', 
        water: 'Гідратація', stress: 'Стрес', ready: 'Готовність'
    };

    const colorsMap = {
        sleep: { color: GOLD_COLOR, area: GOLD_AREA },
        soreness: { color: 'rgb(255, 99, 132)', area: 'rgba(255, 99, 132, 0.4)' },
        mood: { color: 'rgb(147, 112, 219)', area: 'rgba(147, 112, 219, 0.4)' },
        water: { color: 'rgb(0, 191, 255)', area: 'rgba(0, 191, 255, 0.4)' },
        stress: { color: 'rgb(255, 159, 64)', area: 'rgba(255, 159, 64, 0.4)' },
        ready: { color: 'rgb(50, 205, 50)', area: 'rgba(50, 205, 50, 0.4)' },
    };

    // --- 4. РОБОТА З ГРАФІКАМИ ---

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

        // Очищення старих графіків для уникнення помилок
        WELLNESS_FIELDS.forEach(field => {
            if (window[`chart_${field}`] instanceof Chart) window[`chart_${field}`].destroy();
        });
        if (window.wellnessChart instanceof Chart) window.wellnessChart.destroy();

        if (sortedDates.length === 0) return;

        const chartLabels = sortedDates.map(date => date.split('-').slice(1).join('/'));
        const latestData = history[sortedDates[sortedDates.length - 1]];
        updateWellnessStats(latestData);

        // Головний РАДАР-графік ("Зірка")
        const mainCtx = document.getElementById('wellnessChart');
        if (mainCtx) {
            window.wellnessChart = new Chart(mainCtx, {
                type: 'radar',
                data: {
                    labels: Object.values(FIELD_LABELS),
                    datasets: [{
                        label: 'Мій стан',
                        data: WELLNESS_FIELDS.map(f => latestData[f]),
                        backgroundColor: GOLD_AREA,
                        borderColor: '#333',
                        borderWidth: 2
                    }]
                },
                options: {
                    scales: { r: { min: 0, max: 10, grid: { color: '#444' }, pointLabels: { color: 'white' }, ticks: { display: false } } },
                    plugins: { legend: { labels: { color: 'white' } } }
                }
            });
        }

        // Міні-графіки (Лінії)
        WELLNESS_FIELDS.forEach(field => {
            const ctx = document.getElementById(`chart-${field}`);
            if (ctx) {
                window[`chart_${field}`] = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: chartLabels,
                        datasets: [{
                            data: sortedDates.map(d => history[d][field]),
                            borderColor: colorsMap[field].color,
                            backgroundColor: colorsMap[field].area,
                            fill: true,
                            tension: 0.3
                        }]
                    },
                    options: { 
                        scales: { y: { display: false, min: 0, max: 10 }, x: { display: false } }, 
                        plugins: { legend: { display: false } } 
                    }
                });
            }
        });
    }

    // --- 5. ОБМЕЖЕННЯ ТА ВІДПРАВКА ФОРМИ ---

    function checkDailyRestriction() {
        const today = getTodayDateString();
        const lastSub = localStorage.getItem('lastWellnessSubmissionDate');
        const button = document.querySelector('.gold-button');

        if (button && lastSub === today) {
            button.disabled = true;
            button.textContent = "Звіт на сьогодні вже подано";
            button.style.opacity = "0.5";
            return true;
        }
        return false;
    }

    // --- 6. ЗАПУСК ПРИ ЗАВАНТАЖЕННІ ---

    document.addEventListener('DOMContentLoaded', function() {
        // Перевірка Auth (виправляє помилку firebase.auth is not a function)
        if (typeof firebase.auth === 'function') {
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    syncWithFirebase(user.uid);
                    checkDailyRestriction();
                }
            });
        }

        const form = document.getElementById('wellness-form');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                const user = firebase.auth().currentUser;
                if (!user) return alert("Будь ласка, увійдіть в систему!");

                const scores = {};
                let valid = true;
                WELLNESS_FIELDS.forEach(f => {
                    const val = form.querySelector(`input[name="${f}"]:checked`);
                    if (val) scores[f] = parseInt(val.value); else valid = false;
                });

                if (!valid) return alert("Оберіть всі 6 показників!");

                try {
                    const todayDate = getTodayDateString();
                    
                    // Запис у Firebase
                    await db.collection(COLLECTION_NAME).add({
                        userId: user.uid,
                        date: todayDate,
                        scores: scores,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    saveWellnessHistory(todayDate, scores);
                    localStorage.setItem('lastWellnessSubmissionDate', todayDate);
                    
                    initCharts();
                    checkDailyRestriction();
                    alert("Дані успішно збережені в ProAtletCare!");
                } catch (err) {
                    alert("Помилка бази даних: " + err.message);
                }
            });
        }
    });
})();
