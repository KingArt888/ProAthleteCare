// ==========================================================
// 1. НАЛАШТУВАННЯ ТА FIREBASE
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
        renderLoadChart(metrics.acuteLoad, metrics.chronicLoad);
    } catch (e) { console.error(e); }
}

// ==========================================================
// 2. ЗОЛОТИЙ СПІДОМЕТР З ЧЕРВОНОЮ ЗОНОЮ ТА ЦИФРАМИ ВНИЗУ
// ==========================================================
function drawGoldenGauge(acwr) {
    const canvas = document.getElementById('gaugeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height - 40; // Трохи підняли, щоб внизу влізли цифри
    const radius = 110;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. МАЛЮЄМО КОЛЬОРОВУ ДУГУ (ШКАЛУ)
    ctx.lineWidth = 10;
    ctx.lineCap = 'butt';

    // Жовта/Золота зона (0.0 - 0.8)
    drawArcSegment(ctx, cx, cy, radius, 0, 0.8, "#FFC72C");
    // Зелена зона (0.8 - 1.3)
    drawArcSegment(ctx, cx, cy, radius, 0.8, 1.3, "#4CAF50");
    // Червона зона (1.3 - 2.0+)
    drawArcSegment(ctx, cx, cy, radius, 1.3, 2.0, "#DA3E52");

    // 2. АНІМАЦІЯ СТРІЛКИ
    const targetAngle = Math.PI + (Math.min(acwr, 2.0) / 2.0) * Math.PI;
    const easing = 0.08; 
    currentNeedleAngle += (targetAngle - currentNeedleAngle) * easing;

    // 3. МАЛЮЄМО СТРІЛКУ (Золота з неоновим ефектом)
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#FFC72C";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(currentNeedleAngle) * (radius - 5), cy + Math.sin(currentNeedleAngle) * (radius - 5));
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Центр стрілки
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#FFD700";
    ctx.fill();

    // 4. ЦИФРИ ПІД СТРІЛКОЮ (В самому низу)
    ctx.fillStyle = "#FFC72C";
    ctx.font = "bold 36px 'Orbitron', sans-serif"; // Спортивний шрифт
    ctx.textAlign = "center";
    ctx.fillText(acwr.toFixed(2), cx, canvas.height - 5);

    if (Math.abs(targetAngle - currentNeedleAngle) > 0.001) {
        requestAnimationFrame(() => drawGoldenGauge(acwr));
    }
}

// Допоміжна функція для малювання частин дуги
function drawArcSegment(ctx, cx, cy, radius, startVal, endVal, color) {
    const startAngle = Math.PI + (startVal / 2) * Math.PI;
    const endAngle = Math.PI + (endVal / 2) * Math.PI;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.stroke();
}

function startGaugeAnimation() {
    requestAnimationFrame(() => drawGoldenGauge(targetACWR));
}

// ==========================================================
// 3. МАТЕМАТИКА ТА ФОРМА
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
    const result = acute / (chronic || 1);
    return { acuteLoad: Math.round(acute), chronicLoad: Math.round(chronic), acwr: parseFloat(result.toFixed(2)) };
}

document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.gauge-display');
    if (container) {
        // Робимо Canvas трохи вищим, щоб влізли цифри під стрілкою
        container.innerHTML = '<canvas id="gaugeCanvas" width="300" height="200"></canvas>';
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

// Функція для графіка
function renderLoadChart(acute, chronic) {
    const ctx = document.getElementById('loadChart');
    if (!ctx) return;
    if (window.myLoadChart) window.myLoadChart.destroy();
    window.myLoadChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Today'],
            datasets: [
                { label: 'Acute', data: [acute*0.7, acute*0.9, acute*1.1, acute], borderColor: '#DA3E52', tension: 0.4 },
                { label: 'Chronic', data: [chronic, chronic, chronic, chronic], borderColor: '#4CAF50', tension: 0.4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, animation: false }
    });
}
