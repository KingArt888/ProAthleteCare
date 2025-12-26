(function() {
    const COLLECTION_NAME = 'wellness_reports';
    const WELLNESS_FIELDS = ['sleep', 'soreness', 'mood', 'water', 'stress', 'ready'];
    const FIELD_LABELS = { sleep: 'Сон', soreness: 'Біль', mood: 'Настрій', water: 'Гідратація', stress: 'Стрес', ready: 'Готовність' };

    // --- 1. СИНХРОНІЗАЦІЯ ТА ОНОВЛЕННЯ СТАНУ ---
    async function syncWellnessFromFirebase(uid) {
        try {
            console.log("Завантаження даних для користувача:", uid);
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("timestamp", "asc")
                .get();

            const history = {};
            let lastDate = "";

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.date && data.scores) {
                    history[data.date] = data.scores;
                    if (data.date > lastDate) lastDate = data.date;
                }
            });

            // Зберігаємо історію та дату останнього запису
            localStorage.setItem('wellnessHistory', JSON.stringify(history));
            if (lastDate) {
                localStorage.setItem('lastWellnessSubmissionDate', lastDate);
            }

            // ОНОВЛЮЄМО ВІЗУАЛ
            initCharts(); 
            checkDailyRestriction(); // Оновлюємо стан кнопки після завантаження
        } catch (e) {
            console.error("Помилка підтягування даних:", e);
        }
    }

    // --- 2. ДОПОМІЖНІ ФУНКЦІЇ ---
    function getTodayDateString() {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    function checkDailyRestriction() {
        const lastSubmission = localStorage.getItem('lastWellnessSubmissionDate');
        const today = getTodayDateString();
        const submitBtn = document.querySelector('#wellness-form button[type="submit"]');

        if (lastSubmission === today && submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Сьогодні вже заповнено";
            submitBtn.style.backgroundColor = "#444";
            submitBtn.style.color = "#888";
            submitBtn.style.cursor = "not-allowed";
            return true;
        }
        return false;
    }

    function loadWellnessHistory() {
        const data = localStorage.getItem('wellnessHistory');
        return data ? JSON.parse(data) : {};
    }

    // --- 3. МАЛЮВАННЯ ГРАФІКІВ (Павутиння та статистика) ---
    function initCharts() {
        const history = loadWellnessHistory();
        const sortedDates = Object.keys(history).sort(); 
        if (sortedDates.length === 0) return;

        const latestData = history[sortedDates[sortedDates.length - 1]];
        
        // Оновлення текстових оцінок
        WELLNESS_FIELDS.forEach(field => {
            const el = document.getElementById(`stat-${field}`);
            if (el) {
                const score = latestData[field] || 0;
                el.textContent = `Оцінка: ${score} / 10`;
                el.style.color = score >= 7 ? 'rgb(50, 205, 50)' : (score >= 4 ? 'rgb(255, 159, 64)' : 'rgb(255, 99, 132)');
            }
        });

        // Малювання павутиння
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
                        pointBackgroundColor: 'rgb(255, 215, 0)'
                    }]
                },
                options: { 
                    scales: { 
                        r: { 
                            min: 0, max: 10, beginAtZero: true,
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { display: false } 
                        } 
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
    }

    // --- 4. ГОЛОВНА ЛОГІКА ---
    document.addEventListener('DOMContentLoaded', () => {
        // Перевірка кнопки одразу при завантаженні
        checkDailyRestriction();

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                await syncWellnessFromFirebase(user.uid);
            } else {
                try {
                    await firebase.auth().signInAnonymously();
                } catch (error) {
                    console.error("Помилка входу:", error.message);
                }
            }
        });

        const form = document.getElementById('wellness-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (checkDailyRestriction()) return;

                const user = firebase.auth().currentUser;
                if (!user) return alert("Зачекайте авторизації...");

                const scores = {};
                let valid = true;
                WELLNESS_FIELDS.forEach(f => {
                    const input = form.querySelector(`input[name="${f}"]:checked`);
                    if (input) scores[f] = parseInt(input.value, 10); else valid = false;
                });

                if (!valid) return alert("Будь ласка, заповніть усі 6 точок даних!");

                try {
                    const today = getTodayDateString();
                    await db.collection(COLLECTION_NAME).add({
                        userId: user.uid,
                        date: today,
                        scores: scores,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // Оновлюємо локально та блокуємо кнопку
                    localStorage.setItem('lastWellnessSubmissionDate', today);
                    const history = loadWellnessHistory();
                    history[today] = scores;
                    localStorage.setItem('wellnessHistory', JSON.stringify(history));
                    
                    alert("Дані успішно збережено в хмару!");
                    location.reload(); 
                } catch (err) {
                    alert("Помилка збереження: " + err.message);
                }
            });
        }
    });
})();
