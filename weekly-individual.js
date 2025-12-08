// weekly-individual.js
// ПОТРЕБУЄ exercise_library.js ДЛЯ РОБОТИ (який тут не включений)

const STORAGE_KEY = 'weeklyPlanData';
const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

const COLOR_MAP = {
    'MD': { status: 'MD', colorClass: 'color-red' },
    'MD+1': { status: 'MD+1', colorClass: 'color-dark-green' }, 
    'MD+2': { status: 'MD+2', colorClass: 'color-green' }, 
    'MD-1': { status: 'MD-1', colorClass: 'color-yellow' }, 
    'MD-2': { status: 'MD-2', colorClass: 'color-deep-green' }, 
    'MD-3': { status: 'MD-3', colorClass: 'color-orange' }, 
    'MD-4': { status: 'MD-4', colorClass: 'color-blue' }, 
    'REST': { status: 'REST', colorClass: 'color-neutral' }, 
    'TRAIN': { status: 'TRAIN', colorClass: 'color-dark-grey' }, 
};

// --- ФУНКЦІЇ ЛОГІКИ MD-СТАТУСІВ та ПЛАНУВАННЯ ---

/**
 * Оновлює MD-статуси та кольори в таблиці відповідно до обраної активності.
 */
function updateCycleColors() {
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const mdStatusRow = document.getElementById('md-colors-row');
    
    if (!mdStatusRow) return;

    // 1. Визначення днів матчу (MD)
    const matchDays = [];
    activitySelects.forEach((select, index) => {
        if (select.value === 'MATCH') {
            matchDays.push(index);
        }
    });

    // 2. Розрахунок MD-статусу для кожного дня
    const dayStatuses = [];
    for (let i = 0; i < 7; i++) {
        const activity = activitySelects[i].value;
        let status = activity;

        if (activity === 'TRAIN' || activity === 'MATCH') {
            
            if (activity === 'MATCH') {
                status = 'MD';
            } else {
                // Шукаємо найближчий MD
                let minDiff = 100;
                let isBeforeMatch = false;

                matchDays.forEach(matchIndex => {
                    // Циклічна різниця для MD+X
                    let diffAfter = (i >= matchIndex) ? (i - matchIndex) : (7 + i - matchIndex);
                    // Циклічна різниця для MD-X
                    let diffBefore = (matchIndex >= i) ? (matchIndex - i) : (7 + matchIndex - i);
                    
                    // Визначаємо, який статус MD-X чи MD+X найближчий
                    if (diffAfter > 0 && diffAfter < minDiff) {
                        minDiff = diffAfter;
                        isBeforeMatch = false;
                    }
                    if (diffBefore > 0 && diffBefore < minDiff) {
                        minDiff = diffBefore;
                        isBeforeMatch = true;
                    }
                });

                if (minDiff > 0 && minDiff < 7) {
                    status = isBeforeMatch ? `MD-${minDiff}` : `MD+${minDiff}`;
                } else {
                    status = 'TRAIN'; // Немає матчу поруч
                }
            }
        }
        dayStatuses.push(status);
    }
    
    // 3. Оновлення відображення
    mdStatusRow.querySelectorAll('.cycle-day').forEach((cell, index) => {
        const status = dayStatuses[index];
        const statusData = COLOR_MAP[status] || COLOR_MAP['TRAIN'];
        
        const span = cell.querySelector('.md-status');
        span.textContent = statusData.status;
        
        // Очищаємо всі класи кольорів і додаємо потрібний
        Object.values(COLOR_MAP).forEach(map => span.classList.remove(map.colorClass));
        span.classList.add(statusData.colorClass);
        
        // Зберігаємо статус у клітинці для подальшого використання
        cell.setAttribute('data-md-status', statusData.status);

        // Оновлюємо заголовок шаблону дня
        const mdTitle = document.getElementById(`md-title-${index}`);
        if (mdTitle) {
            mdTitle.innerHTML = `${dayNamesShort[index]} <span class="md-status-label">(${statusData.status})</span>`;
        }

        // Рендеримо елементи шаблону (якщо не ініціалізовано)
        renderDayTemplateInput(index, statusData.status);
    });
}

/**
 * Генерує або оновлює поля для налаштування шаблонів вправ
 * (Скорочений варіант для прикладу)
 */
function renderDayTemplateInput(dayIndex, mdStatus) {
    const container = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!container || container.querySelector('.template-stage-header')) return; // Якщо вже є, не рендеримо знову

    const templateHtml = `
        <p class="note-info" style="font-size:0.9em;">Налаштуйте категорії та кількість вправ для статусу **${mdStatus}**.</p>
        
        <div class="template-stage-header">РОЗМИНКА (WARM-UP)</div>
        <div class="template-row">
            <button type="button" class="template-category-button" data-category="mobility" data-stage="warm-up">Мобільність</button>
            <div class="count-controls">
                <button type="button" class="count-control-btn count-minus">-</button>
                <span class="exercise-count" data-category="mobility">0</span>
                <button type="button" class="count-control-btn count-plus">+</button>
            </div>
        </div>
        
        <div class="template-stage-header">ОСНОВНЕ НАВАНТАЖЕННЯ (MAIN)</div>
        <div class="template-row">
            <button type="button" class="template-category-button" data-category="power" data-stage="main">Сила/Потужність</button>
            <div class="count-controls">
                <button type="button" class="count-control-btn count-minus">-</button>
                <span class="exercise-count" data-category="power">0</span>
                <button type="button" class="count-control-btn count-plus">+</button>
            </div>
        </div>
        
        <div class="template-stage-header">ЗАМИНКА (COOL-DOWN)</div>
        <div class="template-row">
            <button type="button" class="template-category-button" data-category="recovery" data-stage="cool-down">Відновлення</button>
            <div class="count-controls">
                <button type="button" class="count-control-btn count-minus">-</button>
                <span class="exercise-count" data-category="recovery">0</span>
                <button type="button" class="count-control-btn count-plus">+</button>
            </div>
        </div>

        <div class="generated-exercises-list" id="generated-exercises-${dayIndex}">
            </div>
    `;
    container.innerHTML = templateHtml;
    // Після рендеру додаємо слухачі
    addTemplateControlListeners(dayIndex);
}

// ... (Тут має бути логіка: addTemplateControlListeners, saveData, loadDataToUI, loadWeeklyPlanDisplay, modal functions)
// ... (Ці функції тут опущені, але вони потрібні для повної роботи)

// --- ЛОГІКА МЕНЮ ДЛЯ МОБІЛЬНОЇ ВЕРСІЇ ---

/**
 * Логіка для перемикання бічної панелі на мобільних пристроях
 */
function setupMenuToggle() {
    // ID кнопки: menu-toggle-button
    const toggleButton = document.getElementById('menu-toggle-button');
    // ID сайдбару: main-sidebar
    const sidebar = document.getElementById('main-sidebar'); 

    if (toggleButton && sidebar) {
        toggleButton.addEventListener('click', () => {
            // Використовуємо клас 'active' (як у Daily Individual)
            sidebar.classList.toggle('active');
        });
        
        // Додатково: закриття меню при кліку на посилання
        document.querySelectorAll('#main-sidebar a').forEach(link => {
            link.addEventListener('click', () => {
                if (sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            });
        });
    } else {
         console.warn("Попередження: Не вдалося знайти кнопку меню або сайдбар для налаштування мобільної навігації.");
    }
}


function setupEventListeners() {
    // Налаштування меню
    setupMenuToggle(); 
    
    // Налаштування слухачів для таблиці активності
    document.querySelectorAll('.activity-type-select').forEach(select => {
        select.addEventListener('change', updateCycleColors);
    });
    
    // Налаштування форми збереження
    document.getElementById('weekly-plan-form').addEventListener('submit', (e) => {
        e.preventDefault();
        // В реальному коді тут буде викликана функція saveData()
        alert('Дані тижневого плану відправлено/збережено! (Цю функцію потрібно реалізувати повністю)');
    });
}

// --- ІНІЦІАЛІЗАЦІЯ ---

function init() {
    // Встановлення обробників подій (включаючи меню)
    setupEventListeners();

    // Ініціалізація та завантаження даних
    const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    // loadDataToUI(savedData); // Завантаження активності та кількості вправ (якщо реалізовано)
    updateCycleColors(); // Встановлення кольорів та заголовків
    // loadWeeklyPlanDisplay(savedData); // Завантаження раніше доданих вручну вправ (якщо реалізовано)
    
}

// Запуск при завантаженні сторінки
document.addEventListener('DOMContentLoaded', init);
