// ==========================================================
// 1. КОНФІГУРАЦІЯ ТА FIREBASE
// ==========================================================
const LOAD_COLLECTION = 'training_loads';
let currentUserId = null;
let trainingData = [];
let targetACWR = 1.0;
let currentNeedleAngle = -Math.PI; 

function setTodayDate() {
    const dateInput = document.getElementById('load-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
}

if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            setTodayDate();
            loadDataFromFirebase();
        } else {
            firebase.auth().signInAnonymously().catch(e => console.error(e));
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

// ==========================================================
// 2. ЗОЛОТИЙ СПІДОМЕТР (PREMIUM STYLE) - ВИПРАВЛЕНИЙ
// ==========================================================
function drawGoldenGauge(acwr) {
    const canvas = document.getElementById('gaugeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height - 45; // Підняли центр, щоб звільнити місце знизу для цифр
    const radius = 115;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Малюємо шкалу (поділки) з червоною зоною
    for (let i = 0; i <= 20; i++) {
        const angle = Math.PI + (i / 20) * Math.PI;
        const xStart = cx + Math.cos(angle) * (radius - 8);
        const yStart = cy + Math.sin(angle) * (radius - 8);
        const xEnd = cx + Math.cos(angle) * radius;
        const yEnd = cy + Math.sin(angle) * radius;

        ctx.beginPath();
        ctx.moveTo(xStart, yStart);
        ctx.lineTo(xEnd, yEnd);
        
        // ЛОГІКА КОЛЬОРУ: 0-7 Золото (Low), 8-13 Зелений (Safe), 14-20 Червоний (Danger)
        if (i >= 8 && i <= 13) {
            ctx.strokeStyle = "#4CAF50"; // Зелений
        } else if (i > 13) {
            ctx.strokeStyle = "#DA3E52"; // Червоний (Ризик)
        } else {
            ctx.strokeStyle = "#FFC72C"; // Золотий
        }
        
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    // 2. Розрахунок кута стрілки
    const targetAngle = Math.PI + (Math.min(acwr, 2.0) / 2.0) * Math.PI;
    currentNeedleAngle += (targetAngle - currentNeedleAngle) * 0.1;

    // 3. Малюємо стрілку
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#FFC72C";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(currentNeedleAngle) * (radius - 10), cy + Math.sin(currentNeedleAngle) * (radius - 10));
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. Центр стрілки
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#FFD700";
    ctx.fill();

    // 5. ТЕКСТ ЗНАЧЕННЯ - ТЕПЕР ВНИЗУ ПІД СТРІЛКОЮ
    ctx.fillStyle = "#FFC72C";
    ctx.font = "bold 38px 'Orbitron', sans-serif"; // Спортивний шрифт
    ctx.textAlign = "center";
    // Малюємо цифри в самому низу канвасу
    ctx.fillText(acwr.toFixed(2), cx, canvas.height - 5);
    
    if (Math.abs(targetAngle - currentNeedleAngle) > 0.01) {
        requestAnimationFrame(() => drawGoldenGauge(acwr));
    }
}

function startGaugeAnimation() {
    requestAnimationFrame(() => drawGoldenGauge(targetACWR));
}

// ==========================================================
// 3. МАТЕМАТИКА ТА ІНІЦІАЛІЗАЦІЯ
// ==========================================================
function calculateProfessionalACWR() {
    if (trainingData.length < 2) return { acuteLoad: 0, chronicLoad: 0, acwr: 1.0 };
    const latest = new Date(trainingData[trainingData.length - 1].date);
    const getAvg = (d) => {
        const cutoff = new Date(latest);
        cutoff.setDate(latest.getDate() - d);
        const p = trainingData.filter(item => new Date(item.date) > cutoff);
        return p.length ? p.reduce((s, i) => s + (Number(i.duration) * Number(i.rpe)), 0) / d : 0;
    };
    const acute = getAvg(7);
    const chronic = getAvg(28);
    return { 
        acuteLoad: Math.round(acute), 
        chronicLoad: Math.round(chronic), 
        acwr: parseFloat((acute / (chronic || 1)).toFixed(2)) 
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.gauge-display');
    if (container) {
        // Збільшили висоту канвасу до 220, щоб влізли цифри під стрілкою
        container.innerHTML = '<canvas id="gaugeCanvas" width="300" height="220"></canvas>';
    }

    const form = document.getElementById('load-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.submitter; btn.disabled = true;
            const data = {
                userId: currentUserId,
                date: form.date.value,
                duration: Number(form.duration.value),
                distance: Number(form.distance.value),
                rpe: Number(form.querySelector('input[name="rpe"]:checked')?.value || 5),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            try {
                await db.collection(LOAD_COLLECTION).add(data);
                await loadDataFromFirebase();
                form.reset();
                setTodayDate();
            } catch (err) { console.error(err); } finally { btn.disabled = false; }
        };
    }
    setTodayDate();
});
