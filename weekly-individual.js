// =========================================================
// weekly-individual.js - ОСТАТОЧНА ВЕРСІЯ (V8.0: ФІКС ПОШУКУ ПОЛІВ)
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
    
    // === ВИЗНАЧЕННЯ КРИТИЧНИХ ЗМІННИХ ===
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dynamicMatchFields = document.getElementById('dynamic-match-fields');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    // ===========================================

    // =========================================================
    // ФУНКЦІЯ 1: ВИМКНЕННЯ ПОЛІВ (V8.0 - НАЙНАДІЙНІШИЙ ПОШУК ЗА NAME)
    // =========================================================

    function toggleDayInputs(dayIndex, activityType, isPlanActive) {
        
        const isDisabledOverall = !isPlanActive;
        // Шукаємо ВСІ поля введення у всьому документі
        const allFormElements = document.body.querySelectorAll('input, select, textarea');
        const currentDayIndexStr = dayIndex.toString();

        allFormElements.forEach(element => {
            const elementName = element.name || '';
            
            // Ігноруємо сам селектор активності
            if (element.classList.contains('activity-type-select')) {
                return; 
            }

            let shouldBeDisabled = false;
            
            // 1. Встановлюємо, чи поле належить поточному Дню/Індексу
            // Шукаємо name, що закінчується на _0, _1, ... _6
            const isFieldRelatedToDay = elementName.endsWith(`_${currentDayIndexStr}`);
            
            // 2. Додаткова перевірка для полів MD+2 (якщо вони окремі)
            const isFieldRelatedToMDPlus2 = (dayIndex === 6 && elementName.includes('md_plus_2'));
            
            const isFieldRelevant = isFieldRelatedToDay || isFieldRelatedToMDPlus2;
            
            
            // 3. Встановлюємо стан disabled
            
            if (isDisabledOverall) {
                shouldBeDisabled = true; // Вимкнути все, якщо MD не обрано
            } 
            else if (isFieldRelevant) {
                
                // Правило I: Вимкнути для "Відпочинку" (REST)
                if (activityType === 'REST') {
                    shouldBeDisabled = true; 
                } 
                
                // Правило II: Вимкнути деталі матчу, якщо це не день матчу
                // Перевірка, чи це одне з динамічних полів матчу: opponent_X, venue_X, travel_km_X
                else if (activityType !== 'MATCH' && (elementName.startsWith('opponent_') || elementName.startsWith('venue_') || elementName.startsWith('travel_km_'))) {
                     shouldBeDisabled = true;
                }
            }
            
            element.disabled = shouldBeDisabled;
            
            if (shouldBeDisabled) {
                element.classList.add('day-disabled');
            } else {
                element.classList.remove('day-disabled');
            }
        });
    }

    // =========================================================
    // ФУНКЦІЯ 2: ПЕРЕРИВАННЯ ЦИКЛУ ТА ВІДЛІК ДО НАСТУПНОГО МАТЧУ (Без змін)
    // =========================================================

    function resetCycleAfterRest(days, matchDays) {
        let nextMatchIndex = -1;
        
        for (let i = 0; i < 7; i++) {
            if (matchDays.includes(i)) {
                nextMatchIndex = i;
                break; 
            }
        }

        if (nextMatchIndex === -1) return days; 

        const updatedDays = [...days]; 

        for (let i = 0; i < 7; i++) {
            if (activitySelects[i].value === 'REST') { // Використовуємо реальне значення
                
                for (let j = i + 1; j < 7; j++) {
                    
                    const offset = (nextMatchIndex - j + 7) % 7; 
                    
                    if (offset > 0 && offset <= 4) {
                        updatedDays[j] = `MD-${offset}`;
                    } else if (offset === 0) {
                        updatedDays[j] = 'MD'; 
                        break; 
                    } else {
                        updatedDays[j] = 'MD-4'; 
                    }
                    
                    if (j === 6 && updatedDays[j] !== 'MD') {
                        break; 
                    }
                }
                
            }
        }

        return updatedDays;
    }


    // =========================================================
    // ФУНКЦІЯ 3: ОНОВЛЕННЯ ДЕТАЛЕЙ МАТЧУ (Без змін)
    // =========================================================

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
        
        const isPlanActive = document.querySelectorAll('.activity-type-select[value="MATCH"]').length > 0;
        toggleDayInputs(dayIndex, activityType, isPlanActive);
    }
    
    // =========================================================
    // ФУНКЦІЯ 4: РОЗРАХУНОК КОЛЬОРУ ЦИКЛУ (Оновлена)
    // =========================================================
    
    function updateCycleColors() {
        let activityTypes = [];
        let matchDays = [];

        activitySelects.forEach((select, index) => {
            activityTypes[index] = select.value;
            if (select.value === 'MATCH') {
                matchDays.push(index); 
            }
        });
        
        const isPlanActive = matchDays.length > 0;
        let dayStatuses = new Array(7).fill('REST'); 

        // 1. Стандартний розрахунок MD+X/MD-X
        dayCells.forEach((cell, index) => {
            if (matchDays.includes(index)) {
                dayStatuses[index] = 'MD';
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
                    dayStatuses[index] = isPostMatch ? `MD+${minOffset}` : `MD-${minOffset}`; 
                }
            }
            // Якщо обрано REST у селекторі, це поки що не впливає на колір.
        });


        // 2. ПЕРЕРИВАННЯ ЦИКЛУ: Перезапускаємо відлік до наступного матчу, якщо було REST
        let finalStatuses = dayStatuses;

        if (activityTypes.includes('REST') && isPlanActive) {
            finalStatuses = resetCycleAfterRest(dayStatuses, matchDays);
        }

        // 3. ФІНАЛЬНЕ ОНОВЛЕННЯ КОЛЬОРІВ ТА ПОЛІВ
        dayCells.forEach((cell, index) => {
            const mdStatusElement = cell.querySelector('.md-status');
            
            // Встановлюємо статус з фінального масиву АБО використовуємо REST, якщо обрано REST у селекторі
            let statusKey = finalStatuses[index] || 'REST'; 
            
            // Якщо селектор - REST, колір має бути REST, незалежно від розрахунку
            if (activitySelects[index].value === 'REST') {
                statusKey = 'REST'; 
            }
            
            const style = COLOR_MAP[statusKey] || COLOR_MAP['REST'];
            mdStatusElement.textContent = style.status;
            
            Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
            mdStatusElement.classList.add(style.colorClass); 

            cell.title = `Фаза: ${style.status}`; 

            const currentActivity = activitySelects[index].value;
            // Викликаємо функцію вимкнення полів
            toggleDayInputs(index, currentActivity, isPlanActive); 
        });
    }


    // === ІНІЦІАЛІЗАЦІЯ ОБРОБНИКІВ ===
    activitySelects.forEach(select => {
        select.addEventListener('change', (event) => {
            const dayIndex = parseInt(event.target.closest('td').dataset.dayIndex); 
            const activityType = event.target.value;
            
            updateCycleColors(); 
            updateMatchDetails(dayIndex, activityType); 
        });
    });

    // === ПОЧАТКОВИЙ ЗАПУСК ===
    updateCycleColors(); 
});
