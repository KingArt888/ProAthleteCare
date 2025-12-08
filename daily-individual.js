document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Конфігурація та Карта Відео ---
    const STORAGE_KEY = 'weeklyPlanData';
    const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота', 'Неділя'];
    
    // ПРИКЛАД: Карта ваших коротких відео. 
    // ВИКОРИСТОВУЙТЕ ID ВІДЕО ТА ПАРАМЕТРИ ДЛЯ АВТОПЛЕЮ/ЦИКЛУ
    const EXERCISE_VIDEO_MAP = {
        // ID відео YouTube без ?embed/
        "mobility_shoulders": "bU_kK3B4j-k", 
        "back_squat_70": "fH_C1-eU6S8",
        "plyo_jumps": "5Y3U_k4-k9A",
        "cool_down_5min": "vX-h3B2-m1P",
        "sprint_30m": "cW_jK4L-p2R",
    };

    const container = document.getElementById('daily-plan-view');
    if (!container) return; 

    // Визначення сьогоднішнього дня (0 = ПН, 6 = НД)
    let todayIndex = new Date().getDay();
    todayIndex = (todayIndex === 0) ? 6 : todayIndex - 1; 

    const savedData = localStorage.getItem(STORAGE_KEY);
    let planData = savedData ? JSON.parse(savedData) : {};
    
    // Ключ для доступу до структурованих завдань поточного дня.
    // УВАГА: Припускаємо, що у weekly-individual.js ви зберегли дані під цим ключем.
    const dailyTaskData = planData[`structured_plan_${todayIndex}`]; 

    // Допоміжна функція для групування завдань за етапом
    const groupTasksByStage = (tasks) => {
        const stages = {
            'Pre-Training': { title: '🔥 Підготовка (Pre-Training)', tasks: [] },
            'Main Training': { title: '💪 Індивідуальна Робота (Main Training)', tasks: [] },
            'Post-Training': { title: '❄️ Відновлення (Post-Training)', tasks: [] },
        };
        tasks.forEach(task => {
            const stageKey = task.stage || 'Main Training';
            if (stages[stageKey]) {
                stages[stageKey].tasks.push(task);
            }
        });
        return stages;
    };


    // --- 2. Обробка відсутності даних ---
    if (!dailyTaskData || !dailyTaskData.tasks || dailyTaskData.tasks.length === 0) {
        container.innerHTML = `
            <div class="daily-card error-card">
                <h3 class="gold-text">⚠️ План на ${dayNames[todayIndex]} відсутній</h3>
                <p>Не знайдено структурованих завдань. Переконайтеся, що ви зберегли дані у <a href="weekly-individual.html" class="gold-link">Weekly Individual</a> у правильному структурованому форматі.</p>
            </div>
        `;
        return;
    }

    // Групуємо завдання та готуємо HTML
    const groupedTasks = groupTasksByStage(dailyTaskData.tasks);
    let tasksHTML = '';

    for (const stageKey in groupedTasks) {
        const stageData = groupedTasks[stageKey];
        if (stageData.tasks.length > 0) {
            tasksHTML += `<h3 class="stage-header gold-text">${stageData.title}</h3>`;
            tasksHTML += `<div class="stage-container">`;

            stageData.tasks.forEach((task) => {
                const videoID = EXERCISE_VIDEO_MAP[task.video_key];
                
                // Параметри для автоплею/зациклення, без контролів
                const videoParams = `?autoplay=1&mute=1&loop=1&playlist=${videoID}&controls=0&modestbranding=1&rel=0`;
                const videoSource = videoID ? `https://www.youtube.com/embed/${videoID}${videoParams}` : null;
                
                const videoHTML = videoSource 
                    ? `
                    <div class="video-preview-wrapper">
                        <iframe 
                            src="${videoSource}" 
                            frameborder="0" 
                            allow="autoplay; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen>
                        </iframe>
                    </div>
                    ` 
                    : `<div class="no-video-alert">Відео не знайдено для вправи "${task.title}"</div>`;

                tasksHTML += `
                    <div class="exercise-row">
                        <div class="exercise-media">
                            ${videoHTML}
                        </div>
                        <div class="exercise-info">
                            <h4>${task.title}</h4>
                            <p class="task-description">${task.description}</p>
                        </div>
                    </div>
                `;
            });
            tasksHTML += `</div>`; // Закриття stage-container
        }
    }
    
    // --- 3. Фінальна Збірка Сторінки ---
    const outputHTML = `
        <div class="daily-card">
            <p class="day-of-week"><span class="gold-text">Поточний день:</span> ${dayNames[todayIndex]}</p>
            <div class="status-indicator">
                <span class="md-status-label color-red">${dailyTaskData.phase}</span>
            </div>
        </div>

        <div class="tasks-card">
            <h3 class="gold-text">📅 Протокол тренування на сьогодні:</h3>
            ${tasksHTML}
        </div>
    `;

    container.innerHTML = outputHTML;
});
