// weekly-individual.js — ProAtletCare (SUPPORT FOR MULTIPLE MATCHES)
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
// 1. ЛОГІКА СКЛАДНОГО МІКРОЦИКЛУ (2 МАТЧІ)
// =========================================================

function updateCycleColors() {
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    
    let activityTypes = Array.from(activitySelects).map(s => s.value);
    let dayStatuses = new Array(7).fill('TRAIN');

    // Знаходимо ВСІ індекси матчів
    const matchIndices = activityTypes.map((type, index) => type === 'MATCH' ? index : -1).filter(index => index !== -1);

    for (let i = 0; i < 7; i++) {
        if (activityTypes[i] === 'MATCH') {
            dayStatuses[i] = 'MD';
            continue;
        }

        // Для кожного дня шукаємо найближчий матч
        let minDiff = Infinity;
        let bestStatus = 'TRAIN';

        matchIndices.forEach(mIdx => {
            // Розрахунок дистанції з урахуванням циклічності тижня (7 днів)
            for (let offset of [-7, 0, 7]) {
                let diff = i - (mIdx + offset);
                
                // MD+1, MD+2
                if (diff === 1 || diff === 2) {
                    if (Math.abs(diff) < Math.abs(minDiff)) {
                        minDiff = diff;
                        bestStatus = `MD+${diff}`;
                    }
                }
                // MD-1, MD-2, MD-3, MD-4
                if (diff >= -4 && diff <= -1) {
                    if (Math.abs(diff) < Math.abs(minDiff)) {
                        minDiff = diff;
                        bestStatus = `MD${diff}`; // diff вже від'ємний
                    }
                }
            }
        });
        dayStatuses[i] = bestStatus;
    }

    // ВІЗУАЛІЗАЦІЯ
    dayStatuses.forEach((status, idx) => {
        const isRest = activityTypes[idx] === 'REST';
        const finalStatus = isRest ? 'REST' : status;
        const style = COLOR_MAP[finalStatus] || COLOR_MAP['TRAIN'];
        
        // Шкала зверху
        const mdEl = dayCells[idx]?.querySelector('.md-status');
        if (mdEl) {
            mdEl.textContent = finalStatus;
            Object.values(COLOR_MAP).forEach(m => mdEl.classList.remove(m.colorClass));
            mdEl.classList.add(style.colorClass);
        }
        
        // Заголовки блоків
        const titleEl = document.getElementById(`md-title-${idx}`);
        if (titleEl) {
            titleEl.innerHTML = `<span class="md-status-label ${style.colorClass}">${finalStatus}</span> (${dayNamesShort[idx]})`;
        }
        
        // Рендер вправ за СТАТУСОМ
        renderExercisesByStatus(idx, finalStatus);
    });

    saveData();
}

// =========================================================
// 2. ФУНКЦІЇ ЗБЕРЕЖЕННЯ (ПРИВ'ЯЗКА ДО СТАТУСУ)
// =========================================================

function renderExercisesByStatus(dayIndex, status) {
    const container = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!container) return;

    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const plan = data[`status_plan_${status}`] || { exercises: [] };

    if (status === 'REST') {
        container.innerHTML = '<div style="text-align:center; padding: 20px; color: #777; font-style: italic;">☕ ВІДПОЧИНОК</div>';
        return;
    }

    let html = '<div class="generated-exercises-list">';
    Object.keys(templateStages).forEach(stage => {
        const stageExs = plan.exercises.filter(ex => ex.stage === stage);
        html += `<div style="font-size: 0.7rem; color: #d4af37; margin-top: 10px; border-bottom: 1px solid #333;">${stage}</div>`;
        
        stageExs.forEach(ex => {
            html += `
                <div class="exercise-item" style="display:flex; justify-content:space-between; align-items:center; background:#111; margin: 3px 0; padding: 5px; border-left: 2px solid #d4af37;">
                    <span style="font-size: 0.85rem;">${ex.name}</span>
                    <button type="button" style="color:red; background:none; border:none; cursor:pointer;" onclick="removeExerciseFromStatus('${status}', '${ex.name}')">✕</button>
                </div>`;
        });
        html += `<button type="button" class="add-manual-btn" style="width:100%;" onclick="openExerciseModal('${status}', '${stage}')">+ Додати</button>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function addExerciseToStatus(name, stage, category) {
    const status = window.currentAddStatus;
    const exTemplate = EXERCISE_LIBRARY[stage][category].exercises.find(e => e.name === name);
    
    if (exTemplate) {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const key = `status_plan_${status}`;
        if (!data[key]) data[key] = { exercises: [] };
        
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

// --- ІНШІ ФУНКЦІЇ (МОДАЛКА) ---

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
                list.innerHTML += `<div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #222;">
                    <span>${ex.name}</span>
                    <button class="gold-button btn-small" onclick="addExerciseToStatus('${ex.name}', '${stage}', '${cat}')">Додати</button>
                </div>`;
            });
        }
    }
    const closeBtn = document.createElement('button');
    closeBtn.textContent = "Зберегти та закрити";
    closeBtn.style.cssText = "width:100%; padding:10px; margin-top:10px; background:#d4af37; color:#000; font-weight:bold;";
    closeBtn.onclick = () => modal.style.display = 'none';
    list.appendChild(closeBtn);
    modal.style.display = 'flex';
}

function saveData() {
    let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    document.querySelectorAll('.activity-type-select').forEach(sel => { data[sel.name] = sel.value; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

document.addEventListener('DOMContentLoaded', () => {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    document.querySelectorAll('.activity-type-select').forEach(sel => {
        if (data[sel.name]) sel.value = data[sel.name];
        sel.addEventListener('change', updateCycleColors);
    });
    updateCycleColors();
});
