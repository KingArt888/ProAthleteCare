// weekly-individual.js
// Повна версія: Розділи (Pre/Main/Post), Чекбокси та Глобальні шаблони

const STORAGE_KEY = 'weeklyPlanData';
const GLOBAL_TEMPLATE_KEY = 'pro_global_templates';
const INDIVIDUAL_OVERRIDE_KEY = 'pro_individual_overrides';

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

// Твоя структура розділів
const templateStages = {
    'Pre-Training': ['Mobility', 'Activation'],
    'Main Training': ['Legs', 'Core', 'UpperBody'],
    'Post-Training': ['Recovery', 'FoamRolling']
};

let currentExerciseContext = null; 
let selectedExercises = []; 

// =========================================================
// 1. РОБОТА З ДАНИМИ
// =========================================================

function getDayPlan(dayIndex, mdStatus, userId = "default_athlete") {
    const overrides = JSON.parse(localStorage.getItem(INDIVIDUAL_OVERRIDE_KEY) || '{}');
    if (overrides[userId] && overrides[userId][dayIndex]) {
        return overrides[userId][dayIndex].exercises;
    }
    const globals = JSON.parse(localStorage.getItem(GLOBAL_TEMPLATE_KEY) || '{}');
    return globals[mdStatus] ? globals[mdStatus].exercises : [];
}

// =========================================================
// 2. ВІДОБРАЖЕННЯ ТА РОЗДІЛИ (PRE/MAIN/POST)
// =========================================================

function updateCycleColors() {
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    
    let activityTypes = Array.from(activitySelects).map(select => select.value);
    let dayStatuses = calculateMdStatuses(activityTypes);

    dayCells.forEach((cell, index) => {
        let statusKey = dayStatuses[index];
        const style = COLOR_MAP[statusKey] || COLOR_MAP['TRAIN'];

        const titleEl = document.getElementById(`md-title-${index}`);
        if (titleEl) titleEl.innerHTML = `<span class="md-status-label">${style.status}</span> (${dayNamesShort[index]})`;

        const exercises = getDayPlan(index, statusKey);
        renderExercisesWithStages(index, statusKey, exercises);
    });
}

function calculateMdStatuses(activityTypes) {
    let statuses = activityTypes.map(type => (type === 'MATCH' ? 'MD' : (type === 'REST' ? 'REST' : 'TRAIN')));
    const matchIdx = activityTypes.indexOf('MATCH');
    if (matchIdx !== -1) {
        for (let i = 1; i <= 4; i++) {
            let prev = (matchIdx - i + 7) % 7;
            if (statuses[prev] === 'TRAIN') statuses[prev] = `MD-${i}`;
        }
        for (let i = 1; i <= 2; i++) {
            let next = (matchIdx + i) % 7;
            if (statuses[next] === 'TRAIN') statuses[next] = `MD+${i}`;
        }
    }
    return statuses;
}

function renderExercisesWithStages(dayIndex, mdStatus, exercises) {
    const container = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!container) return;

    if (mdStatus === 'REST') {
        container.innerHTML = '<p class="rest-message">☕ Відпочинок</p>';
        return;
    }

    let html = '<div class="generated-exercises-list">';
    
    // Відображення за розділами (Pre/Main/Post)
    Object.keys(templateStages).forEach(stage => {
        const stageExs = exercises.filter(ex => ex.stage === stage);
        html += `<h5 class="template-stage-header">${stage.replace('-', ' ')}</h5>`;
        
        stageExs.forEach((ex, idx) => {
            const globalIdx = exercises.indexOf(ex);
            html += `
                <div class="exercise-item">
                    <strong>${ex.name}</strong>
                    <p>${ex.description}</p>
                    <button type="button" class="remove-btn" onclick="deleteExercise(${dayIndex}, ${globalIdx})">✕</button>
                </div>`;
        });
        
        // Кнопка додавання саме в цей розділ
        html += `<button type="button" class="add-manual-btn" onclick="openExerciseModal(${dayIndex}, '${mdStatus}', '${stage}')">+ Додати в ${stage}</button>`;
    });

    html += `
        <div class="day-footer-actions" style="margin-top:15px; border-top:1px solid #d4af37; padding-top:10px;">
            <button type="button" class="gold-button btn-small" onclick="saveAsGlobal(${dayIndex}, '${mdStatus}')">★ Зберегти як шаблон ${mdStatus}</button>
        </div></div>`;

    container.innerHTML = html;
}

// =========================================================
// 3. МОДАЛКА З ГАЛОЧКАМИ (ЧЕКБОКСАМИ)
// =========================================================

function openExerciseModal(dayIndex, mdStatus, stage) {
    currentExerciseContext = { dayIndex, mdStatus, stage };
    selectedExercises = [];
    
    const modal = document.getElementById('exercise-selection-modal');
    const qualityFilters = document.getElementById('quality-filters');
    
    // Фільтри за якістю (Strength, Mobility тощо)
    qualityFilters.innerHTML = QUALITIES.map(q => 
        `<button type="button" class="filter-chip" onclick="filterModal('${q}')">${q}</button>`
    ).join('');

    renderModalList(stage);
    modal.style.display = 'flex';
}

function renderModalList(stage, qualityFilter = null) {
    const listContainer = document.getElementById('exercise-list-container');
    listContainer.innerHTML = '';

    // Беремо вправи тільки для вибраного розділу (Stage)
    const categories = EXERCISE_LIBRARY[stage];
    for (const catName in categories) {
        const data = categories[catName];
        if (qualityFilter && !data.qualities.includes(qualityFilter)) continue;

        data.exercises.forEach(ex => {
            const div = document.createElement('div');
            div.className = 'exercise-select-item';
            div.innerHTML = `
                <input type="checkbox" class="ex-checkbox" id="chk-${ex.name}" onchange="toggleEx('${ex.name}', '${stage}')">
                <label for="chk-${ex.name}">
                    <strong>${ex.name}</strong><br><small>${catName}</small>
                </label>
            `;
            listContainer.appendChild(div);
        });
    }
}

function toggleEx(name, stage) {
    const categories = EXERCISE_LIBRARY[stage];
    let foundEx = null;
    for (const cat in categories) {
        const ex = categories[cat].exercises.find(e => e.name === name);
        if (ex) { foundEx = { ...ex, stage }; break; }
    }

    const idx = selectedExercises.findIndex(e => e.name === name);
    if (idx > -1) selectedExercises.splice(idx, 1);
    else if (foundEx) selectedExercises.push(foundEx);

    const btn = document.getElementById('add-selected-btn');
    btn.style.display = selectedExercises.length > 0 ? 'block' : 'none';
    btn.textContent = `Додати вибрані (${selectedExercises.length})`;
}

function handleSelectionComplete() {
    const userId = "default_athlete";
    const overrides = JSON.parse(localStorage.getItem(INDIVIDUAL_OVERRIDE_KEY) || '{}');
    
    if (!overrides[userId]) overrides[userId] = {};
    const currentExs = getDayPlan(currentExerciseContext.dayIndex, currentExerciseContext.mdStatus);
    
    overrides[userId][currentExerciseContext.dayIndex] = { 
        exercises: [...currentExs, ...selectedExercises],
        mdStatus: currentExerciseContext.mdStatus 
    };

    localStorage.setItem(INDIVIDUAL_OVERRIDE_KEY, JSON.stringify(overrides));
    closeExerciseModal();
    updateCycleColors();
}

// =========================================================
// 4. ІНІЦІАЛІЗАЦІЯ
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.activity-type-select').forEach(s => s.addEventListener('change', updateCycleColors));
    const addBtn = document.getElementById('add-selected-btn');
    if (addBtn) addBtn.onclick = handleSelectionComplete;
    updateCycleColors();
});

function deleteExercise(dayIdx, exIdx) {
    const userId = "default_athlete";
    const overrides = JSON.parse(localStorage.getItem(INDIVIDUAL_OVERRIDE_KEY) || '{}');
    const currentExs = getDayPlan(dayIdx, ""); 
    
    currentExs.splice(exIdx, 1);
    overrides[userId] = overrides[userId] || {};
    overrides[userId][dayIdx] = { exercises: currentExs };
    
    localStorage.setItem(INDIVIDUAL_OVERRIDE_KEY, JSON.stringify(overrides));
    updateCycleColors();
}

function saveAsGlobal(dayIdx, mdStatus) {
    const currentExs = getDayPlan(dayIdx, mdStatus);
    const globals = JSON.parse(localStorage.getItem(GLOBAL_TEMPLATE_KEY) || '{}');
    globals[mdStatus] = { exercises: currentExs };
    localStorage.setItem(GLOBAL_TEMPLATE_KEY, JSON.stringify(globals));
    alert(`Шаблон для ${mdStatus} збережено!`);
}

function closeExerciseModal() { document.getElementById('exercise-selection-modal').style.display = 'none'; }
function filterModal(q) { renderModalList(currentExerciseContext.stage, q); }
