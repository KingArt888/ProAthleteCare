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

    // ЛОГІКА РУХУ МАРКЕРА ПО ЛІНІЙНІЙ ШКАЛІ
    function updateACWRLinear(acwrValue) {
        const marker = document.querySelector('.acwr-marker');
        const valueDisplay = document.getElementById('acwr-value');
        const statusDisplay = document.getElementById('acwr-status-text');

        if (!marker || !valueDisplay) return;

        // Розрахунок позиції маркера у відсотках (%) 
        // Згідно з вашим CSS: zone-under (40%), zone-sweet (25%), zone-danger (35%)
        let pos = 0;
        if (acwrValue <= 0.8) {
            pos = (acwrValue / 0.8) * 40;
        } else if (acwrValue <= 1.3) {
            pos = 40 + ((acwrValue - 0.8) / 0.5) * 25;
        } else {
            pos = 65 + ((acwrValue - 1.3) / 0.7) * 35;
        }

        // Обмеження, щоб не виходив за межі лінії
        const finalPos = Math.min(99, Math.max(0, pos));
        
        // РУХАЄМО МАРКЕР
        marker.style.left = `${finalPos}%`;
        
        // ОНОВЛЮЄМО ЦИФРУ ТА СТАТУС
        valueDisplay.textContent = acwrValue.toFixed(2);

        if (statusDisplay) {
            if (acwrValue < 0.8) {
                statusDisplay.textContent = 'НЕДОТРЕНОВАНІСТЬ';
                statusDisplay.style.color = 'rgba(255, 215, 0, 0.6)';
            } else if (acwrValue <= 1.3) {
                statusDisplay.textContent = 'ОПТИМАЛЬНА ФОРМА (SWEET SPOT)';
                statusDisplay.style.color = '#FFD700'; // Золото ProAtletCare
            } else {
                statusDisplay.textContent = 'РИЗИК ТРАВМИ';
                statusDisplay.style.color = '#D9534F'; // Червоний
            }
        }
    }

    // --- Далі стандартна логіка Firebase та Графіків (без змін) ---
    async function syncLoadFromFirebase(uid) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME).where("userId", "==", uid).orderBy("date", "asc").get();
            dailyLoadData = [];
            snapshot.forEach(doc => dailyLoadData.push(doc.data()));
            
            if (dailyLoadData.length === 0) dailyLoadData = [{ date: new Date().toISOString().split('T')[0], duration: 60, rpe: 7, distance: 5 }];

            const sorted = [...dailyLoadData].sort((a,b) => new Date(a.date) - new Date(b.date));
            const last = new Date(sorted[sorted.length-1].date);
            const getAvg = (d) => {
                const s = new Date(last); s.setDate(last.getDate()-d);
                const p = sorted.filter(i => new Date(i.date) > s);
                return p.reduce((acc, i) => acc + (i.duration * (i.rpe || 0)), 0) / d;
            };

            const a = getAvg(7), c = getAvg(28);
            const acwr = c > 0 ? a / c : 0;
            
            updateACWRLinear(acwr); // Виклик вашої лінійної шкали
            renderCharts(a, c);
        } catch (e) { console.error(e); }
    }

    function renderCharts(acute, chronic) {
        // Код графіків залишається вашим (чорно-золотим)
        const ctxD = document.getElementById('distanceChart');
        if (ctxD && dailyLoadData.length > 0) {
            if (distanceChart) distanceChart.destroy();
            distanceChart = new Chart(ctxD, {
                type: 'line',
                data: {
                    labels: dailyLoadData.slice(-7).map(d => d.date.split('-').reverse().slice(0,2).join('.')),
                    datasets: [{ label: 'Км', data: dailyLoadData.slice(-7).map(d => d.distance), borderColor: '#FFD700', fill: true }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
        // ... (аналогічно для loadChart)
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
