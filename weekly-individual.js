// =========================================================
// weekly_plan_logic.js - ФІНАЛЬНА ВИПРАВЛЕНА ЛОГІКА
// =========================================================

// МАПА КОЛЬОРІВ ТА СТАТУСІВ MD+X / MD-X
const COLOR_MAP = {
    'MD': { status: 'MD', colorClass: 'color-red' },
    'MD+1': { status: 'MD+1', colorClass: 'color-dark-green' }, 
    'MD+2': { status: 'MD+2', colorClass: 'color-green' }, 
    'MD+3': { status: 'MD+3', colorClass: 'color-neutral' }, // Виходить за межі 7-денного MD-4 - MD+2
    
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

    // === 1. ОБРОБНИКИ ПОДІЙ ===

    activitySelects.forEach(select => {
        select.addEventListener('change', (event) => {
            const dayIndex = event.target.closest('td').dataset.dayIndex;
            
            updateCycleColors(); 
            updateMatchDetails(dayIndex, event.target.value); 
        });
    });

    // === 2. ФУНКЦІЯ ДЛЯ ДЕТАЛЕЙ МАТЧУ (без змін) ===
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


    // === 3. ОСНОВНА ВИПРАВЛЕНА ЛОГІКА РОЗРАХУНКУ MD+X/MD-X та КОЛЬОРІВ ===

    function updateCycleColors() {
        const matchDays = [];
        activitySelects.forEach((select, index) => {
            if (select.value === 'MATCH') {
                matchDays.push(index); 
            }
        });

        // 3.1. Ітеруємо по кожному дню
        dayCells.forEach((cell, index) => {
            const mdStatusElement = cell.querySelector('.md-status');
            let statusKey = 'REST'; 

            if (matchDays.includes(index)) {
                // Це день матчу
                statusKey = 'MD';
            } else if (matchDays.length > 0) {
                
                let bestMatchDay = -1;
                let minOffset = 7;
                let isPostMatch = false; // Визначає, чи є це MD+X (True) чи MD-X (False)
                
                // Проходимо по всіх MD, щоб знайти найближчий MD та його фазу
                matchDays.forEach(mdIndex => {
                    
                    // Обчислення відстані вперед (MD+X)
                    const offsetForward = (index - mdIndex + 7) % 7;
                    
                    // Обчислення відстані назад (MD-X)
                    const offsetBackward = (mdIndex - index + 7) % 7; 
                    
                    // 1. Пріоритет MD+X (Відновлення йде відразу після матчу)
                    if (offsetForward > 0 && offsetForward <= 3) { // MD+1, MD+2, MD+3
                        if (offsetForward < minOffset) {
                            minOffset = offsetForward;
                            isPostMatch = true;
                        }
                    } 
                    
                    // 2. Якщо це не MD+X, перевіряємо MD-X (Підготовка до наступного матчу)
                    else if (offsetBackward > 0 && offsetBackward < 7) { // MD-1, MD-2, MD-3, MD-4...
                        if (offsetBackward <= 4) { // Обмежуємо MD-4
                            if (offsetBackward < minOffset) {
                                minOffset = offsetBackward;
                                isPostMatch = false;
                            }
                        }
                    }
                });

                // Призначаємо статус MD+X/MD-X
                if (minOffset <= 4 && minOffset > 0) { 
                    statusKey = isPostMatch ? `MD+${minOffset}` : `MD-${minOffset}`;
                }
            }

            // 3.2. ЗАСТОСУВАННЯ СТИЛІВ (Фінальне виправлення)
            const style = COLOR_MAP[statusKey] || COLOR_MAP['REST']; // Захист від undefined
            mdStatusElement.textContent = style.status;
            
            // Видаляємо всі класи кольорів, що існують, з SPAN
            Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
            
            // Додаємо новий клас до SPAN
            mdStatusElement.classList.add(style.colorClass); 

            cell.title = `Фаза: ${style.status}`; 
        });
    }

    // Початковий запуск логіки при завантаженні
    updateCycleColors(); 
});
