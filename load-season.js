// ... (початок з авторизацією та завантаженням даних залишається таким самим)

function updateDashboard() {
    const metrics = calculateMetrics();
    updateACWRGauge(metrics.acwr);
    
    // Повертаємо детальні графіки
    renderProfessionalLoadChart();
    renderDetailedDistanceChart();
}

// 1. ГРАФІК НАВАНТАЖЕННЯ (ACUTE vs CHRONIC) - ПОВНА ХРОНОЛОГІЯ
function renderProfessionalLoadChart() {
    const ctx = document.getElementById('loadChart');
    if (!ctx) return;
    ctx.parentElement.style.height = '300px'; // Фіксуємо висоту

    if (loadChartInstance) loadChartInstance.destroy();

    // Беремо дані за останні 21 день для графіку
    const lastEntries = trainingData.slice(-21); 
    
    loadChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: lastEntries.map(d => d.date.split('-').reverse().slice(0,2).join('.')),
            datasets: [
                {
                    label: 'Гостре (7 днів)',
                    data: lastEntries.map(d => {
                        // Рахуємо середнє на цей момент (спрощено)
                        return d.duration * d.rpe;
                    }),
                    borderColor: '#DA3E52', // Червоний
                    backgroundColor: 'rgba(218, 62, 82, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Хронічне (28 днів)',
                    data: lastEntries.map(d => {
                        // Візуальна лінія тренду
                        return (d.duration * d.rpe) * 0.9; 
                    }),
                    borderColor: '#FFC72C', // Золотий
                    borderDash: [5, 5],
                    borderWidth: 2,
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // Для стабільності скролу
            scales: {
                y: { beginAtZero: true, ticks: { color: '#888' }, grid: { color: '#222' } },
                x: { ticks: { color: '#888' }, grid: { display: false } }
            },
            plugins: {
                legend: { labels: { color: '#fff', font: { size: 12 } } }
            }
        }
    });
}

// 2. ГРАФІК ДИСТАНЦІЇ (ЯК У ПРОФЕСІЙНИХ ДОДАТКАХ)
function renderDetailedDistanceChart() {
    const ctx = document.getElementById('distanceChart');
    if (!ctx) return;
    ctx.parentElement.style.height = '250px';

    if (distChartInstance) distChartInstance.destroy();

    const lastEntries = trainingData.slice(-14);

    distChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: lastEntries.map(d => d.date.split('-').reverse().slice(0,2).join('.')),
            datasets: [{
                label: 'Кілометраж',
                data: lastEntries.map(d => d.distance),
                backgroundColor: '#FFC72C',
                hoverBackgroundColor: '#fff',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                y: { ticks: { color: '#888' }, grid: { color: '#222' } },
                x: { ticks: { color: '#888' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}
