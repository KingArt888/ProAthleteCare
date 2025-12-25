// daily-individual.js — ProAtletCare (FINAL STABLE VERSION)
const STORAGE_KEY = 'weeklyPlanData';
const YOUTUBE_EMBED_BASE = 'https://www.youtube.com/embed/';

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

const STAGES = ['Pre-Training', 'Main Training', 'Post-Training'];

// 1. Функція для акордеонів (відкрити/закрити)
function toggleStage(headerElement) {
    const content = headerElement.nextElementSibling;
    const arrow = headerElement.querySelector('.stage-arrow');
    
    if (content.style.display === "none" || content.style.display === "") {
        content.style.display = "block";
        if (arrow) arrow.textContent = "▼";
        headerElement.style.borderLeftColor = "#FFD700";
    } else {
        content.style.display = "none";
        if (arrow) arrow.textContent = "▶";
        headerElement.style.borderLeftColor = "#444";
    }
}

function getCurrentDayIndex() {
    const today = new Date();
    const jsDay = today.getDay(); 
    return (jsDay === 0) ? 6 : jsDay - 1; 
}

function createExerciseItemHTML(exercise, index) {
    const uniqueId = `ex-check-${index}`;
    let mediaHtml = '';

    if (exercise.videoKey) {
        mediaHtml = `<iframe src="${YOUTUBE_EMBED_BASE}${exercise.videoKey}" frameborder="0" allowfullscreen></iframe>`;
    } else {
        mediaHtml = `<div style="width:100%; height:180px; background:#111; display:flex; align-items:center; justify-content:center; border:1px solid #333; color:#444;">Відео вантажиться...</div>`;
    }

    return `
        <div class="daily-exercise-item" style="margin-bottom: 15px; border: 1px solid #333; padding: 10px; background: #0a0a0a;">
            <div class="exercise-content">
                <h4 style="color: #d4af37; margin-bottom: 5px;">${exercise.name}</h4>
                <p style="font-size: 0.85rem; color: #ccc;">${exercise.category || ''}</p>
            </div>
            <div class="media-container" style="margin-top: 10px;">
                ${mediaHtml}
                <div style="margin-top: 10px; display: flex; align-items: center; gap: 10px; color: #fff;">
                    <input type="checkbox" id="${uniqueId}" onchange="this.closest('.daily-exercise-item').style.opacity = this.checked ? 0.5 : 1">
                    <label for="${uniqueId}">Виконано</label>
                </div>
            </div>
        </div>
    `;
}

function loadAndDisplayDailyPlan() {
    const todayIndex = getCurrentDayIndex();
    const listContainer = document.getElementById('daily-exercise-list');
    const statusDisplay = document.getElementById('md-status-display');
    const mdxDisplay = document.getElementById('mdx-range-display');

    try {
        const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        
        // Розрахунок статусу (MD, MD-1 і т.д.)
        const mdStatus = calculateTodayStatus(savedData, todayIndex);
        
        // Відображення статусу
        const style = COLOR_MAP[mdStatus] || COLOR_MAP['TRAIN'];
        if (statusDisplay) {
            statusDisplay.textContent = mdStatus;
            statusDisplay.className = `md-status ${style.colorClass}`;
        }
        if (mdxDisplay) mdxDisplay.textContent = mdStatus;

        // ВАЖЛИВО: Отримуємо план саме за статусом
        const planKey = `status_plan_${mdStatus}`;
        const plan = savedData[planKey];

        if (!plan || !plan.exercises || plan.exercises.length === 0) {
            listContainer.innerHTML = `
                <div style="padding: 20px; border: 1px solid #d4af37; background: #111; color: #eee; text-align: center;">
                    <h3>На сьогодні вправ не знайдено</h3>
                    <p>Будь ласка, додайте вправи у вкладці <strong>Weekly Individual</strong> для статусу ${mdStatus}.</p>
                </div>`;
            return;
        }

        // Генерація акордеонів
        let finalHtml = '';
        STAGES.forEach(stage => {
            const stageExercises = plan.exercises.filter(ex => ex.stage === stage);
            
            if (stageExercises.length > 0) {
                finalHtml += `
                    <div class="stage-wrapper" style="margin-bottom: 10px;">
                        <div class="stage-header" onclick="toggleStage(this)" style="
                            background: #1a1a1a; color: #d4af37; padding: 15px; 
                            border-left: 4px solid #444; cursor: pointer; 
                            display: flex; justify-content: space-between; font-weight: bold;">
                            <span>${stage.toUpperCase()}</span>
                            <span class="stage-arrow">▶</span>
                        </div>
                        <div class="stage-content" style="display: none; padding: 10px; background: #050505;">
                            ${stageExercises.map((ex, i) => createExerciseItemHTML(ex, i)).join('')}
                        </div>
                    </div>
                `;
            }
        });

        listContainer.innerHTML = finalHtml;

    } catch (e) {
        console.error("Помилка:", e);
        listContainer.innerHTML = "<p style='color:red;'>Помилка завантаження даних.</p>";
    }
}

function calculateTodayStatus(data, todayIdx) {
    let matchIndices = [];
    for (let i = 0; i < 7; i++) {
        if (data[`activity_${i}`] === 'MATCH') matchIndices.push(i);
    }
    
    if (data[`activity_${todayIdx}`] === 'REST') return 'REST';
    if (matchIndices.length === 0) return 'TRAIN';
    
    let bestStatus = 'TRAIN';
    let minDiff = Infinity;

    matchIndices.forEach(mIdx => {
        let diff = todayIdx - mIdx;
        if (diff === 0) { bestStatus = 'MD'; minDiff = 0; }
        else if (diff === 1 || diff === 2) {
            if (Math.abs(diff) < Math.abs(minDiff)) { minDiff = diff; bestStatus = `MD+${diff}`; }
        }
        else if (diff >= -4 && diff <= -1) {
            if (Math.abs(diff) < Math.abs(minDiff)) { minDiff = diff; bestStatus = `MD${diff}`; }
        }
    });
    
    return bestStatus;
}

document.addEventListener('DOMContentLoaded', loadAndDisplayDailyPlan);
