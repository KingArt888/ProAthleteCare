// daily-individual.js

const DAILY_STORAGE_KEY = 'weeklyPlanData'; // ЗМІНА: для уникнення конфлікту імен з weekly-individual.js
const YOUTUBE_EMBED_BASE = 'https://www.youtube.com/embed/';

// ===================== COLORS =====================
// *** ВИДАЛЕНО const COLOR_MAP = {...} для уникнення конфлікту (SyntaxError) ***

const dayNamesFull = [
    // Виправлення: 0=Понеділок, 6=Неділя, щоб відповідати day_plan_X
    'Понеділок','Вівторок','Середа','Четвер','Пʼятниця','Субота','Неділя' 
];

// ===================== RECOMMENDATIONS =====================
const MD_RECOMMENDATIONS = {
    'MD': 'Сьогодні ігровий день...',
    'MD+1': 'Високе навантаження!',
    'MD+2': 'Середнє навантаження.',
    'MD-1': 'День перед матчем.',
    'MD-2': 'Глибоке відновлення.',
    'MD-3': 'Активний відпочинок.',
    'MD-4': 'Базове тренування.',
    'REST': 'Повний відпочинок.',
    'TRAIN': 'Стандартний тренувальний день.'
};

// ===================== HELPERS =====================
function getCurrentDayIndex() {
    const d = new Date().getDay(); // 0 (Неділя) до 6 (Субота)
    // Повертає 0 для Понеділка, 6 для Неділі
    return d === 0 ? 6 : d - 1; 
}

function normalizeStage(stage) {
    if (!stage) return 'UNSORTED';
    return stage
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .replace(/^pre-training$/, 'Pre-training')
        .replace(/^main-training$/, 'Main-training')
        .replace(/^post-training$/, 'Post-training');
}

// ... (функції initializeCollapsibles та createExerciseItemHTML без значних змін)

// ===================== MAIN LOAD (ЗМІНА: ДОДАНО ЛОГІКУ СТАТУСУ) =====================
function loadAndDisplayDailyPlan() {
    const todayIndex = getCurrentDayIndex();
    const dayName = dayNamesFull[todayIndex]; 
    const planKey = `day_plan_${todayIndex}`;

    const list = document.getElementById('daily-exercise-list');
    
    // 1. ОТРИМУЄМО HTML-ЕЛЕМЕНТИ ДЛЯ СТАТУСУ:
    const dayNameEl = document.getElementById('daily-day-name'); 
    const mdStatusEl = document.getElementById('daily-md-status'); 
    const recommendationEl = document.getElementById('daily-recommendation-text');

    if (dayNameEl) dayNameEl.textContent = dayName; // Виводимо назву дня

    const savedData = JSON.parse(localStorage.getItem(DAILY_STORAGE_KEY) || '{}');
    const todayPlan = savedData[planKey];

    // 2. ЛОГІКА ДЛЯ ВИЗНАЧЕННЯ СТАТУСУ ТА РЕКОМЕНДАЦІЙ:
    let mdStatus = 'TRAIN'; 
    let recommendation = MD_RECOMMENDATIONS['TRAIN'];

    if (todayPlan && todayPlan.mdStatus) {
        mdStatus = todayPlan.mdStatus;
        recommendation = MD_RECOMMENDATIONS[mdStatus] || MD_RECOMMENDATIONS['TRAIN'];
    } else if (!todayPlan) {
        // Якщо плану немає, встановлюємо статус як REST/Немає плану
        mdStatus = 'REST';
        recommendation = MD_RECOMMENDATIONS['REST'];
    }

    // 3. ВСТАВЛЯЄМО СТАТУС ТА РЕКОМЕНДАЦІЮ В HTML:
    if (mdStatusEl) mdStatusEl.textContent = mdStatus;
    if (recommendationEl) recommendationEl.textContent = recommendation;
    // ----------------------------------------------------

    if (!list) return;

    if (!todayPlan || !todayPlan.exercises?.length) {
        list.innerHTML = `<p>На сьогодні немає запланованих вправ.</p>`;
        return;
    }

    // ... (Групування та відображення вправ залишається без змін)
    // === GROUP BY STAGE ===
    const grouped = {};
    todayPlan.exercises.forEach((ex, i) => {
        const stage = normalizeStage(ex.stage);
        if (!grouped[stage]) grouped[stage] = [];
        grouped[stage].push({ ...ex, originalIndex: i });
    });

    const order = ['Pre-training','Main-training','Post-training','Recovery','UNSORTED'];
    const stages = Object.keys(grouped).sort((a,b) => {
        const ia = order.indexOf(a), ib = order.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
    });

    let html = '';
    let idx = 1;

    stages.forEach(stage => {
        html += `
            <div class="training-section">
                <h3 class="stage-header collapsible">
                    ${idx++}. ${stage.replace('-', ' ').toUpperCase()}
                    <span class="toggle-icon">►</span>
                </h3>
                <div class="section-content">
                    ${grouped[stage].map(e =>
                        createExerciseItemHTML(e, e.originalIndex)
                    ).join('')}
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
    initializeCollapsibles();
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayDailyPlan();
});
