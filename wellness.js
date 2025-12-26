// wellness.js — ProAtletCare (ВЕРСІЯ З ПІДТРИМКОЮ FIREBASE)

(function() {
    // МИ НЕ ПЕРЕОГОЛОШУЄМО db, вона вже є у вашому HTML
    const COLLECTION_NAME = 'wellness_reports';

    // --- ФУНКЦІЇ ДЛЯ FIREBASE (ДОДАТИ) ---

    async function syncWithFirebase(uid) {
        try {
            // Отримуємо всі записи користувача з Firebase
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("timestamp", "asc")
                .get();

            const history = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                // Використовуємо дату як ключ (YYYY-MM-DD)
                history[data.date] = data.scores;
            });

            // Зберігаємо завантажені дані в локальну пам'ять, щоб ваш старий код їх підхопив
            localStorage.setItem('wellnessHistory', JSON.stringify(history));
            
            // Оновлюємо графіки після завантаження
            initCharts();
        } catch (e) {
            console.error("Помилка синхронізації з Firebase:", e);
        }
    }

    // --- ВАШІ ОРИГІНАЛЬНІ ФУНКЦІЇ (БЕЗ ЗМІН) ---

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

    const GOLD_COLOR = 'rgb(255, 215, 0)';
    const GOLD_AREA = 'rgba(255, 215, 0, 0.4)';
    const RED_COLOR = 'rgb(255, 99, 132)'; 
    const LIME_COLOR = 'rgb(50, 205, 50)'; 
    const ORANGE_COLOR = 'rgb(255, 159, 64)';
    const GREY_GRID = '#CCCCCC';

    const WELLNESS_FIELDS = ['sleep', 'soreness', 'mood', 'water', 'stress', 'ready'];
    const FIELD_LABELS = {
        sleep: 'Сон', soreness: 'Біль', mood: 'Настрій', 
        water: 'Гідратація', stress: 'Стрес', ready: 'Готовність'
    };

    const colorsMap = {
        sleep: { color: GOLD_COLOR, area: GOLD_AREA },
        soreness: { color: RED_COLOR, area: 'rgba(255, 99, 132, 0.4)' },
        mood: { color: 'rgb(147, 112, 219)', area: 'rgba(147, 112, 219, 0.4)' },
        water: { color: 'rgb(0, 191, 255)', area: 'rgba(0, 191, 255, 0.4)' },
        stress: { color: ORANGE_COLOR, area: 'rgba(255, 159, 64, 0.4)' },
        ready: { color: LIME_COLOR, area: 'rgba(50, 205, 50, 0.4)' },
    };

    function updateWellnessStats(latestData) {
        WELLNESS_FIELDS.forEach(field => {
            const statElement = document.getElementById(`stat-${field}`);
            if (statElement) {
                const score = latestData[field] || 0;
                statElement.textContent = `Оцінка: ${score} / 10`;
                statElement.style.color = score >= 7 ? LIME_COLOR : (score >= 4 ? ORANGE_COLOR : RED_COLOR);
            }
        });
    }

    function initCharts() {
        const history = loadWellnessHistory();
        const sortedDates = Object.keys(history).sort(); 

        WELLNESS_FIELDS.forEach(field => {
            if (window[`chart_${field}`] && typeof window[`chart_${field}`].destroy === 'function') {
                window[`chart_${field}`].destroy();
            }
        });
        
        const mainCtx = document.getElementById('wellnessChart');
        if (window.wellnessChart && typeof window.wellnessChart.destroy === 'function') {
            window.wellnessChart.destroy();
        }

        if (sortedDates.length === 0) return;

        const chartLabels = sortedDates.map(date => {
            const parts = date.split('-');
            return `${parts[1]}/${parts[2]}`;
        });
        
        const chartData = {};
        WELLNESS_FIELDS.forEach(field => {
            chartData[field] = sortedDates.map(date => history[date][field]);
        });

        const latestData = history[sortedDates[sortedDates.length - 1]];
        updateWellnessStats(latestData);

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
                    scales: { r: { min: 0, max: 10, grid: { color: GREY_GRID }, pointLabels: { color: 'white' }, ticks: { display: false } } },
                    plugins: { legend: { labels: { color: 'white' } } }
                }
            });
        }
        
        // Малюємо міні-графіки
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

    // --- ЗАПУСК ---

    document.addEventListener('DOMContentLoaded', function() {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // Синхронізуємо локальні дані з Firebase
                syncWithFirebase(user.uid);
            }
        });

        const form = document.getElementById('wellness-form');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                const user = firebase.auth().currentUser;
                if (!user) return alert("Увійдіть в систему!");

                const submissionData = {};
                WELLNESS_FIELDS.forEach(f => {
                    const checked = form.querySelector(`input[name="${f}"]:checked`);
                    if (checked) submissionData[f] = parseInt(checked.value, 10);
                });

                if (Object.keys(submissionData).length < 6) return alert("Заповніть всі 6 пунктів!");

                try {
                    const todayDate = getTodayDateString();
                    // 1. Зберігаємо в Firebase
                    await db.collection(COLLECTION_NAME).add({
                        userId: user.uid,
                        date: todayDate,
                        scores: submissionData,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // 2. Оновлюємо локально
                    saveWellnessHistory(todayDate, submissionData);
                    localStorage.setItem('lastWellnessSubmissionDate', todayDate);
                    
                    initCharts();
                    checkDailyRestriction();
                    alert("Дані збережено в хмару!");
                } catch (err) {
                    alert("Помилка збереження: " + err.message);
                }
            });
        }
    });
})();
