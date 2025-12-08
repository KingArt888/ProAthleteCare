const STORAGE_KEY = 'weeklyPlanData';
const COLOR_MAP = {
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

const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота', 'Неділя'];

document.addEventListener('DOMContentLoaded', () => {
    
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dynamicMatchFields = document.getElementById('dynamic-match-fields');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    const form = document.getElementById('weekly-plan-form');
    const saveButton = document.querySelector('.save-button'); 

    // Додаємо обробники для нових кнопок "Додати вправу"
    document.querySelectorAll('.add-exercise-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const dayIndex = event.target.dataset.dayIndex;
            const stage = event.target.dataset.stage;
            addExercise(dayIndex, stage, {
                name: '',
                videoKey: '',
                description: ''
            });
            saveData();
        });
    });

    if (activitySelects.length === 0 || dayCells.length === 0 || !form) {
        console.error("Помилка: Не знайдено необхідних елементів таблиці або форми.");
        return; 
    }
    
    // =========================================================
    // 1. ФУНКЦІЇ ДЛЯ СТРУКТУРОВАНИХ ВПРАВ (НОВИЙ КОД)
    // =========================================================
    
    function getExerciseHtml(dayIndex, stage, index, exercise = {}) {
        const idPrefix = `${dayIndex}_${stage.replace(/\s/g, '-')}_${index}`;
        
        return `
            <div class="exercise-item" data-day-index="${dayIndex}" data-stage="${stage}" data-index="${index}">
                <div class="exercise-item-header">
                    <span class="exercise-number">${stage} #${index + 1}</span>
                    <button type="button" class="remove-exercise-button" data-day-index="${dayIndex}" data-stage="${stage}" data-index="${index}">✖</button>
                </div>
                
                <div class="exercise-fields">
                    <label for="name-${idPrefix}">Назва вправи:</label>
                    <input type="text" name="ex_name_${idPrefix}" id="name-${idPrefix}" value="${exercise.name || ''}" placeholder="Наприклад: Присідання зі штангою" required>

                    <label for="video-${idPrefix}">Ключ відео (для Firebase):</label>
                    <input type="text" name="ex_video_${idPrefix}" id="video-${idPrefix}" value="${exercise.videoKey || ''}" placeholder="Наприклад: Squat_BS" >

                    <label for="desc-${idPrefix}">Параметри / Опис:</label>
                    <textarea name="ex_desc_${idPrefix}" id="desc-${idPrefix}" placeholder="Наприклад: 3 підходи по 8 повторень, 70% 1RM">${exercise.description || ''}</textarea>
                </div>
            </div>
        `;
    }

    function addExercise(dayIndex, stage, exercise) {
        const containerId = `exercise-list-${dayIndex}`;
        const container = document.getElementById(containerId);
        if (!container) return;

        const existingItems = Array.from(container.querySelectorAll('.exercise-item')).filter(item => item.dataset.stage === stage);
        const newIndex = existingItems.length;

        const newItem = document.createElement('div');
        newItem.innerHTML = getExerciseHtml(dayIndex, stage, newIndex, exercise);
        
        // Знаходимо правильну кнопку "Додати" для цієї фази і вставляємо елемент перед нею
        const insertionPoint = document.querySelector(`.add-exercise-button[data-day-index="${dayIndex}"][data-stage="${stage}"]`);

        if (insertionPoint) {
            container.insertBefore(newItem.firstElementChild, insertionPoint);
        } else {
            container.appendChild(newItem.firstElementChild);
        }
        
        attachExerciseListeners(dayIndex);
    }
    
    function attachExerciseListeners(dayIndex) {
        const container = document.getElementById(`exercise-list-${dayIndex}`);
        if (!container) return;
        
        container.querySelectorAll('input, textarea').forEach(input => {
            input.removeEventListener('input', saveData);
            input.addEventListener('input', saveData);
        });

        container.querySelectorAll('.remove-exercise-button').forEach(button => {
            button.onclick = null; 
            button.onclick = (event) => {
                event.preventDefault();
                const item = event.target.closest('.exercise-item');
                if (item) {
                    item.remove();
                    reindexExercises(dayIndex);
                    saveData();
                }
            };
        });
    }
    
    function reindexExercises(dayIndex) {
        const container = document.getElementById(`exercise-list-${dayIndex}`);
        if (!container) return;
        
        // Збираємо та переіндексовуємо вправи, групуючи за фазою
        const stages = ['Pre-Training', 'Main Training', 'Post-Training'];
        
        stages.forEach(stage => {
            let stageIndex = 0;
            container.querySelectorAll(`.exercise-item[data-stage="${stage}"]`).forEach((item) => {
                
                // Оновлюємо індекс
                item.dataset.index = stageIndex;
                
                // Оновлюємо відображення та імена полів
                item.querySelector('.exercise-number').textContent = `${stage} #${stageIndex + 1}`;
                
                const idPrefix = `${dayIndex}_${stage.replace(/\s/g, '-')}_${stageIndex}`;
                
                item.querySelectorAll('input, textarea').forEach(input => {
                    const nameParts = input.name.split('_');
                    const fieldType = nameParts[1]; 
                    input.name = `ex_${fieldType}_${idPrefix}`;
                    input.id = `${fieldType}-${idPrefix}`;
                });
                
                item.querySelector('.remove-exercise-button').dataset.index = stageIndex;
                stageIndex++;
            });
        });
    }

    // =========================================================
    // 2. ФУНКЦІЇ МІКРОЦИКЛУ ТА ДІЙ (ВІДНОВЛЕНО)
    // =========================================================
    
    function updateMatchDetails(dayIndex, activityType, savedValues = {}) {
        const existingBlock = dynamicMatchFields.querySelector(`.match-detail-block[data-day-index="${dayIndex}"]`);
        const dayName = dayNames[dayIndex];

        if (activityType === 'MATCH' && dynamicMatchFields && !existingBlock) {
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
                 input.removeEventListener('change', saveData);
                 input.removeEventListener('input', saveData);
                 input.addEventListener('change', saveData); 
                 input.addEventListener('input', saveData);
             });

        } else if (activityType !== 'MATCH' && existingBlock) {
             existingBlock.remove();
        }
    }

    function updateCycleColors() {
        try {
            let activityTypes = Array.from(activitySelects).map(select => select.value);
            let dayStatuses = activityTypes.map(type => (type === 'MATCH' ? 'MD' : (type === 'REST' ? 'REST' : 'TRAIN'))); 
            const isPlanActive = activityTypes.includes('MATCH');

            if (!isPlanActive) {
                dayCells.forEach((cell, index) => {
                     const finalStatusKey = activityTypes[index] === 'REST' ? 'REST' : 'TRAIN';
                     const mdStatusElement = cell.querySelector('.md-status');
                     const style = COLOR_MAP[finalStatusKey];
                     
                     mdStatusElement.textContent = style.status;
                     Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.
