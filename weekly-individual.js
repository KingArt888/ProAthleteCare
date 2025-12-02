// =========================================================
// weekly-individual.js - V22.4 (Виправлення логіки днів та автозаповнення)
// =========================================================

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
    
    // Допоміжна функція для отримання індексу дня з імені поля
    function getDayIndexFromName(name) {
        const indexMatch = name.match(/_(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/);
        if (indexMatch) {
            const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            return dayNames.indexOf(indexMatch[1]);
        }
        const indexNumMatch = name.match(/_(\d+)/);
        if (indexNumMatch) {
            return parseInt(indexNumMatch[1]);
        }
        return -1;
    }

    // =========================================================
    // ФУНКЦІЯ: ІНІЦІАЛІЗАЦІЯ ШАБЛОНІВ (Форматування для кращого вигляду)
    // =========================================================
    function initializeTemplates() {
        const templates = [
            { name: 'tasks_md_plus_2', defaultText: 
                `1. **Самомасаж (Ролінг/Перкусія):** 10 хв (фокус на квадрицепси, сідниці, спина).
2. **Мобілізація суглобів:** 15 хв (комплекс на гомілкостоп, тазостегновий суглоб).
3. **Легкий Стретчинг (статичний):** 15 хв.
4. **Гідратація:** Посилений контроль водного балансу.`
            },
            { name: 'tasks_md_plus_1', defaultText: 
                `1. **Кардіо в легкій зоні (LSD):** 20-30 хв (пульс 120-130 уд/хв) або велотренажер.
2. **Превентивні вправи:** 15 хв (зміцнення CORE та ротаторної манжети).
3. **Робота з м'ячем (легка):** Індивідуальні технічні елементи (30 хв).
4. **Харчування:** Підвищене споживання білка та вуглеводів.`
            },
            { name: 'tasks_md_minus_4', defaultText: 
                `1. **Силова активація:** 10 хв (динамічна розминка, активація сідничних м'язів).
2. **Тренування в залі (MAX Load):** 45-60 хв. Фокус на **максимальну/вибухову силу** ніг.
3. **Пліометрика:** 3-5 сетів, 5 повторень (боксові стрибки/бар'єри).`
            },
            { name: 'tasks_md_minus_3', defaultText: 
                `1. **CORE-тренування (функціональне):** 20 хв (планки, анти-ротаційні вправи).
2. **Швидкість (Спринти):** 5-7 x 30 м (95-100% інтенсивності), **повне відновлення**.
3. **Координація:** 10 хв (координаційні драбини).`
            },
            { name: 'tasks_md_minus_2', defaultText: 
                `1. **Зал (Верх Тіла):** 30 хв (фокус на баланс сили).
2. **Ігрові вправи:** Середня/Висока інтенсивність, фокус на **командну тактику/витривалість**.
3. **Ролінг:** 10 хв (для підтримки еластичності).`
            },
            { name: 'tasks_md_minus_1', defaultText: 
                `1. **Нейро активація:** 10 хв (сходи, реакція).
2. **Легка ігрова розминка:** 30 хв (з акцентом на швидкість).
3. **Пріоритет:** Якісний сон та відновлення (мінімум 8 годин).`
            }
        ];

        templates.forEach(template => {
            const textarea = document.querySelector(`textarea[name="${template.name}"]`);
            if (textarea && textarea.value.trim() === '') {
                textarea.value = template.defaultText;
                console.log(`[INIT] Заповнено шаблон: ${template.name}`); 
            }
        });
    }

    // =========================================================
    // ФУНКЦІЯ: ОТРИМАННЯ ШАБЛОНУ
    // =========================================================
    function getTemplateText(status) {
        if (status === 'MD') return 'Матч: Індивідуальна розминка/завершення гри';
        if (status === 'REST') return 'Повний відпочинок, відновлення, сон.';
        
        let fieldName = '';
        if (status.startsWith('MD+')) {
            fieldName = `tasks_md_plus_${status.charAt(3)}`;
        } else if (status.startsWith('MD-')) {
            fieldName = `tasks_md_minus_${status.charAt(3)}`;
        } else {
             return ''; 
        }

        const templateElement = document.querySelector(`textarea[name="${fieldName}"]`);
        
        if (!templateElement) {
             return '';
        }

        // Додаємо заголовок фази перед шаблоном
        const phaseTitle = `**Фаза: ${status}**\n`;
        return phaseTitle + templateElement.value.trim(); 
    }

    // =========================================================
    // ФУНКЦІЯ: toggleDayInputs (Заборона введення для відпочинку/матчу)
    // =========================================================
    function toggleDayInputs(dayIndex, activityType, isPlanActive) {
        // ... (Логіка toggleDayInputs залишається такою ж, як у V22.3)
        try {
            const isDisabledOverall = !isPlanActive;
            const currentDayIndexStr = dayIndex.toString();
            
            const fieldPrefixesToDisable = [
                'opponent', 'venue', 'travel_km' 
            ];

            if (dayIndex !== null && dayIndex !== -1) {
                 const dailyTaskField = document.querySelector(`[name="daily_task_${currentDayIndexStr}"]`);
                 if (dailyTaskField) {
                      const shouldDisable = (activityType === 'REST' && isPlanActive);
                      dailyTaskField.disabled = shouldDisable;
                      if (shouldDisable) {
                          dailyTaskField.classList.add('day-disabled');
                      } else {
                          dailyTaskField.classList.remove('day-disabled');
                      }
                 }
            }


            fieldPrefixesToDisable.forEach(prefix => {
                const element = document.querySelector(`[name="${prefix}_${currentDayIndexStr}"]`);
                if (element) {
                     let shouldBeDisabled = false;
                     
                     if (isDisabledOverall) {
                         shouldBeDisabled = true; 
                     } else if (activityType !== 'MATCH') {
                         shouldBeDisabled = true;
                     }
                     
                     element.disabled = shouldBeDisabled;
                     
                     if (shouldBeDisabled) {
                         element.classList.add('day-disabled');
                     } else {
                         element.classList.remove('day-disabled');
                     }
                }
            });
            
            const opponentField = document.querySelector(`[name="opponent_${currentDayIndexStr}"]`);
            if (opponentField) opponentField.disabled = activityType !== 'MATCH';

        } catch (e) {
            console.error("Помилка у toggleDayInputs:", e);
        }
    }


    // =========================================================
    // ФУНКЦІЯ: resetCycleAfterRest (Перерахунок MD-фаз після дня відпочинку)
    // =========================================================
    function resetCycleAfterRest(days, activityTypes, matchDays) {
        const updatedDays = [...days]; 
        
        // Знайти останній матч
        let lastMatchIndex = -1;
        matchDays.forEach(idx => {
            if (idx > lastMatchIndex) lastMatchIndex = idx;
        });

        for (let i = 0; i < 7; i++) {
            if (activityTypes[i] === 'REST') {
                
                let nextMatchIndex = -1;
                for (let k = i + 1; k < 7; k++) {
                    if (matchDays.includes(k)) {
                        nextMatchIndex = k;
                        break;
                    }
                }
                
                // Якщо REST після останнього матчу і немає наступного матчу в циклі
                if (i > lastMatchIndex && nextMatchIndex === -1 && lastMatchIndex !== -1) {
                     // Все, що після останнього матчу до кінця циклу (НД), залишається MD+3 (TRAIN)
                     for (let j = i + 1; j < 7; j++) {
                          if (activityTypes[j] !== 'REST') updatedDays[j] = 'TRAIN';
                     }
                     continue; 
                }

                if (nextMatchIndex === -1) {
                     // Якщо REST, але немає майбутніх матчів, то всі дні TRAIN
                     for (let j = i + 1; j < 7; j++) {
                          if (activityTypes[j] !== 'REST') updatedDays[j] = 'TRAIN';
                     }
                     continue; 
                }

                // Перерахунок до наступного матчу (MD-X)
                for (let j = i + 1; j < nextMatchIndex; j++) {
                    
                    if (activityTypes[j] === 'REST') {
                         updatedDays[j] = 'REST';
                         continue; 
                    }
                    
                    const offset = nextMatchIndex - j; 
                    
                    if (offset > 0 && offset <= 4) {
                        updatedDays[j] = `MD-${offset}`;
                    } else if (offset > 4) {
                        updatedDays[j] = 'MD-4';
                    }
                }
            }
        }

        return updatedDays;
    }


    // =========================================================
    // ФУНКЦІЯ: updateMatchDetails (Додавання/видалення блоку деталей матчу + Accessibility Fix)
    // =========================================================
    function updateMatchDetails(dayIndex, activityType) {
        const existingBlock = dynamicMatchFields.querySelector(`.match-detail-block[data-day-index="${dayIndex}"]`);
        const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота', 'Неділя'];
        const dayName = dayNames[dayIndex];

        if (activityType === 'MATCH' && dynamicMatchFields && !existingBlock && dayIndex !== -1) {
            const detailsHTML = `
                <div class="match-detail-block" data-day-index="${dayIndex}">
                    <h4>День ${dayIndex * 1 + 1}: ${dayName} (Матч)</h4>
                    <label for="opponent-${dayIndex}">Суперник:</label>
                    <input type="text" name="opponent_${dayIndex}" id="opponent-${dayIndex}" required>
                    <label for="venue-${dayIndex}">Місце проведення:</label>
                    <select name="venue_${dayIndex}" id="venue-${dayIndex}">
                        <option value="Home">Вдома</option>
                        <option value="Away">На виїзді</option>
                    </select>
                    <label for="travel-km-${dayIndex}">Відстань поїздки (км):</label>
                    <input type="number" name="travel_km_${dayIndex}" id="travel-km-${dayIndex}" value="0" min="0">
                </div>
            `;
            dynamicMatchFields.insertAdjacentHTML('beforeend', detailsHTML);
        } else if (activityType !== 'MATCH' && existingBlock) {
            existingBlock.remove();
        }
        
        const isPlanActive = document.querySelectorAll('.activity-type-select[value="MATCH"]').length > 0;
        if (dayIndex !== -1) {
           toggleDayInputs(dayIndex, activityType, isPlanActive);
        }
    }

    // =========================================================
    // ФУНКЦІЯ: loadData (Виправлення логіки визначення індексу)
    // =========================================================
    function loadData() {
        try {
            const savedData = localStorage.getItem(STORAGE_KEY);
            if (!savedData) return;

            const data = JSON.parse(savedData);
            
            Object.keys(data).forEach(name => {
                const element = form.querySelector(`[name="${name}"]`);
                if (element) {
                    element.value = data[name];
                    
                    if (element.tagName === 'SELECT' && element.classList.contains('activity-type-select')) {
                        const dayIndex = getDayIndexFromName(name);
                        if (dayIndex !== -1) {
                            updateMatchDetails(dayIndex, data[name]); 
                        }
                    }
                }
            });

        } catch (e) {
            console.error("Помилка при завантаженні даних:", e);
        }
    }

    // =========================================================
    // ФУНКЦІЯ: updateCycleColors (Головний розрахунок MD-фаз та автозаповнення)
    // =========================================================
    function updateCycleColors() {
        try {
            let activityTypes = [];
            let matchDays = [];

            activitySelects.forEach((select, index) => {
                activityTypes[index] = select.value;
                if (select.value === 'MATCH') {
                    matchDays.push(index); 
                }
            });
            
            const isPlanActive = matchDays.length > 0;
            let dayStatuses = new Array(7).fill('TRAIN'); 

            // 1. Стандартний розрахунок MD-фаз (MD+X / MD-X)
            dayCells.forEach((cell, index) => {
                if (matchDays.includes(index)) {
                    dayStatuses[index] = 'MD';
                } else if (isPlanActive) { 
                    
                    let minOffset = 7;
                    let isPostMatch = false; 
                    
                    matchDays.forEach(mdIndex => {
                        const offsetForward = (index - mdIndex + 7) % 7; 
                        const offsetBackward = (mdIndex - index + 7) % 7; 
                        
                        if (offsetForward > 0 && offsetForward <= 3) { 
                            if (offsetForward < minOffset) {
                                minOffset = offsetForward;
                                isPostMatch = true;
                            }
                        } 
                        else if (offsetBackward > 0 && offsetBackward <= 4) { 
                            if (offsetBackward < minOffset) {
                                minOffset = offsetBackward;
                                isPostMatch = false;
                            }
                        }
                    });

                    if (minOffset <= 4 && minOffset > 0) { 
                        dayStatuses[index] = isPostMatch ? `MD+${minOffset}` : `MD-${minOffset}`; 
                    } else {
                        dayStatuses[index] = 'TRAIN';
                    }
                } else {
                     dayStatuses[index] = 'TRAIN';
                }
            });


            // 2. Коригування циклу після дня відпочинку
            let finalStatuses = dayStatuses;

            if (activityTypes.includes('REST') && isPlanActive) {
                finalStatuses = resetCycleAfterRest(dayStatuses, activityTypes, matchDays);
            }
            
            // Застосовуємо REST, якщо обрано (перезаписуємо MD-статус)
            for(let i = 0; i < 7; i++) {
                if(activityTypes[i] === 'REST') {
                    finalStatuses[i] = 'REST';
                }
            }


            // 3. ФІНАЛЬНЕ ОНОВЛЕННЯ КОЛЬОРІВ ТА АВТОЗАПОВНЕННЯ ПОЛІВ
            dayCells.forEach((cell, index) => {
                const mdStatusElement = cell.querySelector('.md-status');
                
                const statusKey = finalStatuses[index] || 'TRAIN'; 
                const currentActivity = activitySelects[index].value;
                
                const style = COLOR_MAP[statusKey] || COLOR_MAP['TRAIN'];
                mdStatusElement.textContent = style.status;
                
                Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
                mdStatusElement.classList.add(style.colorClass); 

                cell.title = `Фаза: ${style.status}`; 

                toggleDayInputs(index, currentActivity, isPlanActive); 
                
                const dailyTaskField = document.querySelector(`textarea[name="daily_task_${index}"]`);
                
                if (dailyTaskField) {
                     const templateText = getTemplateText(statusKey);
                     
                     if (templateText) {
                          // Перезаписуємо з оновленим форматуванням
                          dailyTaskField.value = templateText;
                     } 
                     else if (currentActivity === 'TRAIN' || (!isPlanActive && statusKey === 'TRAIN')) {
                          dailyTaskField.value = 'Загальнокомандне тренування: Специфічні вправи вводити вручну.';
                     }
                     else if (currentActivity === 'REST') {
                          dailyTaskField.value = getTemplateText('REST'); // Для гарантії
                     }
                     else {
                          dailyTaskField.value = ''; 
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
            // Отримуємо індекс з HTML-таблиці
            const dayIndex = parseInt(event.target.closest('td').dataset.dayIndex); 
            const activityType = event.target.value;
            
            updateCycleColors(); 
            updateMatchDetails(dayIndex, activityType); 
        });
    });

    document.querySelectorAll('#recovery-details-container textarea').forEach(textarea => {
        textarea.addEventListener('input', updateCycleColors);
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
