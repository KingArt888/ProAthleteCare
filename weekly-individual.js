// weekly-individual.js — ProAtletCare (Адаптована версія для існуючого HTML/CSS)
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
// 1. ЗБЕРЕЖЕННЯ ТА ОНОВЛЕННЯ
// =========================================================

function saveData(manualData = null) {
    try {
        let existingData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const activityData = {};
        document.querySelectorAll('.activity-type-select').forEach(sel => {
            activityData[sel.name] = sel.value;
        });
        const finalData = { ...existingData, ...activityData, ...(manualData || {}) };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalData));
    } catch (e) { console.error("Помилка збереження:", e); }
}

function updateCycleColors() {
    const selects = document.querySelectorAll('.activity-type-select');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    
    let activityTypes = Array.from(selects).map(s => s.value);
    let dayStatuses = activityTypes.map(v => (v === 'MATCH' ? 'MD' : (v === 'REST' ? 'REST' : 'TRAIN')));
    const matchIdx = activityTypes.indexOf('MATCH');

    if (matchIdx !== -1) {
        for (let j = 1; j <= 4; j++) {
            let i = (matchIdx - j + 7) % 7;
            if (activityTypes[i] !== 'REST' && activityTypes[i] !== 'MATCH') dayStatuses[i] = `MD-${j}`;
            else break;
        }
        for (let j = 1; j <= 2; j++) {
            let i = (matchIdx + j) % 7;
            if (activityTypes[i] !== 'REST' && activityTypes[i] !== 'MATCH') dayStatuses[i] = `MD+${j}`;
            else break;
        }
    }

    dayStatuses.forEach((status, idx) => {
        const style = COLOR_MAP[status] || COLOR_MAP['TRAIN'];
        const mdEl = dayCells[idx]?.querySelector('.md-status');
        if (mdEl) {
            mdEl.textContent = style.status;
            Object.values(COLOR_MAP).forEach(m => mdEl.classList.remove(m.colorClass));
            mdEl.classList.add(style.colorClass);
        }
        const titleEl = document.getElementById(`md-title-${idx}`);
        if (titleEl) {
            titleEl.innerHTML = `<span class="md-status-label ${style.colorClass}">${style.status}</span> (${dayNamesShort[idx]})`;
        }
        renderDayExercises(idx, status);
    });
    saveData();
}

// =========================================================
// 2. ВПРАВИ (ЛОГІКА ТА РЕНДЕР)
// =========================================================

function renderDayExercises(dayIndex, mdStatus) {
    const container = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!container) return;

    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const dayPlan = data[`day_plan_${dayIndex}`] || { exercises: [] };

    if (mdStatus === 'REST') {
        container.innerHTML = '<div class="rest-box" style="text-align:center; padding: 20px; color: #777;">☕ REST DAY</div>';
        return;
    }

    let html = '<div class="generated-exercises-list">';
    Object.keys(templateStages).forEach(stage => {
        const stageExs = dayPlan.exercises.filter(ex => ex.stage === stage);
        html += `<div style="font-size: 0.8rem; color: #d4af37; margin-top: 10px; border-bottom: 1px solid #333;">${stage}</div>`;
        
        stageExs.forEach(ex => {
            html += `
                <div class="exercise-item" style="display:flex; justify-content:space-between; align-items:center; background:#111; margin: 2px 0; padding: 5px;">
                    <span style="font-size: 0.9rem;">${ex.name}</span>
                    <button type="button" style="background:none; border:none; color:red; cursor:pointer;" onclick="removeExercise(${dayIndex}, '${ex.name}')">✕</button>
                </div>`;
        });
        html += `<button type="button" class="add-manual-btn" style="width:100%; margin-top:5px; cursor:pointer;" onclick="openExerciseModal(${dayIndex}, '${mdStatus}', '${stage}')">+ Додати</button>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

// =========================================================
// 3. МОДАЛКА (МУЛЬТИ-ВИБІР ТА КАТЕГОРІЇ)
// =========================================================

function openExerciseModal(dayIndex, mdStatus, stage) {
    window.currentAddContext = { dayIndex, mdStatus, stage };
    const modal = document.getElementById('exercise-selection-modal');
    const list = document.getElementById('exercise-list-container');
    
    if (!modal || !list) return;
    list.innerHTML = '';

    const stageData = EXERCISE_LIBRARY[stage];
    if (stageData) {
        for (const cat in stageData) {
            // Додаємо назву категорії
            const catDiv = document.createElement('div');
            catDiv.style.cssText = "background: #222; color: #d4af37; padding: 5px; margin-top: 10px; font-weight: bold; font-size: 0.8rem;";
            catDiv.textContent = cat.toUpperCase();
            list.appendChild(catDiv);

            // Додаємо вправи
            stageData[cat].exercises.forEach(ex => {
                const item = document.createElement('div');
                item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #333;";
                item.innerHTML = `
                    <span style="color: #fff;">${ex.name}</span>
                    <button class="gold-button btn-small" onclick="addSingleExercise('${ex.name}', '${stage}', '${cat}')">Додати</button>
                `;
                list.appendChild(item);
            });
        }
    }
    modal.style.display = 'flex';
}

// Функція додавання без закриття модалки (щоб ти міг клікати багато разів)
function addSingleExercise(name, stage, category) {
    const { dayIndex } = window.currentAddContext;
    const exTemplate = EXERCISE_LIBRARY[stage][category].exercises.find(e => e.name === name);
    
    if (exTemplate) {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const key = `day_plan_${dayIndex}`;
        if (!data[key]) data[key] = { exercises: [] };
        
        // Перевірка, щоб не додавати одну і ту ж вправу двічі за один раз
        if (!data[key].exercises.some(e => e.name === name)) {
            data[key].exercises.push({ ...exTemplate, stage, category });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            
            // Оновлюємо інтерфейс під модалкою, щоб бачити прогрес
            updateCycleColors();
            
            // Змінюємо кнопку на "Додано", щоб було видно зворотній зв'язок
            event.target.textContent = "✔";
            event.target.style.background = "green";
        }
    }
}

function removeExercise(dayIndex, name) {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const key = `day_plan_${dayIndex}`;
    if (data[key]) {
        data[key].exercises = data[key].exercises.filter(e => e.name !== name);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        updateCycleColors();
    }
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
