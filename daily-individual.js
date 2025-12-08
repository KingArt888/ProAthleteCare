document.addEventListener('DOMContentLoaded', () => {
    // Константи для ProAthleteCare
    const STORAGE_KEY = 'weeklyPlanData';
    const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота', 'Неділя'];
    
    // Мапа кольорів (частина, що використовується для статусу)
    const COLOR_MAP = {
        'MD': { status: 'MD (Матч)', colorClass: 'color-red' },
        'MD+1': { status: 'MD+1 (Легке Відновлення)', colorClass: 'color-dark-green' }, 
        'MD+2': { status: 'MD+2 (Відновлення)', colorClass: 'color-green' }, 
        'MD-1': { status: 'MD-1 (Передматчева Активація)', colorClass: 'color-yellow' }, 
        'MD-2': { status: 'MD-2 (Спеціальна Витривалість)', colorClass: 'color-deep-green' }, 
        'MD-3': { status: 'MD-3 (Швидкість/Кор)', colorClass: 'color-orange' }, 
        'MD-4': { status: 'MD-4 (MAX Сила)', colorClass: 'color-blue' }, 
        'REST': { status: 'Відпочинок', colorClass: 'color-neutral' }, 
        'TRAIN': { status: 'Тренування (Загальна)', colorClass: 'color-dark-grey' }, 
    };

    const container = document.getElementById('daily-plan-view');
    if (!container) return; // Захист від відсутності елемента

    // --- 1. Визначення сьогоднішнього дня ---
    // new Date().getDay() повертає 0 для НД, 1 для ПН... 6 для СБ
    let todayIndex = new Date().getDay();
    // Перетворюємо: НД (0) стає 6, ПН (1) стає 0, ВТ (2) стає 1, і т.д.
    todayIndex = (todayIndex === 0) ? 6 : todayIndex - 1; 

    const savedData = localStorage.getItem(STORAGE_KEY);
    let planData = savedData ? JSON.parse(savedData) : {};

    const dayName = dayNames[todayIndex];
    const taskKey = `daily_task_${todayIndex}`;
    const activityKey = `activity_${todayIndex}`;
    
    // --- 2. Витягнення даних ---
    let dailyTaskContent = planData[taskKey] || '';
    let activityType = planData[activityKey] || 'TRAIN';
    let isPlanActive = Object.keys(planData).length > 0;

    // Якщо даних немає, відображаємо повідомлення
    if (!isPlanActive || dailyTaskContent === '') {
        container.innerHTML = `
            <div class="daily-card error-card">
                <h3 class="gold-text">⚠️ Дані відсутні</h3>
                <p>Не вдалося завантажити індивідуальний план. Будь ласка, перевірте та збережіть свій тижневий мікроцикл у розділі 
                <a href="weekly-individual.html" class="gold-link">Weekly Individual</a>.</p>
            </div>
        `;
        return;
    }

    // --- 3. Визначення статусу MD для відображення ---
    let statusMatch = dailyTaskContent.match(/\*\*Фаза: (MD[+-]?\d?|MD|REST|TRAIN)\*\*/);
    let statusText = statusMatch ? statusMatch[1] : (activityType === 'MATCH' ? 'MD' : 'TRAIN');
    const statusStyle = COLOR_MAP[statusText] || COLOR_MAP['TRAIN'];
    
    // --- 4. Генерація HTML контенту ---
    
    // Відео для тесту (Placeholder)
    const videoEmbed = `
        <div class="video-placeholder">
            <h4 class="gold-text">🎥 ВІДЕО-ІНСТРУКЦІЯ НА ДЕНЬ</h4>
            <a href="https://youtube.com/your-test-video-link" target="_blank" class="gold-button">
                ПЕРЕГЛЯНУТИ ВІДЕО ТА ФІЛОСОФІЮ ДНЯ
            </a>
            <p class="small-text">Ви, як тренер, маєте можливість завантажити відео, що пояснює мету та техніку тренування фази **${statusText}**.</p>
        </div>
    `;

    // Деталі матчу
    let matchDetailsHTML = '';
    if (activityType === 'MATCH') {
        matchDetailsHTML = `
            <div class="match-info-box">
                <h4 class="gold-text">🏆 Деталі матчу:</h4>
                <p><strong>Суперник:</strong> ${planData[`opponent_${todayIndex}`] || 'Не вказано'}</p>
                <p><strong>Місце:</strong> ${planData[`venue_${todayIndex}`] || '—'}</p>
                <p><strong>Поїздка:</strong> ${planData[`travel_km_${todayIndex}`] || '0'} км</p>
            </div>
        `;
    }
    
    const outputHTML = `
        <div class="daily-card">
            <p class="day-of-week"><span class="gold-text">Сьогодні:</span> ${dayName}</p>
            <div class="status-indicator">
                <span class="md-status-label ${statusStyle.colorClass}">${statusStyle.status}</span>
            </div>
        </div>

        ${videoEmbed}

        <div class="tasks-card">
            <h3 class="gold-text">📝 Детальний Протокол Дня:</h3>
            ${matchDetailsHTML}
            <pre class="tasks-box">${dailyTaskContent}</pre>
        </div>
    `;

    container.innerHTML = outputHTML;
});
