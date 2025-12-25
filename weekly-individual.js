// weekly-individual.js — ProAtletCare (FINAL STABLE VERSION)
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
// 1. ОСНОВНЕ ЗБЕРЕЖЕННЯ ТА ІНІЦІАЛІЗАЦІЯ
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
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    
    let activityTypes = Array.from(activitySelects).map(s => s.value);
    let dayStatuses = activityTypes.map(v => (v === 'MATCH' ? 'MD' : (v === 'REST' ? 'REST' : 'TRAIN')));
    const matchIdx = activityTypes.indexOf('MATCH');

    // Розрахунок MD-статусів (Недільний мікроцикл)
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
        
        // Оновлення верхньої шкали кольорів
        const mdEl = dayCells[idx]?.querySelector('.md-status');
        if (mdEl) {
            mdEl.textContent = style.status;
            Object.values(COLOR_MAP).forEach(m => mdEl.classList.remove(m.colorClass));
            mdEl.classList.add(style.colorClass);
        }
        
        // Оновлення великих заголовків блоків
        const titleEl = document.getElementById(`md-title-${idx}`);
        if (titleEl) {
            titleEl.innerHTML = `<span class="md-status-label ${style.colorClass}">${style.status}</span> <span style="color:#fff">(${dayNamesShort[idx]})</span>`;
        }
        
        renderDayExercises(idx, status);
    });

    saveData();
}

// =========================================================
// 2. ВІДОБРАЖЕННЯ ВПРАВ У БЛОКАХ ДНІВ
// =========================================================

function renderDayExercises(dayIndex, mdStatus) {
    const container = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!container) return;

    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const dayPlan = data[`day_plan_${dayIndex}`] || { exercises: [] };

    if (mdStatus === 'REST') {
        container.innerHTML = '<div style="text-align:center; padding: 20px; color: #777; font-style: italic;">☕ ВІДПОЧИНОК</div>';
        return;
    }

    let html = '<div class="generated-exercises-list">';
    Object.keys(templateStages).forEach(stage => {
        const stageExs = dayPlan.exercises.filter(ex => ex.stage === stage);
        html += `<div style="font-size: 0.75rem; color: #d4af37; margin-top: 12px; border-bottom: 1px solid #333; text-transform: uppercase; letter-spacing: 1px;">${stage}</div>`;
        
        stageExs.forEach(ex => {
            html += `
                <div class="exercise-item" style="display:flex; justify-content:space-between; align-items:center; background:#111; margin: 4px 0; padding: 6px 10px; border-left: 2px solid #d4af37;">
                    <span style="font-size: 0.85rem; color: #eee;">${ex.name}</span>
                    <button type="button" style="background:none; border:none; color:#ff4d4d; cursor:pointer; font-weight:bold;" onclick="removeExercise(${dayIndex}, '${ex.name}')">✕</button>
                </div>`;
        });
        html += `<button type="button" class="add-manual-btn" style="width:100%; margin-top:5px; padding: 5px; cursor:pointer; background: #222; color: #ccc; border: 1px dashed #444;" onclick="openExerciseModal(${dayIndex}, '${mdStatus}', '${stage}')">+ Додати</button>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

// =========================================================
// 3. МОДАЛКА (КАТЕГОРІЇ ТА МУЛЬТИ-ВИБІР)
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
            // Заголовок категорії
            const catDiv = document.createElement('div');
            catDiv.style.cssText = "background: #d4af37; color: #000; padding: 6px 12px; margin-top: 15px; font-weight: bold; font-size: 0.85rem; text-transform: uppercase;";
            catDiv.textContent = cat;
            list.appendChild(catDiv);

            // Список вправ
            stageData[cat].exercises.forEach(ex => {
                const item = document.createElement('div');
                item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #222; background: #0a0a0a;";
                item.innerHTML = `
                    <span style="color: #fff; font-size: 0.9rem;">${ex.name}</span>
                    <button class="gold-button btn-small" style="padding: 4px 12px; cursor: pointer;" onclick="addSingleExercise(this, '${ex.name}', '${stage}', '${cat}')">Додати</button>
                `;
                list.appendChild(item);
            });
        }
    }

    // Велика кнопка закриття внизу
    const closeBtn = document.createElement('button');
    closeBtn.textContent = "Зберегти та закрити";
    closeBtn.style.cssText = "width: 100%; padding: 15px; margin-top: 25px; background: #d4af37; color: #000; border: none; font-weight: bold; cursor: pointer; text-transform: uppercase; font-size: 1rem;";
    closeBtn.onclick = closeExerciseModal;
    list.appendChild(closeBtn);

    modal.style.display = 'flex';
}

function addSingleExercise(btn, name, stage, category) {
    const { dayIndex } = window.currentAddContext;
    const exTemplate = EXERCISE_LIBRARY[stage][category].exercises.find(e => e.name === name);
    
    if (exTemplate) {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const key = `day_plan_${dayIndex}`;
        if (!data[key]) data[key] = { exercises: [] };
        
        // Додаємо вправу в масив
        data[key].exercises.push({ ...exTemplate, stage, category });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        
        // Оновлюємо основну сторінку під модалкою
        updateCycleColors();
        
        // Змінюємо стан кнопки в модалці
        btn.textContent = "Додано ✔";
        btn.style.background = "#28a745";
        btn.style.color = "#fff";
        btn.disabled = true;
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

function closeExerciseModal() {
    const modal = document.getElementById('exercise-selection-modal');
    if (modal) modal.style.display = 'none';
}

// Закриття по кліку на фон
window.onclick = function(event) {
    const modal = document.getElementById('exercise-selection-modal');
    if (event.target == modal) closeExerciseModal();
}

// =========================================================
// 4. СТАРТ ТА СЛУХАЧІ ПОДІЙ
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    // Відновлення вибраних селектів (Матч/Тренування)
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    document.querySelectorAll('.activity-type-select').forEach(sel => {
        if (data[sel.name]) sel.value = data[sel.name];
        sel.addEventListener('change', () => updateCycleColors());
    });

    // Перший запуск
    updateCycleColors();
});
