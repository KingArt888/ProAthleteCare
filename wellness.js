(function() {
    const COLLECTION_NAME = 'wellness_reports';

    // --- СИНХРОНІЗАЦІЯ З FIREBASE ---
    async function syncWellnessFromFirebase(uid) {
        try {
            console.log("Завантаження даних для:", uid);
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("timestamp", "asc")
                .get();

            const history = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.date && data.scores) history[data.date] = data.scores;
            });

            // Оновлюємо локальну пам'ять, щоб графіки побачили дані
            localStorage.setItem('wellnessHistory', JSON.stringify(history));
            initCharts(); 
        } catch (e) {
            console.error("Помилка підтягування даних:", e);
        }
    }

    // --- ВАШІ ОРИГІНАЛЬНІ ФУНКЦІЇ ---
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

    // --- МАЛЮВАННЯ ГРАФІКІВ ---
    function initCharts() {
        const history = loadWellnessHistory();
        const sortedDates = Object.keys(history).sort(); 
        if (sortedDates.length === 0) return;

        const latestData = history[sortedDates[sortedDates.length - 1]];
        
        // Оновлення текстової статистики
        WELLNESS_FIELDS.forEach(field => {
            const el = document.getElementById(`stat-${field}`);
            if (el) {
                const score = latestData[field] || 0;
                el.textContent = `Оцінка: ${score} / 10`;
                el.style.color = score >= 7 ? 'rgb(50, 205, 50)' : (score >= 4 ? 'rgb(255, 159, 64)' : 'rgb(255, 99, 132)');
            }
        });

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
                        borderColor: 'rgb(255, 215, 0)'
                    }]
                },
                options: { scales: { r: { min: 0, max: 10, ticks: { display: false } } } }
            });
        }
    }

    // --- ЛОГІКА ЗБЕРЕЖЕННЯ ТА ВХОДУ ---
    document.addEventListener('DOMContentLoaded', () => {
        // Перевірка авторизації (тепер працюватиме)
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                syncWellnessFromFirebase(user.uid);
            } else {
                console.warn("Користувач не авторизований");
            }
        });

        const form = document.getElementById('wellness-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = firebase.auth().currentUser;
                if (!user) return alert("Потрібно увійти в систему!");

                const scores = {};
                let valid = true;
                WELLNESS_FIELDS.forEach(f => {
                    const input = form.querySelector(`input[name="${f}"]:checked`);
                    if (input) scores[f] = parseInt(input.value, 10); else valid = false;
                });

                if (!valid) return alert("Заповніть всі точки даних!");

                try {
                    const today = getTodayDateString();
                    
                    // ЗБЕРЕЖЕННЯ В FIREBASE
                    await db.collection(COLLECTION_NAME).add({
                        userId: user.uid,
                        date: today,
                        scores: scores,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // Оновлення локально для миттєвого відображення
                    const history = loadWellnessHistory();
                    history[today] = scores;
                    localStorage.setItem('wellnessHistory', JSON.stringify(history));
                    localStorage.setItem('lastWellnessSubmissionDate', today);
                    
                    alert("Дані успішно збережено в хмару!");
                    location.reload(); 
                } catch (err) {
                    alert("Помилка: " + err.message);
                }
            });
        }
    });
})();
