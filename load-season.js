(function() {
    // Назва має збігатися з вашими Firebase Rules!
    const COLLECTION_NAME = 'training_loads';
    
    let dailyLoadData = [];
    let distanceChart, loadChart;

    // --- СИНХРОНІЗАЦІЯ З FIREBASE ---
    async function syncLoadFromFirebase(uid) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("date", "asc")
                .get();

            dailyLoadData = [];
            snapshot.forEach(doc => dailyLoadData.push(doc.data()));
            
            // Якщо в хмарі порожньо, можна залишити ваші заглушки для тесту, 
            // але зазвичай тут порожній масив для нових юзерів
            refreshUI();
        } catch (e) {
            console.error("Помилка синхронізації:", e);
            refreshUI();
        }
    }

    function refreshUI() {
        const { acuteLoad, chronicLoad, acwr } = calculateACWR();
        updateACWRGauge(acwr);
        if (typeof Chart !== 'undefined') {
            renderDistanceChart();
            renderLoadChart(acuteLoad, chronicLoad);
        }
    }

    // --- ВАША ОРИГІНАЛЬНА ЛОГІКА ОБЧИСЛЕНЬ ---

    function calculateSessionRPE(duration, rpe) {
        return duration * rpe;
    }

    function getWeekNumber(dateString) {
        const date = new Date(dateString);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 4 - (date.getDay() || 7));
        const yearStart = new Date(date.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
        return date.getFullYear() * 100 + weekNo;
    }

    function calculateACWR() {
        if (dailyLoadData.length === 0) return { acuteLoad: 0, chronicLoad: 0, acwr: 0 };
        const sortedData = [...dailyLoadData].sort((a, b) => new Date(a.date) - new Date(b.date));
        const latestDate = new Date(sortedData[sortedData.length - 1].date);

        const dataWithLoad = sortedData.map(item => ({
            ...item,
            load: calculateSessionRPE(item.duration, item.rpe)
        }));

        const sevenDaysAgo = new Date(latestDate);
        sevenDaysAgo.setDate(latestDate.getDate() - 7);
        const twentyEightDaysAgo = new Date(latestDate);
        twentyEightDaysAgo.setDate(latestDate.getDate() - 28);

        const acuteLoad = dataWithLoad.filter(item => new Date(item.date) > sevenDaysAgo)
                                     .reduce((sum, item) => sum + item.load, 0) / 7;

        const chronicLoad = dataWithLoad.filter(item => new Date(item.date) > twentyEightDaysAgo)
                                       .reduce((sum, item) => sum + item.load, 0) / 28;

        return {
            acuteLoad: Math.round(acuteLoad),
            chronicLoad: Math.round(chronicLoad),
            acwr: chronicLoad > 0 ? parseFloat((acuteLoad / chronicLoad).toFixed(2)) : 0
        };
    }

    // --- ВАШІ ОРИГІНАЛЬНІ ФУНКЦІЇ UI (Спідометр та Графіки) ---

    function updateACWRGauge(acwrValue) {
        const needle = document.getElementById('gauge-needle');
        const acwrValueDisplay = document.getElementById('acwr-value');
        const statusText = document.getElementById('acwr-status');
        if (!needle || !acwrValueDisplay || !statusText) return;

        let degree = 0;
        let status = 'Недостатньо даних';
        let statusClass = 'status-warning';

        if (acwrValue >= 0.8 && acwrValue <= 1.3) {
            degree = -50 + ((acwrValue - 0.8) / 0.5) * 100;
            status = 'Безпечна зона (Оптимально)'; statusClass = 'status-safe';
        } else if (acwrValue > 1.3) {
            degree = 50 + ((acwrValue - 1.3) / 0.7) * 40;
            status = 'Ризик травми'; statusClass = 'status-danger';
        } else {
            degree = -90; status = 'Детренування'; statusClass = 'status-warning';
        }
        
        degree = Math.min(90, Math.max(-90, degree));
        needle.style.transform = `translateX(-50%) rotate(${degree}deg)`;
        acwrValueDisplay.textContent = acwrValue.toFixed(2);
        statusText.textContent = status;
        statusText.className = statusClass;
    }

    function renderDistanceChart() {
        const ctx = document.getElementById('distanceChart');
        if (!ctx) return;
        
        const weeklyDistance = {};
        dailyLoadData.forEach(item => {
            const week = getWeekNumber(item.date);
            weeklyDistance[week] = (weeklyDistance[week] || 0) + item.distance;
        });

        const sortedWeeks = Object.keys(weeklyDistance).sort();
        const labels = sortedWeeks.map((_, i) => `Тиждень ${i + 1}`);
        const data = sortedWeeks.map(w => weeklyDistance[w]);

        if (distanceChart) distanceChart.destroy();
        distanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Загальна дистанція (км)',
                    data: data,
                    borderColor: '#FFD700',
                    backgroundColor: 'rgba(255, 215, 0, 0.2)',
                    borderWidth: 3, tension: 0.3, fill: true
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#CCCCCC' } } },
                scales: {
                    x: { ticks: { color: '#AAAAAA' }, grid: { color: '#333333' } },
                    y: { beginAtZero: true, ticks: { color: '#AAAAAA' }, grid: { color: '#333333' } }
                }
            }
        });
    }

    function renderLoadChart(acuteLoad, chronicLoad) {
        const ctx = document.getElementById('loadChart');
        if (!ctx) return;

        // Повертаємо ваші демо-мітки та логіку порівняння
        const demoLabels = ['4 тижні тому', '3 тижні тому', '2 тижні тому', 'Поточний'];
        const demoAcute = [500, 650, 800, acuteLoad];
        const demoChronic = [600, 620, 700, chronicLoad];

        if (loadChart) loadChart.destroy();
        loadChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: demoLabels,
                datasets: [
                    { label: 'Acute Load', data: demoAcute, borderColor: '#D9534F', fill: false, tension: 0.3 },
                    { label: 'Chronic Load', data: demoChronic, borderColor: '#4CAF50', fill: false, tension: 0.3 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#CCCCCC' } } },
                scales: {
                    x: { ticks: { color: '#AAAAAA' }, grid: { color: '#333333' } },
                    y: { beginAtZero: true, ticks: { color: '#AAAAAA' }, grid: { color: '#333333' } }
                }
            }
        });
    }

    // --- ІНІЦІАЛІЗАЦІЯ ---
    document.addEventListener('DOMContentLoaded', () => {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                await syncLoadFromFirebase(user.uid);
            } else {
                await firebase.auth().signInAnonymously();
            }
        });

        const form = document.getElementById('load-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = firebase.auth().currentUser;
                if (!user) return alert("Авторизація...");

                const data = {
                    userId: user.uid,
                    date: form.elements['date'].value,
                    duration: parseInt(form.elements['duration'].value),
                    distance: parseFloat(form.elements['distance'].value),
                    rpe: parseInt(form.querySelector('input[name="rpe"]:checked')?.value || 0),
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };

                try {
                    // Використовуємо дату як ID документа, щоб не дублювати записи за один день
                    await db.collection(COLLECTION_NAME).doc(`${user.uid}_${data.date}`).set(data);
                    document.getElementById('form-status').textContent = "Дані збережено!";
                    await syncLoadFromFirebase(user.uid);
                } catch (err) { alert("Помилка: " + err.message); }
            });
        }
        
        if (document.getElementById('load-date')) {
            document.getElementById('load-date').valueAsDate = new Date();
        }
    });
})();
