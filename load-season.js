const LOAD_COLLECTION = 'training_loads';
let currentUserId = null;
let trainingData = [];
let targetACWR = 0.0;
let currentNeedleAngle = -Math.PI; 

// 1. Авторизація та завантаження
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            loadDataFromFirebase();
        }
    });
}

async function loadDataFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(LOAD_COLLECTION).where("userId", "==", currentUserId).get();
        trainingData = [];
        snapshot.forEach(doc => trainingData.push({ id: doc.id, ...doc.data() }));
        trainingData.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const metrics = calculateProfessionalACWR();
        targetACWR = metrics.acwr;
        
        startGaugeAnimation(); 
        if (typeof renderLoadChart === 'function') renderLoadChart(metrics.acuteLoad, metrics.chronicLoad);
    } catch (e) { console.error(e); }
}

// 2. Функція малювання преміального спідометра
function drawGoldenGauge(acwr) {
    const canvas = document.getElementById('gaugeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height - 70; 
    const radius = 100;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Визначаємо колір залежно від зони
    let mainColor = "#FFC72C"; // Золото (дефолт)
    let statusLabel = "ADAPTATION";
    
    if (acwr >= 0.8 && acwr <= 1.3) {
        mainColor = "#4CAF50"; // Зелений
        statusLabel = "SAFE ZONE";
    } else if (acwr > 1.3) {
        mainColor = "#FF4444"; // Червоний
        statusLabel = "DANGER: OVERLOAD";
    }

    // Оновлюємо текстовий статус у HTML (якщо він є)
    const statusBox = document.getElementById('acwr-status');
    if (statusBox) {
        statusBox.textContent = statusLabel;
        statusBox.style.color = mainColor;
    }

    // Малюємо поділки шкали
    for (let i = 0; i <= 20; i++) {
        const angle = Math.PI + (i / 20) * Math.PI;
        const isGreen = (i >= 8 && i <= 13);
        const isRed = (i > 13);
        
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * (radius - 5), cy + Math.sin(angle) * (radius - 5));
        ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.strokeStyle = isRed ? "#FF4444" : (isGreen ? "#4CAF50" : "#FFC72C");
        ctx.lineWidth = 3;
        ctx.stroke();

        // Цифри під шкалою
        if (i % 5 === 0) {
            ctx.fillStyle = "#888";
            ctx.font = "11px Arial";
            ctx.fillText((i/10).toFixed(1), cx + Math.cos(angle) * (radius + 15), cy + Math.sin(angle) * (radius + 15));
        }
    }

    // Розрахунок кута стрілки
    const targetAngle = Math.PI + (Math.min(acwr, 2.0) / 2.0) * Math.PI;
    currentNeedleAngle += (targetAngle - currentNeedleAngle) * 0.06;

    // Стрілка
    ctx.shadowBlur = 10;
    ctx.shadowColor = mainColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(currentNeedleAngle) * (radius - 10), cy + Math.sin(currentNeedleAngle) * (radius - 10));
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ВЕЛИКИЙ ІНДЕКС ACWR ПО ЦЕНТРУ ЗНИЗУ
    ctx.textAlign = "center";
    ctx.fillStyle = "#888";
    ctx.font = "12px Montserrat";
    ctx.fillText("CURRENT ACWR", cx, cy + 30);
    
    ctx.fillStyle = mainColor;
    ctx.font = "bold 42px Orbitron, sans-serif"; // Спортивний шрифт
    ctx.fillText(acwr.toFixed(2), cx, cy + 70);

    if (Math.abs(targetAngle - currentNeedleAngle) > 0.001) {
        requestAnimationFrame(() => drawGoldenGauge(acwr));
    }
}

function startGaugeAnimation() {
    requestAnimationFrame(() => drawGoldenGauge(targetACWR));
}

// 3. Розрахунок ACWR
function calculateProfessionalACWR() {
    if (trainingData.length < 2) return { acuteLoad: 0, chronicLoad: 0, acwr: 0.0 };
    const latest = new Date(trainingData[trainingData.length - 1].date);
    const getAvg = (d) => {
        const cutoff = new Date(latest);
        cutoff.setDate(latest.getDate() - d);
        const p = trainingData.filter(i => new Date(i.date) > cutoff);
        return p.length ? p.reduce((s, i) => s + (Number(i.duration) * Number(i.rpe)), 0) / d : 0;
    };
    const acute = getAvg(7);
    const chronic = getAvg(28);
    return { acuteLoad: acute, chronicLoad: chronic, acwr: parseFloat((acute / (chronic || 1)).toFixed(2)) };
}

document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.gauge-display');
    if (container) {
        container.innerHTML = '<canvas id="gaugeCanvas" width="300" height="250"></canvas>';
    }
    const dateInput = document.getElementById('load-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
});
