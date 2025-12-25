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

const MD_RECOMMENDATIONS = {
    'MD': 'Ігровий день. Фокус на результаті та енергії.',
    'MD+1': 'Відновлення. Робота з роликом (МФР) та легка мобільність.',
    'MD-1': 'Передматчева активація. Швидкість та реакція.',
    'REST': 'Повний відпочинок. Відновлюй ресурси організму.',
    'TRAIN': 'Робочий день. Працюй за планом.'
};

// Структура етапів для завантаження
const STAGES = ['Pre-Training', 'Main Training', 'Post-Training'];

function getCurrentDayIndex() {
    const today = new Date();
    const jsDay = today.getDay(); 
    return (jsDay === 0) ? 6 : jsDay - 1; 
}

// Функція створення картки вправи з відео
function createExerciseItemHTML(exercise, index) {
    const uniqueId = `ex-${getCurrentDayIndex()}-${index}`;
    let mediaHtml = '';

    if (exercise.videoKey) {
        mediaHtml = `<iframe src="${YOUTUBE_EMBED_BASE}${exercise.videoKey}" frameborder="0" allowfullscreen></iframe>`;
    } else {
        mediaHtml = `<div class="no-video-placeholder" style="width:300px; height:180px; background:#111; display:flex; align-items:center; justify-content:center; border:1px solid #d4af37; color:#444;">Відео в процесі...</div>`;
    }

    return `
        <div class="daily-exercise-item">
            <div class="exercise-content">
                <h4>${exercise.name}</h4>
                <div class="exercise-details">
                    <p><strong>Категорія:</strong> ${exercise.category || 'Загальна'}</p>
                    <p>${exercise.description || 'Виконуйте згідно з технікою.'}</p>
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
    const recContainer = document.getElementById('md-recommendations');

    try {
        const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const mdStatus = calculateTodayStatus(savedData, todayIndex);
        
        // Відображення статусу та рекомендації
        const style = COLOR_MAP[mdStatus] || COLOR_MAP['TRAIN'];
        if (statusDisplay) {
            statusDisplay.textContent = mdStatus;
            statusDisplay.className = `md-status ${style.colorClass}`;
        }
        if (recContainer) {
            recContainer.innerHTML = `<p><strong>Порада тренера:</strong> ${MD_RECOMMENDATIONS[mdStatus] || MD_RECOMMENDATIONS['TRAIN']}</p>`;
        }

        const planKey = `status_plan_${mdStatus}`;
        const plan = savedData[planKey];

        if (!plan || !plan.exercises || plan.exercises.length === 0) {
            listContainer.innerHTML = '<p class="note-info">На сьогодні вправ немає.</p>';
            return;
        }

        // ГРУПУВАННЯ ЗА ЕТАПАМИ (Pre, Main, Post)
        let finalHtml = '';
        STAGES.forEach(stage => {
            const stageExercises = plan.exercises.filter(ex => ex.stage === stage);
            
            if (stageExercises.length > 0) {
                finalHtml += `
                    <div class="stage-group">
                        <h3 class="stage-header" style="background: #1a1a1a; color: #d4af37; padding: 10px; border-left: 4px solid #d4af37; margin-top: 20px; cursor: pointer;">
                            ${stage.replace('-', ' ')} ▼
                        </h3>
                        <div class="stage-content">
                            ${stageExercises.map((ex, i) => createExerciseItemHTML(ex, i)).join('')}
                        </div>
                    </div>
                `;
            }
        });

        listContainer.innerHTML = finalHtml;

    } catch (e) {
        console.error("Помилка завантаження:", e);
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
