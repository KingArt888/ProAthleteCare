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

    // --- ОНОВЛЕНА ФУНКЦІЯ СПІДОМЕТРА ---
    function updateACWRGauge(acwrValue) {
        const needle = document.querySelector('.gauge-needle');
        const display = document.getElementById('acwr-value');
        const statusDisplay = document.getElementById('acwr-status');

        if (!needle || !display) return;

        // Твій CSS використовує систему, де 0deg — це вертикально вгору.
        // Щоб стрілка ходила від лівого краю до правого по дузі:
        // -90deg (ліво) | 0deg (центр) | +90deg (право)
        
        let degree = -90; 
        if (acwrValue <= 0.8) {
            degree = -90 + (acwrValue / 0.8) * 45; // Рух від -90 до -45
        } else if (acwrValue <= 1.3) {
            degree = -45 + ((acwrValue - 0.8) / 0.5) * 90; // Рух від -45 до +45
        } else {
            degree = 45 + ((acwrValue - 1.3) / 0.7) * 45; // Рух від +45 до +90
        }

        // Обмеження, щоб стрілка не виходила за межі візуальної шкали
        const finalDegree = Math.min(95, Math.max(-95, degree));

        // ВАЖЛИВО: додаємо translateX(-50%), щоб зберегти центрування з твого CSS
        needle.style.transform = `translateX(-50%) rotate(${finalDegree}deg)`;
        
        display.textContent = acwrValue.toFixed(2);

        if (statusDisplay) {
            if (acwrValue < 0.8) {
                statusDisplay.textContent = 'НЕДОТРЕНОВАНІСТЬ';
                statusDisplay.className = 'status-warning';
                display.style.color = '#f0ad4e';
            } else if (acwrValue <= 1.3) {
                statusDisplay.textContent = 'ОПТИМАЛЬНА ФОРМА';
                statusDisplay.className = 'status-safe';
                display.style.color = '#5cb85c';
            } else {
                statusDisplay.textContent = 'РИЗИК ТРАВМИ';
                statusDisplay.className = 'status-danger';
                display.style.color = '#d9534f';
            }
        }
    }

    async function syncLoadFromFirebase(uid) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("date", "asc")
                .get();
            
            dailyLoadData = [];
            snapshot.forEach(doc => dailyLoadData.push(doc.data()));
            
            if (dailyLoadData.length === 0) {
                updateACWRGauge(0);
                return;
            }

            const { acute, chronic, acwr } = calculateMetrics();
            updateACWRGauge(acwr);
            renderCharts(acute, chronic);
        } catch (e) { console.error(e); }
    }

    function calculateMetrics() {
        if (dailyLoadData.length === 0) return { acute: 0, chronic: 0, acwr: 0 };
        const sorted = [...dailyLoadData].sort((a, b) => new Date(a.date) - new Date(b.date));
        const lastDate = new Date(sorted[sorted.length - 1].date);

        const getAvg = (days) => {
            const start = new Date(lastDate);
            start.setDate(lastDate.getDate() - days);
            const period = sorted.filter(d => new Date(d.date) > start);
            const total = period.reduce((s, d) => s + (d.duration * (d.rpe || 0)), 0);
            return total / days;
        };

        const acute = getAvg(7);
        const chronic = getAvg(28);
        const acwr = chronic > 0 ? acute / chronic : 0;
        return { acute, chronic, acwr };
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
                        fill: true
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
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
