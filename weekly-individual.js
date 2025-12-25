// weekly-individual.js — ProAtletCare (FULL DYNAMIC MICROCYCLE)
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

// --- 1. ЛОГІКА РОЗРАХУНКУ СТАТУСІВ (МІКРОЦИКЛ) ---
function calculateMdStatuses(activityValues) {
    let statuses = activityValues.map(v => (v === 'MATCH' ? 'MD' : (v === 'REST' ? 'REST' : 'TRAIN')));
    const matchIdx = activityValues.indexOf('MATCH');

    if (matchIdx !== -1) {
        // Дні ДО матчу
        for (let i = 1; i <= 4; i++) {
            let prev = (matchIdx - i + 7) % 7;
            if (statuses[prev] === 'TRAIN') statuses[prev] = `MD-${i}`;
        }
        // Дні ПІСЛЯ матчу
        for (let i = 1; i <= 2; i++) {
            let next = (matchIdx + i) % 7;
            if (statuses[next] === 'TRAIN') statuses[next] = `MD+${i}`;
        }
    }
    return statuses;
}

// --- 2. ОНОВЛЕННЯ КОЛЬОРІВ ТА ВІДОБРАЖЕННЯ ---
function updateCycleColors(shouldGenerate = false) {
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const activityValues = Array.from(activitySelects).map(s => s.value);
    const statuses = calculateMdStatuses(activityValues);

    activitySelects.forEach((select, index) => {
        const statusKey = statuses[index];
        const style = COLOR_MAP[statusKey] || COLOR_MAP['TRAIN'];

        // Оновлюємо заголовок (колір плашки)
        const titleEl = document.getElementById(`md-title-${index}`);
        if (titleEl) {
            titleEl.className = `day-md-title ${style.colorClass}`;
            titleEl.innerHTML = `<span class="md-status-label">${style.status}</span> (${dayNamesShort[index]})`;
        }

        // Завантажуємо вправи конкретно для цього статусу
        const exercises = getExercisesForStatus(index, statusKey);
        displayExercisesForDay(index, statusKey, exercises);
    });

    if (shouldGenerate) saveData();
}

// --- 3. РОБОТА З ДАНИМИ (Вправи під статус) ---
function getExercisesForStatus(dayIndex, mdStatus) {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    
    // Якщо для цього статусу (наприклад, MD-1) вже збережено шаблон — беремо його
    if (data[`template_${mdStatus}`]) {
        return data[`template_${mdStatus}`].exercises || [];
    }
    
    // Якщо шаблону немає, але є ручні правки для цього конкретного дня тижня
    if (data[`day_plan_${dayIndex}`] && data[`day_plan_${dayIndex}`].mdStatus === mdStatus) {
        return data[`day_plan_${dayIndex}`].exercises || [];
    }

    return []; // Якщо нічого немає, повертаємо порожній список
}

function displayExercisesForDay(dayIndex, mdStatus, exercises) {
    const container = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!container) return;

    if (mdStatus === 'REST') {
        container.innerHTML = '<div class="rest-box">☕ ВІДПОЧИНОК</div>';
        return;
    }

    let html = '<div class="generated-exercises-list">';
    // Групуємо по стадіях (Pre, Main, Post)
    const stages = ['Pre-Training', 'Main Training', 'Post-Training'];
    
    stages.forEach(stage => {
        const stageExs = exercises.filter(ex => ex.stage === stage);
        html += `<h5 class="template-stage-header">${stage}</h5>`;
        
        stageExs.forEach(ex => {
            html += `
                <div class="exercise-item">
                    <span>${ex.name}</span>
                    <button type="button" class="remove-btn" onclick="removeEx(${dayIndex}, '${ex.name}')">✕</button>
                </div>`;
        });
        
        html += `<button type="button" class="add-manual-btn" onclick="openExerciseModal(${dayIndex}, '${mdStatus}', '${stage}')">+ Додати</button>`;
    });

    html += `<button type="button" class="gold-button btn-small" onclick="saveAsStatusTemplate(${dayIndex}, '${mdStatus}')">Зберегти як шаблон ${mdStatus}</button>`;
    html += '</div>';
    
    container.innerHTML = html;
}

// --- 4. ЗБЕРЕЖЕННЯ ТА МОДАЛКА ---
function saveAsStatusTemplate(dayIndex, mdStatus) {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const dayPlan = data[`day_plan_${dayIndex}`];
    
    if (dayPlan && dayPlan.exercises.length > 0) {
        data[`template_${mdStatus}`] = { exercises: dayPlan.exercises };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        alert(`Набір вправ збережено для всіх днів ${mdStatus}!`);
    } else {
        alert("Спочатку додайте вправи у цей день.");
    }
}

// Видалення вправи
function removeEx(dayIndex, exName) {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const key = `day_plan_${dayIndex}`;
    if (data[key]) {
        data[key].exercises = data[key].exercises.filter(e => e.name !== exName);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        updateCycleColors();
    }
}

// --- 5. ІНІЦІАЛІЗАЦІЯ ---
document.addEventListener('DOMContentLoaded', () => {
    const activitySelects = document.querySelectorAll('.activity-type-select');
    activitySelects.forEach(select => {
        select.addEventListener('change', () => updateCycleColors(true));
    });

    updateCycleColors();
});
