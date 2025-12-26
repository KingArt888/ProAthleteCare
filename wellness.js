(function() {
    // Колекція у вашому Firestore
    const COLLECTION_NAME = 'wellness_reports';

    // ==============================================
    // 1. СИНХРОНІЗАЦІЯ З FIREBASE (ПІДТЯГУВАННЯ ДАНИХ)
    // ==============================================
    async function syncWithFirebase(uid) {
        try {
            console.log("Завантаження даних з Firebase для:", uid);
            // Отримуємо документи поточного користувача, відсортовані за часом
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

            // Оновлюємо LocalStorage, щоб графіки побачили дані
            localStorage.setItem('wellnessHistory', JSON.stringify(history));
            
            // Малюємо графіки
            initCharts();
        } catch (e) {
            console.error("Помилка синхронізації:", e);
        }
    }

    // ==============================================
    // 2. ВАШІ ОРИГІНАЛЬНІ ФУНКЦІЇ (ЛОГІКА ТА СТИЛЬ)
    // ==============================================
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

    const WELLNESS_FIELDS = ['sleep', 'soreness', 'mood', 'water', 'stress', 'ready'];
    const FIELD_LABELS = { sleep: 'Сон', soreness: 'Біль', mood: 'Настрій', water: 'Гідратація', stress: 'Стрес', ready: 'Готовність' };

    function updateWellnessStats(latestData) {
        WELLNESS_FIELDS.forEach(field => {
            const el = document.getElementById(`stat-${field}`);
            if (el) {
                const score = latestData[field] || 0;
                el.textContent = `Оцінка: ${score} / 10`;
                el.style.color = score >= 7 ? 'rgb(50, 205, 50)' : (score >= 4 ? 'rgb(255, 159, 64)' : 'rgb(255, 99, 132)');
            }
        });
    }

    // ==============================================
    // 3. МАЛЮВАННЯ ГРАФІКІВ
    // ==============================================
    function initCharts() {
        const history = loadWellnessHistory();
        const sortedDates = Object.keys(history).sort(); 
        if (sortedDates.length === 0) return;

        const latestData = history[sortedDates[sortedDates.length - 1]];
        updateWellnessStats(latestData);

        const mainCtx = document.getElementById('wellnessChart');
        if (mainCtx && typeof Chart !== 'undefined') {
            if (window.wellnessChart instanceof Chart) window.wellnessChart.destroy();
            window.wellnessChart = new Chart(mainCtx, {
                type: 'radar',
                data: {
                    labels: Object.values(FIELD_LABELS),
                    datasets: [{
                        label: 'Мій стан',
                        data: WELLNESS_FIELDS.map(f => latestData[f]),
                        backgroundColor: 'rgba(255, 215, 0, 0.4)',
                        borderColor: 'rgb(255, 215, 0)',
                        pointBackgroundColor: '#333'
                    }]
                },
                options: {
                    scales: { r: { min: 0, max: 10, grid: { color: '#ccc' }, pointLabels: { color: 'white' }, ticks: { display: false } } },
                    plugins: { legend: { labels: { color: 'white' } } }
                }
            });
        }
    }

    // ==============================================
    // 4. ЛОГІКА КНОПКИ ТА FIREBASE AUTH
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

    document.addEventListener('DOMContentLoaded', () => {
        // Чекаємо на авторизацію користувача
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                syncWithFirebase(user.uid);
                checkDailyRestriction();
            }
        });

        const form = document.getElementById('wellness-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const user = firebase.auth().currentUser;
                if (!user) return alert("Будь ласка, увійдіть в систему!");

                const scores = {};
                let allChecked = true;
                WELLNESS_FIELDS.forEach(f => {
                    const val = form.querySelector(`input[name="${f}"]:checked`);
                    if (val) scores[f] = parseInt(val.value); else allChecked = false;
                });

                if (!allChecked) return alert("Заповніть всі 6 пунктів!");

                try {
                    const todayDate = getTodayDateString();

                    // Збереження в Firebase з прив'язкою до користувача
                    await db.collection(COLLECTION_NAME).add({
                        userId: user.uid,
                        date: todayDate,
                        scores: scores,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    saveWellnessHistory(todayDate, scores);
                    localStorage.setItem('lastWellnessSubmissionDate', todayDate);
                    
                    alert("Дані збережено в хмару!");
                    location.reload(); // Перезавантаження для оновлення всіх графіків
                } catch (err) {
                    console.error("Помилка збереження:", err);
                    alert("Помилка бази даних: " + err.message);
                }
            });
        }
    });
})();
