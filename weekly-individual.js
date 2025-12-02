// =========================================================
// weekly_plan_logic.js - ФІНАЛЬНА ВЕРСІЯ З ФІКСОМ SCOPE
// =========================================================

// МАПА КОЛЬОРІВ ТА СТАТУСІВ MD+X / MD-X (Оголошена глобально)
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

// =========================================================
// ОСНОВНИЙ КОД: ВСЕ ВСЕРЕДИНІ DOMContentLoaded
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // === 1. ОГОЛОШЕННЯ ЗМІННИХ (activitySelects, dayCells) ===
    // ЦЕ КРИТИЧНО: ЗМІННІ ДОСТУПНІ ТІЛЬКИ ТУТ
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dynamicMatchFields = document.getElementById('dynamic-match-fields');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');

    // === 2. ОБРОБНИКИ ПОДІЙ ===

    activitySelects.forEach(select => {
        select.addEventListener('change', (event) => {
            console.log('--- Зміна активності виявлена! ---');
            updateCycleColors(); 
            updateMatchDetails(event.target.closest('td').dataset.dayIndex, event.target.value); 
        });
    });

    // === 3. ФУНКЦІЯ ДЛЯ ДЕТАЛЕЙ МАТЧУ (винесена для чистоти) ===
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
    }


    // === 4. ЛОГІКА РОЗРАХУНКУ MD+X/MD-X та КОЛЬОРІВ (винесена для чистоти) ===

    function updateCycleColors() {
        const matchDays = [];
        activitySelects.forEach((select, index) => {
            if (select.value === 'MATCH') {
                matchDays.push(index); 
            }
        });
        
        console.log('Дні матчів (Індекси):', matchDays); 

        dayCells.forEach((cell, index) => {
            const mdStatusElement = cell.querySelector('.md-status');
            let statusKey = 'REST'; 

            if (matchDays.includes(index)) {
                statusKey = 'MD';
            } else if (matchDays.length > 0) {
                
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
                    } else if (offsetBackward > 0 && offsetBackward < 7) { 
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
            }

            // ЗАСТОСУВАННЯ СТИЛІВ
            const style = COLOR_MAP[statusKey] || COLOR_MAP['REST'];
            mdStatusElement.textContent = style.status;
            
            Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
            mdStatusElement.classList.add(style.colorClass); 

            cell.title = `Фаза: ${style.status}`; 
            console.log(`День ${index}: Статус: ${style.status}, Клас: ${style.colorClass}`); 
        });
    }

    console.log('--- Сторінка завантажена, початковий розрахунок ---');
    updateCycleColors(); 
}); // <--- ЗАКРИВАЮЧА ДУЖКА ДЛЯ DOMContentLoaded
