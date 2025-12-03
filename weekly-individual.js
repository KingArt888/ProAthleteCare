const STORAGE_KEY = 'weeklyPlanData';
const COLOR_MAP = {
    'MD': { status: 'MD', colorClass: 'color-red' },
    'MD+1': { status: 'MD+1', colorClass: 'color-dark-green' }, 
    'MD+2': { status: 'MD+2', colorClass: 'color-green' }, 
    'MD+3': { status: 'MD+3', colorClass: 'color-neutral' }, 
    'MD-1': { status: 'MD-1', colorClass: 'color-yellow' }, 
    'MD-2': { status: 'MD-2', colorClass: 'color-deep-green' }, 
    'MD-3': { status: 'MD-3', colorClass: 'color-orange' }, 
    'MD-4': { status: 'MD-4', colorClass: 'color-blue' }, 
    'REST': { status: 'REST', colorClass: 'color-neutral' }, 
    'TRAIN': { status: 'TRAIN', colorClass: 'color-neutral' },
};

document.addEventListener('DOMContentLoaded', () => {
    
    // === ІНІЦІАЛІЗАЦІЯ ЗМІННИХ ===
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dynamicMatchFields = document.getElementById('dynamic-match-fields');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    const form = document.getElementById('weekly-plan-form');
    const saveButton = document.querySelector('.save-button'); 

    if (activitySelects.length === 0 || dayCells.length === 0 || !form) {
        console.error("Помилка: Не знайдено необхідних елементів таблиці або форми.");
        return; 
    }
    
    // =========================================================
    // ФУНКЦІЯ: ЗБЕРЕЖЕННЯ ДАНИХ (ТІЛЬКИ по натисканню кнопки)
    // =========================================================
    function saveData() {
        try {
            const data = {};
            
            document.querySelectorAll('#weekly-plan-form [name]').forEach(element => {
                const name = element.name;
                data[name] = element.value;
            });

            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            saveButton.textContent = 'Збережено! (✔)';
            setTimeout(() => {
                saveButton.textContent = 'Зберегти Тижневий План';
            }, 2000);
        } catch (e) {
            console.error("Помилка при збереженні даних:", e);
        }
    }

    // =========================================================
    // ФУНКЦІЯ: ІНІЦІАЛІЗАЦІЯ ШАБЛОНІВ 
    // =========================================================
    function initializeTemplates() {
        // У шаблонах я виправив синтаксис (замість '...' використано \n для перенесення рядків),
        // щоб уникнути потенційних проблем з копіюванням/вставкою в деяких середовищах.
        const templates = [
            { name: 'tasks_md_plus_2', defaultText: `1. **Самомасаж (Ролінг/Перкусія):** 10 хв (фокус на квадрицепси, сідниці, спина).\n2. **Мобілізація суглобів:** 15 хв (комплекс на гомілкостоп, тазостегновий суглоб).\n3. **Легкий Стретчинг (статичний):** 15 хв.\n4. **Гідратація:** Посилений контроль водного балансу.` },
            { name: 'tasks_md_plus_3', defaultText: `1. **Загальне Командне Тренування:** Фокус на техніку/тактику.\n2. **Індивідуальна робота:** Легка аеробна активність (15-20 хв).` },
            { name: 'tasks_md_plus_1', defaultText: `1. **Кардіо в легкій зоні (LSD):** 20-30 хв (пульс 120-130 уд/хв) або велотренажер.\n2. **Превентивні вправи:** 15 хв (зміцнення CORE та ротаторної манжети).\n3. **Робота з м'ячем (легка):** Індивідуальні технічні елементи (30 хв).\n4. **Харчування:** Підвищене споживання білка та вуглеводів.` },
            { name: 'tasks_md_minus_4', defaultText: `1. **Силова активація:** 10 хв (динамічна розминка, активація сідничних м'язів).\n2. **Тренування в залі (MAX Load):** 45-60 хв. Фокус на **максимальну/вибухову силу** ніг.\n3. **Пліометрика:** 3-5 сетів, 5 повторень (боксові стрибки/бар'єри).` },
            { name: 'tasks_md_minus_3', defaultText: `1. **CORE-тренування (функціональне):** 20 хв (планки, анти-ротаційні вправи).\n2. **Швидкість (Спринти):** 5-7 x 30 м (95-100% інтенсивності), **повне відновлення**.\n3. **Координація:** 10 хв (координаційні драбини).` },
            { name: 'tasks_md_minus_2', defaultText: `1. **Зал (Верх Тіла):** 30 хв (фокус на баланс сили).\n2. **Ігрові вправи:** Середня/Висока інтенсивність, фокус на **командну тактику/витривалість**.\n3. **Ролінг:** 10 хв (для підтримки еластичності).` },
            { name: 'tasks_md_minus_1', defaultText: `1. **Нейро активація:** 10 хв (сходи, реакція).\n2. **Легка ігрова розминка:** 30 хв (з акцентом на швидкість).\n3. **Пріоритет:** Якісний сон та відновлення (мінімум 8 годин).` }
        ];

        templates.forEach(template => {
            const textarea = document.querySelector(`textarea[name="${template.name}"]`);
            if (textarea && textarea.value.trim() === '') {
                textarea.value = template.defaultText;
            }
        });
    }

    // =========================================================
    // ФУНКЦІЯ: ОТРИМАННЯ ШАБЛОНУ 
    // =========================================================
    function getTemplateText(status) {
        if (status === 'MD') return 'Матч: Індивідуальна розминка/завершення гри';
        if (status === 'REST') return 'Повний відпочинок, відновлення, сон.';
        if (status === 'TRAIN') return 'Загальнокомандне тренування: Специфічні вправи вводити вручну.';

        let fieldName = '';
        const numberMatch = status.match(/(\d+)/); 

        if (!numberMatch) {
            return '';
        }

        const phaseNumber = numberMatch[1]; 

        if (status.startsWith('MD+')) {
            fieldName = `tasks_md_plus_${phaseNumber}`;
        } else if (status.startsWith('MD-')) {
            fieldName = `tasks_md_minus_${phaseNumber}`;
        } else {
            return '';
        }

        const templateElement = document.querySelector(`textarea[name="${fieldName}"]`);

        if (!templateElement) {
            console.error(`Помилка: Не знайдено textarea з іменем: ${fieldName}`); 
            return '';
        }

        const phaseTitle = `**Фаза: ${status}**\n`;
        return phaseTitle + templateElement.value.trim();
    }

    // =========================================================
    // ФУНКЦІЯ: toggleDayInputs (Управління активністю полів)
    // =========================================================
    function toggleDayInputs(dayIndex, activityType, isPlanActive) {
        try {
            const dailyTaskField = document.querySelector(`[name="daily_task_${dayIndex}"]`);
            
            if (dailyTaskField) {
                 let shouldDisable = true;
                 
                 // --- ВИПРАВЛЕНО ТУТ ---
                 // 1. Якщо MATCH обрано: поле завжди активне
                 if (activityType === 'MATCH') {
                     shouldDisable = false;
                 // 2. Якщо REST обрано: поле завжди неактивне
                 } else if (activityType === 'REST') {
                     shouldDisable = true;
                 // 3. Якщо є MD в тижні, і це не REST: поле активне (для TRAIN/MD+/-)
                 } else if (isPlanActive) {
                      shouldDisable = false;
                 }
                 // 4. Якщо MD немає: shouldDisable залишається true

                 dailyTaskField.disabled = shouldDisable;
                 
                 if (shouldDisable) {
                     dailyTaskField.classList.add('day-disabled');
                     if (!isPlanActive) {
                         // Заглушка, якщо немає жодного матчу в тижні
                         dailyTaskField.value = 'Оберіть МАТЧ для активації планування.';
                     }
                 } else {
                     dailyTaskField.classList.remove('day-disabled');
                     // Очищаємо заглушку, якщо поле стало активним
                     if (dailyTaskField.value === 'Оберіть МАТЧ для активації планування.') {
                         dailyTaskField.value = ''; 
                     }
                 }
            }

            // Поля деталей матчу (активні тільки якщо обрано MATCH)
            const fieldPrefixesToDisable = ['opponent', 'venue', 'travel_km'];
            
            fieldPrefixesToDisable.forEach(prefix => {
                const element = document.querySelector(`[name="${prefix}_${dayIndex}"]`);
                if (element) {
                     const shouldBeDisabled = (activityType !== 'MATCH');
                     element.disabled = shouldBeDisabled;
                     
                     if (shouldBeDisabled) {
                         element.classList.add('day-disabled');
                     } else {
                         element.classList.remove('day-disabled');
                     }
                }
            });
        } catch (e) {
            console.error("Помилка у toggleDayInputs:", e);
        }
    }


    // =========================================================
    // ФУНКЦІЯ: updateMatchDetails
    // =========================================================
    function updateMatchDetails(dayIndex, activityType, savedValues = {}) {
        const existingBlock = dynamicMatchFields.querySelector(`.match-detail-block[data-day-index="${dayIndex}"]`);
        const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота', 'Неділя'];
        const dayName = dayNames[dayIndex];

        if (activityType === 'MATCH' && dynamicMatchFields && !existingBlock && dayIndex !== -1) {
            const detailsHTML = `
                <div class="match-detail-block" data-day-index="${dayIndex}">
                    <h4>День ${dayIndex * 1 + 1}: ${dayName} (Матч)</h4>
                    <label for="opponent-${dayIndex}">Суперник:</label>
                    <input type="text" name="opponent_${dayIndex}" id="opponent-${dayIndex}" value="${savedValues[`opponent_${dayIndex}`] || ''}" required>
                    <label for="venue-${dayIndex}">Місце проведення:</label>
                    <select name="venue_${dayIndex}" id="venue-${dayIndex}">
                        <option value="Home">Вдома</option>
                        <option value="Away">На виїзді</option>
                    </select>
                    <label for="travel-km-${dayIndex}">Відстань поїздки (км):</label>
                    <input type="number" name="travel_km_${dayIndex}" id="travel-km-${dayIndex}" value="${savedValues[`travel_km_${dayIndex}`] || '0'}" min="0">
                </div>
            `;
            dynamicMatchFields.insertAdjacentHTML('beforeend', detailsHTML);
            
            const venueSelect = document.getElementById(`venue-${dayIndex}`);
            if (venueSelect && savedValues[`venue_${dayIndex}`]) {
                venueSelect.value = savedValues[`venue_${dayIndex}`];
            }

            // Додаємо обробники для нових динамічних полів (зберігаються по зміні)
            document.querySelectorAll(`.match-detail-block[data-day-index="${dayIndex}"] input, .match-detail-block[data-day-index="${dayIndex}"] select`).forEach(input => {
                input.addEventListener('change', saveData); 
                input.addEventListener('input', saveData);
            });

        } else if (activityType !== 'MATCH' && existingBlock) {
            existingBlock.remove();
        }
    }

    // =========================================================
    // ФУНКЦІЯ: loadData (Завантаження даних)
    // =========================================================
    function loadData() {
        try {
            const savedData = localStorage.getItem(STORAGE_KEY);
            let data = {};
            if (savedData) {
                data = JSON.parse(savedData);
            }

            let matchDetailsData = {};

            document.querySelectorAll('#weekly-plan-form [name]').forEach(element => {
                 const name = element.name;
                 if (data[name] !== undefined) {
                     element.value = data[name];
                    
                    if (name.startsWith('opponent_') || name.startsWith('venue_') || name.startsWith('travel_km_')) {
                        matchDetailsData[name] = data[name];
                    }
                 }
            });

            activitySelects.forEach((select, index) => {
                const activityType = select.value;
                updateMatchDetails(index, activityType, matchDetailsData);
            });


        } catch (e) {
            console.error("Помилка при завантаженні даних:", e);
        }
    }

    // =========================================================
    // ФУНКЦІЯ: updateCycleColors (ОСНОВНИЙ РОЗРАХУНОК ФАЗ)
    // =========================================================
    function updateCycleColors() {
        try {
            let activityTypes = [];
            let dayStatuses = new Array(7).fill('TRAIN'); // Початковий статус для розрахунку

            activitySelects.forEach((select, index) => {
                activityTypes[index] = select.value;
            });
            
            const isPlanActive = activityTypes.includes('MATCH');

            // === ОБРОБКА НЕАКТИВНОГО СТАНУ ===
            if (!isPlanActive) {
                dayCells.forEach((cell, index) => {
                    const finalStatusKey = activityTypes[index] === 'REST' ? 'REST' : 'TRAIN';
                    
                    const mdStatusElement = cell.querySelector('.md-status');
                    const style = COLOR_MAP[finalStatusKey];
                    mdStatusElement.textContent = style.status;
                    
                    Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
                    mdStatusElement.classList.add(style.colorClass); 
                    cell.title = `Фаза: ${style.status}`; 

                    // Викликаємо toggleDayInputs для оновлення стану блокування
                    toggleDayInputs(index, activityTypes[index], false);
                    
                    const dailyTaskField = document.querySelector(`textarea[name="daily_task_${index}"]`);
                    if (dailyTaskField && (dailyTaskField.value.trim() === '' || dailyTaskField.value.includes('Фаза: MD'))) {
                        dailyTaskField.value = getTemplateText(finalStatusKey);
                    }
                });
                return; 
            }
            // ===============================================

            const mdMinusCycle = ['MD-1', 'MD-2', 'MD-3', 'MD-4', 'MD-5', 'MD-6']; 
            const mdPlusMap = ['MD+1', 'MD+2', 'MD+3', 'MD+4', 'MD+5', 'MD+6']; 
            
            // 1. РОЗРАХУНОК MD- ФАЗ (назад від MATCH)
            let currentMDMinus = 0; 
            let matchFoundInCycle = false;

            for (let i = 6; i >= 0; i--) { 
                const currentActivity = activityTypes[i];
                
                if (currentActivity === 'MATCH') {
                    currentMDMinus = 0; 
                    matchFoundInCycle = true;
                    dayStatuses[i] = 'MD'; // Фіксуємо MD
                } else if (currentActivity === 'REST') {
                    currentMDMinus = -1; // REST перериває відлік
                    dayStatuses[i] = 'REST'; // Фіксуємо REST
                } else if (matchFoundInCycle && currentMDMinus >= 0 && currentMDMinus < mdMinusCycle.length) {
                    dayStatuses[i] = mdMinusCycle[currentMDMinus];
                    currentMDMinus++;
                }
            }
            
            // 2. РОЗРАХУНОК MD+ ФАЗ (вперед від MATCH)
            let daysSinceLastMatch = 0;
            matchFoundInCycle = false;

            for (let i = 0; i < 7; i++) { 
                const currentActivity = activityTypes[i];
                
                if (currentActivity === 'MATCH') {
                    daysSinceLastMatch = 0;
                    matchFoundInCycle = true;
                } else if (currentActivity === 'REST') {
                    daysSinceLastMatch = 0; 
                } else if (dayStatuses[i].startsWith('MD-')) {
                    daysSinceLastMatch = 0; // MD- фаза перериває MD+
                } else if (matchFoundInCycle && daysSinceLastMatch >= 0 && daysSinceLastMatch < mdPlusMap.length) {
                    // Якщо день не MD, не REST, і не MD-, застосовуємо MD+
                    dayStatuses[i] = mdPlusMap[daysSinceLastMatch];
                    daysSinceLastMatch++;
                } else if (matchFoundInCycle && daysSinceLastMatch >= mdPlusMap.length) {
                     // Після MD+3, якщо день не MD або REST, повертаємо TRAIN
                     dayStatuses[i] = 'TRAIN';
                }
            }
            
            // 3. ФІНАЛЬНЕ ОНОВЛЕННЯ КОЛЬОРІВ ТА АВТОЗАПОВНЕННЯ ПОЛІВ
            dayCells.forEach((cell, index) => {
                const mdStatusElement = cell.querySelector('.md-status');
                
                const finalStatusKey = dayStatuses[index] || 'TRAIN'; 
                const currentActivity = activityTypes[index]; 
                
                const style = COLOR_MAP[finalStatusKey] || COLOR_MAP['TRAIN'];
                mdStatusElement.textContent = style.status;
                
                Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
                mdStatusElement.classList.add(style.colorClass); 

                cell.title = `Фаза: ${style.status}`; 

                // !!! КЛЮЧОВЕ ОНОВЛЕННЯ: оновлюємо активність полів !!!
                toggleDayInputs(index, currentActivity, isPlanActive); 
                
                const dailyTaskField = document.querySelector(`textarea[name="daily_task_${index}"]`);
                
                if (dailyTaskField) {
                    const templateText = getTemplateText(finalStatusKey);
                    const currentTaskValue = dailyTaskField.value.trim();
                    
                    const isGenericTemplate = currentTaskValue === 'Загальнокомандне тренування: Специфічні вправи вводити вручну.' ||
                                                 currentTaskValue === 'Матч: Індивідуальна розминка/завершення гри' ||
                                                 currentTaskValue === 'Повний відпочинок, відновлення, сон.' ||
                                                 currentTaskValue.includes('**Фаза: MD'); 

                    if (templateText && (currentTaskValue === '' || isGenericTemplate)) {
                         dailyTaskField.value = templateText;
                    }
                }
            });
        } catch (e) {
            console.error("Критична помилка у updateCycleColors:", e);
        }
    }


    // === ІНІЦІАЛІЗАЦІЯ ОБРОБНИКІВ ===
    
    activitySelects.forEach(select => {
        select.addEventListener('change', (event) => {
            const dayIndexElement = event.target.closest('td');
            if (!dayIndexElement || dayIndexElement.dataset.dayIndex === undefined) return;
            
            const dayIndex = parseInt(dayIndexElement.dataset.dayIndex); 
            const activityType = event.target.value;
            
            updateCycleColors(); 
            updateMatchDetails(dayIndex, activityType); 
        });
    });

    // Обробник для полів шаблонів
    document.querySelectorAll('[name^="tasks_md_"]').forEach(textarea => { 
        textarea.addEventListener('input', updateCycleColors);
    });
    
    // Обробники для всіх полів, що зберігаються (крім activity_type_ і tasks_md_...)
    document.querySelectorAll('input, select, textarea').forEach(input => {
        if (input.name.startsWith('tasks_md_') || input.name.startsWith('activity_')) {
            return;
        }

        input.addEventListener('change', saveData);
        input.addEventListener('input', saveData);
    });

    // Обробник для кнопки ЗБЕРЕГТИ (основне збереження)
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveData(); 
    });

    // === ПОЧАТКОВИЙ ЗАПУСК ===
    initializeTemplates();
    loadData();
    updateCycleColors();
});
