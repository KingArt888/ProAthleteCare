const STORAGE_KEY = 'weeklyPlanData';
const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота', 'Неділя'];

document.addEventListener('DOMContentLoaded', () => {
    
    // Поточний день: 0 - Понеділок, 6 - Неділя
    const today = new Date();
    const currentDayIndex = (today.getDay() + 6) % 7; 

    const savedData = localStorage.getItem(STORAGE_KEY);
    let data = {};
    if (savedData) {
        data = JSON.parse(savedData);
    }
    
    const dayPlanKey = `structured_plan_${currentDayIndex}`;
    const dayPlan = data[dayPlanKey];

    displayTasks(dayPlan, currentDayIndex);
});

// =========================================================
// ФУНКЦІЯ: displayTasks 
// =========================================================
function displayTasks(dayPlan, currentDayIndex) {
    const tasksContainer = document.getElementById('daily-tasks-container');
    const dayName = dayNames[currentDayIndex];
    
    if (!tasksContainer) {
        console.error("Критична помилка: Не знайдено контейнер #daily-tasks-container.");
        return;
    }
    
    tasksContainer.innerHTML = ''; 

    // Використовуємо id="main-protocol-header"
    const header = document.getElementById('main-protocol-header');
    if (header) {
        header.innerHTML = `🔥 Daily Individual: Індивідуальний протокол на **${dayName}**`;
    } 

    if (!dayPlan || !dayPlan.tasks || dayPlan.tasks.length === 0) {
        tasksContainer.innerHTML = `
            <div class="warning-box">
                <span class="icon-text">⚠️ План на ${dayName} відсутній</span>
                <p>Не знайдено структурованих завдань. Переконайтеся, що ви зберегли дані у <a href="weekly-individual.html">Weekly Individual</a> у правильному структурованому форматі (використовуйте ключові слова: "Розминка", "Основна", "Завершення" та нумеровані списки).</p>
            </div>`;
        return;
    }
    
    dayPlan.tasks.forEach(task => {
        
        // Виправлено: Шлях до зображення
        const videoHtml = task.video_key ? 
            `<div class="video-placeholder video-active"><img src="AK_logo.png" alt="Video Icon"/> Відео ${task.video_key}</div>` : 
            `<div class="video-placeholder">Відео недоступно</div>`;

        let stageDisplay = '';
        if (task.stage === 'Pre-Training') {
            stageDisplay = 'До тренування';
        } else if (task.stage === 'Main Training') {
            stageDisplay = 'Основна Робота';
        } else if (task.stage === 'Post-Training') {
            stageDisplay = 'Після тренування';
        } else {
            stageDisplay = 'Завдання';
        }
        
        // Логіка для розділення тексту на пункти (залишено лише 1., 2. формат)
        const descriptionText = task.description
            .replace(/\*+/g, '') 
            .trim(); 
        
        let descriptionHTML = `<p class="list-text">${descriptionText}</p>`;
        
        const lines = descriptionText.split('\n');
        // Перевірка на наявність нумерації
        const isList = lines.some(line => /^\d+[\.\)]\s/.test(line.trim()));
        
        if (isList) {
            descriptionHTML = `<div class="task-description-list">`;
            lines.forEach(line => {
                const match = line.trim().match(/^(\d+)[.\)]\s*(.*)/);
                if (match) {
                    descriptionHTML += `
                        <div class="task-list-item">
                            <span class="list-number">${match[1]}.</span> 
                            <span class="list-text">${match[2].trim()}</span>
                        </div>`;
                } else if (line.trim().length > 0) {
                     descriptionHTML += `<div class="task-list-item"><span class="list-text list-text-unstructured">${line.trim()}</span></div>`;
                }
            });
            descriptionHTML += `</div>`;
        }

        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
        taskItem.dataset.stage = task.stage.replace(' ', '-');
        
        taskItem.innerHTML = `
            <div class="task-video-container">
                ${videoHtml}
            </div>
            
            <div class="task-details-content">
                <div class="stage-label-header">${stageDisplay}</div>
                ${task.stage === 'Main Training' ? 
                    `<h3 class="task-title-phase">Фаза: ${dayPlan.phase}</h3>` : 
                    `<h3 class="task-title-phase" style="display:none;"></h3>`
                }
                <div class="task-description-wrapper">
                    ${descriptionHTML}
                </div>
            </div>
        `;

        tasksContainer.appendChild(taskItem);
    });
}
