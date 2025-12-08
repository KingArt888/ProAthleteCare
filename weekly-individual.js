// weekly-individual.js
// ПОТРЕБУЄ exercise_library.js ДЛЯ РОБОТИ

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

const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

// =========================================================
// 1. СТРУКТУРА ШАБЛОНІВ ТА ГЕНЕРАЦІЯ
// =========================================================

const templateStages = {
    'Pre-Training': ['Mobility', 'Activation'],
    'Main Training': ['Legs', 'Core', 'UpperBody'],
    'Post-Training': ['Recovery', 'FoamRolling'] // ДОДАНО FOAMROLLING
};

/**
 * Генерує випадковий список вправ на основі категорій.
 * ... (Логіка генерації залишається без змін) ...
 */
function generateRandomExercises(stage, category, count) {
    if (!EXERCISE_LIBRARY || !EXERCISE_LIBRARY[stage] || !EXERCISE_LIBRARY[stage][category]) {
        console.warn(`Категорія ${stage} / ${category} не знайдена в EXERCISE_LIBRARY.`);
        return [{ name: `Помилка: Немає вправ у ${category}`, videoKey: '', description: 'Перевірте exercise_library.js' }];
    }
    
    const availableExercises = EXERCISE_LIBRARY[stage][category];
    if (availableExercises.length === 0) return [];

    const shuffled = [...availableExercises].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// =========================================================
// 2. УПРАВЛІННЯ ІНТЕРФЕЙСОМ ШАБЛОНІВ ДНЯ
// =========================================================

function renderDayTemplateInput(dayIndex, mdStatus, savedTemplates) {
    const dayBlock = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!dayBlock) return;
    
    // Завантажуємо вимоги для цього MD-статусу (шаблон)
    const templateKey = `template_${mdStatus}`;
    const template = savedTemplates[templateKey] || {}; 
    
    let html = `<div class="template-exercise-fields" data-md-status-editor="${mdStatus}">`;
    let hasInputs = false;

    // Ініціалізуємо шаблон, якщо він порожній
    if (Object.keys(template).length === 0) {
         for (const stage of Object.keys(templateStages)) {
             template[stage] = {};
         }
    }

    for (const [stage, categories] of Object.entries(templateStages)) {
        // Показуємо заголовок стадії, тільки якщо це не REST
        if (mdStatus !== 'REST') {
            html += `<h5 class="template-stage-header">${stage.replace('-', ' ')}</h5>`;
        }
        
        categories.forEach(category => {
            const currentCount = template[stage] && template[stage][category] ? template[stage][category] : 0;
            const inputId = `input_${dayIndex}_${stage.replace(/\s/g, '-')}_${category}`;
            
            // Якщо день — REST, поля не потрібні, але ми їх все одно генеруємо, щоб вони були доступні, 
            // якщо MD-статус зміниться, просто приховуємо їх.
            const rowStyle = mdStatus === 'REST' ? 'style="display: none;"' : '';

            html += `
                <div class="template-row" ${rowStyle}>
                    <label for="${inputId}">${category}:</label>
                    <input type="number" min="0" max="5" value="${currentCount}" 
                           data-md-status="${mdStatus}" 
                           data-stage="${stage}" 
                           data-category="${category}"
                           data-day-index="${dayIndex}"
                           id="${inputId}"
                           name="${inputId}"
                           class="template-count-input"
                           title="Кількість вправ для категорії ${category} (Шаблон ${mdStatus})"
                    >
                    <span>вправ</span>
                </div>
            `;
            hasInputs = true;
        });
    }

    html += `</div>`;
    
    // Видаляємо всі попередні дочірні елементи (якщо там був старий план або старий редактор)
    dayBlock.querySelectorAll('.template-exercise-fields, .generated-exercises-list').forEach(el => el.remove());
    
    // Вставляємо новий HTML для налаштування шаблонів
    dayBlock.innerHTML += html;
    
    // Прикріплюємо слухачі
    dayBlock.querySelectorAll('.template-count-input').forEach(input => {
        input.removeEventListener('change', saveData);
        input.addEventListener('change', saveData);
    });

    // Якщо це REST, додаємо повідомлення
    if (mdStatus === 'REST') {
         dayBlock.innerHTML += `<div class="rest-message">День відновлення. Вправи не потрібні.</div>`;
    }
}


function displayGeneratedExercises(dayIndex, mdStatus, exercises) {
    const dayBlock = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!dayBlock) return;
    
    // Очищаємо всі попередні елементи управління шаблонами
    dayBlock.querySelectorAll('.template-exercise-fields').forEach(el => el.remove());
    
    const newContainer = document.createElement('div');
    newContainer.className = 'generated-exercises-list'; 

    let html = '';
    let index = 0;
    
    if (exercises.length === 0 && mdStatus !== 'REST') {
        html = '<p style="color:red;">❗ Немає згенерованих вправ. Перевірте вимоги шаблону вище.</p>';
    } else {
        // Відображаємо вправи, групуючи за стадіями
        for (const stage of Object.keys(templateStages)) {
             const stageExercises = exercises.filter(ex => ex.stage === stage);
             
             if (stageExercises.length > 0) {
                 html += `<h5 class="template-stage-header">${stage.replace('-', ' ')} (${stageExercises.length})</h5>`;
             }
             
             stageExercises.forEach((exercise) => {
                 html += `
                    <div class="exercise-item" data-md-status="${mdStatus}" data-stage="${stage}" data-index="${index}">
                        <div class="exercise-fields">
                             <label>Назва вправи:</label>
                             <input type="text" value="${exercise.name || ''}" readonly>
                             <label>Параметри / Опис:</label>
                             <textarea readonly>${exercise.description || ''}</textarea>
                        </div>
                    </div>
                 `;
                 index++;
             });
        }
    }
    newContainer.innerHTML = html;
    dayBlock.appendChild(newContainer);
}


// =========================================================
// 3. ОСНОВНА ЛОГІКА ЦИКЛУ ТА ЗБЕРЕЖЕННЯ
// =========================================================

function generateWeeklyPlan(mdStatuses, templates) {
    const weeklyPlan = {};
    const dayIndices = [0, 1, 2, 3, 4, 5, 6];
    
    dayIndices.forEach(dayIndex => {
        const mdStatus = mdStatuses[dayIndex];
        const template = templates[`template_${mdStatus}`];
        const generatedExercises = [];
        
        if (template && mdStatus !== 'REST') {
            for (const [stage, categories] of Object.entries(templateStages)) {
                 if (!template[stage]) continue;

                 categories.forEach(category => {
                     const count = template[stage][category] || 0;
                     if (count > 0) {
                          const randomExercises = generateRandomExercises(stage, category, count);
                          randomExercises.forEach(ex => {
                               generatedExercises.push({
                                    ...ex,
                                    stage: stage 
                               });
                          });
                     }
                 });
            }
        }
        
        weeklyPlan[`day_plan_${dayIndex}`] = {
            mdStatus: mdStatus,
            exercises: generatedExercises.sort((a, b) => 
                Object.keys(templateStages).indexOf(a.stage) - Object.keys(templateStages).indexOf(b.stage)
            )
        };

        // Відображаємо згенерований план під полями налаштування
        displayGeneratedExercises(dayIndex, mdStatus, generatedExercises);
    });
    
    return weeklyPlan;
}

function collectTemplatesFromUI() {
    const templateData = {};
    document.querySelectorAll('.template-count-input').forEach(input => {
        const mdStatus = input.dataset.mdStatus;
        const stage = input.dataset.stage;
        const category = input.dataset.category;
        const value = parseInt(input.value) || 0;
        
        // Зберігаємо вимоги за MD-статусом, щоб вони були універсальними (шаблонами)
        const templateKey = `template_${mdStatus}`;
        if (!templateData[templateKey]) {
             templateData[templateKey] = { phase: mdStatus };
        }
        if (!templateData[templateKey][stage]) {
             templateData[templateKey][stage] = {};
        }
        
        templateData[templateKey][stage][category] = value;
    });
    return templateData;
}


// ... (loadData, saveData, updateCycleColors залишаються схожими, але адаптовані до нової логіки рендерингу) ...

document.addEventListener('DOMContentLoaded', () => {
    
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    const form = document.getElementById('weekly-plan-form');
    const saveButton = document.querySelector('.save-button'); 

    // ... (generateRandomExercises, collectTemplatesFromUI, generateWeeklyPlan, renderDayTemplateInput, displayGeneratedExercises functions should be defined here or globally accessible) ...

    function loadWeeklyPlanDisplay(data) {
        // Оскільки тепер ми завжди рендеримо поля налаштування (renderDayTemplateInput), 
        // ця функція лише відображає вже згенерований план під ними.
        const dayIndices = [0, 1, 2, 3, 4, 5, 6];
        dayIndices.forEach(dayIndex => {
            const planKey = `day_plan_${dayIndex}`;
            const plan = data[planKey];
            if (plan && plan.exercises) {
                displayGeneratedExercises(dayIndex, plan.mdStatus, plan.exercises);
            }
        });
    }

    function updateCycleColors(shouldGenerate = false) {
        try {
            let activityTypes = Array.from(activitySelects).map(select => select.value);
            let dayStatuses = activityTypes.map(type => (type === 'MATCH' ? 'MD' : (type === 'REST' ? 'REST' : 'TRAIN'))); 
            const isPlanActive = activityTypes.includes('MATCH');
            const mdPlusMap = ['MD+1', 'MD+2', 'MD+3', 'MD+4', 'MD+5', 'MD+6']; 
            const mdMinusCycle = ['MD-1', 'MD-2', 'MD-3', 'MD-4', 'MD-5', 'MD-6']; 
            
            // ... (Логіка розрахунку MD-статусів) ...
            if (isPlanActive) {
                let matchIndices = dayStatuses.map((status, index) => status === 'MD' ? index : -1).filter(index => index !== -1);
                for (const matchIdx of matchIndices) {
                     for (let j = 1; j <= 2; j++) { 
                          const currentIdx = (matchIdx + j) % 7;
                          if (activityTypes[currentIdx] !== 'REST' && dayStatuses[currentIdx] !== 'MD') {
                               if (!dayStatuses[currentIdx].startsWith('MD+')) {
                                    dayStatuses[currentIdx] = mdPlusMap[j - 1]; 
                               }
                          }
                     }
                }
                for (const matchIdx of matchIndices) {
                     let currentMDMinus = 0;
                     for (let j = 1; j <= 7; j++) {
                          let i = (matchIdx - j + 7) % 7; 
                          
                          if (activityTypes[i] === 'REST' || dayStatuses[i] === 'MD' || dayStatuses[i].startsWith('MD+')) {
                               break;
                          }
                          
                          if (currentMDMinus < 4) {
                               dayStatuses[i] = mdMinusCycle[currentMDMinus];
                               currentMDMinus++;
                          } else {
                               break;
                          }
                     }
                }
            } else {
                 dayStatuses = activityTypes.map(type => (type === 'REST' ? 'REST' : 'TRAIN')); 
            }
            
            // 4. Оновлення відображення MD-статусу
            const currentMdStatuses = [];

            dayCells.forEach((cell, index) => {
                 let finalStatusKey = dayStatuses[index] || 'TRAIN'; 
                 if (finalStatusKey.startsWith('MD+') && parseInt(finalStatusKey.substring(3)) > 2) {
                      finalStatusKey = 'TRAIN';
                 } else if (finalStatusKey.startsWith('MD-') && parseInt(finalStatusKey.substring(3)) > 4) {
                      finalStatusKey = 'TRAIN'; 
                 }
                 
                 currentMdStatuses[index] = finalStatusKey;

                 const style = COLOR_MAP[finalStatusKey] || COLOR_MAP['TRAIN'];
                 const mdStatusElement = cell.querySelector('.md-status');
                 if (mdStatusElement) {
                     mdStatusElement.textContent = style.status;
                     Object.values(COLOR_MAP).forEach(map => mdStatusElement.classList.remove(map.colorClass)); 
                     mdStatusElement.classList.add(style.colorClass); 
                 }
                 
                 const mdTitleElement = document.getElementById(`md-title-${index}`);
                 if (mdTitleElement) {
                     mdTitleElement.innerHTML = `<span class="md-status-label">${style.status}</span> <span class="day-name-label">(${dayNamesShort[index]})</span>`;
                 }
            });
            
            // 5. Оновлюємо інтерфейс тепер для кожного дня
            const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            const savedTemplates = {};
            Object.keys(savedData).forEach(key => {
                if (key.startsWith('template_')) {
                    savedTemplates[key] = savedData[key];
                }
            });
            
            // Ітеруємо по кожному дню і рендеримо поля шаблонів
            dayCells.forEach((cell, index) => {
                 renderDayTemplateInput(index, currentMdStatuses[index], savedTemplates);
            });


            // 6. Якщо потрібно (при збереженні або зміні циклу), генеруємо та відображаємо план
            if (shouldGenerate) {
                const templatesFromUI = collectTemplatesFromUI();
                const newWeeklyPlan = generateWeeklyPlan(currentMdStatuses, templatesFromUI);
                saveData(newWeeklyPlan, templatesFromUI);
            } else {
                // Інакше відображаємо попередній згенерований план
                loadWeeklyPlanDisplay(savedData);
            }


        } catch (e) {
            console.error("Критична помилка у updateCycleColors:", e);
        }
    }

    function saveData(newWeeklyPlan = null, templatesFromUI = null) {
        try {
            let existingData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            const activityData = {};
            const finalData = {};
            
            // 1. Зберігаємо типи активності
            document.querySelectorAll('#weekly-plan-form [name^="activity_"]').forEach(element => {
                activityData[element.name] = element.value;
            });
            
            // 2. Збираємо Шаблони MD-статусів з UI
            const templateData = templatesFromUI || collectTemplatesFromUI();
            
            // 3. Зберігаємо щойно згенерований план
            if (newWeeklyPlan) {
                 Object.keys(existingData).forEach(key => {
                     if (key.startsWith('day_plan_')) {
                          delete existingData[key];
                     }
                 });
                 Object.assign(finalData, newWeeklyPlan);
            }
            
            // Комбінуємо дані
            const combinedData = { ...existingData, ...activityData, ...templateData, ...finalData };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(combinedData));
            
            saveButton.textContent = 'Збережено! (✔)';
            setTimeout(() => {
                saveButton.textContent = 'Зберегти Тижневий План та Шаблони';
            }, 2000);
        } catch (e) {
            console.error("Помилка при збереженні даних:", e);
        }
    }


    function loadData() {
        try {
            const savedData = localStorage.getItem(STORAGE_KEY);
            let data = {};
            if (savedData) {
                 data = JSON.parse(savedData);
            }

            document.querySelectorAll('#weekly-plan-form [name^="activity_"]').forEach(element => {
                 const name = element.name;
                 if (data[name] !== undefined) {
                     element.value = data[name];
                 }
            });
            
            // Завантаження оновлює MD-статуси, рендерить поля шаблонів та відображає старий план
            updateCycleColors(false); 

        } catch (e) {
            console.error("Помилка при завантаженні даних:", e);
        }
    }


    // === ІНІЦІАЛІЗАЦІЯ ОБРОБНИКІВ ===
    
    activitySelects.forEach((select) => { 
         select.addEventListener('change', () => {
             // Зміна циклу викликає нову генерацію та збереження
             updateCycleColors(true); 
         });
    });

    form.addEventListener('submit', (e) => {
         e.preventDefault();
         // Явне збереження також викликає генерацію, якщо змінилися шаблони або цикл
         updateCycleColors(true); 
    });

    // === ПОЧАТКОВИЙ ЗАПУСК ===
    loadData();
});
