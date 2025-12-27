(function() {
    const COLLECTION_NAME = 'load_season_reports';
    
    // --- ДИЗАЙН ProAthleteCare ---
    const GOLD_COLOR = 'rgb(255, 215, 0)';
    const GOLD_AREA = 'rgba(255, 215, 0, 0.2)';
    const WHITE_GRID = 'rgba(255, 255, 255, 0.1)';
    const TEXT_COLOR = 'rgba(255, 255, 255, 0.8)';
    const ACUTE_COLOR = '#D9534F'; 
    const CHRONIC_COLOR = '#4CAF50'; 

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
            localStorage.setItem('loadSeasonData', JSON.stringify(dailyLoadData));
            refreshUI();
        } catch (e) {
            console.error("Помилка синхронізації:", e);
            dailyLoadData = JSON.parse(localStorage.getItem('loadSeasonData') || '[]');
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

    // --- ЛОГІКА ОБЧИСЛЕНЬ ---
    function calculateACWR() {
        if (dailyLoadData.length === 0) return { acuteLoad: 0, chronicLoad: 0, acwr: 0 };
        const sortedData = [...dailyLoadData].sort((a, b) => new Date(a.date) - new Date(b.date));
        const latestDate = new Date(sortedData[sortedData.length - 1].date);

        const getLoad = (days) => {
            const startDate = new Date(latestDate);
            startDate.setDate(latestDate.getDate() - days);
            const periodData = sortedData.filter(i => new Date(i.date) > startDate);
            const total = periodData.reduce((sum, i) => sum + (i.duration * i.rpe), 0);
            return total / days;
        };

        const acute = getLoad(7);
        const chronic = getLoad(28);
        return {
            acuteLoad: Math.round(acute),
            chronicLoad: Math.round(chronic),
            acwr: chronic > 0 ? parseFloat((acute / chronic).toFixed(2)) : 0
        };
    }

    // --- ОНОВЛЕННЯ СПІДОМЕТРА ---
    function updateACWRGauge(acwr) {
        const needle = document.getElementById('gauge-needle');
        const display = document.getElementById('acwr-value');
        const status = document.getElementById('acwr-status');
        if (!needle || !display || !status) return;

        let degree = -90;
        let text = "Недостатньо даних";
        let cls = "status-warning";

        if (acwr > 0) {
            if (acwr >= 0.8 && acwr <= 1.3) {
                degree = -50 + ((acwr - 0.8) / 0.5) * 100;
                text = "Безпечна зона"; cls = "status-safe";
            } else if (acwr > 1.3) {
                degree = 50 + ((acwr - 1.3) / 0.7) * 40;
                text = "Ризик травми"; cls = "status-danger";
            } else {
                degree = -90 + (acwr / 0.8) * 40;
                text = "Низьке навантаження"; cls = "status-warning";
            }
        }
        
        needle.style.transform = `translateX(-50%) rotate(${Math.min(90, Math.max(-90, degree))}deg)`;
        display.textContent = acwr.toFixed(2);
        status.textContent = text;
        status.className = cls;
    }

    // --- ГРАФІКИ ---
    function renderDistanceChart() {
        const ctx = document.getElementById('distanceChart');
        if (!ctx) return;
        const last7Days = dailyLoadData.slice(-7);
        if (distanceChart) distanceChart.destroy();
        distanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days.map(d => d.date.split('-').slice(1).join('/')),
                datasets: [{
                    label: 'Дистанція (км)',
                    data: last7Days.map(d => d.distance),
                    borderColor: GOLD_COLOR,
                    backgroundColor: GOLD_AREA,
                    fill: true, tension: 0.3
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: WHITE_GRID }, ticks: { color: TEXT_COLOR } },
                    x: { ticks: { color: TEXT_COLOR } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function renderLoadChart(acute, chronic) {
        const ctx = document.getElementById('loadChart');
        if (!ctx) return;
        if (loadChart) loadChart.destroy();
        loadChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Acute (7d)', 'Chronic (28d)'],
                datasets: [{
                    data: [acute, chronic],
                    backgroundColor: [ACUTE_COLOR, CHRONIC_COLOR]
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: WHITE_GRID }, ticks: { color: TEXT_COLOR } },
                    x: { ticks: { color: TEXT_COLOR } }
                },
                plugins: { legend: { display: false } }
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
                    await db.collection(COLLECTION_NAME).doc(`${user.uid}_${data.date}`).set(data);
                    document.getElementById('form-status').textContent = "Збережено!";
                    await syncLoadFromFirebase(user.uid);
                } catch (err) { alert(err.message); }
            });
        }
        
        if (document.getElementById('load-date')) {
            document.getElementById('load-date').valueAsDate = new Date();
        }
    });
})();
