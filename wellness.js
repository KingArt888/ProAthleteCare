(function() {
    const COLLECTION_NAME = 'wellness_reports';

    // ПІДТЯГУВАННЯ ДАНИХ З ХМАРИ
    async function syncWithFirebase(uid) {
        try {
            console.log("Користувач увійшов:", uid); // Тепер це з'явиться!
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
            initCharts(); 
        } catch (e) {
            console.error("Помилка синхронізації:", e);
        }
    }

    // ВАШІ ОРИГІНАЛЬНІ ФУНКЦІЇ
    function getTodayDateString() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    function loadWellnessHistory() {
        const data = localStorage.getItem('wellnessHistory');
        return data ? JSON.parse(data) : {};
    }

    const WELLNESS_FIELDS = ['sleep', 'soreness', 'mood', 'water', 'stress', 'ready'];
    const FIELD_LABELS = { sleep: 'Сон', soreness: 'Біль', mood: 'Настрій', water: 'Гідратація', stress: 'Стрес', ready: 'Готовність' };

    // МАЛЮВАННЯ ГРАФІКІВ
    function initCharts() {
        const history = loadWellnessHistory();
        const sortedDates = Object.keys(history).sort(); 
        if (sortedDates.length === 0) return;

        const latestData = history[sortedDates[sortedDates.length - 1]];
        
        // Оновлення статистики під графіками
        WELLNESS_FIELDS.forEach(field => {
            const el = document.getElementById(`stat-${field}`);
            if (el) el.textContent = `Оцінка: ${latestData[field] || 0} / 10`;
        });

        const mainCtx = document.getElementById('wellnessChart');
        if (mainCtx && typeof Chart !== 'undefined') {
            if (window.wellnessChart instanceof Chart) window.wellnessChart.destroy();
            window.wellnessChart = new Chart(mainCtx, {
                type: 'radar',
                data: {
                    labels: Object.values(FIELD_LABELS),
                    datasets: [{
                        label: 'Поточний стан',
                        data: WELLNESS_FIELDS.map(f => latestData[f]),
                        backgroundColor: 'rgba(255, 215, 0, 0.4)',
                        borderColor: 'rgb(255, 215, 0)'
                    }]
                },
                options: { scales: { r: { min: 0, max: 10, ticks: { display: false } } } }
            });
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        // Чекаємо на підключення Auth
        if (typeof firebase.auth === 'function') {
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    syncWithFirebase(user.uid);
                } else {
                    console.warn("Користувач не авторизований");
                }
            });
        }

        const form = document.getElementById('wellness-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = firebase.auth().currentUser;
                if (!user) return alert("Потрібна авторизація!");

                const scores = {};
                WELLNESS_FIELDS.forEach(f => {
                    const val = form.querySelector(`input[name="${f}"]:checked`);
                    if (val) scores[f] = parseInt(val.value);
                });

                if (Object.keys(scores).length < 6) return alert("Заповніть всі пункти!");

                try {
                    const today = getTodayDateString();
                    await db.collection(COLLECTION_NAME).add({
                        userId: user.uid,
                        date: today,
                        scores: scores,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // Зберігаємо локально для миттєвого оновлення
                    const history = loadWellnessHistory();
                    history[today] = scores;
                    localStorage.setItem('wellnessHistory', JSON.stringify(history));
                    localStorage.setItem('lastWellnessSubmissionDate', today);
                    
                    alert("Дані збережено!");
                    location.reload(); 
                } catch (err) {
                    alert("Помилка: " + err.message);
                }
            });
        }
    });
})();
