// --- КОНСТАНТИ ---
const WELLNESS_KEY = 'proatletcare_wellness_data';
const LAST_SUBMISSION_KEY = 'proatletcare_last_submission_date';
const FORM_ID = 'wellness-form';
const SUBMIT_BUTTON_SELECTOR = '.gold-button';

// Назви показників та їх кольори
const METRICS = [
    { id: 'sleep', label: 'Якість сну', color: '#FFC72C', max: 10, isPositive: true },
    { id: 'soreness', label: "Біль / Втома", color: '#DA3E52', max: 10, isPositive: false }, // Обернена шкала (чим менше, тим краще)
    { id: 'mood', label: 'Настрій / Енергія', color: '#4CAF50', max: 10, isPositive: true },
    { id: 'water', label: 'Гідратація', color: '#2196F3', max: 10, isPositive: true },
    { id: 'stress', label: 'Псих. Стрес', color: '#F44336', max: 10, isPositive: false }, // Обернена шкала
    { id: 'ready', label: 'Готовність', color: '#9C27B0', max: 10, isPositive: true }
];

// --- ДОПОМІЖНІ ФУНКЦІЇ ---

// Отримує дані з LocalStorage
function getWellnessData() {
    const data = localStorage.getItem(WELLNESS_KEY);
    return data ? JSON.parse(data) : [];
}

// Зберігає нові дані
function saveWellnessData(data) {
    localStorage.setItem(WELLNESS_KEY, JSON.stringify(data));
}

// Форматує дату для відображення
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
}

// Перевіряє, чи було вже подано форму сьогодні
function hasSubmittedToday() {
    const lastSubmission = localStorage.getItem(LAST_SUBMISSION_KEY);
    if (!lastSubmission) return false;

    const today = new Date().toDateString();
    const lastDate = new Date(lastSubmission).toDateString();
    
    return today === lastDate;
}

// --- ІНІЦІАЛІЗАЦІЯ ГРАФІКІВ ---

let mainChart;
let smallCharts = {};

// Створює налаштування для Chart.js (однакові для всіх графіків)
function createChartConfig(chartData, metric, type = 'line') {
    return {
        type: type,
        data: {
            labels: chartData.dates.map(formatDate),
            datasets: [{
                label: metric.label,
                data: chartData.values,
                borderColor: metric.color,
                backgroundColor: metric.color + '33', // 20% непрозорості
                tension: 0.4,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 1,
                    max: metric.max,
                    ticks: {
                        color: '#CCCCCC'
                    },
                    grid: {
                        color: '#333333'
                    }
                },
                x: {
                    ticks: {
                        color: '#CCCCCC',
                        maxRotation: 0,
                        minRotation: 0,
                        autoSkipPadding: 10
                    },
                    grid: {
                        color: '#333333'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: (context) => formatDate(chartData.dates[context[0].dataIndex]),
                        label: (context) => `${context.dataset.label}: ${context.parsed.y}`
                    }
                }
            }
        }
    };
}

// Ініціалізує всі малі графіки
function initSmallCharts(data) {
    METRICS.forEach(metric => {
        const chartElement = document.getElementById(`chart-${metric.id}`);
        if (chartElement) {
            const chartData = {
                dates: data.map(d => d.timestamp),
                values: data.map(d => d[metric.id])
            };

            const config = createChartConfig(chartData, metric, 'line');
            config.options.scales.y.display = false; // Приховуємо вісь Y на малих графіках
            config.options.scales.x.display = false; // Приховуємо вісь X на малих графіках
            config.options.plugins.tooltip.enabled = false; // Приховуємо тултіпи

            smallCharts[metric.id] = new Chart(chartElement, config);
        }
    });
}


// Ініціалізує головний графік (середнє значення)
function initMainChart(data) {
    const mainChartElement = document.getElementById('wellnessChart');
    if (!mainChartElement) return;

    // Розрахунок середнього значення (Average Wellness Score)
    const avgData = data.map(d => {
        let total = 0;
        let count = 0;
        
        METRICS.forEach(metric => {
            let value = d[metric.id];
            
            // Інвертуємо значення для негативних шкал (біль/стрес), щоб 10 завжди було "краще"
            if (!metric.isPositive) {
                value = metric.max + 1 - value; // Перетворює 10 (біль) на 1 (добре), а 1 (біль) на 10 (добре)
            }
            total += value;
            count++;
        });

        return total / count;
    });

    const chartData = {
        dates: data.map(d => d.timestamp),
        values: avgData
    };

    const mainConfig = {
        type: 'line',
        data: {
            labels: chartData.dates.map(formatDate),
            datasets: [{
                label: 'Середній рівень Wellness',
                data: chartData.values,
                borderColor: '#FFC72C',
                backgroundColor: '#FFC72C33',
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 1,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Середній бал (1-10)',
                        color: '#CCCCCC'
                    },
                    ticks: {
                        color: '#CCCCCC'
                    },
                    grid: {
                        color: '#333333'
                    }
                },
                x: {
                    ticks: {
                        color: '#CCCCCC',
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        color: '#333333'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#CCCCCC'
                    }
                },
                tooltip: {
                    callbacks: {
                        title: (context) => formatDate(chartData.dates[context[0].dataIndex]),
                        label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`
                    }
                }
            }
        }
    };

    // Прибираємо заглушку, якщо є дані
    const chartArea = document.querySelector('.chart-area');
    chartArea.innerHTML = data.length > 0 ? '<canvas id="wellnessChart"></canvas>' : '<p class="placeholder-text">Даних поки що немає. Заповніть форму, щоб побачити графік.</p>';
    
    // Перевіряємо, чи існує canvas після оновлення
    const newMainChartElement = document.getElementById('wellnessChart');
    if (newMainChartElement) {
        if (mainChart) mainChart.destroy(); // Знищуємо попередній екземпляр
        mainChart = new Chart(newMainChartElement, mainConfig);
    }
}


// Оновлює графіки та статистику
function updateDashboard() {
    const data = getWellnessData();
    
    // Показуємо тільки останні 7 записів для графіків
    const recentData = data.slice(-7); 

    initMainChart(recentData);
    initSmallCharts(recentData);
    
    // Оновлення поточної статистики (якщо дані є)
    if (data.length > 0) {
        const lastEntry = data[data.length - 1];
        METRICS.forEach(metric => {
            const statElement = document.getElementById(`stat-${metric.id}`);
            if (statElement) {
                statElement.textContent = `Останнє значення: ${lastEntry[metric.id]}/10`;
            }
        });
    }
}


// --- ОБРОБКА ФОРМИ ---

function handleFormSubmit(event) {
    event.preventDefault();

    if (hasSubmittedToday()) {
        alert('Ви вже надсилали звіт сьогодні. Повторне подання можливе лише завтра.');
        return;
    }

    const form = event.target;
    const formData = new FormData(form);
    const newEntry = {
        timestamp: new Date().getTime()
    };
    
    let allValid = true;

    // Збір даних
    METRICS.forEach(metric => {
        const value = formData.get(metric.id);
        if (!value) {
            allValid = false;
        }
        newEntry[metric.id] = parseInt(value);
    });

    if (!allValid) {
        alert('Будь ласка, оцініть всі показники (1-10) перед відправкою.');
        return;
    }

    // Зберігання
    const currentData = getWellnessData();
    currentData.push(newEntry);
    saveWellnessData(currentData);
    
    // Блокування на сьогодні
    localStorage.setItem(LAST_SUBMISSION_KEY, new Date().toISOString());
    
    // Оновлення інтерфейсу
    checkSubmissionStatus();
    updateDashboard();

    alert('Дані Wellness успішно записано!');
}

// Перевіряє статус подання та блокує кнопку, якщо потрібно
function checkSubmissionStatus() {
    const submitButton = document.querySelector(SUBMIT_BUTTON_SELECTOR);
    const form = document.getElementById(FORM_ID);
    
    if (hasSubmittedToday()) {
        submitButton.textContent = 'Звіт на сьогодні подано';
        submitButton.classList.add('disabled-button');
        submitButton.disabled = true;
        // Блокуємо всі input'и форми
        form.querySelectorAll('input[type="radio"]').forEach(input => {
            input.disabled = true;
        });

    } else {
        submitButton.textContent = 'Записати 6 точок даних';
        submitButton.classList.remove('disabled-button');
        submitButton.disabled = false;
        // Розблоковуємо input'и
        form.querySelectorAll('input[type="radio"]').forEach(input => {
            input.disabled = false;
        });
    }
}


// --- ЗАПУСК ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Прив'язуємо обробник подій до форми
    const form = document.getElementById(FORM_ID);
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // 2. Перевіряємо статус кнопки/форми
    checkSubmissionStatus();

    // 3. Ініціалізуємо графіки на основі існуючих даних
    updateDashboard();
});
