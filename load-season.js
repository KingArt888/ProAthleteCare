let dailyLoadData = [];
let loadChart = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('load-date').valueAsDate = new Date();

    // Слухаємо базу даних Firebase
    db.collection("dailyLoad").orderBy("date", "asc")
    .onSnapshot((snapshot) => {
        dailyLoadData = [];
        snapshot.forEach(doc => dailyLoadData.push(doc.data()));
        updateDashboard();
    });

    // Збереження форми
    document.getElementById('load-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const rpe = document.querySelector('input[name="rpe"]:checked')?.value;
        const duration = parseInt(document.getElementById('load-duration').value);
        
        const entry = {
            date: document.getElementById('load-date').value,
            duration: duration,
            rpe: parseInt(rpe),
            load: duration * parseInt(rpe),
            distance: parseFloat(document.getElementById('load-distance').value) || 0
        };

        try {
            await db.collection("dailyLoad").add(entry);
            document.getElementById('form-status').innerText = "Синхронізовано! ✅";
            e.target.reset();
            document.getElementById('load-date').valueAsDate = new Date();
        } catch (err) {
            document.getElementById('form-status').innerText = "Помилка Firebase ❌";
        }
    });
});

function updateDashboard() {
    if (dailyLoadData.length === 0) return;

    const acwr = calculateACWR();
    
    // Рух стрілки
    const needle = document.getElementById('gauge-needle');
    const valueText = document.getElementById('acwr-value');
    
    // 1.0 ACWR = 0 градусів (центр), 0.0 = -90, 2.0 = +90
    let degrees = (acwr * 90) - 90;
    if (degrees > 95) degrees = 95;
    if (degrees < -95) degrees = -95;

    needle.style.transform = `translateX(-50%) rotate(${degrees}deg)`;
    valueText.innerText = acwr.toFixed(2);

    // Статус
    const st = document.getElementById('acwr-status');
    if (acwr < 0.8) { st.innerText = "Underloading"; st.className = "status-warn"; }
    else if (acwr <= 1.3) { st.innerText = "Safe Zone"; st.className = "status-safe"; }
    else { st.innerText = "High Risk!"; st.className = "status-danger"; }

    renderChart();
}

function calculateACWR() {
    if (dailyLoadData.length < 7) return 1.0;
    const acute = dailyLoadData.slice(-7).reduce((sum, d) => sum + d.load, 0) / 7;
    const chronic = dailyLoadData.slice(-28).reduce((sum, d) => sum + d.load, 0) / 28;
    return chronic > 0 ? (acute / chronic) : 1.0;
}

function renderChart() {
    const ctx = document.getElementById('loadChart').getContext('2d');
    if (loadChart) loadChart.destroy();
    
    const last14 = dailyLoadData.slice(-14);
    loadChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last14.map(d => d.date.split('-').slice(1).join('.')),
            datasets: [{
                label: 'Load',
                data: last14.map(d => d.load),
                borderColor: '#FFD700',
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}
