// =========================================================
// weekly-individual.js - ФІНАЛЬНА ВЕРСІЯ (V16.0: Підтягує ВСІ MD-статуси)
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
    'TRAIN': { status: 'TRAIN', colorClass: 'color-neutral' },
};

document.addEventListener('DOMContentLoaded', () => {
    
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dynamicMatchFields = document.getElementById('dynamic-match-fields');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    
    // ФУНКЦІЯ ОТРИМАННЯ ШАБЛОНУ: Отримує актуальний текст з textarea
    function getTemplateText(status) {
        if (status === 'MD') return 'Матч: Індивідуальна розминка/завершення гри';
        if (status === 'REST') return 'Повний відпочинок, відновлення, сон.';
        
        let fieldName = '';
        if (status.startsWith('MD+')) {
            fieldName = `tasks_md_plus_${status.charAt(3)}`;
        } else if (status.startsWith('MD-')) {
            fieldName = `tasks_md_minus_${status.charAt(3)}`;
        }

        const templateElement = document.querySelector(`textarea[name="${fieldName}"]`);
        // Використовуємо .value, щоб отримати актуальний текст
        return templateElement ? templateElement.value.trim() : ''; 
    }

    // =========================================================
    // ФУНКЦІЯ 1: ВИМКНЕННЯ ПОЛІВ
    // (Без змін)
    // =========================================================

    function toggleDayInputs(dayIndex, activityType, isPlanActive) {
        
        const isDisabledOverall = !isPlanActive;
        const allFormElements = document.body.querySelectorAll('input, select, textarea');
        const currentDayIndexStr = dayIndex.toString();
        
        const fieldPrefixesToDisable = [
            'daily_task',       
            'tasks',            
            'cardio',           
            'opponent',         
            'venue',            
            'travel_km'         
        ];

        allFormElements.forEach(element => {
            const elementName = element.name || '';
            
            if (element.classList.contains('activity-type-select')) {
                return; 
            }

            let shouldBeDisabled = false;
            
            const isFieldRelatedToDay = fieldPrefixesToDisable.some(prefix => 
                elementName.startsWith(prefix) && (elementName.endsWith(`_${currentDayIndexStr}`))
            );
            
            const isFieldRelatedToMDPlus2 = (elementName.includes('md_plus_2')); 
            
            const isFieldRelevant = isFieldRelatedToDay || isFieldRelatedToMDPlus2;
            
            
            if (isDisabledOverall) {
                shouldBeDisabled = true; 
            } 
            else if (isFieldRelevant) {
                
                if (activityType === 'REST') {
                    shouldBeDisabled = true; 
                } 
                
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
    // ФУНКЦІЯ 2: ПЕРЕРИВАННЯ ЦИКЛУ (Без змін)
    // =========================================================

    function resetCycleAfterRest(days, activityTypes, matchDays) {
        const updatedDays = [...days]; 

        for (let i = 0; i < 7; i++) {
            if (activityTypes[i] === 'REST') {
                
                let nextMatchIndex = -1;
                for (let k = i + 1; k < 7; k++) {
                    if (matchDays.includes(k)) {
                        nextMatchIndex = k;
                        break;
                    }
                }

                if (nextMatchIndex === -1) {
                    continue; 
                }

                for (let j = i + 1; j < 7; j++) {
                    
                    if (j === nextMatchIndex) {
                        updatedDays[j] = 'MD'; 
                        break; 
                    }

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
    // ФУНКЦІЯ 4: РОЗРАХУНОК КОЛЬОРУ ЦИКЛУ та АВТОЗАПОВНЕННЯ (V16.0)
    // =========================================================
    
    function updateCycleColors() {
