// weekly-individual.js
// ПОТРЕБУЄ exercise_library.js ДЛЯ РОБОТИ

const WEEKLY_STORAGE_KEY = 'weeklyPlanData'; // ЗМІНА: для уникнення конфлікту
const COLOR_MAP = {
    // ... (COLOR_MAP залишається тут)
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
// ... (Інший код без змін, крім заміни STORAGE_KEY на WEEKLY_STORAGE_KEY)
// ...

function saveData(newWeeklyPlan = null, templatesFromUI = null) {
    const saveButton = document.querySelector('.save-button');
    try {
        let existingData = JSON.parse(localStorage.getItem(WEEKLY_STORAGE_KEY) || '{}'); // ЗМІНА
        const activityData = {};
        // ... (решта логіки saveData)
        // ...
        
        const combinedData = { ...existingData, ...activityData, ...templateData, ...finalPlanData };
        localStorage.setItem(WEEKLY_STORAGE_KEY, JSON.stringify(combinedData)); // ЗМІНА
        // ...
    } catch (e) {
        console.error("Помилка при збереженні даних:", e);
    }
}

// ... (Інші функції без змін)

function generateWeeklyPlan(mdStatuses, templates) {
    // ... (решта логіки generateWeeklyPlan)
    // ...
    
    const savedData = JSON.parse(localStorage.getItem(WEEKLY_STORAGE_KEY) || '{}'); // ЗМІНА
    // ...
}

function updateCycleColors(shouldGenerate = false) {
    // ... (решта логіки updateCycleColors)
    // ...
    
    const savedData = JSON.parse(localStorage.getItem(WEEKLY_STORAGE_KEY) || '{}'); // ЗМІНА
    // ...
}

function loadData() {
    try {
        const savedData = localStorage.getItem(WEEKLY_STORAGE_KEY); // ЗМІНА
        let data = savedData ? JSON.parse(savedData) : {};

        document.querySelectorAll('#weekly-plan-form [name^="activity_"]').forEach(element => {
             const name = element.name;
             if (data[name] !== undefined) {
                 element.value = data[name];
             }
        });
        
        updateCycleColors(false); 

    } catch (e) {
        console.error("Помилка при завантаженні даних:", e);
    }
}

// ... (Інші функції без змін)

// =========================================================
// 5. ІНІЦІАЛІЗАЦІЯ ОБРОБНИКІВ
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const form = document.getElementById('weekly-plan-form');
    
    activitySelects.forEach((select) => { 
         select.addEventListener('change', () => {
             updateCycleColors(true); 
         });
    });

    if (form) { // ДОДАНО БЕЗПЕЧНУ ПЕРЕВІРКУ
        form.addEventListener('submit', (e) => {
             e.preventDefault();
             saveData(null, null);
        });
    }
    
    const addSelectedBtn = document.getElementById('add-selected-btn');
    if (addSelectedBtn) { // ДОДАНО БЕЗПЕЧНУ ПЕРЕВІРКУ
        addSelectedBtn.addEventListener('click', handleSelectionComplete);
    }
    
    const modal = document.getElementById('exercise-selection-modal');
    if (modal) { // ДОДАНО БЕЗПЕЧНУ ПЕРЕВІРКУ
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'exercise-selection-modal' || e.target.classList.contains('close-modal-btn')) {
                closeExerciseModal();
            }
        });
    }

    loadData();
});
