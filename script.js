// script.js

// Функція для отримання поточної дати у форматі YYYY-MM-DD
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 1. КОД ДЛЯ ГРАФІКІВ (ТІЛЬКИ ДЛЯ wellness.html)
function initCharts() {
    // --- КОЛЬОРОВІ КОНСТАНТИ ДЛЯ МІНІ-ГРАФІКІВ ---
    const GOLD_COLOR = 'rgb(255, 215, 0)';
    const GOLD_AREA = 'rgba(255, 215, 0, 0.4)';
    const RED_COLOR = 'rgb(255, 99, 132)'; // Біль
    const RED_AREA = 'rgba(255, 99, 132, 0.4)';
    const ORANGE_COLOR = 'rgb(255, 159, 64)'; // Стрес
    const ORANGE_AREA = 'rgba(255, 159, 64, 0.4)';
    
    const BLUE_COLOR = 'rgb(0, 191, 255)'; // Блакитний для Гідратації
    const BLUE_AREA = 'rgba(0, 191, 255, 0.4)'; 
    
    const PURPLE_COLOR = 'rgb(147, 112, 219)'; // Фіолетовий для Настрою
    const PURPLE_AREA = 'rgba(147, 112, 219, 0.4)'; 
    
    const LIME_COLOR = 'rgb(50, 205, 50)'; // Салатовий для Готовності
    const LIME_AREA = 'rgba(50, 205, 50, 0.4)';

    const GREY_GRID = '#CCCCCC'; 

    // Шаблон даних для міні-графіків (За замовчуванням Золотий)
    const dataTemplate = {
        labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
        datasets: [{
            label: 'Поточний тиждень',
            data: [7, 8, 7, 6, 8, 9, 7], 
            borderColor: GOLD_COLOR, 
            backgroundColor: GOLD_AREA,
            tension: 0.3,
            fill: true
        }]
    };

    const config = {
        type: 'line',
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 1,
                    max: 10,
                    ticks: { stepSize: 1 }
                }
            },
            plugins: {
                legend: { display: false },
                title: { display: false }
            }
        }
    };

    // Створення маленьких графіків з індивідуальними кольорами
    const charts = [
        // Золотий (Сон) - Використовує GOLD_COLOR за шаблоном
        { id: 'chart-sleep', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [7, 8, 7, 6, 8, 9, 7], label: 'Сон' }] } },
        
        // Червоний (Біль)
        { id: 'chart-soreness', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [4, 5, 3, 6, 5, 2, 4], label: 'Біль', borderColor: RED_COLOR, backgroundColor: RED_AREA }] } },
        
        // ФІОЛЕТОВИЙ (Настрій)
        { id: 'chart-mood', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [9, 8, 9, 7, 8, 10, 9], label: 'Настрій', borderColor: PURPLE_COLOR, backgroundColor: PURPLE_AREA }] } },
        
        // БЛАКИТНИЙ (Гідратація)
        { id: 'chart-water', data: { 
            ...dataTemplate, 
            datasets: [{ 
                ...dataTemplate.datasets[0], 
                data: [8, 9, 7, 8, 9, 9, 8], 
                label: 'Гідратація',
                borderColor: BLUE_COLOR, 
                backgroundColor: BLUE_AREA 
            }] 
        } },
        
        // Помаранчевий (Стрес)
        { id: 'chart-stress', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [3, 4, 5, 5, 4, 2, 3], label: 'Стрес', borderColor: ORANGE_COLOR, backgroundColor: ORANGE_AREA }] } },
        
        // САЛАТОВИЙ (Готовність)
        { id: 'chart-ready', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [9, 8, 8, 7, 9, 10, 9], label: 'Готовність', borderColor: LIME_COLOR, backgroundColor: LIME_AREA }] } },
    ];

    charts.forEach(chart => {
        const ctx = document.getElementById(chart.id);
        if (ctx) new Chart(ctx, { ...config, data: chart.data });
    });

    // Створення великого зведеного графіку (Radar Chart)
    const mainCtx = document.getElementById('wellnessChart');
    if (mainCtx) {
        new Chart(mainCtx, {
            type: 'radar',
            data: {
                labels: ['Сон', 'Біль', 'Настрій', 'Гідратація', 'Стрес', 'Готовність'],
                datasets: [{
                    label: 'Поточний стан (середній бал)',
                    data: [7.5, 4.5, 8.5, 8.3, 3.8, 8.8], 
                    backgroundColor: GOLD_AREA, 
                    borderColor: 'rgb(51, 51, 51)',
                    pointBackgroundColor: 'rgb(51, 51, 51)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(51, 51, 51)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                elements: {
                    line: { borderWidth: 3 }
                },
                scales: {
                    r: {
                        // СІТКА ТА ОСІ ЗІ СВІТЛО-СІРИМ КОЛЬОРОМ
                        grid: {
                            color: GREY_GRID, 
                        },
                        angleLines: {
                            display: true,
                            color: GREY_GRID
                        },
                        pointLabels: {
                            color: 'white', 
                            font: { size: 12 }
                        },
                        ticks: {
                            color: 'white', 
                            backdropColor: 'rgba(0, 0, 0, 0)', 
                            stepSize: 1,
                            min: 0,
                            max: 10,
                        },
                        suggestedMin: 1,
                        suggestedMax: 10
                    }
                },
                plugins: {
                    legend: { 
                        display: true, 
                        position: 'top',
                        labels: {
                            color: 'white'
                        }
                    },
                    title: { display: false }
                }
            }
        });
    }
}

// Функція перевірки та застосування обмеження "раз на день"
function checkDailyRestriction() {
    const form = document.getElementById('wellness-form');
    const button = document.querySelector('.gold-button');
    const lastDate = localStorage.getItem('lastWellnessSubmissionDate');
    const today = getTodayDateString();

    if (form && lastDate === today) {
        const inputs = form.querySelectorAll('input, button');
        inputs.forEach(input => {
            input.disabled = true;
        });
        
        button.textContent = "Дані на сьогодні вже записані.";
        button.style.backgroundColor = '#6c757d'; 
        button.style.cursor = 'not-allowed';
        
        if (!document.getElementById('restriction-message')) {
            const message = document.createElement('p');
            message.id = 'restriction-message';
            message.style.marginTop = '15px';
            message.style.color = '#dc3545';
            message.style.fontWeight = 'bold';
            message.textContent = "Ви можете надіслати опитування лише раз на день. Приходьте завтра!";
            form.prepend(message);
        }
        return true; 
    }
    return false;
}


// 2. АКТИВАЦІЯ МЕНЮ ТА ІНІЦІАЛІЗАЦІЯ
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname.split('/').pop();
    const sidebarLinks = document.querySelectorAll('.sidebar a');

    // Логіка підсвічування активного пункту меню
    sidebarLinks.forEach(link => {
        link.classList.remove('active'); 
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // Ініціалізація графіків та обмежень, якщо ми на сторінці Wellness Control
    if (currentPath === 'wellness.html') {
        initCharts();
        
        checkDailyRestriction(); 

        const form = document.getElementById('wellness-form');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                if (checkDailyRestriction()) {
                    return;
                }
                
                // --- ПРОСТА ВАЛІДАЦІЯ ---
                const requiredRatings = form.querySelectorAll('.rating-group');
                let allChecked = true;
                requiredRatings.forEach(group => {
                    if (!group.querySelector('input:checked')) {
                        allChecked = false;
                    }
                });

                if (!allChecked) {
                    alert("Будь ласка, заповніть усі 6 точок даних перед відправкою.");
                    return; 
                }
                
                // --- ЛОГІКА ЗБЕРЕЖЕННЯ ---
                
                const submissionData = {};
                form.querySelectorAll('input[type="radio"]:checked').forEach(input => {
                    submissionData[input.name] = input.value;
                });
                console.log("Дані для відправки:", submissionData);


                // 1. Збереження дати відправки в localStorage
                localStorage.setItem('lastWellnessSubmissionDate', getTodayDateString());
                
                // 2. Застосування обмеження (вимикаємо форму)
                checkDailyRestriction(); 
                
                alert("Ваші дані Wellness успішно записані!");
            });
        }
    }
});
// ==========================================================
// ФУНКЦІЇ ДЛЯ INJURY STORY (injury.html)
// ==========================================================

// Функція-хелпер для отримання поточної дати у форматі YYYY-MM-DD
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

// Ініціалізація або отримання даних травм
let injuries = JSON.parse(localStorage.getItem('athleteInjuries')) || [];
let selectedInjury = null;
let currentPainChart = null; // Змінна для зберігання об'єкта Chart.js

function saveInjuries() {
    localStorage.setItem('athleteInjuries', JSON.stringify(injuries));
}

// ----------------------------------------------------------
// ЛОГІКА КАРТИ ТРАВМ
// ----------------------------------------------------------
function setupBodyMap() {
    const mapContainer = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    const coordXInput = document.getElementById('coordX');
    const coordYInput = document.getElementById('coordY');
    const notesSection = document.getElementById('notes-section');
    const injuryForm = document.getElementById('injury-form');
    const injuryLocationInput = document.getElementById('injury-location');

    // Якщо ключових елементів немає, виходимо
    if (!mapContainer || !injuryForm || !marker) return;


    // 1. Обробка кліку на карту (встановлення місця травми)
    mapContainer.addEventListener('click', function(e) {
        
        // Перевіряємо, чи клікнули саме на зображення або контейнер, а не на вже існуючий маркер
        if (e.target.classList.contains('injury-marker')) return; 

        const rect = mapContainer.getBoundingClientRect();
        const x = e.clientX - rect.left; 
        const y = e.clientY - rect.top;

        // Перетворюємо у відсотки для адаптивності
        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;

        // Позиціонуємо червоний обідок (візуальний фідбек)
        marker.style.left = `${xPercent}%`;
        marker.style.top = `${yPercent}%`;
        
        // Відображаємо місце для нотаток
        notesSection.style.display = 'block';

        // Зберігаємо координати у приховані поля форми
        coordXInput.value = xPercent.toFixed(2);
        coordYInput.value = yPercent.toFixed(2);
        
        // Скидаємо вибір поточної травми для створення нової
        selectedInjury = null; 
        injuryForm.reset(); // Скидаємо форму
        document.getElementById('injury-date').value = getTodayDateString(); // Встановлюємо сьогоднішню дату
        document.getElementById('injury-notes').value = '';
        
        renderInjuryMarkers(); // Оновлюємо відображення маркерів
    });

    // 2. Рендеринг збережених маркерів та їх функціональність
    function renderInjuryMarkers() {
        // Видаляємо всі існуючі маркери травм
        mapContainer.querySelectorAll('.injury-marker').forEach(m => m.remove());

        injuries.forEach((injury) => {
            const injuryEl = document.createElement('div');
            injuryEl.classList.add('injury-marker');
            injuryEl.style.left = `${injury.coordX}%`;
            injuryEl.style.top = `${injury.coordY}%`;
            
            // Встановлюємо клас, якщо травма обрана
            if (selectedInjury && selectedInjury.id === injury.id) {
                 injuryEl.style.backgroundColor = '#FFC72C'; // Виділення золотим
                 injuryEl.style.width = '16px';
                 injuryEl.style.height = '16px';
            }

            // Додаємо інформацію про травму при наведенні
            const latestPain = injury.painHistory.length > 0 ? injury.painHistory[injury.painHistory.length - 1].pain : injury.pain;
            injuryEl.title = `${injury.location} (${injury.date})\nОстанній біль: ${latestPain}/10`;
            
            // Обробка кліку на збережений маркер
            injuryEl.addEventListener('click', function(e) {
                e.stopPropagation(); // Запобігаємо спрацюванню кліку на карту
                selectedInjury = injury;
                displayInjuryDetails(injury);
                renderInjuryMarkers(); // Оновлюємо виділення
                
                // Переміщуємо червоний обідок на місце обраної травми
                marker.style.left = `${injury.coordX}%`;
                marker.style.top = `${injury.coordY}%`;
            });

            mapContainer.appendChild(injuryEl);
        });
    }

    // 3. Відображення деталей травми (при кліку на маркер)
    function displayInjuryDetails(injury) {
        const listContainer = document.getElementById('injury-list');
        const latestPain = injury.painHistory.length > 0 ? injury.painHistory[injury.painHistory.length - 1].pain : injury.pain;
        
        listContainer.innerHTML = `
            <div style="padding: 10px; border: 1px solid #333; border-radius: 6px;">
                <h3>${injury.location}</h3>
                <p><strong>Дата початку:</strong> ${injury.date}</p>
                <p><strong>Поточний біль:</strong> <span style="color:#DA3E52; font-weight:bold;">${latestPain}</span>/10</p>
                <p style="font-style: italic;">"${injury.notes || 'Опис відсутній.'}"</p>
            </div>
        `;
        
        // Оновлюємо форму для ОНОВЛЕННЯ болю
        document.getElementById('injury-date').value = injury.date;
        injuryLocationInput.value = injury.location;
        document.getElementById('injury-notes').value = injury.notes;
        coordXInput.value = injury.coordX;
        coordYInput.value = injury.coordY;
        
        // Встановлюємо поточний рівень болю у формі
        const painRatingEl = document.getElementById('pain-rating-group').querySelector(`input[value="${latestPain}"]`);
        if (painRatingEl) painRatingEl.checked = true;

        notesSection.style.display = 'block';

        renderPainChart(); 
    }

    // 4. Обробка відправки форми (додавання/оновлення)
    injuryForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const currentPain = document.querySelector('input[name="pain"]:checked').value;
        const today = getTodayDateString();

        const newInjuryData = {
            date: document.getElementById('injury-date').value,
            location: injuryLocationInput.value,
            pain: currentPain,
            coordX: coordXInput.value,
            coordY: coordYInput.value,
            notes: document.getElementById('injury-notes').value,
        };
        
        if (!newInjuryData.coordX || !newInjuryData.coordY) {
            alert("Будь ласка, клікніть на силует, щоб відмітити місце травми.");
            return;
        }

        if (selectedInjury) {
            // ОНОВЛЕННЯ СТАРОЇ ТРАВМИ (оновлюємо деталі та біль)
            const index = injuries.findIndex(i => i.id === selectedInjury.id);
            
            let updatedPainHistory = selectedInjury.painHistory || [];
            
            // Якщо сьогоднішня дата вже є, не додаємо, інакше додаємо новий запис
            if (!updatedPainHistory.some(h => h.date === today)) {
                updatedPainHistory.push({ date: today, pain: currentPain });
            } else {
                // Якщо є, оновлюємо бал
                updatedPainHistory = updatedPainHistory.map(h => h.date === today ? { ...h, pain: currentPain } : h);
            }
            
            injuries[index] = { 
                ...selectedInjury, 
                ...newInjuryData,
                id: selectedInjury.id,
                painHistory: updatedPainHistory.sort((a, b) => new Date(a.date) - new Date(b.date))
            };
            
            alert(`Травма "${newInjuryData.location}" оновлена!`);

        } else {
            // СТВОРЕННЯ НОВОЇ ТРАВМИ
            const newInjury = {
                ...newInjuryData,
                id: Date.now(), 
                painHistory: [{ date: newInjuryData.date, pain: newInjuryData.pain }] 
            };
            injuries.push(newInjury);
            alert(`Нова травма "${newInjuryData.location}" збережена!`);
        }

        saveInjuries();
        renderInjuryMarkers();
        injuryForm.reset();
        notesSection.style.display = 'none';
        
        // Переміщуємо червоний обідок назад
        marker.style.left = '-100px';
        marker.style.top = '-100px';

        displayInjuryList();
        selectedInjury = null; 
    });

    // 5. Відображення списку усіх травм
    function displayInjuryList() {
        const listContainer = document.getElementById('injury-list');
        if (injuries.length === 0) {
            listContainer.innerHTML = '<p class="placeholder-text">Історія травм порожня. Додайте першу травму!</p>';
            return;
        }

        let html = injuries.map(injury => {
            const latestPain = injury.painHistory.length > 0 ? injury.painHistory[injury.painHistory.length - 1].pain : injury.pain;
            return `
                <div class="injury-item" style="padding: 10px; border-bottom: 1px dashed #333; cursor: pointer;" data-id="${injury.id}">
                    <p style="color: #FFC72C; font-weight: bold; margin: 0;">${injury.location} (${injury.date})</p>
                    <p style="margin: 0; font-size: 0.9em;">Поточний біль: <span style="color:#DA3E52;">${latestPain}</span>/10 | Записів: ${injury.painHistory.length}</p>
                </div>
            `;
        }).join('');

        listContainer.innerHTML = html;
        
        // Додаємо обробники кліків до елементів списку
        listContainer.querySelectorAll('.injury-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.getAttribute('data-id'));
                selectedInjury = injuries.find(i => i.id === id);
                displayInjuryDetails(selectedInjury);
                renderInjuryMarkers();
            });
        });
    }

    // 6. Функція для відображення графіка болю
    function renderPainChart() {
        const ctx = document.getElementById('painChart');
        if (!selectedInjury || !ctx) {
            if (currentPainChart) currentPainChart.destroy();
            ctx.parentNode.innerHTML = '<p class="placeholder-text">Оберіть травму для перегляду динаміки.</p>';
            return;
        }

        if (currentPainChart) currentPainChart.destroy();

        const painData = selectedInjury.painHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const data = {
            labels: painData.map(d => d.date),
            datasets: [{
                label: `Біль "${selectedInjury.location}"`,
                data: painData.map(d => parseInt(d.pain)),
                borderColor: 'rgb(218, 62, 82)', 
                backgroundColor: 'rgba(218, 62, 82, 0.4)',
                tension: 0.3,
                fill: true
            }]
        };

        const config = {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { min: 1, max: 10, ticks: { stepSize: 1, color: '#CCCCCC' }, grid: { color: '#333333' } },
                    x: { ticks: { color: '#CCCCCC' }, grid: { color: '#333333' } }
                },
                plugins: {
                    legend: { labels: { color: '#CCCCCC' } },
                    title: { display: false }
                }
            }
        };

        currentPainChart = new Chart(ctx, config);
    }
    
    // Початкова ініціалізація сторінки
    document.getElementById('injury-date').value = getTodayDateString();
    displayInjuryList();
    renderInjuryMarkers();
}


// ==========================================================
// ОСНОВНА ІНІЦІАЛІЗАЦІЯ (Додайте логіку для Wellness тут)
// ==========================================================

document.addEventListener('DOMContentLoaded', function() {
    // ... Ваш існуючий код ініціалізації Wellness Control ...
    
    // Ініціалізація Injury Story
    if (window.location.pathname.split('/').pop() === 'injury.html') {
        setupBodyMap();
    }
    
});
/* ========================================================== */
/* ЛОГІКА ДЛЯ СТОРІНКИ LOAD SEASON                  */
/* Використовує Chart.js та дані з localStorage     */
/* ========================================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Переконайтеся, що Chart.js завантажено
    if (typeof Chart === 'undefined') {
        console.error("Chart.js не завантажено. Перевірте підключення бібліотеки.");
        return;
    }
    
    // Константи
    const STORAGE_KEY = 'proathletecare_load_data';
    const ACWR_OPTIMAL_MIN = 0.8;
    const ACWR_OPTIMAL_MAX = 1.3;
    const ACWR_HIGH_RISK = 1.5;
    const ACWR_LOW_RISK = 0.5;

    // Елементи DOM
    const loadForm = document.getElementById('load-form');
    const submitLoadBtn = document.getElementById('submit-load-btn');
    const acwrRpeValue = document.getElementById('acwr-rpe-value');
    const riskStatusCard = document.getElementById('risk-status-card');

    // Екземпляри графіків
    let acwrChartInstance;
    let loadTrendChartInstance;
    let distanceChartInstance;

    // --- Data Storage & Loading ---

    function loadData() {
        try {
            const json = localStorage.getItem(STORAGE_KEY);
            // Сортування даних за датою для коректних розрахунків
            return json ? JSON.parse(json).sort((a, b) => new Date(a.date) - new Date(b.date)) : [];
        } catch (e) {
            console.error("Помилка завантаження даних:", e);
            return [];
        }
    }

    function saveData(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    // --- ACWR & Load Calculation ---

    function calculateACWR(data, type = 'rpe') {
        const results = [];
        if (data.length === 0) return results;

        const loadMap = new Map();
        data.forEach(d => {
            if (type === 'rpe') {
                loadMap.set(d.date, d.duration * d.rpe); // RPE-Load
            } else if (type === 'distance') {
                loadMap.set(d.date, d.distance); // Distance Load
            }
        });

        const sortedDates = data.map(d => new Date(d.date));
        const startDate = sortedDates[0];
        const endDate = sortedDates[sortedDates.length - 1];

        // Починаємо розрахунок на 27 днів раніше, щоб мати хронічне навантаження
        const effectiveStartDate = new Date(startDate);
        effectiveStartDate.setDate(startDate.getDate() - 27);

        for (let current = new Date(effectiveStartDate); current <= endDate; current.setDate(current.getDate() + 1)) {
            const currentDateStr = current.toISOString().split('T')[0];
            
            // --- Acute Load (7 days Sum) ---
            let acuteLoadSum = 0;
            for (let i = 0; i < 7; i++) {
                const date = new Date(current);
                date.setDate(current.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                acuteLoadSum += (loadMap.get(dateStr) || 0);
            }
            const acute = acuteLoadSum;

            // --- Chronic Load (28 days Average) ---
            let chronicLoadSum = 0;
            for (let i = 0; i < 28; i++) {
                const date = new Date(current);
                date.setDate(current.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                chronicLoadSum += (loadMap.get(dateStr) || 0);
            }
            const chronicAvg = chronicLoadSum / 28;
            
            let acwr = null;
            if (chronicAvg > 0) {
                acwr = acute / chronicAvg;
            }

            // Додаємо дані лише з оригінального діапазону
            if (current >= startDate) {
                results.push({
                    date: currentDateStr,
                    acwr: acwr,
                    acute: acute,
                    chronic: chronicAvg * 7, // Для графіків, щоб візуально порівнювати
                    dailyLoad: (loadMap.get(currentDateStr) || 0)
                });
            }
        }
        return results;
    }

    // --- Form Submission ---

    loadForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const data = new FormData(loadForm);
        const date = data.get('date');
        const duration = parseInt(data.get('duration'));
        const distance = parseInt(data.get('distance'));
        const rpe = parseInt(data.get('rpe'));

        if (!date || isNaN(duration) || isNaN(distance) || isNaN(rpe)) {
            alert('Будь ласка, заповніть усі поля форми.');
            return;
        }

        const allData = loadData();
        const dailyLoad = duration * rpe;

        // Перевірка на дублікат даних (якщо сьогодні вже зафіксовано)
        const existingIndex = allData.findIndex(item => item.date === date);
        if (existingIndex !== -1) {
            if (!confirm(`Дані за ${date} вже існують. Ви хочете їх оновити?`)) {
                return;
            }
            allData[existingIndex] = { date, duration, distance, rpe, load: dailyLoad };
        } else {
            allData.push({ date, duration, distance, rpe, load: dailyLoad });
        }
        
        saveData(allData);
        alert('Дані про тренування успішно зафіксовано!');
        loadForm.reset();
        document.getElementById('load-date').value = new Date().toISOString().split('T')[0];
        updateDashboard();
    });

    // --- Dashboard Update ---

    function updateDashboard() {
        const allData = loadData();
        
        if (allData.length === 0) {
            // Ініціалізація, коли немає даних
            acwrRpeValue.textContent = "N/A";
            submitLoadBtn.className = 'gold-button status-grey';
            riskStatusCard.className = 'chart-card status-grey';
            riskStatusCard.innerHTML = `<p style="font-size: 1.1em; color: #999; font-weight: bold; margin: 0;">Недостатньо даних</p>`;
            return;
        }

        const acwrRpeResults = calculateACWR(allData, 'rpe');
        const acwrDistanceResults = calculateACWR(allData, 'distance');

        // Оновлення картки ACWR (RPE) та кнопки
        const latestRpeResult = acwrRpeResults[acwrRpeResults.length - 1];
        let latestACWR = null;
        
        if (latestRpeResult && latestRpeResult.acwr !== null) {
            latestACWR = parseFloat(latestRpeResult.acwr.toFixed(2));
            acwrRpeValue.textContent = latestACWR;

            let statusText = '';
            let statusClass = '';
            let buttonClass = '';

            if (latestACWR >= ACWR_HIGH_RISK) {
                statusText = 'Високий Ризик Травми';
                statusClass = 'status-danger';
                buttonClass = 'status-red';
            } else if (latestACWR >= ACWR_OPTIMAL_MAX) {
                statusText = 'Підвищений Ризик (Увага)';
                statusClass = 'status-warning';
                buttonClass = 'status-orange';
            } else if (latestACWR >= ACWR_OPTIMAL_MIN) {
                statusText = 'Оптимальна Зона';
                statusClass = 'status-optimal';
                buttonClass = 'status-green';
            } else if (latestACWR >= ACWR_LOW_RISK) {
                statusText = 'Недостатній Обсяг (Увага)';
                statusClass = 'status-warning';
                buttonClass = 'status-orange';
            } else {
                statusText = 'Низький Обсяг (Детренування)';
                statusClass = 'status-danger';
                buttonClass = 'status-red';
            }
            
            // Оновлення картки статусу
            riskStatusCard.className = `chart-card ${statusClass}`;
            riskStatusCard.innerHTML = `
                <p style="font-size: 1.1em; color: ${statusClass === 'status-danger' ? '#DA3E52' : statusClass === 'status-warning' ? '#FF9800' : '#4CAF50'}; font-weight: bold; margin: 0;">
                    <span style="font-size: 1.5em; margin-right: 5px;">${statusClass === 'status-danger' ? '🔴' : statusClass === 'status-warning' ? '⚠️' : '✅'}</span> ${statusText}
                </p>
                <p style="font-size: 0.8em; color: #999; margin: 5px 0 0 0;">$0.8 \text{ — } 1.3 \text{ (Optimal)}$</p>
            `;
            
            // Оновлення кнопки
            submitLoadBtn.className = 'gold-button ' + buttonClass;
        } else {
            acwrRpeValue.textContent = "N/A";
            submitLoadBtn.className = 'gold-button status-grey';
        }

        // Рендер графіків
        renderACWRChart(acwrRpeResults);
        renderLoadTrendChart(acwrRpeResults);
        renderDistanceChart(acwrDistanceResults);
    }

    // --- Chart.js Rendering Functions ---

    // Базові опції для темних графіків
    const baseChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: '#BBBBBB' } },
            tooltip: { backgroundColor: 'rgba(13, 13, 13, 0.9)', titleColor: '#FFC72C', bodyColor: '#CCCCCC', borderColor: '#333', borderWidth: 1 }
        },
        scales: {
            x: { grid: { color: '#1a1a1a' }, ticks: { color: '#BBBBBB' } },
            y: { grid: { color: '#1a1a1a' }, ticks: { color: '#BBBBBB' } }
        }
    };

    // 1. Графік Динаміки Ризику (ACWR)
    function renderACWRChart(results) {
        const ctx = document.getElementById('acwrChart').getContext('2d');
        if (acwrChartInstance) acwrChartInstance.destroy();

        const labels = results.map(r => r.date);
        const acwrData = results.map(r => r.acwr);

        acwrChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'ACWR',
                    data: acwrData,
                    borderColor: '#FFC72C', // Золотий
                    backgroundColor: 'rgba(255, 199, 44, 0.2)',
                    tension: 0.4,
                    pointRadius: 3,
                    borderWidth: 2
                }]
            },
            options: {
                ...baseChartOptions,
                plugins: {
                    ...baseChartOptions.plugins,
                    annotation: {
                        annotations: {
                            optimalMax: {
                                type: 'line',
                                yMin: ACWR_OPTIMAL_MAX,
                                yMax: ACWR_OPTIMAL_MAX,
                                borderColor: '#FF9800',
                                borderWidth: 1,
                                borderDash: [5, 5],
                                label: { content: 'Ризик (1.3)', enabled: true, position: 'end', color: '#FF9800' }
                            },
                            highRisk: {
                                type: 'line',
                                yMin: ACWR_HIGH_RISK,
                                yMax: ACWR_HIGH_RISK,
                                borderColor: '#DA3E52',
                                borderWidth: 2,
                                label: { content: 'Високий Ризик (1.5)', enabled: true, position: 'end', color: '#DA3E52' }
                            },
                            optimalMin: {
                                type: 'line',
                                yMin: ACWR_OPTIMAL_MIN,
                                yMax: ACWR_OPTIMAL_MIN,
                                borderColor: '#4CAF50',
                                borderWidth: 1,
                                borderDash: [5, 5],
                                label: { content: 'Оптимально (0.8)', enabled: true, position: 'start', color: '#4CAF50' }
                            }
                        }
                    }
                },
                scales: {
                    x: baseChartOptions.scales.x,
                    y: {
                        ...baseChartOptions.scales.y,
                        min: 0,
                        max: 2.0,
                        title: { display: true, text: 'ACWR', color: '#BBBBBB' }
                    }
                }
            }
        });
    }

    // 2. Графік Тренувального Навантаження (Acute & Chronic Load)
    function renderLoadTrendChart(results) {
        const ctx = document.getElementById('loadTrendChart').getContext('2d');
        if (loadTrendChartInstance) loadTrendChartInstance.destroy();

        const labels = results.map(r => r.date);
        const acuteLoad = results.map(r => r.acute);
        const chronicLoad = results.map(r => r.chronic);

        loadTrendChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Гостре Навантаження (7 дн)',
                        data: acuteLoad,
                        backgroundColor: '#FFC72C', // Золотий
                        yAxisID: 'y'
                    },
                    {
                        label: 'Хронічне Навантаження (28 дн)',
                        data: chronicLoad,
                        type: 'line',
                        borderColor: '#CCCCCC', // Світло-сірий для тренду
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: false,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                ...baseChartOptions,
                scales: {
                    x: baseChartOptions.scales.x,
                    y: {
                        ...baseChartOptions.scales.y,
                        title: { display: true, text: 'RPE Навантаження', color: '#BBBBBB' }
                    }
                }
            }
        });
    }

    // 3. Графік Кілометражу (Distance Trend)
    function renderDistanceChart(results) {
        const ctx = document.getElementById('distanceChart').getContext('2d');
        if (distanceChartInstance) distanceChartInstance.destroy();

        const labels = results.map(r => r.date);
        const distanceData = results.map(r => r.dailyLoad);

        distanceChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Кілометраж (м)',
                    data: distanceData,
                    borderColor: '#4CAF50', // Можна використати зелений для цього графіка, як стандарт для "кілометражу"
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    fill: 'origin',
                    tension: 0.3,
                    pointRadius: 2,
                    borderWidth: 2
                }]
            },
            options: {
                ...baseChartOptions,
                scales: {
                    x: {
                        ...baseChartOptions.scales.x,
                        display: false // Приховуємо вісь X для мінімалізму
                    },
                    y: {
                        ...baseChartOptions.scales.y,
                        display: false // Приховуємо вісь Y
                    }
                },
                plugins: {
                    ...baseChartOptions.plugins,
                    legend: { display: false }
                }
            }
        });
    }

    // Ініціалізація дашборду при завантаженні сторінки
    updateDashboard();
});
