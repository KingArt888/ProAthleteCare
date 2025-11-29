// ФУНКЦІЇ ДЛЯ LOAD SEASON (load-season.js)
// ==========================================================

let loadData = []; // Початкові дані будуть заповнені тестовими або з localStorage
let currentRollingChart = null;
let currentWeeklyChart = null;
let currentGaugeChart = null; // 👈 НОВА ЗМІННА ДЛЯ СПІДОМЕТРА

// Тестові дані, що імітують 28 днів S-RPE Load
// Це дозволить ACWR одразу працювати при першому запуску
const TEST_LOAD_HISTORY = [
    // День 1 (Сьогодні-1) до День 28 (Сьогодні-28). Load = Duration * RPE
    100, 300, 400, 0, 500, 450, 0, // Тиждень 1 (1750 AU)
    600, 750, 700, 0, 550, 650, 0, // Тиждень 2 (3250 AU)
    450, 600, 500, 0, 400, 500, 0, // Тиждень 3 (2450 AU)
    400, 500, 450, 0, 300, 400, 0  // Тиждень 4 (2050 AU)
];

// Функція-хелпер для отримання поточної дати у форматі YYYY-MM-DD
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

// Хелпер для отримання початку тижня (Понеділок)
function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(d.setDate(diff));
    return startOfWeek.toISOString().split('T')[0];
}

// ==========================================================
// ЛОГІКА ЗБЕРЕЖЕННЯ ТА ІНІЦІАЛІЗАЦІЯ ДАНИХ
// ==========================================================

function loadInitialData() {
    const storedData = JSON.parse(localStorage.getItem('athleteLoadData'));

    if (storedData && storedData.length > 0) {
        loadData = storedData;
    } else {
        // Якщо немає збережених даних, генеруємо тестові дані за останні 28 днів
        loadData = generateTestData(TEST_LOAD_HISTORY);
        saveLoadData(); // Зберігаємо тестові дані для першого запуску
    }
}

function generateTestData(loads) {
    const today = new Date();
    const data = [];

    for (let i = 0; i < loads.length; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (loads.length - 1) + i); // Забезпечуємо 28 послідовних днів
        
        const internalLoad = loads[i];
        
        // Генеруємо RPE і Duration, щоб InternalLoad був приблизно правильним
        let rpe = 5;
        let duration = internalLoad / rpe;
        
        if (internalLoad === 0) {
            rpe = 1;
            duration = 0;
        } else if (duration < 10 && internalLoad > 0) { // Якщо InternalLoad є, але Duration занадто малий, збільшуємо RPE
             rpe = 8;
             duration = internalLoad / rpe;
        }

        data.push({
            date: date.toISOString().split('T')[0],
            duration: Math.round(duration),
            rpe: Math.round(rpe),
            distance: (Math.random() * 5).toFixed(1) * (internalLoad > 0 ? 1 : 0),
            internalLoad: internalLoad
        });
    }
    return data;
}

function saveLoadData() {
    loadData.sort((a, b) => new Date(a.date) - new Date(b.date));
    localStorage.setItem('athleteLoadData', JSON.stringify(loadData));
    calculateAndDisplayLoads();
}

// ----------------------------------------------------------
// ЛОГІКА ФОРМИ (Daily Input)
// ----------------------------------------------------------
function setupLoadForm() {
    const loadForm = document.getElementById('load-form');
    const loadDateInput = document.getElementById('load-date');
    
    if (!loadForm) return;

    loadDateInput.value = getTodayDateString();

    loadForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const date = loadDateInput.value;
        const duration = parseInt(document.getElementById('load-duration').value);
        const distance = parseFloat(document.getElementById('load-distance').value);
        
        // 🚨 ВИПРАВЛЕННЯ RPE: Перевірка та отримання значення
        const rpeEl = document.querySelector('input[name="rpe"]:checked');
        
        if (!rpeEl) {
             alert("Будь ласка, виберіть суб'єктивне навантаження (RPE) від 1 до 10.");
             return;
        }
        const rpe = parseInt(rpeEl.value);
        
        const internalLoad = duration * rpe;

        const existingIndex = loadData.findIndex(d => d.date === date);

        const newEntry = {
            date: date,
            duration: duration,
            rpe: rpe,
            distance: distance,
            internalLoad: internalLoad 
        };

        if (existingIndex !== -1) {
            loadData[existingIndex] = newEntry;
            alert(`Дані за ${date} оновлено. Internal Load: ${internalLoad} AU.`);
        } else {
            loadData.push(newEntry);
            alert(`Дані за ${date} збережено. Internal Load: ${internalLoad} AU.`);
        }

        saveLoadData();
        // Залишаємо форму заповненою поточною датою для подальшого введення
        document.getElementById('load-duration').value = 60;
        document.getElementById('load-distance').value = 0.0;
        // Скидаємо вибір RPE (або залишаємо на 1)
        document.getElementById('rpe1').checked = true;
    });
}

// ==========================================================
// ОСНОВНА ЛОГІКА РОЗРАХУНКІВ НАВАНТАЖЕННЯ (Internal Load - AU)
// ==========================================================

function calculateAndDisplayLoads() {
    const today = getTodayDateString();
    const validData = loadData.filter(d => new Date(d.date) <= new Date(today));
    
    // 1. РОЗРАХУНОК ACWR (Rolling 7-day та 28-day)
    const rollingMetrics = calculateRollingMetrics(validData);
    
    // 2. РОЗРАХУНОК ТИЖНЕВИХ СУМ (Weekly Totals)
    const weeklyMetrics = calculateWeeklyMetrics(validData);

    // 3. ВІДОБРАЖЕННЯ
    displayACWR(rollingMetrics.acwrLatest, rollingMetrics.acuteLatest, rollingMetrics.chronicLatest);
    
    // 💡 НОВА ЛОГІКА СПІДОМЕТРА
    if (rollingMetrics.acwrLatest) {
        const acwrValue = parseFloat(rollingMetrics.acwrLatest);
        const gaugeData = getAcwrGaugeData(acwrValue);
        renderGaugeChart(gaugeData);
        // Оновлюємо також колір ACWR-значення
        const acwrEl = document.getElementById('acwr-value');
        if(acwrEl) acwrEl.style.color = gaugeData.pointerColor;
    } else {
        // Очищаємо спідометр, якщо немає даних
        const ctx = document.getElementById('acwrGaugeChart');
        if (currentGaugeChart) currentGaugeChart.destroy();
        const acwrEl = document.getElementById('acwr-value');
        if(acwrEl) acwrEl.textContent = 'N/A';
    }
    
    renderRollingLoadChart(rollingMetrics.chartData);
    renderWeeklyLoadChart(weeklyMetrics);
}

function calculateRollingMetrics(data) {
    const rollingData = [];
    const internalLoads = data.map(d => ({ date: d.date, load: d.internalLoad }));
    
    let acwrLatest = null;
    let acuteLatest = 0;
    let chronicLatest = 0;

    // Починаємо розрахунок, коли є 28 днів даних
    if (internalLoads.length < 28) {
        return { chartData: [], acwrLatest: null, acuteLatest: 0, chronicLatest: 0 };
    }

    for (let i = 27; i < internalLoads.length; i++) {
        const currentDate = internalLoads[i].date;
        
        // Acute (7 днів) - Включаючи поточний день (i - 6 до i)
        const acuteSlice = internalLoads.slice(i - 6, i + 1);
        const acuteSum = acuteSlice.reduce((sum, item) => sum + item.load, 0);
        const acuteLoad = acuteSum / 7; // Середньоденне Acute

        // Chronic (28 днів) - Включаючи поточний день (i - 27 до i)
        const chronicSlice = internalLoads.slice(i - 27, i + 1);
        const chronicSum = chronicSlice.reduce((sum, item) => sum + item.load, 0);
        const chronicLoad = chronicSum / 28; // Середньоденне Chronic

        const acwr = chronicLoad > 0 ? (acuteLoad / chronicLoad) : 0;
        
        // Переводимо Acute і Chronic у тижневі суми для відображення
        const acuteWeeklySum = acuteLoad * 7;
        const chronicWeeklySum = chronicLoad * 7;

        rollingData.push({
            date: currentDate,
            acute: acuteWeeklySum.toFixed(0),
            chronic: chronicWeeklySum.toFixed(0),
            acwr: acwr.toFixed(2)
        });
        
        // Останні значення
        if (i === internalLoads.length - 1) {
            acwrLatest = acwr.toFixed(2);
            acuteLatest = acuteWeeklySum.toFixed(0);
            chronicLatest = chronicWeeklySum.toFixed(0);
        }
    }

    return { 
        chartData: rollingData,
        acwrLatest: acwrLatest,
        acuteLatest: acuteLatest,
        chronicLatest: chronicLatest
    };
}

function calculateWeeklyMetrics(data) {
    const weeklyTotals = {};
    data.forEach(d => {
        const startOfWeek = getStartOfWeek(d.date);
        
        if (!weeklyTotals[startOfWeek]) {
            weeklyTotals[startOfWeek] = { 
                internalLoad: 0,
                distance: 0
            };
        }
        weeklyTotals[startOfWeek].internalLoad += d.internalLoad;
        weeklyTotals[startOfWeek].distance += d.distance;
    });
    
    const chartData = Object.keys(weeklyTotals).map(date => ({
        weekStart: date,
        internalLoad: weeklyTotals[date].internalLoad,
        distance: weeklyTotals[date].distance
    })).sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
    
    return chartData;
}


// ----------------------------------------------------------
// ФУНКЦІЇ СПІДОМЕТРА (GAUGE CHART) 💡 НОВИЙ БЛОК
// ----------------------------------------------------------

// Функція, яка готує дані та кольори для спідометра
function getAcwrGaugeData(acwr) {
    const zones = [0.0, 0.8, 1.3, 1.5, 2.0];
    const colors = ['#00BFFF', '#50C878', '#FFC72C', '#DA3E52']; // Низький, Оптимальний, Високий, Критичний
    
    let pointerValue = acwr;
    let pointerColor = '#CCCCCC';

    // Обмеження значення для відображення
    if (pointerValue > 2.0) {
        pointerValue = 2.0;
        pointerColor = '#DA3E52';
    } else if (pointerValue < 0) {
        pointerValue = 0;
    }

    // Визначаємо колір стрілки (за ACWR)
    if (acwr > 1.5) {
        pointerColor = '#DA3E52'; 
    } else if (acwr > 1.3) {
        pointerColor = '#FFC72C'; 
    } else if (acwr >= 0.8) {
        pointerColor = '#50C878'; 
    } else { 
        pointerColor = '#00BFFF';
    }

    // Нам потрібні три набори даних для Chart.js:
    // Сектори: [0.8, 1.3-0.8, 1.5-1.3, 2.0-1.5]
    const dataSet = [zones[1], zones[2] - zones[1], zones[3] - zones[2], zones[4] - zones[3]];
    
    return {
        data: dataSet,
        colors: colors,
        pointer: pointerValue,
        pointerColor: pointerColor
    };
}

// Функція для малювання спідометра
function renderGaugeChart(gaugeData) {
    const ctx = document.getElementById('acwrGaugeChart');
    if (!ctx) return;
    if (currentGaugeChart) currentGaugeChart.destroy();
    
    // Готуємо дані для відображення стрілки
    const maxVal = 2.0;
    const value = gaugeData.pointer;
    // 270 - 90 = 180 градусів (півколо). 270 (початок) + (180 * (value/max))
    const angle = (value / maxVal) * 180;
    
    // Реєструємо плагін для відображення стрілки
    const gaugePointer = {
        id: 'gaugePointer',
        afterDatasetsDraw(chart, args, options) {
            const { ctx, chartArea: { left, right, bottom } } = chart;
            const xCenter = (left + right) / 2;
            const yCenter = bottom; 
            
            ctx.save();
            
            // 1. Малюємо центр (коло)
            ctx.beginPath();
            ctx.arc(xCenter, yCenter, 8, 0, 2 * Math.PI);
            ctx.fillStyle = gaugeData.pointerColor;
            ctx.fill();
            
            // 2. Малюємо стрілку
            ctx.translate(xCenter, yCenter);
            ctx.rotate(Math.PI + (angle * Math.PI / 180)); // Повертаємо на 180 + кут
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -60); // Довжина стрілки
            ctx.lineWidth = 3;
            ctx.strokeStyle = gaugeData.pointerColor;
            ctx.lineCap = 'round';
            ctx.stroke();
            
            ctx.restore();
        }
    };
    
    currentGaugeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: gaugeData.data,
                backgroundColor: gaugeData.colors,
                borderWidth: 0,
                circumference: 180, 
                rotation: 270,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '60%', 
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
            },
            layout: {
                padding: {
                    bottom: 10 // Додатковий відступ знизу
                }
            }
        },
        plugins: [gaugePointer] 
    });
}

// ----------------------------------------------------------
// ФУНКЦІЇ ВІДОБРАЖЕННЯ
// ----------------------------------------------------------

function displayACWR(acwrValue, acuteLoad, chronicLoad) {
    const valueEl = document.getElementById('acwr-value');
    const statusEl = document.getElementById('acwr-status');
    const acuteEl = document.getElementById('acute-workload');
    const chronicEl = document.getElementById('chronic-workload');
    
    if (!statusEl || !valueEl || !acuteEl || !chronicEl) return;

    // Скидання, якщо даних недостатньо
    if (!acwrValue) {
        valueEl.textContent = 'N/A';
        statusEl.textContent = 'ПОТРІБНО > 28 ДНІВ ДАНИХ';
        statusEl.style.backgroundColor = '#2c2c2c';
        statusEl.style.color = '#FFC72C';
        acuteEl.textContent = 'Гостре (7 дн.): N/A';
        chronicEl.textContent = 'Хронічне (28 дн.): N/A';
        return;
    }

    const acwr = parseFloat(acwrValue);
    let riskStatus = '';
    let bgColor = '';
    let textColor = '#000000'; // Чорний текст для контрасту

    if (acwr > 1.5) {
        riskStatus = 'КРИТИЧНИЙ РИЗИК 🚨';
        bgColor = '#DA3E52'; 
    } else if (acwr > 1.3) {
        riskStatus = 'ВИСОКИЙ РИЗИК 🔥';
        bgColor = '#FFC72C'; 
    } else if (acwr >= 0.8 && acwr <= 1.3) {
        riskStatus = 'ОПТИМАЛЬНО ✅';
        bgColor = '#50C878'; 
    } else { // ACWR < 0.8
        riskStatus = 'НИЗЬКИЙ СТИМУЛ 📉';
        bgColor = '#00BFFF';
        textColor = '#000000'; // Синій колір для тексту (або чорний, якщо фон світлий)
    }

    valueEl.textContent = acwrValue;
    // Колір значення буде встановлено через renderGaugeChart
    statusEl.textContent = riskStatus;
    statusEl.style.backgroundColor = bgColor;
    statusEl.style.color = textColor; 
    acuteEl.textContent = `Гостре (7 дн.): ${acuteLoad} AU`;
    chronicEl.textContent = `Хронічне (28 дн.): ${chronicLoad} AU`;
}

// ----------------------------------------------------------
// ФУНКЦІЇ ГРАФІКІВ (Chart.js)
// ----------------------------------------------------------

function renderRollingLoadChart(rollingData) {
    const ctx = document.getElementById('rollingLoadChart');
    if (!ctx) return;
    if (currentRollingChart) currentRollingChart.destroy();

    if (rollingData.length === 0) {
        ctx.style.display = 'none';
        ctx.parentNode.querySelector('h3').insertAdjacentHTML('afterend', '<p class="placeholder-text">Потрібно 28 днів даних для відображення ролінгу.</p>');
        return;
    }
    
    ctx.style.display = 'block';
    
    // ... (Your rolling load chart implementation) ...
    const labels = rollingData.map(d => d.date);
    const acuteData = rollingData.map(d => d.acute);
    const chronicData = rollingData.map(d => d.chronic);
    const acwrData = rollingData.map(d => d.acwr);

    currentRollingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Гостре навантаження (7-Day Sum)',
                    data: acuteData,
                    borderColor: '#DA3E52',
                    backgroundColor: 'rgba(218, 62, 82, 0.2)',
                    fill: false,
                    tension: 0.2,
                    yAxisID: 'y'
                },
                {
                    label: 'Хронічне навантаження (28-Day Avg * 7)',
                    data: chronicData,
                    borderColor: '#00BFFF',
                    backgroundColor: 'rgba(0, 191, 255, 0.2)',
                    fill: false,
                    tension: 0.2,
                    yAxisID: 'y'
                },
                {
                    label: 'ACWR',
                    data: acwrData,
                    borderColor: '#FFC72C',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'acwr'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: false },
                legend: { labels: { color: '#CCCCCC' } },
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            yMin: 1.3,
                            yMax: 1.3,
                            borderColor: '#FFC72C',
                            borderWidth: 1,
                            borderDash: [6, 6],
                            yAxisID: 'acwr'
                        },
                        line2: {
                            type: 'line',
                            yMin: 0.8,
                            yMax: 0.8,
                            borderColor: '#50C878',
                            borderWidth: 1,
                            borderDash: [6, 6],
                            yAxisID: 'acwr'
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#CCCCCC' }, grid: { color: '#333333' } },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Тижневе Навантаження (AU)', color: '#CCCCCC' },
                    ticks: { color: '#CCCCCC' },
                    grid: { color: '#333333' }
                },
                acwr: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'ACWR', color: '#FFC72C' },
                    ticks: { color: '#FFC72C' },
                    grid: { drawOnChartArea: false }, 
                    min: 0,
                    max: 2.0
                }
            }
        }
    });
}

function renderWeeklyLoadChart(weeklyData) {
    const ctx = document.getElementById('weeklyLoadChart');
    if (!ctx) return;
    if (currentWeeklyChart) currentWeeklyChart.destroy();

    if (weeklyData.length === 0) {
        ctx.style.display = 'none';
        ctx.parentNode.querySelector('h3').insertAdjacentHTML('afterend', '<p class="placeholder-text">Введіть дані, щоб побачити тижневі підсумки.</p>');
        return;
    }
    
    ctx.style.display = 'block';

    const labels = weeklyData.map(d => `Тиждень від ${d.weekStart}`);
    const loadData = weeklyData.map(d => d.internalLoad);
    const distanceData = weeklyData.map(d => d.distance);
    
    currentWeeklyChart = new Chart(ctx, {
        type: 'line', // 💡 Змінено на LINE
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Тижневе Internal Load (AU)',
                    data: loadData,
                    borderColor: '#00BFFF',
                    backgroundColor: 'rgba(0, 191, 255, 0.3)',
                    fill: 'origin', // Заповнення під лінією
                    tension: 0.3, // Плавні підйоми та спади
                    yAxisID: 'load'
                },
                {
                    label: 'Тижнева Дистанція (км)',
                    data: distanceData,
                    borderColor: '#FFC72C',
                    fill: false,
                    tension: 0.3,
                    yAxisID: 'distance'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: false },
                legend: { labels: { color: '#CCCCCC' } }
            },
            scales: {
                x: { ticks: { color: '#CCCCCC' }, grid: { color: '#333333' } },
                load: {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'Навантаження (AU)', color: '#CCCCCC' },
                    ticks: { color: '#CCCCCC' },
                    grid: { color: '#333333' }
                },
                distance: {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'Дистанція (км)', color: '#FFC72C' },
                    ticks: { color: '#FFC72C' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}


// Запуск ініціалізації при завантаженні
document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();
    setupLoadForm();
    // Викликаємо розрахунок після завантаження даних
    calculateAndDisplayLoads(); 
});
