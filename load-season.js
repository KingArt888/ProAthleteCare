// load-season.js
document.addEventListener('DOMContentLoaded', initLoadControl);

function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

function initLoadControl() {
    if (typeof Chart === 'undefined') {
        console.error("Chart.js не завантажено.");
        return;
    }
    
    // --- КОНСТАНТИ ACWR ---
    const STORAGE_KEY = 'proathletecare_load_data';
    const ACWR_OPTIMAL_MIN = 0.8;
    const ACWR_OPTIMAL_MAX = 1.3;
    const ACWR_HIGH_RISK = 1.5;
    const ACWR_LOW_RISK = 0.5;

    // --- ЕЛЕМЕНТИ DOM ---
    const loadForm = document.getElementById('load-form');
    const submitLoadBtn = document.getElementById('submit-load-btn');
    const acwrRpeValue = document.getElementById('acwr-rpe-value');
    const riskStatusCard = document.getElementById('risk-status-card');
    const acwrRpeTrendIcon = document.getElementById('acwr-rpe-trend-icon');

    // --- Екземпляри графіків ---
    let acwrChartInstance;
    let miniLoadTrendChartInstance;
    let loadTrendChartInstance;
    let distanceChartInstance;

    // Встановлюємо сьогоднішню дату
    document.getElementById('load-date').value = getTodayDateString();

    // --- ФУНКЦІЇ ЗБЕРІГАННЯ ДАНИХ ---
    function loadData() {
        try {
            const json = localStorage.getItem(STORAGE_KEY);
            return json ? JSON.parse(json).sort((a, b) => new Date(a.date) - new Date(b.date)) : [];
        } catch (e) {
            console.error("Помилка завантаження даних:", e);
            return [];
        }
    }

    function saveData(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    // --- ФУНКЦІЯ РОЗРАХУНКУ ACWR ---
    function calculateACWR(data, type = 'rpe') {
        const results = [];
        if (data.length === 0) return results;

        const loadMap = new Map();
        data.forEach(d => {
            let loadValue = 0;
            // Session-RPE
            if (type === 'rpe' && d.duration && d.rpe) {
                loadValue = d.duration * d.rpe; 
            // Дистанція
            } else if (type === 'distance' && d.distance) {
                loadValue = d.distance; 
            }
            loadMap.set(d.date, loadValue);
        });

        const sortedDates = data.map(d => new Date(d.date)).sort((a, b) => a - b);
        if (sortedDates.length === 0) return results;

        const endDate = new Date();
        const effectiveStartDate = new Date(sortedDates[0]);
        effectiveStartDate.setDate(effectiveStartDate.getDate() - 27);

        let current = effectiveStartDate;

        while (current <= endDate) {
            const currentDateStr = current.toISOString().split('T')[0];
            
            let acuteLoadSum = 0;
            for (let i = 0; i < 7; i++) {
                const date = new Date(current);
                date.setDate(current.getDate() - i);
                acuteLoadSum += (loadMap.get(date.toISOString().split('T')[0]) || 0);
            }
            const acute = acuteLoadSum;

            let chronicLoadSum = 0;
            for (let i = 0; i < 28; i++) {
                const date = new Date(current);
                date.setDate(current.getDate() - i);
                chronicLoadSum += (loadMap.get(date.toISOString().split('T')[0]) || 0);
            }
            const chronicAvg = chronicLoadSum / 28;
            
            let acwr = null;
            if (chronicAvg > 0) {
                acwr = acute / chronicAvg;
            }

            if (current >= sortedDates[0]) {
                 results.push({
                    date: currentDateStr,
                    acwr: acwr,
                    acute: acute,
                    chronic: chronicAvg * 7, // Хронічне за 7 днів
                    dailyLoad: (loadMap.get(currentDateStr) || 0)
                });
            }
            current.setDate(current.getDate() + 1);
        }
        return results;
    }

    // --- ОБРОБКА ФОРМИ ---
    if (loadForm) {
        loadForm.addEventListener('submit', function(e) {
            e.preventDefault();

            if (!document.querySelector('input[name="rpe"]:checked')) {
                alert('Будь ласка, оберіть суб’єктивне навантаження (RPE) від 1 до 10.');
                return;
            }

            const data = new FormData(loadForm);
            const date = data.get('date');
            const duration = parseInt(data.get('duration'));
            const distance = parseInt(data.get('distance')) || 0; 
            const rpe = parseInt(document.querySelector('input[name="rpe"]:checked').value);

            const allData = loadData();
            const newDataEntry = { date, duration, distance, rpe };

            const existingIndex = allData.findIndex(item => item.date === date);
            if (existingIndex !== -1) {
                if (!confirm(`Дані за ${date} вже існують. Ви хочете їх оновити?`)) {
                    return;
                }
                allData[existingIndex] = newDataEntry;
            } else {
                allData.push(newDataEntry);
            }
            
            saveData(allData);
            alert('Дані про тренування успішно зафіксовано!');
            
            loadForm.reset();
            document.getElementById('load-date').value = getTodayDateString(); 
            updateDashboard();
        });
    }

    // --- ОНОВЛЕННЯ ДАШБОРДУ ТА ГРАФІКІВ ---
    function updateDashboard() {
        const allData = loadData();
        
        if (allData.length < 7) { 
            acwrRpeValue.textContent = "N/A";
            acwrRpeValue.style.color = '#CCCCCC';
            riskStatusCard.className = 'status-grey';
            riskStatusCard.innerHTML = `<p style="font-size: 1.1em; font-weight: bold; margin: 0;">Збір даних</p><p style="font-size: 0.8em; margin: 5px 0 0 0;">(Потрібно >7 дн. для ACWR)</p>`;
            if (acwrChartInstance) acwrChartInstance.destroy();
            if (loadTrendChartInstance) loadTrendChartInstance.destroy();
            if (distanceChartInstance) distanceChartInstance.destroy();
            if (miniLoadTrendChartInstance) miniLoadTrendChartInstance.destroy();
            return;
        }

        const acwrRpeResults = calculateACWR(allData, 'rpe');
        const acwrDistanceResults = calculateACWR(allData, 'distance');

        const latestRpeResult = acwrRpeResults[acwrRpeResults.length - 1];
        let latestACWR = null;
        
        if (latestRpeResult && latestRpeResult.acwr !== null) {
            latestACWR = parseFloat(latestRpeResult.acwr.toFixed(2));
            acwrRpeValue.textContent = latestACWR;
            
            let statusText = '';
            let statusClass = '';
            let valueColor = '';

            // Визначення ризику
            if (latestACWR >= ACWR_HIGH_RISK) {
                statusText = 'Високий Ризик';
                statusClass = 'status-danger';
                valueColor = '#DA3E52'; 
            } else if (latestACWR >= ACWR_OPTIMAL_MAX) {
                statusText = 'Увага (Підвищ.)';
                statusClass = 'status-warning';
                valueColor = '#FF9800'; 
            } else if (latestACWR >= ACWR_OPTIMAL_MIN) {
                statusText = 'Оптимальна Зона';
                statusClass = 'status-optimal';
                valueColor = '#4CAF50'; 
            } else if (latestACWR >= ACWR_LOW_RISK) {
                statusText = 'Увага (Зниж.)';
                statusClass = 'status-warning';
                valueColor = '#FF9800'; 
            } else {
                statusText = 'Низький Обсяг';
                statusClass = 'status-danger';
                valueColor = '#DA3E52';
            }

            acwrRpeValue.style.color = valueColor;
            
            // Визначення тренду
            let trendIcon = '';
            let trendColor = '';
            if (acwrRpeResults.length > 1) {
                const prevACWR = acwrRpeResults[acwrRpeResults.length - 2].acwr || latestACWR; 
                if (latestACWR > prevACWR) {
                    trendIcon = '▲ Зростання';
                    trendColor = '#DA3E52'; 
                } else if (latestACWR < prevACWR) {
                    trendIcon = '▼ Зниження';
                    trendColor = '#4CAF50'; 
                } else {
                    trendIcon = '— Стабільність';
                    trendColor = '#CCCCCC';
                }
            }
            
            riskStatusCard.className = statusClass;
            riskStatusCard.innerHTML = `<p style="font-size: 1.1em; font-weight: bold; margin: 0;">${statusText}</p>
                                        <p style="font-size: 0.8em; margin: 5px 0 0 0;">(0.8 — 1.3)</p>`;
            acwrRpeTrendIcon.innerHTML = `<span style="color: ${trendColor};">${trendIcon}</span>`;
        } 

        // Рендер графіків
        renderACWRChart(acwrRpeResults);
        renderMiniLoadTrendChart(acwrRpeResults);
        renderLoadTrendChart(acwrRpeResults);
        renderDistanceChart(acwrDistanceResults);
    }

    // --- БАЗОВІ НАЛАШТУВАННЯ ГРАФІКІВ (Темна Тема) ---
    const baseChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: '#BBBBBB' } },
            tooltip: { backgroundColor: 'rgba(30, 30, 30, 0.9)', titleColor: '#FFC72C', bodyColor: '#CCCCCC', borderColor: '#444', borderWidth: 1 }
        },
        scales: {
            x: { grid: { color: '#333333' }, ticks: { color: '#BBBBBB' } },
            y: { grid: { color: '#333333' }, ticks: { color: '#BBBBBB' } }
        }
    };

    // --- 3.1. ACWR Chart (Графік Динаміки Ризику) ---
    function renderACWRChart(results) {
        const ctx = document.getElementById('acwrChart');
        if (!ctx) return;
        if (acwrChartInstance) acwrChartInstance.destroy();

        const filteredResults = results.slice(-60); // Останні 60 днів
        const labels = filteredResults.map(r => r.date.slice(5)); 
        const acwrData = filteredResults.map(r => r.acwr);

        const data = {
            labels: labels,
            datasets: [{
                label: 'ACWR (Співвідношення)',
                data: acwrData,
                borderColor: '#FFC72C', 
                backgroundColor: 'rgba(255, 199, 44, 0.2)',
                tension: 0.3,
                fill: false,
                yAxisID: 'yACWR',
                borderWidth: 2,
            }]
        };

        const config = {
            type: 'line',
            data: data,
            options: {
                ...baseChartOptions,
                scales: {
                    x: baseChartOptions.scales.x,
                    yACWR: { 
                        type: 'linear',
                        position: 'left',
                        min: 0,
                        max: 2.0,
                        ticks: { ...baseChartOptions.scales.y.ticks, stepSize: 0.2 },
                        title: { display: true, text: 'ACWR', color: '#BBBBBB' },
                        grid: baseChartOptions.scales.y.grid
                    }
                },
                plugins: {
                    ...baseChartOptions.plugins,
                    annotation: {
                        annotations: {
                            // Зелена зона
                            safeZone: { type: 'box', yMin: ACWR_OPTIMAL_MIN, yMax: ACWR_OPTIMAL_MAX, backgroundColor: 'rgba(76, 175, 80, 0.2)', scaleID: 'yACWR' },
                            // Червона зона (Високий ризик)
                            highRiskZone: { type: 'box', yMin: ACWR_HIGH_RISK, yMax: 2.0, backgroundColor: 'rgba(218, 62, 82, 0.2)', scaleID: 'yACWR' },
                            // Жовта зона (Низький обсяг)
                            lowRiskZone: { type: 'box', yMin: 0.0, yMax: ACWR_OPTIMAL_MIN, backgroundColor: 'rgba(255, 152, 0, 0.2)', scaleID: 'yACWR' },
                        }
                    }
                }
            }
        };

        acwrChartInstance = new Chart(ctx, config);
    }
    
    // --- 3.2. Mini Load Trend Chart (Графік на картці статусу, як на image_633520.jpg) ---
    function renderMiniLoadTrendChart(results) {
        const ctx = document.getElementById('miniLoadTrendChart');
        if (!ctx) return;
        
        if (miniLoadTrendChartInstance) miniLoadTrendChartInstance.destroy();

        const filteredResults = results.slice(-14); 
        const dailyLoad = filteredResults.map(r => r.dailyLoad); 

        const data = {
            labels: filteredResults.map(r => r.date.slice(5)),
            datasets: [{
                data: dailyLoad,
                borderColor: '#4CAF50',
                backgroundColor: 'transparent',
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2
            }]
        };

        const config = {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                    x: { display: false, grid: { display: false } },
                    y: { display: false, grid: { display: false }, min: 0 }
                },
            }
        };

        miniLoadTrendChartInstance = new Chart(ctx, config);
    }


    // --- 3.3. Load Trend Chart (Комбінований графік, як на image_639602.png) ---
    function renderLoadTrendChart(results) {
        const ctx = document.getElementById('loadTrendChart');
        if (!ctx) return;
        if (loadTrendChartInstance) loadTrendChartInstance.destroy();

        // Спрощений підрахунок тижневих даних 
        const weeklyDataMap = {};
        
        results.forEach(r => {
            const date = new Date(r.date);
            const dayOfWeek = (date.getDay() + 6) % 7; 
            const startOfWeek = new Date(date);
            startOfWeek.setDate(date.getDate() - dayOfWeek);
            const weekKey = startOfWeek.toISOString().split('T')[0];
            
            if (!weeklyDataMap[weekKey]) {
                weeklyDataMap[weekKey] = { totalLoad: 0, acwrSum: 0, acwrCount: 0, label: `${startOfWeek.getMonth() + 1}/${startOfWeek.getDate()}` };
            }
            if (r.dailyLoad > 0) {
                 weeklyDataMap[weekKey].totalLoad += r.dailyLoad;
            }
            if (r.acwr !== null) {
                weeklyDataMap[weekKey].acwrSum += r.acwr;
                weeklyDataMap[weekKey].acwrCount += 1;
            }
        });
        
        const weeklyResults = Object.values(weeklyDataMap).slice(-12);
        
        const barLabels = weeklyResults.map(w => w.label);
        const barData = weeklyResults.map(w => w.totalLoad); 
        const lineData = weeklyResults.map(w => w.acwrCount > 0 ? (w.acwrSum / w.acwrCount) : null);

        function getColorSegment(acwr) {
            if (acwr >= ACWR_HIGH_RISK) return 'rgb(255, 0, 0)'; 
            if (acwr >= ACWR_OPTIMAL_MAX || acwr <= ACWR_OPTIMAL_MIN) return 'rgb(255, 165, 0)'; 
            return 'rgb(69, 179, 114)'; 
        }

        const data = {
            labels: barLabels,
            datasets: [{
                label: 'Тижневе Навантаження',
                data: barData,
                backgroundColor: 'rgba(69, 179, 114, 0.8)', 
                type: 'bar',
                yAxisID: 'yBar',
                borderWidth: 0,
            },
            {
                label: 'Середній ACWR',
                data: lineData,
                borderColor: (context) => {
                    const acwrValue = context.raw;
                    // Для Chart.js V4, використовуємо сегменти для кольору
                    return '#FFC72C'; // Задаємо загальний колір, а сегменти змінять його
                },
                backgroundColor: 'transparent',
                type: 'line',
                yAxisID: 'yLine',
                tension: 0.2,
                pointRadius: 4,
                borderWidth: 3,
                segment: {
                    borderColor: (ctx) => {
                        if (!ctx.p1DataIndex || lineData[ctx.p1DataIndex] === null) return '#FFC72C';
                        return getColorSegment(lineData[ctx.p1DataIndex]);
                    }
                }
            }]
        };

        const config = {
            type: 'bar', 
            data: data,
            options: {
                ...baseChartOptions, 
                scales: {
                    x: baseChartOptions.scales.x,
                    yBar: { 
                        type: 'linear',
                        display: true,
                        position: 'right',
                        min: 0,
                        title: { display: true, text: 'Тижневе Навантаження', color: '#BBBBBB' },
                        grid: { drawOnChartArea: false },
                        ticks: baseChartOptions.scales.y.ticks
                    },
                    yLine: { 
                        type: 'linear',
                        display: true,
                        position: 'left',
                        min: 0,
                        max: 2.0,
                        title: { display: true, text: 'Середній ACWR', color: '#BBBBBB' },
                        ticks: { ...baseChartOptions.scales.y.ticks, stepSize: 0.2 }
                    }
                },
                plugins: {
                    ...baseChartOptions.plugins,
                    annotation: false 
                }
            }
        };

        loadTrendChartInstance = new Chart(ctx, config);
    }
    
    // --- 3.4. Distance Chart (Графік Дистанції) ---
     function renderDistanceChart(results) {
        const ctx = document.getElementById('distanceChart');
        if (!ctx) return;
        if (distanceChartInstance) distanceChartInstance.destroy();

        const filteredResults = results.slice(-60); 
        const labels = filteredResults.map(r => r.date.slice(5)); 
        const dailyDistance = filteredResults.map(r => r.dailyLoad);
        const cumulativeDistance = [];
        let runningSum = 0;
        
        dailyDistance.forEach(d => {
            runningSum += d;
            cumulativeDistance.push(runningSum);
        });

        const data = {
            labels: labels,
            datasets: [{
                label: 'Накопичена Дистанція (м)',
                data: cumulativeDistance,
                borderColor: '#00BFFF', 
                backgroundColor: 'rgba(0, 191, 255, 0.2)',
                tension: 0.3,
                fill: 'origin',
                yAxisID: 'yCumulative',
                borderWidth: 2,
            }]
        };

        const config = {
            type: 'line',
            data: data,
            options: {
                ...baseChartOptions,
                scales: {
                    x: baseChartOptions.scales.x,
                    yCumulative: { 
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: 'Накопичена Дистанція (м)', color: '#BBBBBB' },
                        ticks: baseChartOptions.scales.y.ticks,
                        grid: baseChartOptions.scales.y.grid
                    }
                },
                plugins: baseChartOptions.plugins
            }
        };

        distanceChartInstance = new Chart(ctx, config);
    }

    updateDashboard();
}
