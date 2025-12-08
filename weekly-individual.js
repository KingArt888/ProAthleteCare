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
    // ФУНКЦІЯ: ГЕНЕРАЦІЯ HTML ДЛЯ ОДНІЄЇ ВПРАВИ
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

    // =========================================================
    // ФУНКЦІЯ: ДОДАВАННЯ ВПРАВИ
    // =========================================================
    function addExercise(dayIndex, stage, exercise) {
        const containerId = `exercise-list-${dayIndex}`;
        const container = document.getElementById(containerId);
        if (!container) return;

        // Визначаємо індекс для нової вправи
        const existingItems = container.querySelectorAll(`.exercise-item[data-stage="${stage}"]`);
        const newIndex = existingItems.length;

        // Створюємо новий елемент
        const newItem = document.createElement('div');
        newItem.innerHTML = getExerciseHtml(dayIndex, stage, newIndex, exercise);
        
        // Знаходимо правильне місце для вставки (після останньої вправи цієї фази)
        let insertionPoint = null;
        if (existingItems.length > 0) {
            insertionPoint = existingItems[existingItems.length - 1].nextElementSibling;
        } else {
            // Якщо це перша вправа фази, вставляємо на початок контейнера
            insertionPoint = container.firstElementChild;
        }

        if (insertionPoint) {
             container.insertBefore(newItem.firstElementChild, insertionPoint);
        } else {
             container.appendChild(newItem.firstElementChild);
        }
        
        // Додаємо обробники подій до нових полів
        attachExerciseListeners(dayIndex);
    }

    // =========================================================
    // ФУНКЦІЯ: ПРИКРІПЛЕННЯ ОБРОБНИКІВ ДО ПОЛІВ ВПРАВ
    // =========================================================
    function attachExerciseListeners(dayIndex) {
        const container = document.getElementById(`exercise-list-${dayIndex}`);
        if (!container) return;
        
        // Обробники введення/зміни
        container.querySelectorAll('input, textarea').forEach(input => {
            input.removeEventListener('input', saveData);
            input.addEventListener('input', saveData);
        });

        // Обробники кнопки видалення
        container.querySelectorAll('.remove-exercise-button').forEach(button => {
            button.onclick = null; // Видаляємо старий, щоб уникнути дублювання
            button.onclick = (event) => {
                event.preventDefault();
                const item = event.target.closest('.exercise-item');
                if (item) {
                    item.remove();
                    // Після видалення потрібно переіндексувати та зберегти
                    reindexExercises(dayIndex);
                    saveData();
                }
            };
        });
    }

    // =========================================================
    // ФУНКЦІЯ: ПЕРЕІНДЕКСАЦІЯ ПІСЛЯ ВИДАЛЕННЯ
    // =========================================================
    function reindexExercises(dayIndex) {
        const container = document.getElementById(`exercise-list-${dayIndex}`);
        if (!container) return;
        
        container.querySelectorAll('.exercise-item').forEach((item, globalIndex) => {
            const stage = item.dataset.stage;
            
            // Оновлюємо внутрішній індекс та відображення
            item.dataset.index = globalIndex;
            item.querySelector('.exercise-number').textContent = `${stage} #${globalIndex + 1}`;
            
            // Оновлюємо імена/ідентифікатори полів для коректного збереження
            const idPrefix = `${dayIndex}_${stage.replace(/\s/g, '-')}_${globalIndex}`;
            
            item.querySelectorAll('input, textarea').forEach(input => {
                const name = input.name;
                const fieldType = name.split('_')[1]; // ex_name, ex_video, ex_desc
                input.name = `ex_${fieldType}_${idPrefix}`;
                input.id = `${fieldType}-${idPrefix}`;
            });
            
            // Оновлюємо data-індекси кнопок видалення
            item.querySelector('.remove-exercise-button').dataset.index = globalIndex;
        });
    }

    // =========================================================
    // ФУНКЦІЯ: ЗБЕРЕЖЕННЯ ДАНИХ (ОНОВЛЕНО)
    // =========================================================
    function saveData() {
        try {
            const flatData = {};
            const structuredPlanData = {};

            document.querySelectorAll('#weekly-plan-form [name]').forEach(element => {
                const name = element.name;
                // Зберігаємо всі інші поля (activity, opponent, venue, travel)
                if (!name.startsWith('ex_')) {
                   flatData[name] = element.value;
                }
            });

            // Збір структурованих даних про вправи
            const dayIndices = [0, 1, 2, 3, 4, 5, 6];
            dayIndices.forEach(dayIndex => {
                const dayExercises = [];
                
                document.querySelectorAll(`#exercise-list-${dayIndex} .exercise-item`).forEach(item => {
                    const stage = item.dataset.stage;
                    
                    const nameInput = item.querySelector('[name^="ex_name_"]');
                    const videoInput = item.querySelector('[name^="ex_video_"]');
                    const descInput = item.querySelector('[name^="ex_desc_"]');

                    if (nameInput && nameInput.value.trim() !== '') {
                        dayExercises.push({
                            stage: stage,
                            name: nameInput.value.trim(),
                            videoKey: (videoInput ? videoInput.value.trim() : ''),
                            description: (descInput ? descInput.value.trim() : '')
                        });
                    }
                });
                
                // Збираємо MD-статус для збереження (для Daily Individual)
                const mdStatusElement = document.querySelector(`#day-status-${dayIndex} .md-status`);
                const finalPhase = mdStatusElement ? mdStatusElement.textContent : 'TRAIN';

                structuredPlanData[`structured_plan_${dayIndex}`] = {
                    day: dayNames[dayIndex],
                    phase: finalPhase, 
                    activity: flatData[`activity_${dayIndex}`],
                    exercises: dayExercises // <-- Зберігаємо масив вправ
                };
            });
            
            const combinedData = { ...flatData, ...structuredPlanData };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(combinedData));
            
            saveButton.textContent = 'Збережено! (✔)';
            setTimeout(() => {
                saveButton.textContent = 'Зберегти Тижневий План';
            }, 2000);
        } catch (e) {
            console.error("Помилка при збереженні даних:", e);
        }
    }


    // =========================================================
    // ФУНКЦІЯ: ЗАВАНТАЖЕННЯ ДАНИХ (ОНОВЛЕНО)
    // =========================================================
    function loadData() {
        try {
            const savedData = localStorage.getItem(STORAGE_KEY);
            let data = {};
            if (savedData) {
                 data = JSON.parse(savedData);
            }

            let matchDetailsData = {};

            // 1. Завантаження загальних полів (activity, match details)
            document.querySelectorAll('#weekly-plan-form [name]').forEach(element => {
                 const name = element.name;
                 if (data[name] !== undefined) {
                     element.value = data[name];
                     
                     if (name.startsWith('opponent_') || name.startsWith('venue_') || name.startsWith('travel_km_')) {
                          matchDetailsData[name] = data[name];
                      }
                 }
            });
            
            // 2. Завантаження структурованих вправ
            const dayIndices = [0, 1, 2, 3, 4, 5, 6];
            dayIndices.forEach(dayIndex => {
                const planKey = `structured_plan_${dayIndex}`;
                if (data[planKey] && data[planKey].exercises) {
                    // Очищаємо контейнер перед додаванням
                    const container = document.getElementById(`exercise-list-${dayIndex}`);
                    if (container) container.innerHTML = ''; 
                    
                    data[planKey].exercises.forEach(exercise => {
                        // Викликаємо функцію, яка відтворює форму вправи
                        addExercise(dayIndex, exercise.stage, exercise);
                    });
                }
            });

            activitySelects.forEach((select, index) => {
                 const activityType = select.value;
                 updateMatchDetails(index, activityType, matchDetailsData);
            });


        } catch (e) {
            console.error("Помилка при завантаженні даних:", e);
        }
    }


    // =========================================================
    // ФУНКЦІЯ: ДЛЯ СТАРОГО КОДУ (ЗАЛИШАЄМО БЕЗ ЗМІН)
    // =========================================================
    
    function toggleDayInputs(dayIndex, activityType, isPlanActive) { /* ... */ }
    function updateMatchDetails(dayIndex, activityType, savedValues = {}) { /* ... */ }
    function updateCycleColors() { /* ... */ }
    // ... (всі інші допоміжні функції, які були в оригіналі)
    // Я не надаю їх тут, щоб не робити код занадто великим, але вони мають бути у вашому файлі.
    
    // === ІНІЦІАЛІЗАЦІЯ ОБРОБНИКІВ ===
    
    activitySelects.forEach(select => {
         select.addEventListener('change', (event) => {
             const dayIndexElement = event.target.closest('td');
             if (!dayIndexElement || dayIndexElement.dataset.dayIndex === undefined) return;
             
             const dayIndex = parseInt(dayIndexElement.dataset.dayIndex); 
             const activityType = event.target.value;
             
             updateCycleColors(); 
             updateMatchDetails(dayIndex, activityType); 
             saveData();
         });
    });

    // Обробники для введених вправ додаються динамічно у attachExerciseListeners

    document.querySelectorAll('input, select, textarea').forEach(input => {
         if (input.name.startsWith('activity_') || input.name.startsWith('ex_')) {
             return;
         }

         input.addEventListener('change', saveData);
         input.addEventListener('input', saveData);
    });

    form.addEventListener('submit', (e) => {
         e.preventDefault();
         saveData(); 
    });

    // === ПОЧАТКОВИЙ ЗАПУСК ===
    loadData();
    updateCycleColors();
});
