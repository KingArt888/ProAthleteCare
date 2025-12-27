let dailyLoadData = [];
let loadChart = null;
let distanceChart = null;

document.addEventListener('DOMContentLoaded', () => {
    // Встановлюємо дату
    const dateInput = document.getElementById('load-date');
    if (dateInput) dateInput.valueAsDate = new Date();

    // Підключаємося до вашої бази Firebase
    db.collection("dailyLoad").orderBy("date", "asc")
    .onSnapshot((querySnapshot) => {
        dailyLoadData = [];
        querySnapshot.forEach((doc) => {
            dailyLoadData.push(doc.data());
        });
        updateDashboard(); 
    });

    const form = document.getElementById('load-form');
    if (form) form.addEventListener('submit', handleLoadFormSubmit);
});

function updateDashboard() {
    if (dailyLoadData.length === 0) return;

    const acwr = calculateACWR();
    
    // Оновлюємо текст значення
    document.getElementById('acwr-value').textContent = acwr.toFixed(2);

    // ВИПРАВЛЕНЕ ОБЕРТАННЯ: додано translateX(-50%)
    const needle = document.getElementById('gauge-needle');
    if (needle) {
        let degrees = (acwr * 90) - 90; // Масштабування: 1.0 = 0deg
        if (degrees < -95) degrees = -95;
        if (degrees > 95) degrees = 95;
        needle.style.transform = `translateX(-50%) rotate(${degrees}deg)`;
    }

    updateStatusText(acwr);
    renderCharts(); // Ваші графіки
}

function calculateACWR() {
    if (dailyLoadData.length < 1) return 1.0;
    const acute = dailyLoadData.slice(-7).reduce((s, i) => s + (i.load || 0), 0) / 7;
    const chronic = dailyLoadData.slice(-28).reduce((s, i) => s + (i.load || 0), 0) / 28;
    return chronic > 0 ? (acute / chronic) : 1.0;
}

function updateStatusText(acwr) {
    const statusEl = document.getElementById('acwr-status');
    if (acwr < 0.8) {
        statusEl.textContent = "Underloading";
        statusEl.className = "status-warn";
    } else if (acwr <= 1.3) {
        statusEl.textContent = "Safe Zone (Sweet Spot)";
        statusEl.className = "status-safe";
    } else {
        statusEl.textContent = "High Risk";
        statusEl.className = "status-danger";
    }
}
// ... решта ваших функцій збереження та графіків ...
