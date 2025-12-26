const LOAD_COLLECTION = 'training_loads';
let currentUserId = null;
let trainingData = [];
let targetACWR = 0.0;
let currentNeedleAngle = -Math.PI;
let charts = {}; // Для зберігання об'єктів графіків

// Авторизація
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            document.getElementById('load-date').value = new Date().toISOString().split('T')[0];
            loadData();
        } else {
            firebase.auth().signInAnonymously();
        }
    });
}

async function loadData() {
    if (!currentUserId) return;
    const snap = await db.collection(LOAD_COLLECTION).where("userId", "==", currentUserId).get();
    trainingData = snap.docs.map(doc => doc.data()).sort((a,b) => new Date(a.date) - new Date(b.date));
    
    const metrics = calculateMetrics();
    targetACWR = metrics.acwr;
    
    startGauge(); // Спідометр
    renderCharts(metrics); // Графіки
}

function calculateMetrics() {
    if (trainingData.length === 0) return { acwr: 0, acute: 0, chronic: 0, history: [] };
    const latest = new Date(trainingData[trainingData.length-1].date);
    
    const getAvg = (days) => {
        const cutoff = new Date(latest);
        cutoff.setDate(latest.getDate() - days);
        const filtered = trainingData.filter(d => new Date(d.date) > cutoff);
        return filtered.reduce((sum, d) => sum + (Number(d.duration) * Number(d.rpe)), 0) / days;
    };

    const acute = getAvg(7);
    const chronic = getAvg(28);
    return {
        acwr: parseFloat((acute / (chronic || 1)).toFixed(2)),
        acute: Math.round(acute),
        chronic: Math.round(chronic),
        distData: trainingData.slice(-7).map(d => d.distance) // Останні 7 записів
    };
}

// МАЛЮВАННЯ ЗОЛОТОГО СПІДОМЕТРА
function drawGauge() {
    const container = document.getElementById('acwr-gauge-display');
    if (!container) return;
    if (!document.getElementById('gaugeCanvas')) {
        container.innerHTML = '<canvas id="gaugeCanvas" width="300" height="250"></canvas>';
    }
    const canvas = document.getElementById('gaugeCanvas');
    const ctx = canvas.getContext('2d');
    const cx = 150, cy = 160, radius = 100;

    ctx.clearRect(0, 0, 300, 250);

    // Колір та статус
    let color = "#FFC72C"; let status = "ADAPTATION";
    if (targetACWR >= 0.8 && targetACWR <= 1.3) { color = "#4CAF50"; status = "SAFE ZONE"; }
    else if (targetACWR > 1.3) { color = "#FF4444"; status = "DANGER: OVERLOAD"; }

    const statusEl = document.getElementById('acwr-status');
    if (statusEl) { statusEl.textContent = status; statusEl.style.color = color; }

    // Шкала
    for (let i = 0; i <= 20; i++) {
        const angle = Math.PI + (i / 20) * Math.PI;
        ctx.beginPath();
        ctx.strokeStyle = i > 13 ? "#FF4444" : (i >= 8 ? "#4CAF50" : "#FFC72C");
        ctx.lineWidth = 3;
        ctx.moveTo(cx + Math.cos(angle) * 95, cy + Math.sin(angle) * 95);
        ctx.lineTo(cx + Math.cos(angle) * 105, cy + Math.sin(angle) * 105);
        ctx.stroke();
    }

    // Стрілка
    const targetAngle = Math.PI + (Math.min(targetACWR, 2.0) / 2.0) * Math.PI;
    currentNeedleAngle += (targetAngle - currentNeedleAngle) * 0.1;
    
    ctx.shadowBlur = 15; ctx.shadowColor = color;
    ctx.beginPath();
    ctx.strokeStyle = color; ctx.lineWidth = 4;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(currentNeedleAngle) * 90, cy + Math.sin(currentNeedleAngle) * 90);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Цифра ACWR
    ctx.textAlign = "center";
    ctx.fillStyle = "#888"; ctx.font = "14px Arial";
    ctx.fillText("INDEX ACWR", cx, cy + 40);
    ctx.fillStyle = color; ctx.font = "bold 42px Orbitron, sans-serif";
    ctx.fillText(targetACWR.toFixed(2), cx, cy + 80);

    if (Math.abs(targetAngle - currentNeedleAngle) > 0.001) requestAnimationFrame(drawGauge);
}

function startGauge() { requestAnimationFrame(drawGauge); }

// ГРАФІКИ
function renderCharts(m) {
    const commonOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#aaa' } } } };

    // 1. Acute vs Chronic
    if (charts.load) charts.load.destroy();
    charts.load = new Chart(document.getElementById('loadChart'), {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Today'],
            datasets: [
                { label: 'Acute', data: [m.acute*0.8, m.acute*1.1, m.acute], borderColor: '#FF4444' },
                { label: 'Chronic', data: [m.chronic, m.chronic, m.chronic], borderColor: '#4CAF50' }
            ]
        },
        options: commonOpts
    });

    // 2. Дистанція
    if (charts.dist) charts.dist.destroy();
    charts.dist = new Chart(document.getElementById('distanceChart'), {
        type: 'bar',
        data: {
            labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
            datasets: [{ label: 'Км', data: m.distData, backgroundColor: '#FFC72C' }]
        },
        options: commonOpts
    });
}

// Форма
document.getElementById('load-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const data = {
        userId: currentUserId,
        date: f.date.value,
        duration: Number(f.duration.value),
        distance: Number(f.distance.value),
        rpe: Number(f.querySelector('input[name="rpe"]:checked')?.value || 5),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection(LOAD_COLLECTION).add(data);
    f.reset();
    loadData();
};
