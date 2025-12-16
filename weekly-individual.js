// weekly-individual.js
// ПОТРЕБУЄ exercise_library.js ДЛЯ РОБОТИ

const WEEKLY_STORAGE_KEY = 'weeklyPlanData';
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
    'Post-Training': ['Recovery', 'FoamRolling']
};

function generateRandomExercises(stage, category, count) {
    const categoryData = EXERCISE_LIBRARY[stage] && EXERCISE_LIBRARY[stage][category] ? 
                         EXERCISE_LIBRARY[stage][category] : null;

    if (!categoryData || !categoryData.exercises || categoryData.exercises.length === 0) {
        console.warn(`Категорія ${stage} / ${category} не знайдена або порожня.`);
        return [];
    }
    
    const availableExercises = categoryData.exercises;
    const shuffled = [...availableExercises].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// --- ФУНКЦІЇ ЗБЕРЕЖЕННЯ/ЗАВАНТАЖЕННЯ ---

function collectTemplatesFromUI() {
    const templateData = {};
    document.querySelectorAll('.template-category-button').forEach(button => {
        const mdStatus = button.dataset.mdStatus;
        const stage = button.dataset.stage;
        const category = button.dataset.category;
        const value = parseInt(button.dataset.count) || 0;
        
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

function collectManualChanges() {
    const manualPlanData = {};
    for (let i = 0; i < 7; i++) {
        const dayPlan = [];
        const dayBlock = document.querySelector(`.task-day-container[data-day-index="${i}"]`);
        
        if (!dayBlock || dayBlock.querySelectorAll('.exercise-item').length === 0) continue;

        dayBlock.querySelectorAll('.exercise-item').forEach((item) => {
            const nameInput = item.querySelector('[data-field="name"]');
            const descTextarea = item.querySelector('[data-field="description"]');
            
            dayPlan.push({
                name: nameInput ? nameInput.value : 'Невідома вправа',
                description: descTextarea ? descTextarea.value : '',
                stage: item.dataset.stage,
                category: item.dataset.category,
                videoKey: item.dataset.videokey || '',
                imageURL: item.dataset.imageurl || '' 
            });
        });

        if (dayPlan.length > 0) {
            manualPlanData[`day_plan_${i}`] = {
                exercises: dayPlan
            };
        }
    }
    return manualPlanData;
}

function saveData(newWeeklyPlan = null, templatesFromUI = null) {
    const saveButton = document.querySelector('.save-button');
    try {
        let existingData = JSON.parse(localStorage.getItem(WEEKLY_STORAGE_KEY) || '{}');
        const activityData = {};
        let finalPlanData = {};
        
        document.querySelectorAll('#weekly-plan-form [name^="activity_"]').forEach(element => {
            activityData[element.name] = element.value;
        });
        
        const templateData = templatesFromUI || collectTemplatesFromUI();
        
        Object.keys(existingData).forEach(key => {
            if (key.startsWith('day_plan_')) {
                 delete existingData[key];
            }
        });
        
        if (newWeeklyPlan) {
             finalPlanData = newWeeklyPlan;
        } else {
             finalPlanData = collectManualChanges();
             
             for (let i = 0; i < 7; i++) {
                 if (finalPlanData[`day_plan_${i}`]) {
                     const mdStatusEl = document.querySelector(`#md-title-${i} .md-status-label`);
                     const mdStatus = mdStatusEl ? mdStatusEl.textContent.trim() : 'TRAIN';
                     finalPlanData[`day_plan_${i}`].mdStatus = mdStatus;
                 }
             }
        }
        
        const combinedData = { ...existingData, ...activityData, ...templateData, ...finalPlanData };
        localStorage.setItem(WEEKLY_STORAGE_KEY, JSON.stringify(combinedData));
        
        if (saveButton) {
            saveButton.textContent = 'Збережено! (✔)';
            setTimeout(() => {
                saveButton.textContent = 'Зберегти Тижневий План та Шаблони';
            }, 2000);
        }
    } catch (e) {
        console.error("Помилка при збереженні даних:", e);
    }
}

// Інші функції weekly-individual.js використовують аналогічно WEEKLY_STORAGE_KEY замість STORAGE_KEY
// Наприклад: localStorage.getItem(WEEKLY_STORAGE_KEY), localStorage.setItem(WEEKLY_STORAGE_KEY, ...)

// … (весь решта коду weekly-individual.js, замінивши STORAGE_KEY на WEEKLY_STORAGE_KEY)
