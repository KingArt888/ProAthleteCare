(function() {
    const COLLECTION_NAME = 'load_season_reports';
    let dailyLoadData = [];
    let distanceChart = null;
    let loadChart = null;

    document.addEventListener('DOMContentLoaded', () => {
        const dateInput = document.getElementById('load-date');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                await syncLoadFromFirebase(user.uid);
            } else {
                await firebase.auth().signInAnonymously().catch(console.error);
            }
        });

        const form = document.getElementById('load-form');
        if (form) form.addEventListener('submit', handleFormSubmit);
    });

    // --- ФУНКЦІЯ РУХУ СТРІЛКИ СПІДОМЕТРА ---
    function updateACWRGauge(acwrValue) {
        const needle = document.getElementById('gauge-needle');
        const valueDisplay = document.getElementById('acwr-value');
        const statusDisplay = document.getElementById('acwr-status');

        if (!needle || !valueDisplay) return;

        // Твій CSS має дугу від -90 до +90 градусів.
        // Розрахунок: (ACWR * 90) - 90. 
        // При ACWR 1.0 (Оптимально) -> 0 градусів (стрілка вгору)
        let degree = (acwrValue * 90) - 90;

        // Обмеження, щоб стрілка не вилітала за межі спідометра
        if (degree > 95) degree = 95;
        if (degree < -95) degree = -95;

        // Повертаємо стрілку (зберігаючи translateX для центрування)
        needle.style.transform = `translateX(-50%) rotate(${degree}deg)`;
        
        // Оновлюємо цифру
        valueDisplay.textContent = acwrValue.toFixed(2);

        // Оновлюємо текст статусу (використовуючи твої кольори з CSS)
        if (statusDisplay) {
            if (acwrValue < 0.8) {
                statusDisplay.textContent = 'НЕДОТРЕНОВАНІСТЬ';
                statusDisplay.className = 'status-warning';
            } else if (acwrValue <= 1.3) {
                statusDisplay.textContent = 'БЕЗПЕЧНА ЗОНА';
                statusDisplay.className = 'status-safe';
            } else {
                statusDisplay.textContent = 'РИЗИК ТРАВМИ';
                statusDisplay.className = 'status-danger';
            }
        }
    }

    async function syncLoadFromFirebase(uid) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME).where("userId", "==", uid).orderBy("date", "asc").get();
            dailyLoadData = [];
            snapshot.forEach(doc => dailyLoadData.push(doc.data()));
            
            if (dailyLoadData.length === 0) return;

            const sorted = [...dailyLoadData].sort((a,b) => new Date(a.date) - new Date(b.date));
            const last = new Date(sorted[sorted.length-1].date);
            
            const getAvg = (days) => {
                const startDate = new Date(last);
                startDate.setDate(last.getDate() - days);
                const periodData = sorted.filter(i => new Date(i.date) > startDate);
                const totalLoad = periodData.reduce((acc, i) => acc + (i.duration * (i.rpe || 0)), 0);
                return totalLoad / days;
            };

            const acute = getAvg(7);
            const chronic = getAvg(28);
            const acwr = chronic > 0 ? acute / chronic : 0;
            
            updateACWRGauge(acwr); // Рухаємо стрілку
            renderCharts(acute, chronic);
        } catch (e) { console.error("Firebase Sync Error:", e); }
    }

    function renderCharts(acute, chronic) {
        const ctxD = document.getElementById('distanceChart');
        if (ctxD && dailyLoadData.length > 0) {
            if (distanceChart) distanceChart.destroy();
            distanceChart = new Chart(ctxD, {
                type: 'line',
                data: {
                    labels: dailyLoadData.slice(-7).map(d => d.date.split('-').reverse().slice(0,2).join('.')),
                    datasets: [{
                        label: 'Км',
                        data: dailyLoadData.slice(-7).map(d => d.distance),
                        borderColor: '#FFD700',
                        backgroundColor: 'rgba(255, 215, 0, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
        // Тут можна додати рендер для loadChart аналогічно
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const user = firebase.auth().currentUser;
        if (!user) return;
        const form = e.target;
        const data = {
            userId: user.uid,
            date: form.elements['date'].value,
            duration: parseInt(form.elements['duration'].value),
            distance: parseFloat(form.elements['distance'].value),
            rpe: parseInt(form.querySelector('input[name="rpe"]:checked')?.value || 0),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection(COLLECTION_NAME).doc(`${user.uid}_${data.date}`).set(data);
        await syncLoadFromFirebase(user.uid);
    }
})();
