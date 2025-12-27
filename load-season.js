let dailyLoadData = [];
let loadChart = null;
let distanceChart = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Встановлюємо дату
    const dateInput = document.getElementById('load-date');
    if (dateInput) dateInput.valueAsDate = new Date();

    // 2. Підключаємося до Firebase (версія compat, яку ви вставили в HTML)
    db.collection("dailyLoad").orderBy("date", "asc")
    .onSnapshot((querySnapshot) => {
        dailyLoadData = [];
        querySnapshot.forEach((doc) => {
            dailyLoadData.push(doc.data());
        });
        updateDashboard(); 
    }, (error) => {
        console.error("Firebase Error:", error);
    });

    // 3. Обробка форми
    const form = document.getElementById('load-form');
    if (form) form.addEventListener('submit', handleLoadFormSubmit);
});

// Функція оновлення всього екрану
function updateDashboard() {
    if (dailyLoadData.length === 0) return;

    const acwr = calculateACWR();
    
    // Оновлюємо текст значення
    document.getElementById('acwr-value').textContent = acwr.toFixed(2);

    // ВІШАЄМО ОБЕРТАННЯ НА ВАШУ СТРІЛКУ
    rotateGauge(acwr);

    // Оновлюємо статус
    updateStatusText(acwr);

    // Оновлюємо ваші графіки
    renderCharts();
}

function calculateACWR() {
    if (dailyLoadData.length < 1) return 1.0;
    const acute = dailyLoadData.slice(-7).reduce((s, i) => s + (i.load || 0), 0) / 7;
    const chronic = dailyLoadData.slice(-28).reduce((s, i) => s + (i.load || 0), 0) / 28;
    return chronic > 0 ? (acute / chronic) : 1.0;
}

// ВИПРАВЛЕНА ФУНКЦІЯ СТРІЛКИ
function rotateGauge(acwr) {
    const needle = document.getElementById('gauge-needle');
    if (!needle) return;

    // 0.0 ACWR = -90deg (ліво)
    // 1.0 ACWR = 0deg (центр)
    // 2.0 ACWR = 90deg (право)
    let degrees = (acwr * 90) - 90;

    // Обмежувачі для безпеки
    if (degrees < -95) degrees = -95;
    if (degrees > 95) degrees = 95;

    // Зберігаємо ваш translateX(-50%), щоб стрілка не злітала з осі
    needle.style.transform = `translateX(-50%) rotate(${degrees}deg)`;
}

function updateStatusText(acwr) {
    const statusEl = document.getElementById('acwr-status');
    if (acwr < 0.8) {
        statusEl.textContent = "Underloading";
        statusEl.className = "status-warn";
    } else if (acwr <= 1.3) {
        statusEl.textContent = "Safe Zone";
        statusEl.className = "status-safe";
    } else {
        statusEl.textContent = "High Risk";
        statusEl.className = "status-danger";
    }
}

async function handleLoadFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const rpe = document.querySelector('input[name="rpe"]:checked')?.value;
    
    if (!rpe) {
        alert("Оберіть RPE!");
        return;
    }

    const duration = parseInt(form.elements['duration'].value);
    const entry = {
        date: form.elements['date'].value,
        duration: duration,
        distance: parseFloat(form.elements['distance'].value),
        rpe: parseInt(rpe),
        load: duration * parseInt(rpe)
    };

    await db.collection("dailyLoad").add(entry);
    form.reset();
    document.getElementById('load-date').valueAsDate = new Date();
}

// Рендеринг графіків (використовуємо ваш Chart.js)
function renderCharts() {
    // Тут ваш існуючий код рендерингу графіків (loadChart та distanceChart)
    // ...
}
