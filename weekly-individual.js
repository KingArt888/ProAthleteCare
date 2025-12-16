// weekly-individual.js
(function(){

const STORAGE_KEY = 'weeklyPlanData';
const COLOR_MAP = {
    'MD': { status: 'MD', colorClass: 'color-red' },
    'MD+1': { status: 'MD+1', colorClass: 'color-dark-green' },
    'MD+2': { status: 'MD+2', colorClass: 'color-green' },
    'MD-1': { status: 'MD-1', colorClass: 'color-yellow' },
    'REST': { status: 'REST', colorClass: 'color-neutral' },
    'TRAIN': { status: 'TRAIN', colorClass: 'color-dark-grey' }
};

const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

// === Ваші інші змінні та функції ===

// Приклад функцій, які викликаються з HTML
window.handleSelectionComplete = function() {
    // Логіка додавання вибраних вправ
    console.log("handleSelectionComplete викликано");
};

window.updateCycleColors = function(shouldGenerate = false) {
    // Логіка оновлення кольорів MD-циклу
    console.log("updateCycleColors викликано", shouldGenerate);
};

// saveData також доступна глобально
window.saveData = function(newWeeklyPlan = null, templatesFromUI = null) {
    console.log("saveData викликано");
};

// === Ініціалізація DOM ===
document.addEventListener('DOMContentLoaded', () => {

    // Приклад: прив’язка до select
    const activitySelects = document.querySelectorAll('.activity-type-select');
    activitySelects.forEach((select) => { 
        select.addEventListener('change', () => {
            window.updateCycleColors(true); // викликаємо глобально
        });
    });

    const addSelectedBtn = document.getElementById('add-selected-btn');
    if(addSelectedBtn){
        addSelectedBtn.addEventListener('click', window.handleSelectionComplete);
    }

    // Тут можна викликати початкове завантаження
    window.updateCycleColors(false);
});

})();
