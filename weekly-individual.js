// weekly-individual.js — ProAtletCare (LOGIC: EXERCISES FOLLOW STATUS)
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
const templateStages = {
    'Pre-Training': ['Mobility', 'Activation'],
    'Main Training': ['Legs', 'Core', 'UpperBody'],
    'Post-Training': ['Recovery', 'FoamRolling']
};

// =========================================================
// 1. РОЗРАХУНОК ТА ЗБЕРЕЖЕННЯ
// =========================================================

function saveData() {
    try {
        let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        // Зберігаємо лише типи активності (Матч/Тренування) для кожного дня тижня
        document.querySelectorAll('.activity-type-select').forEach(sel => {
            data[sel.name] = sel.value;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { console.error("Save error:", e); }
}

function updateCycleColors() {
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    
    let activityTypes = Array.from(activitySelects).map(s => s.value);
    let dayStatuses = new Array(7).fill('TRAIN');
    const matchIdx = activityTypes.indexOf('MATCH');

    // Розрахунок статусів
    if (matchIdx !== -1) {
        dayStatuses[matchIdx] = 'MD';
        for (let j = 1; j <= 4; j++) {
            let i = (matchIdx - j + 7) % 7;
            if (activityTypes[i] !== 'MATCH') dayStatuses[i] = `MD-${j}`;
            else break;
        }
        for (let j = 1; j <= 2; j++) {
            let i = (matchIdx + j) % 7;
            if (activityTypes[i] !== 'MATCH') dayStatuses[i] = `MD+${j}`;
            else break;
        }
    }

    dayStatuses.forEach((status, idx) => {
        const isRest = activityTypes[idx] === 'REST';
        const finalStatus = isRest ? 'REST' : status;
        const style = COLOR_MAP[finalStatus] || COLOR_MAP['TRAIN'];
        
        // Візуал шкали
        const mdEl = dayCells[idx]?.querySelector('.md-status');
        if (mdEl) {
            mdEl.textContent = finalStatus;
            Object.values(COLOR_MAP).forEach(m => mdEl.classList.remove(m.colorClass));
            mdEl.classList.add(style.colorClass);
        }
        
        // Візуал заголовків
        const titleEl = document.getElementById(`md-title-${idx}`);
        if (titleEl) {
            titleEl.innerHTML = `<span class="md-status-label ${style.colorClass}">${finalStatus}</span> (${dayNamesShort[idx]})`;
        }
        
        // ГОЛОВНА ЗМІНА: Рендеримо вправи, прив'язані до СТАТУСУ
        renderExercisesByStatus(idx, finalStatus);
    });
    saveData();
}

// =========================================================
// 2. ВПРАВИ ЗА СТАТУСОМ (MD-x ПРІОРИТЕТ)
// =========================================================

function renderExercisesByStatus(dayIndex, status) {
    const container = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!container) return;

    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    
    // Беремо вправи за ключем статусу (наприклад, status_plan_MD-1)
    const plan = data[`status_plan_${status}`] || { exercises: [] };

    if (status === 'REST') {
        container.innerHTML = '<div style="text-align:center; padding: 20px; color: #777;">☕ REST DAY</div>';
        return;
    }

    let html = '<div class="generated-exercises-list">';
    Object.keys(templateStages).forEach(stage => {
        const stageExs = plan.exercises.filter(ex => ex.stage === stage);
        html += `<div style="font-size: 0.7rem; color: #d4af37; margin-top: 10px; border-bottom: 1px solid #333;">${stage}</div>`;
        
        stageExs.forEach(ex => {
            html += `
                <div class="exercise-item" style="display:flex; justify-content:space-between; align-items:center; background:#111; margin: 3px 0; padding: 5px;">
                    <span style="font-size: 0.85rem;">${ex.name}</span>
                    <button type="button" style="color:red; background:none; border:none; cursor:pointer;" onclick="removeExerciseFromStatus('${status}', '${ex.name}')">✕</button>
                </div>`;
        });
        html += `<button type="button" class="add-manual-btn" style="width:100%; font-size: 0.7rem;" onclick="openExerciseModal('${status}', '${stage}')">+ Додати</button>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

// =========================================================
// 3. МОДАЛКА (ЗБЕРЕЖЕННЯ В СТАТУС)
// =========================================================

function openExerciseModal(status, stage) {
    window.currentAddStatus = status;
    window.currentAddStage = stage;
    const modal = document.getElementById('exercise-selection-modal');
    const list = document.getElementById('exercise-list-container');
    
    if (!modal || !list) return;
    list.innerHTML = '';

    const stageData = EXERCISE_LIBRARY[stage];
    if (stageData) {
        for (const cat in stageData) {
            list.innerHTML += `<div style="background:#d4af37; color:#000; padding:5px; font-weight:bold; margin-top:10px;">${cat}</div>`;
            stageData[cat].exercises.forEach(ex => {
                list.innerHTML += `
                    <div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #222;">
                        <span>${ex.name}</span>
                        <button class="gold-button btn-small" onclick="addExerciseToStatus('${ex.name}', '${stage}', '${cat}')">Додати</button>
                    </div>`;
            });
        }
    }
    modal.style.display = 'flex';
}

function addExerciseToStatus(name, stage, category) {
    const status = window.currentAddStatus;
    const exTemplate = EXERCISE_LIBRARY[stage][category].exercises.find(e => e.name === name);
    
    if (exTemplate) {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const key = `status_plan_${status}`;
        if (!data[key]) data[key] = { exercises: [] };
        
        // Додаємо вправу в план цього СТАТУСУ
        data[key].exercises.push({ ...exTemplate, stage, category });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        
        updateCycleColors();
        event.target.textContent = "✔";
        event.target.style.background = "green";
    }
}

function removeExerciseFromStatus(status, name) {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const key = `status_plan_${status}`;
    if (data[key]) {
        data[key].exercises = data[key].exercises.filter(e => e.name !== name);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        updateCycleColors();
    }
}

function closeExerciseModal() {
    document.getElementById('exercise-selection-modal').style.display = 'none';
}

// =========================================================
// 4. СТАРТ
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    document.querySelectorAll('.activity-type-select').forEach(sel => {
        if (data[sel.name]) sel.value = data[sel.name];
        sel.addEventListener('change', () => updateCycleColors());
    });
    updateCycleColors();
});
