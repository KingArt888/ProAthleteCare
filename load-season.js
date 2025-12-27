(function() {
    const COLLECTION_NAME = 'load_season_reports';
    let dailyLoadData = [];
    let distanceChart, loadChart;

    // --- 1. ІНІЦІАЛІЗАЦІЯ ---
    document.addEventListener('DOMContentLoaded', () => {
        // Автоматична дата (сьогодні)
        const dateInput = document.getElementById('load-date') || document.querySelector('input[type="date"]');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) await syncLoadFromFirebase(user.uid);
            else await firebase.auth().signInAnonymously();
        });

        const form = document.getElementById('load-form');
        if (form) form.addEventListener('submit', handleFormSubmit);
    });

    // --- 2. ПРЕМІАЛЬНИЙ СПІДОМЕТР (DIGITAL DASHBOARD) ---
    function updateACWRGauge(acwrValue) {
        const needle = document.getElementById('gauge-needle');
        const display = document.getElementById('acwr-value');
        const statusText = document.getElementById('acwr-status');
        const gaugeTrack = document.querySelector('.gauge-track') || document.querySelector('.gauge-body');

        if (!needle || !display || !statusText) return;

        // СТИЛІЗАЦІЯ КОРПУСУ (Преміум чорний з градієнтом)
        if (gaugeTrack) {
            gaugeTrack.style.position = "relative";
            gaugeTrack.style.background = `conic-gradient(
                from 270deg,
                #FFD700 0deg, #FFD700 36deg,    /* 0.0-0.8 Жовтий (Underload) */
                #27ae60 36deg, #27ae60 126deg,  /* 0.8-1.3 Зелений (Optimal) */
                #c0392b 126deg, #c0392b 180deg, /* 1.3+ Червоний (Danger) */
                transparent 180deg
            )`;
            gaugeTrack.style.borderRadius = "200px 200px 0 0";
            gaugeTrack.style.height = "150px";
            gaugeTrack.style.overflow = "hidden";
            gaugeTrack.style.boxShadow = "inset 0 0 15px rgba(0,0,0,0.8), 0 5px 15px rgba(0,0,0,0.3)";
        }

        // РОЗРАХУНОК КУТА (0-180 градусів, де 0 - крайній лівий)
        // Масштабуємо значення так, щоб стрілка ніколи не "улітала"
        let degree = 0;
        let status = '';
        let color = '#fff';

        if (acwrValue <= 0.8) {
            degree = (acwrValue / 0.8) * 45;
            status = 'НЕДОТРЕНОВАНІСТЬ';
            color = '#FFD700';
        } else if (acwrValue <= 1.3) {
            degree = 45 + ((acwrValue - 0.8) / 0.5) * 90;
            status = 'ОПТИМАЛЬНА ЗОНА';
            color = '#2ecc71';
        } else {
            degree = 135 + ((acwrValue - 1.3) / 0.7) * 45;
            status = 'РИЗИК ТРАВМИ';
            color = '#e74c3c';
        }

        // Обмеження 180 градусів
        const finalDegree = Math.min(180, Math.max(0, degree)) - 90;

        // СТИЛЬ СТРІЛКИ (Як у спорткарі)
        needle.style.position = "absolute";
        needle.style.bottom = "0";
        needle.style.left = "50%";
        needle.style.width = "4px";
        needle.style.height = "130px";
        needle.style.background = "linear-gradient(to top, #fff, #FFD700)";
        needle.style.transformOrigin = "bottom center";
        needle.style.transition = "transform 1.5s cubic-bezier(0.1, 0.7, 0.1, 1)";
        needle.style.transform = `translateX(-50%) rotate(${finalDegree}deg)`;
        needle.style.boxShadow = "0 0 10px rgba(255, 215, 0, 0.5)";

        // ТЕКСТОВІ ДАНІ
        display.textContent = acwrValue.toFixed(2);
        display.style.color = color;
        statusText.textContent = status;
        statusText.style.color = color;
        statusText.style.fontWeight = "bold";
    }

    // --- 3. РОЗРАХУНКИ ТА FIREBASE ---
    function calculateACWR() {
        if (dailyLoadData.length === 0) return { acuteLoad: 0, chronicLoad: 0, acwr: 0 };
        const sorted = [...dailyLoadData].sort((a, b) => new Date(a.date) - new Date(b.date));
        const lastDate = new Date(sorted[sorted.length - 1].date);

        const getAvg = (days) => {
            const start = new Date(lastDate);
            start.setDate(lastDate.getDate() - days);
            const period = sorted.filter(d => new Date(d.date) > start);
            const total = period.reduce((s, d) => s + (d.duration * (d.rpe || 0)), 0);
            return total / days;
        };

        const a = getAvg(7);
        const c = getAvg(28);
        return { acuteLoad: Math.round(a), chronicLoad: Math.round(c), acwr: c > 0 ? parseFloat((a / c).toFixed(2)) : 0 };
    }

    async function syncLoadFromFirebase(uid) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("date", "asc")
                .get();
            const data = [];
            snapshot.forEach(doc => data.push(doc.data()));
            dailyLoadData = data.length > 0 ? data : getDemoData();
            refreshUI();
        } catch (e) {
            dailyLoadData = getDemoData();
            refreshUI();
        }
    }

    function refreshUI() {
        const { acuteLoad, chronicLoad, acwr } = calculateACWR();
        updateACWRGauge(acwr); 
        // Тут залишаються ваші виклики для графіків...
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

    function getDemoData() {
        return [{ date: new Date().toISOString().split('T')[0], duration: 60, rpe: 7, distance: 5 }];
    }
})();
