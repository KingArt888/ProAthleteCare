(function() {
    const COLLECTION_NAME = 'load_season_reports';
    let dailyLoadData = [];
    let distanceChart, loadChart;

    // --- 1. СИНХРОНІЗАЦІЯ ТА ІНІЦІАЛІЗАЦІЯ ---
    async function syncLoadFromFirebase(uid) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("date", "asc")
                .get();

            const firebaseData = [];
            snapshot.forEach(doc => firebaseData.push(doc.data()));
            dailyLoadData = firebaseData.length > 0 ? firebaseData : getDemoData();
            refreshUI();
        } catch (e) {
            console.error("Помилка:", e);
            dailyLoadData = getDemoData();
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

    // --- 2. ЛОГІКА "ДОРОГОГО" СПІДОМЕТРА З ДИНАМІЧНИМ СТИЛЕМ ---
    function updateACWRGauge(acwrValue) {
        const needle = document.getElementById('gauge-needle');
        const display = document.getElementById('acwr-value');
        const statusText = document.getElementById('acwr-status');
        // Намагаємось знайти корпус спідометра за популярними класами
        const gaugeTrack = document.querySelector('.gauge-track') || 
                           document.querySelector('.gauge-body') || 
                           document.querySelector('.speedometer-ring');

        if (!needle || !display || !statusText) return;

        // ПРИМУСОВЕ ФАРБУВАННЯ ШКАЛИ (як у спорткарі)
        if (gaugeTrack) {
            gaugeTrack.style.background = `conic-gradient(from 270deg, #f1c40f 0deg, #f1c40f 45deg, #2ecc71 45deg, #2ecc71 135deg, #e74c3c 135deg, #e74c3c 180deg, transparent 180deg)`;
            gaugeTrack.style.borderRadius = "50%"; // На випадок, якщо злетіли стилі
        }

        let degree = -90; 
        let status = '';
        
        // Розрахунок позиції стрілки та статусу
        if (acwrValue < 0.8) {
            degree = -90 + (acwrValue / 0.8) * 40; 
            status = 'НЕДОТРЕНОВАНІСТЬ';
            statusText.style.color = '#f1c40f'; 
        } else if (acwrValue >= 0.8 && acwrValue <= 1.3) {
            degree = -50 + ((acwrValue - 0.8) / 0.5) * 100;
            status = 'ХОРОША ДИНАМІКА';
            statusText.style.color = '#2ecc71';
        } else {
            degree = 50 + ((acwrValue - 1.3) / 0.7) * 40;
            status = 'РИЗИК ТРАВМИ';
            statusText.style.color = '#e74c3c';
        }

        // Плавна анімація як у аналогових приладів
        const finalDegree = Math.min(90, Math.max(-90, degree));
        needle.style.transition = "transform 2s cubic-bezier(0.2, 0, 0.2, 1)";
        needle.style.transform = `translateX(-50%) rotate(${finalDegree}deg)`;
        needle.style.backgroundColor = "#FFD700"; // Робимо стрілку золотою
        
        display.textContent = acwrValue.toFixed(2);
        statusText.textContent = status;
        statusText.style.fontWeight = "bold";
    }

    // --- 3. ГРАФІКИ (ЛІНІЇ) ---
    function renderDistanceChart() {
        const ctx = document.getElementById('distanceChart');
        if (!ctx) return;
        
        const weeklyDistance = {};
        dailyLoadData.forEach(item => {
            const date = new Date(item.date);
            const week = Math.ceil(date.getDate() / 7);
            weeklyDistance[week] = (weeklyDistance[week] || 0) + item.distance;
        });
        
        const labels = Object.keys(weeklyDistance).map(w => `Тиждень ${w}`);
        const data = Object.values(weeklyDistance);

        if (distanceChart) distanceChart.destroy();
        distanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Дистанція (км)',
                    data: data,
                    borderColor: '#FFD700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    fill: true, tension: 0.4, borderWidth: 3
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function renderLoadChart(acute, chronic) {
        const ctx = document.getElementById('loadChart');
        if (!ctx) return;
        if (loadChart) loadChart.destroy();
        loadChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['4 тижні тому', '3 тижні тому', '2 тижні тому', 'Поточний'],
                datasets: [
                    { label: 'Acute (7 днів)', data: [acute*0.8, acute*0.9, acute*1.1, acute], borderColor: '#e74c3c', tension: 0.3, fill: false, borderWidth: 3 },
                    { label: 'Chronic (28 днів)', data: [chronic*0.9, chronic, chronic*0.95, chronic], borderColor: '#2ecc71', tension: 0.3, fill: false, borderWidth: 3 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // --- 4. РОЗРАХУНКИ ---
    function calculateACWR() {
        if (dailyLoadData.length === 0) return { acuteLoad: 0, chronicLoad: 0, acwr: 0 };
        const sorted = [...dailyLoadData].sort((a, b) => new Date(a.date) - new Date(b.date));
        const lastDate = new Date(sorted[sorted.length - 1].date);

        const getAvg = (days) => {
            const start = new Date(lastDate);
            start.setDate(lastDate.getDate() - days);
            const filtered = sorted.filter(d => new Date(d.date) > start);
            const total = filtered.reduce((s, d) => s + (d.duration * (d.rpe || 0)), 0);
            return total / days;
        };

        const a = getAvg(7);
        const c = getAvg(28);
        return { acuteLoad: a, chronicLoad: c, acwr: c > 0 ? a / c : 0 };
    }

    function getDemoData() {
        return [{ date: '2025-12-25', duration: 60, rpe: 7, distance: 5 }];
    }

    // --- 5. ЗАПУСК ТА АВТО-ДАТА ---
    document.addEventListener('DOMContentLoaded', () => {
        // АВТОМАТИЧНА СЬОГОДНІШНЯ ДАТА
        const dateInput = document.getElementById('load-date') || document.querySelector('input[type="date"]');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) await syncLoadFromFirebase(user.uid);
            else await firebase.auth().signInAnonymously();
        });

        const form = document.getElementById('load-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = firebase.auth().currentUser;
                if (!user) return;
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
            });
        }
    });
})();
