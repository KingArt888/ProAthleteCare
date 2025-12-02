// =========================================================
// weekly_plan_logic.js - ФІНАЛЬНА ВИПРАВЛЕНА ЛОГІКА
// =========================================================

// МАПА КОЛЬОРІВ ТА СТАТУСІВ MD+X / MD-X (БЕЗ ЗМІН)
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
    // ... Ініціалізація змінних без змін ...

    activitySelects.forEach(select => {
        select.addEventListener('change', (event) => {
            console.log('--- Зміна активності виявлена! ---'); // <--- ДІАГНОСТИКА
            updateCycleColors(); 
            updateMatchDetails(event.target.closest('td').dataset.dayIndex, event.target.value); 
        });
    });

    // ... функція updateMatchDetails без змін ...


    // === 3. ОСНОВНА ВИПРАВЛЕНА ЛОГІКА РОЗРАХУНКУ MD+X/MD-X та КОЛЬОРІВ ===

    function updateCycleColors() {
        const matchDays = [];
        activitySelects.forEach((select, index) => {
            if (select.value === 'MATCH') {
                matchDays.push(index); 
            }
        });
        
        console.log('Дні матчів (Індекси):', matchDays); // <--- ДІАГНОСТИКА

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
                    
                    if (offsetForward > 0 && offsetForward <= 3) { // MD+1, MD+2, MD+3
                        if (offsetForward < minOffset) {
                            minOffset = offsetForward;
                            isPostMatch = true;
                        }
                    } else if (offsetBackward > 0 && offsetBackward < 7) { 
                        if (offsetBackward <= 4) { // MD-1, MD-2, MD-3, MD-4
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

            // 3.2. ЗАСТОСУВАННЯ СТИЛІВ
            const style = COLOR_MAP[statusKey] || COLOR_MAP['REST'];
            mdStatusElement.textContent = style.status;
            
            // Видаляємо всі класи кольорів, що існують, з SPAN
            Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
            
            // Додаємо новий клас до SPAN
            mdStatusElement.classList.add(style.colorClass); 

            cell.title = `Фаза: ${style.status}`; 
            
            // <--- ДІАГНОСТИКА: Який статус застосовано до якого дня
            console.log(`День ${index}: Статус: ${style.status}, Клас: ${style.colorClass}`); 
        });
    }

    // Початковий запуск логіки при завантаженні
    console.log('--- Сторінка завантажена, початковий розрахунок ---'); // <--- ДІАГНОСТИКА
    updateCycleColors(); 
});
