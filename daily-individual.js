// daily-individual.js — ProAtletCare
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

// 1. Функція для розгортання/згортання блоків
function toggleStage(headerElement) {
    const content = headerElement.nextElementSibling;
    const arrow = headerElement.querySelector('.stage-arrow');
    
    if (content.style.display === "none" || content.style.display === "") {
        content.style.display = "block";
        arrow.textContent = "▼";
        headerElement.style.borderColor = "#FFD700"; // Підсвічуємо золотим при відкритті
    } else {
        content.style.display = "none";
        arrow.textContent = "▶";
        headerElement.style.borderColor = "#444";
    }
}

function getCurrentDayIndex() {
    const today = new Date();
    const jsDay = today.getDay(); 
    return (jsDay === 0) ? 6 : jsDay - 1; 
}

function createExerciseItemHTML(exercise, index) {
    const uniqueId = `ex-${getCurrentDayIndex()}-${index}`;
    let mediaHtml = '';

    if (exercise.videoKey) {
        mediaHtml = `<iframe src="${YOUTUBE_EMBED_BASE}${exercise.videoKey}" frameborder="0" allowfullscreen></iframe>`;
    } else {
        mediaHtml = `<div class="no-video" style="width:300px; height:180px; background:#111; display:flex; align-items:center; justify-content:center; border:1px solid #333; color:#444;">Відео додається...</div>`;
    }

    return `
        <div class="daily-exercise-item">
            <div class="exercise-content">
                <h4>${exercise.name}</h4>
                <div class="exercise-details">
                    <p><strong>Категорія:</strong> ${exercise.category || 'Тренування'}</p>
                    <p>${exercise.description || 'Виконуйте згідно з протоколом.'}</p>
                </div>
            </div>
            <div class="media-container">
                ${mediaHtml}
                <div class="completion-section">
                    <label>Готово:</label>
                    <input type="checkbox" id="${uniqueId}" onchange="this.closest('.daily-exercise-item').style.opacity = this.checked ? 0.5 : 1">
                </div>
            </div>
        </div>
    `;
}

function loadAndDisplayDailyPlan() {
    const todayIndex = getCurrentDayIndex();
    const listContainer = document.getElementById('daily-exercise-list');
    const statusDisplay = document.getElementById('md-status-display');

    try {
        const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const mdStatus = calculateTodayStatus(savedData, todayIndex);
        
        const style = COLOR_MAP[mdStatus] || COLOR_MAP['TRAIN'];
        if (statusDisplay) {
            statusDisplay.textContent = mdStatus;
            statusDisplay.className = `md-status ${style.colorClass}`;
        }

        const planKey = `status_plan_${mdStatus}`;
        const plan = savedData[planKey];

        if (!plan || !plan.exercises || plan.exercises.length === 0) {
            listContainer.innerHTML = '<p class="note-info">На сьогодні вправ немає.</p>';
            return;
        }

        let finalHtml = '';
        STAGES.forEach(stage => {
            const stageExercises = plan.exercises.filter(ex => ex.stage === stage);
            
            if (stageExercises.length > 0) {
                finalHtml += `
                    <div class="stage-accordion" style="margin-bottom: 15px;">
                        <div class="stage-header" onclick="toggleStage(this)" style="
                            background: #1a1a1a; 
                            color: #d4af37; 
                            padding: 15px; 
                            border-left: 4px solid #444; 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: center; 
                            cursor: pointer;
                            font-weight: bold;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                            transition: 0.3s;
                        ">
                            <span>${stage.replace('-', ' ')}</span>
                            <span class="stage-arrow">▶</span>
                        </div>
                        <div class="stage-content" style="display: none; padding-top: 15px;">
                            ${stageExercises.map((ex, i) => createExerciseItemHTML(ex, i)).join('')}
                        </div>
                    </div>
                `;
            }
        });

        listContainer.innerHTML = finalHtml;

    } catch (e) {
        console.error("Помилка:", e);
    }
}

function calculateTodayStatus(data, todayIdx) {
    let matchIndices = [];
    for (let i = 0; i < 7; i++) {
        if (data[`activity_${i}`] === 'MATCH') matchIndices.push(i);
    }
    if (matchIndices.length === 0) return 'TRAIN';
    
    let bestStatus = 'TRAIN';
    let minDiff = Infinity;
    matchIndices.forEach(mIdx => {
        let diff = todayIdx - mIdx;
        if (diff === 0) { bestStatus = 'MD'; minDiff = 0; }
        else if ((diff === 1 || diff === 2) && Math.abs(diff) < Math.abs(minDiff)) {
            minDiff = diff; bestStatus = `MD+${diff}`;
        }
        else if (diff >= -4 && diff <= -1 && Math.abs(diff) < Math.abs(minDiff)) {
            minDiff = diff; bestStatus = `MD${diff}`;
        }
    });
    return (data[`activity_${todayIdx}`] === 'REST') ? 'REST' : bestStatus;
}

document.addEventListener('DOMContentLoaded', loadAndDisplayDailyPlan);
