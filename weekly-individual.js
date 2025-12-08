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
    'TRAIN': { status: 'TRAIN', colorClass: 'color-dark-grey' }, 
};

// Карта відео (використовуємо ідентифікатори, а не повні шляхи)
const DEFAULT_VIDEO_KEY_MAP = {
    'MD-4': "back_squat_70", 
    'MD-3': "sprint_30m",
    'MD-2': "mobility_shoulders",
    'MD-1': "core_plank",
    'MD+1': "cool_down_5min",
    'MD+2': "mobility_shoulders",
    'MD': "cool_down_5min",
    'REST': "cool_down_5min",
    'TRAIN': "back_squat_70"
};

const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота', 'Неділя'];

document.addEventListener('DOMContentLoaded', () => {
    
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
    // ФУНКЦІЯ: ЗБЕРЕЖЕННЯ ДАНИХ
    // =========================================================
    function saveData() {
        try {
            const flatData = {};
            document.querySelectorAll('#weekly-plan-form [name]').forEach(element => {
                const name = element.name;
                flatData[name] = element.value;
            });

            const structuredPlanData = {};
            const dayIndices = [0, 1, 2, 3, 4, 5, 6]; 

            dayIndices.forEach(dayIndex => {
                const activityType = flatData[`activity_${dayIndex}`];
                const dailyTaskContent = flatData[`daily_task_${dayIndex}`];
                
                const mdStatusElement = document.querySelector(`#day-status-${dayIndex} .md-status`);
                const finalPhase = mdStatusElement ? mdStatusElement.textContent : 'TRAIN';
                
                const tasks = [];
                
                if (dailyTaskContent && dailyTaskContent.trim() !== '' && dailyTaskContent.trim() !== 'Оберіть МАТЧ для активації планування.') {
                    
                    const content = dailyTaskContent.trim();
                    
                    // Регулярні вирази для пошуку блоків
                    const preMatch = content.match(/Розминка[\s\S]*?(Основна|$|Завершення)/i);
                    const mainMatch = content.match(/Основна[\s\S]*?(Завершення|$)/i);
                    const postMatch = content.match(/Завершення[\s\S]*?$/i);

                    let preTask = preMatch ? preMatch[0].replace(/Основна|$|Завершення/i, '').trim() : '';
                    let mainTask = mainMatch ? mainMatch[0].replace(/Завершення/i, '').trim() : '';
                    let postTask = postMatch ? postMatch[0].trim() : '';
                    
                    // Якщо не знайдено структури, вважаємо весь вміст Основною
                    if (!preMatch && !mainMatch && !postMatch && content.length > 0) {
                         mainTask = content;
                    }

                    const videoKey = DEFAULT_VIDEO_KEY_MAP[finalPhase] || DEFAULT_VIDEO_KEY_MAP['TRAIN'];

                    // Додаємо структуровані блоки
                    if (preTask.trim().length > 0) {
                        tasks.push({
                            "title": `Підготовка: ${finalPhase}`,
                            "stage": "Pre-Training",
                            "description": preTask.trim(),
                            "video_key": videoKey
                        });
                    }
                    if (mainTask.trim().length > 0) {
                        tasks.push({
                            "title": `Основна робота: ${finalPhase}`,
                            "stage": "Main Training",
                            "description": mainTask.trim(),
                            "video_key": videoKey
                        });
                    }
                    if (postTask.trim().length > 0) {
                        tasks.push({
                            "title": `Відновлення: ${finalPhase}`,
                            "stage": "Post-Training",
                            "description": postTask.trim(),
                            "video_key": videoKey
                        });
                    }
                    
                }

                structuredPlanData[`structured_plan_${dayIndex}`] = {
                    day: dayNames[dayIndex],
                    phase: finalPhase, 
                    activity: activityType,
                    tasks: tasks
                };
            });
            
            const combinedData = { ...flatData, ...structuredPlanData };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(combinedData));
            
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
        const templates = [
            { name: 'tasks_md_plus_2', defaultText: `**Фаза: MD+2**\n1. Розминка/Підготовка: Самомасаж (Ролінг) 10 хв. Мобілізація суглобів.\n2. Основна Вправа (Активація): Превентивні вправи на CORE та ротаторну манжету (20 хв).\n3. Завершення/Відновлення: Легкий Стретчинг (статичний) 15 хв. Гідратація.` },
            { name: 'tasks_md_plus_1', defaultText: `**Фаза: MD+1**\n1. Розминка/Підготовка: Легке кардіо (велотренажер) 15 хв.\n2. Основна Вправа (LSD): Кардіо в легкій зоні (пульс 120-130 уд/хв) 20 хв.\n3. Завершення/Відновлення: Посилене харчування. Якісний сон.` },
            { name: 'tasks_md_minus_4', defaultText: `**Фаза: MD-4**\n1. Розминка/Підготовка: Силова активація (10 хв, динамічні стрибки).\n2. Основна Вправа (MAX Load): Тренування в залі (45-60 хв). Фокус на **максимальну силу** ніг.\n3. Завершення/Відновлення: Ролінг/Заминка 10 хв.` },
            { name: 'tasks_md_minus_3', defaultText: `**Фаза: MD-3**\n1. Розминка/Підготовка: CORE-тренування (функціональне) 20 хв.\n2. Основна Вправа (Швидкість): Спринти 5-7 x 30 м (95-100% інтенсивності), **повне відновлення**.\n3. Завершення/Відновлення: Координаційні драбини (10 хв).` },
            { name: 'tasks_md_minus_2', defaultText: `**Фаза: MD-2**\n1. Розминка/Підготовка: Динамічний стретчинг.\n2. Основна Вправа (Команда/Сила): Зал (Верх Тіла) 30 хв. Ігрові вправи середньої інтенсивності.\n3. Завершення/Відновлення: Ролінг (10 хв).` },
            { name: 'tasks_md_minus_1', defaultText: `**Фаза: MD-1**\n1. Розминка/Підготовка: Нейро активація (10 хв).\n2. Основна Вправа (Активація): Легка ігрова розминка (30 хв).\n3. Завершення/Відновлення: Пріоритет: Якісний сон (мінімум 8 годин).` }
        ];

        templates.forEach(template => {
            const textarea = document.querySelector(`textarea[name="${template.name}"]`);
            if (textarea && textarea.value.trim() === '') {
                textarea.value = template.defaultText;
            }
        });
        
        const trainTemplate = 'Загальнокомандне тренування: Специфічні вправи вводити вручну.';
        ['tasks_md_plus_3', 'tasks_md_plus_4', 'tasks_md_plus_5', 'tasks_md_plus_6'].forEach(name => {
             let textarea = document.querySelector(`textarea[name="${name}"]`);
             if (!textarea) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = `<textarea name="${name}" style="display:none;">${trainTemplate}</textarea>`;
                document.body.appendChild(tempDiv.firstChild);
             }
        });
        
        document.querySelectorAll('[name^="tasks_md_"]').forEach(el => {
             let parent = el.closest('div') || el.closest('section') || el.closest('fieldset');
             if (parent) {
                 parent.style.display = 'none';
             } else {
                 el.style.display = 'none';
             }
        });
    }

    // =========================================================
    // ФУНКЦІЯ: ОТРИМАННЯ ШАБЛОНУ 
    // =========================================================
    function getTemplateText(status) {
        if (status === 'MD') return '**Фаза: MD**\nРозминка/Підготовка: Індивідуальна розминка.\nОсновна Вправа: Матч.\nЗавершення/Відновлення: Індивідуальна заминка.';
        if (status === 'REST') return '**Фаза: REST**\nПовний відпочинок, відновлення, сон.';
        if (status === 'TRAIN' || status.startsWith('MD+3') || status.startsWith('MD+4')) return '**Фаза: TRAIN**\nРозминка/Підготовка: Загальна командна розминка.\nОсновна Вправа: Командне тренування.\nЗавершення/Відновлення: Командна заминка.';

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

        return templateElement.value.trim();
    }
    
    // ... (решта функцій loadData, updateCycleColors, toggleDayInputs, updateMatchDetails)
    
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

    function toggleDayInputs(dayIndex, activityType, isPlanActive) {
        try {
            const dailyTaskField = document.querySelector(`[name="daily_task_${dayIndex}"]`);
            
            if (dailyTaskField) {
                 let shouldDisable = true;
                 
                 if (activityType === 'MATCH') {
                     shouldDisable = false;
                 } else if (activityType === 'REST') {
                     shouldDisable = true;
                 } else if (isPlanActive) {
                      shouldDisable = false;
                 }

                 dailyTaskField.disabled = shouldDisable;
                 
                 if (shouldDisable) {
                     dailyTaskField.classList.add('day-disabled');
                     if (!isPlanActive) {
                         dailyTaskField.value = 'Оберіть МАТЧ для активації планування.';
                     }
                 } else {
                     dailyTaskField.classList.remove('day-disabled');
                     if (dailyTaskField.value === 'Оберіть МАТЧ для активації планування.') {
                         dailyTaskField.value = ''; 
                     }
                 }
            }

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

    function updateMatchDetails(dayIndex, activityType, savedValues = {}) {
        const existingBlock = dynamicMatchFields.querySelector(`.match-detail-block[data-day-index="${dayIndex}"]`);
        
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

             document.querySelectorAll(`.match-detail-block[data-day-index="${dayIndex}"] input, .match-detail-block[data-day-index="${dayIndex}"] select`).forEach(input => {
                 input.addEventListener('change', saveData); 
                 input.addEventListener('input', saveData);
             });

        } else if (activityType !== 'MATCH' && existingBlock) {
             existingBlock.remove();
        }
    }

    function updateCycleColors() {
        try {
            let activityTypes = [];
            activitySelects.forEach((select, index) => {
                 activityTypes[index] = select.value;
            });
            
            let dayStatuses = activityTypes.map(type => (type === 'MATCH' ? 'MD' : (type === 'REST' ? 'REST' : 'TRAIN'))); 
            const isPlanActive = activityTypes.includes('MATCH');

            if (!isPlanActive) {
                dayCells.forEach((cell, index) => {
                     const finalStatusKey = activityTypes[index] === 'REST' ? 'REST' : 'TRAIN';
                     const mdStatusElement = cell.querySelector('.md-status');
                     const style = COLOR_MAP[finalStatusKey];
                     mdStatusElement.textContent = style.status;
                     
                     Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
                     mdStatusElement.classList.add(style.colorClass); 
                     cell.title = `Фаза: ${style.status}`; 

                     toggleDayInputs(index, activityTypes[index], false);
                     
                     const dailyTaskField = document.querySelector(`textarea[name="daily_task_${index}"]`);
                     if (dailyTaskField && (dailyTaskField.value.trim() === '' || dailyTaskField.value.includes('Фаза: MD') || dailyTaskField.value.includes('Загальнокомандне тренування'))) {
                          dailyTaskField.value = getTemplateText(finalStatusKey);
                     }
                 });
                 return; 
            }

            const mdMinusCycle = ['MD-1', 'MD-2', 'MD-3', 'MD-4', 'MD-5', 'MD-6']; 
            const mdPlusMap = ['MD+1', 'MD+2', 'MD+3', 'MD+4', 'MD+5', 'MD+6']; 
            let matchIndices = dayStatuses.map((status, index) => status === 'MD' ? index : -1).filter(index => index !== -1);

            for (const matchIdx of matchIndices) {
                 for (let j = 1; j <= 2; j++) { 
                      const currentIdx = (matchIdx + j) % 7;
                      
                      if (activityTypes[currentIdx] !== 'REST' && dayStatuses[currentIdx] !== 'MD') {
                           if (j === 1 || dayStatuses[currentIdx] !== 'MD+1') { 
                              dayStatuses[currentIdx] = mdPlusMap[j - 1]; 
                           }
                      }
                 }
            }
            
            for (const matchIdx of matchIndices) {
                 let currentMDMinus = 0;
                 
                 for (let j = 1; j <= 7; j++) {
                      let i = (matchIdx - j + 7) % 7; 
                      
                      if (activityTypes[i] === 'REST' || dayStatuses[i] === 'MD') {
                           break;
                      }
                      
                      if (currentMDMinus < 4) {
                           if (dayStatuses[i] !== 'MD+1' && dayStatuses[i] !== 'MD+2') {
                                dayStatuses[i] = mdMinusCycle[currentMDMinus];
                           }
                           currentMDMinus++;
                      } else {
                           break;
                      }
                 }
            }
            
            dayCells.forEach((cell, index) => {
                 let finalStatusKey = dayStatuses[index] || 'TRAIN'; 
                 
                 if (finalStatusKey.startsWith('MD+') && parseInt(finalStatusKey.substring(3)) > 2) {
                      finalStatusKey = 'TRAIN';
                 }

                 const currentActivity = activityTypes[index]; 
                 const style = COLOR_MAP[finalStatusKey] || COLOR_MAP['TRAIN'];
                 const mdStatusElement = cell.querySelector('.md-status');

                 mdStatusElement.textContent = style.status;
                 Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
                 mdStatusElement.classList.add(style.colorClass); 
                 cell.title = `Фаза: ${style.status}`; 

                 toggleDayInputs(index, currentActivity, isPlanActive); 
                 
                 const dailyTaskField = document.querySelector(`textarea[name="daily_task_${index}"]`);
                 if (dailyTaskField) {
                      const templateText = getTemplateText(finalStatusKey);
                      const currentTaskValue = dailyTaskField.value.trim();
                      const isGenericTemplate = currentTaskValue.includes('Фаза: MD') ||
                                                      currentTaskValue.includes('Повний відпочинок') ||
                                                      currentTaskValue.includes('Командне тренування') ||
                                                      currentTaskValue.includes('Загальнокомандне тренування');

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
             saveData();
         });
    });

    document.querySelectorAll('[name^="tasks_md_"]').forEach(textarea => { 
         textarea.addEventListener('input', updateCycleColors);
         textarea.addEventListener('change', saveData); 
    });
    
    document.querySelectorAll('input, select, textarea').forEach(input => {
         if (input.name.startsWith('activity_') || input.name.startsWith('tasks_md_')) {
             return;
         }

         input.addEventListener('change', saveData);
         input.addEventListener('input', saveData);
    });

    form.addEventListener('submit', (e) => {
         e.preventDefault();
         saveData(); 
    });

    // === ПОЧАТКОВИЙ ЗАПУСК ===
    initializeTemplates();
    loadData();
    updateCycleColors();
});
