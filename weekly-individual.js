// =========================================================
// weekly_plan_logic.js - ФІНАЛЬНА ВЕРСІЯ: ВИМКНЕННЯ ВСІХ ПОВ'ЯЗАНИХ ПОЛІВ
// =========================================================

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
};

document.addEventListener('DOMContentLoaded', () => {
    
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dynamicMatchFields = document.getElementById('dynamic-match-fields');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    const microcycleTable = document.querySelector('.microcycle-table'); 
    const weeklyPlanForm = document.getElementById('weekly-plan-form'); // Знайдемо всю форму

    activitySelects.forEach(select => {
        select.addEventListener('change', (event) => {
            const dayIndex = event.target.closest('td').dataset.dayIndex;
            const activityType = event.target.value;
            
            console.log('--- Зміна активності виявлена! ---');
            
            updateCycleColors(); 
            updateMatchDetails(dayIndex, activityType); 
        });
    });

    // =========================================================
    // МОДИФІКОВАНА ФУНКЦІЯ: ВИМКНЕННЯ ПОЛІВ
    // Вмикає/вимикає поля, що знаходяться поза таблицею, але пов'язані з MD/REST
    // =========================================================

    function toggleDayInputs(dayIndex, activityType, isPlanActive) {
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const currentDayName = dayNames[dayIndex];
        
        // Вимикаємо ВСІ поля, якщо план не активний (не обрано жодного MD)
        // АБО якщо для цього дня обрано "Відпочинок"
        const isDisabled = !isPlanActive || activityType === 'REST';

        // 1. Обробка полів усередині сітки (activity-row)
        const dayColumn = microcycleTable.querySelector(`td[data-day-index="${dayIndex}"]`);
        if (dayColumn) {
            const controllableElements = dayColumn.querySelectorAll('input, select, textarea');
            controllableElements.forEach(element => {
                if (element.classList.contains('activity-type-select')) {
                    return; 
                }
                element.disabled = isDisabled;
                if (isDisabled) {
                    element.classList.add('day-disabled');
                } else {
                    element.classList.remove('day-disabled');
                }
            });
        }
        
        // 2. Обробка полів у розділі Деталі Матчу/Відновлення (якщо вони існують)
        // Шукаємо поля за ім'ям, що містить індекс або назву дня
        const fieldsToToggle = weeklyPlanForm.querySelectorAll(`input[name*="_${dayIndex}"], select[name*="_${dayIndex}"]`);
        
        // Спеціальний випадок для MD+2 (НД) - індекс 6
        if (dayIndex == 6) {
             const recoveryFields = weeklyPlanForm.querySelectorAll('input[name*="md_plus_2"]');
             recoveryFields.forEach(field => {
                 field.disabled = isDisabled;
                 if (isDisabled) {
                    field.classList.add('day-disabled');
                 } else {
                    field.classList.remove('day-disabled');
                 }
             });
        }


        // 3. Обробляємо всі інші поля, пов'язані з індексом дня
        fieldsToToggle.forEach(element => {
            // Якщо поле входить до динамічного блоку деталей матчу
            if (element.closest(`.match-detail-block[data-day-index="${dayIndex}"]`)) {
                // Вмикаємо/Вимикаємо, але ТІЛЬКИ якщо це не MD (MATCH) і план активний
                element.disabled = !isPlanActive || activityType !== 'MATCH';
                
                if (element.disabled) {
                    element.classList.add('day-disabled');
                } else {
                    element.classList.remove('day-disabled');
                }
            }
        });
    }

    // ... Функції updateMatchDetails, updateCycleColors залишаються, але з одним виправленням:
    // Потрібно переконатися, що toggleDayInputs викликається з трьома аргументами у updateCycleColors
    
    // =========================================================
    // MODIFIED LOGIC: updateCycleColors (ВИКЛИК ФУНКЦІЇ)
    // =========================================================

    function updateCycleColors() {
        let matchDays = [];
        activitySelects.forEach((select, index) => {
            if (select.value === 'MATCH') {
                matchDays.push(index); 
            }
        });
        
        const isPlanActive = matchDays.length > 0;
        
        console.log('Дні матчів (Індекси):', matchDays); 
        console.log('План Активний:', isPlanActive);

        dayCells.forEach((cell, index) => {
            const mdStatusElement = cell.querySelector('.md-status');
            let statusKey = 'REST'; 

            if (matchDays.includes(index)) {
                statusKey = 'MD';
            } else if (isPlanActive) { 
                
                let minOffset = 7;
                let isPostMatch = false; 
                
                matchDays.forEach(mdIndex => {
                    const offsetForward = (index - mdIndex + 7) % 7;
                    const offsetBackward = (mdIndex - index + 7) % 7; 
                    
                    if (offsetForward > 0 && offsetForward <= 2) { 
                        if (offsetForward < minOffset) {
                            minOffset = offsetForward;
                            isPostMatch = true;
                        }
                    } 
                    else if (offsetBackward > 0 && offsetBackward < 7) { 
                        if (offsetBackward <= 4) { 
                            if (offsetBackward < minOffset) {
                                minOffset = offsetBackward;
                                isPostMatch = false;
                            }
                        }
                    }
                });

                if (minOffset <= 4 && minOffset > 0) { 
                    statusKey = isPostMatch ? `MD+${minOffset}` : `MD-${minOffset}`;
                }
            } else {
                 statusKey = 'REST'; 
            }

            // ЗАСТОСУВАННЯ СТИЛІВ
            const style = COLOR_MAP[statusKey] || COLOR_MAP['REST'];
            mdStatusElement.textContent = style.status;
            
            Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
            mdStatusElement.classList.add(style.colorClass); 

            cell.title = `Фаза: ${style.status}`; 
            console.log(`День ${index}: Статус: ${style.status}, Клас: ${style.colorClass}`); 

            // === ВИКЛИК З ТРЬОМА АРГУМЕНТАМИ ===
            const currentActivity = activitySelects[index].value;
            toggleDayInputs(index, currentActivity, isPlanActive); 
        });
    }

    // ... Функції updateMatchDetails (без змін)
    function updateMatchDetails(dayIndex, activityType) {
        const existingBlock = dynamicMatchFields.querySelector(`.match-detail-block[data-day-index="${dayIndex}"]`);
        const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота', 'Неділя'];
        const dayName = dayNames[dayIndex];

        if (activityType === 'MATCH' && !existingBlock) {
            const detailsHTML = `
                <div class="match-detail-block" data-day-index="${dayIndex}">
                    <h4>День ${dayIndex * 1 + 1}: ${dayName} (Матч)</h4>
                    <label>Суперник:</label>
                    <input type="text" name="opponent_${dayIndex}" required>
                    <label>Місце проведення:</label>
                    <select name="venue_${dayIndex}">
                        <option value="Home">Вдома</option>
                        <option value="Away">На виїзді</option>
                    </select>
                    <label>Відстань поїздки (км):</label>
                    <input type="number" name="travel_km_${dayIndex}" value="0" min="0">
                </div>
            `;
            dynamicMatchFields.insertAdjacentHTML('beforeend', detailsHTML);
        } else if (activityType !== 'MATCH' && existingBlock) {
            existingBlock.remove();
        }
        // Після додавання/видалення деталей матчу, перевіряємо стан active/disabled
        // Це забезпечить коректне відображення disabled, якщо план неактивний або день REST
        const isPlanActive = document.querySelectorAll('.activity-type-select[value="MATCH"]').length > 0;
        toggleDayInputs(dayIndex, activityType, isPlanActive);
    }
    // ...
    
    console.log('--- Сторінка завантажена, початковий розрахунок ---');
    updateCycleColors(); 
});
