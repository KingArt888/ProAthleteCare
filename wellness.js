// wellness.js — ProAtletCare (СТАБІЛЬНА ВЕРСІЯ)

(function() {
    // 1. ВИКОРИСТОВУЄМО ІСНУЮЧУ БАЗУ (без повторного const db)
    const fireDB = (typeof db !== 'undefined') ? db : firebase.firestore();
    const COLLECTION_NAME = 'wellness_reports';
    const WELLNESS_FIELDS = ['sleep', 'soreness', 'mood', 'water', 'stress', 'ready'];

    // Поточна дата у форматі YYYY-MM-DD
    const getToday = () => new Date().toISOString().split('T')[0];

    // 2. ІНІЦІАЛІЗАЦІЯ ПРИ ЗАВАНТАЖЕННІ
    async function initWellness() {
        console.log("Wellness ініціалізовано...");
        
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                console.log("Користувач:", user.uid);
                checkSubmission(user.uid);
                await renderRadarChart(user.uid);
            } else {
                console.warn("Користувач не авторизований");
            }
        });
    }

    // 3. ПЕРЕВІРКА, ЧИ ПОДАВАЛИ ЗВІТ СЬОГОДНІ
    function checkSubmission(uid) {
        const lastDate = localStorage.getItem(`wellness_date_${uid}`);
        const btn = document.querySelector('.gold-button');
        if (btn && lastDate === getToday()) {
            btn.disabled = true;
            btn.textContent = "Звіт на сьогодні вже подано";
            btn.style.opacity = "0.6";
        }
    }

    // 4. ЗБЕРЕЖЕННЯ ДАНИХ
    const form = document.getElementById('wellness-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = firebase.auth().currentUser;
            if (!user) return alert("Спочатку увійдіть в систему!");

            const scores = {};
            let allFilled = true;

            WELLNESS_FIELDS.forEach(field => {
                const checked = form.querySelector(`input[name="${field}"]:checked`);
                if (checked) {
                    scores[field] = parseInt(checked.value);
                } else {
                    allFilled = false;
                }
            });

            if (!allFilled) {
                alert("Будь ласка, заповніть всі 6 пунктів!");
                return;
            }

            try {
                await fireDB.collection(COLLECTION_NAME).add({
                    userId: user.uid,
                    date: getToday(),
                    scores: scores,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                localStorage.setItem(`wellness_date_${user.uid}`, getToday());
                alert("Дані успішно збережено в Firebase!");
                location.reload();
            } catch (error) {
                console.error("Помилка запису:", error);
                alert("Помилка Firebase: " + error.message);
            }
        });
    }

    // 5. МАЛЮВАННЯ ГРАФІКА (Зірка стану)
    async function renderRadarChart(uid) {
        const ctx = document.getElementById('wellnessChart');
        if (!ctx) return;

        try {
            const snapshot = await fireDB.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("timestamp", "desc")
                .limit(1)
                .get();

            if (snapshot.empty) return;

            const lastData = snapshot.docs[0].data().scores;
            const labels = ['Сон', 'Біль', 'Настрій', 'Вода', 'Стрес', 'Готовність'];
            const dataValues = WELLNESS_FIELDS.map(f => lastData[f] || 0);

            new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Твій стан',
                        data: dataValues,
                        backgroundColor: 'rgba(212, 175, 55, 0.2)',
                        borderColor: '#d4af37',
                        borderWidth: 3,
                        pointBackgroundColor: '#d4af37'
                    }]
                },
                options: {
                    scales: {
                        r: {
                            min: 0, max: 10,
                            ticks: { display: false, stepSize: 2 },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                            pointLabels: { color: '#fff', font: { size: 12 } }
                        }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        } catch (e) {
            console.error("Помилка графіка:", e);
        }
    }

    initWellness();
})();
