const STORAGE_KEY = 'weeklyPlanData';
const COLOR_MAP = {
    'MD': { status: 'MD', colorClass: 'color-red' },
    'MD+1': { status: 'MD+1', colorClass: 'color-dark-green' }, 
    'MD+2': { status: 'MD+2', colorClass: 'color-green' }, 
    'MD+3': { status: 'MD+3', colorClass: 'color-neutral' }, 
    'MD-1': { status: 'MD-1', colorClass: 'color-yellow' }, 
    'MD-2': { status: 'MD-2', colorClass: 'color-deep-green' }, 
    'MD-3': { status: 'MD-3', colorClass: 'color-orange' }, 
    'MD-4': { status: 'MD-4', colorClass: 'color-blue' }, 
    'REST': { status: 'REST', colorClass: 'color-neutral' }, 
    'TRAIN': { status: 'TRAIN', colorClass: 'color-dark-grey' }, 
};

// Приклад карти відео для Daily Individual (повинна збігатися з daily-individual.js)
const DEFAULT_VIDEO_KEY_MAP = {
    'MD-4': "back_squat_70", 
    'MD-3': "sprint_30m",
    'MD-2': "mobility_shoulders",
    'MD-1': "core_plank",
    'MD+1': "cool_down_5min",
    'MD+2': "mobility_shoulders",
    'MD': "cool_down_5min",
    'REST': "cool_down_5min",
    'TRAIN': "back_squat_70"
};

document.addEventListener('DOMContentLoaded', () => {
    
    // === ІНІЦІАЛІЗАЦІЯ ЗМІННИХ ===
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dynamicMatchFields = document.getElementById('dynamic-match-fields');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    const form = document.getElementById('weekly-plan-form');
    const saveButton = document.querySelector('.save-button'); 
    const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота', 'Неділя'];

    if (activitySelects.length === 0 || dayCells.length === 0 || !form) {
        console.error("Помилка: Не знайдено необхідних елементів таблиці або форми.");
        return; 
    }
    
    // =========================================================
    // ФУНКЦІЯ: ЗБЕРЕЖЕННЯ ДАНИХ (ОНОВЛЕНО ДЛЯ ЗВ'ЯЗКУ)
    // =========================================================
    function saveData() {
        try {
            // 1. Збираємо всі плоскі дані форми (для повного завантаження форми)
            const flatData = {};
            document.querySelectorAll('#weekly-plan-form [name]').forEach(element => {
                const name = element.name;
                flatData[name] = element.value;
            });

            // ----------------------------------------------------
            // 2. СТВОРЕННЯ СТРУКТУРОВАНИХ ДАНИХ ДЛЯ DAILY INDIVIDUAL
            // ----------------------------------------------------
            const structuredPlanData = {};
            const dayIndices = [0, 1, 2, 3, 4, 5, 6]; 

            dayIndices.forEach(dayIndex => {
                const activityType = flatData[`activity_${dayIndex}`];
                const dailyTaskContent = flatData[`daily_task_${dayIndex}`];
                
                // Витягуємо фінальний статус MD-фази з елемента DOM
                const mdStatusElement = document.querySelector(`#day-status-${dayIndex} .md-status`);
                const finalPhase = mdStatusElement ? mdStatusElement.textContent : 'TRAIN';
                
                const tasks = [];
                
                if (dailyTaskContent && dailyTaskContent.trim() !== '') {
                    // Визначаємо загальний ключ відео для цього дня/фази
                    const videoKey = DEFAULT_VIDEO_KEY_MAP[finalPhase] || DEFAULT_VIDEO_KEY_MAP['TRAIN'];
                    
                    // Тут ми об'єднуємо весь вміст dailyTaskContent в одну "загальну" задачу.
                    // УВАГА: Якщо ви захочете розділяти текст на Pre/Main/Post, 
                    // ця логіка має бути значно складнішою (парсинг тексту на блоки).
                    
                    // Щоб Daily Individual відображав три окремі блоки, 
                    // ми спробуємо розділити текст за ключовими словами
                    
                    let preTask = dailyTaskContent.includes('Розминка') ? dailyTaskContent.substring(0, dailyTaskContent.indexOf('Основна')) : '';
                    let mainTask = dailyTaskContent.includes('Основна') ? dailyTaskContent.substring(dailyTaskContent.indexOf('Основна'), dailyTaskContent.indexOf('Завершення') > 0 ? dailyTaskContent.indexOf('Завершення') : dailyTaskContent.length) : dailyTaskContent;
                    let postTask = dailyTaskContent.includes('Завершення') ? dailyTaskContent.substring(dailyTaskContent.indexOf('Завершення')) : '';

                    // Якщо текст не вдалося розділити, використовуємо весь текст як Основне Тренування
                    if (preTask === '' && mainTask === dailyTaskContent) {
                        tasks.push({
                            "title": `Протокол ${finalPhase} на ${dayNames[dayIndex]}`,
                            "stage": "Main Training", 
                            "description": dailyTaskContent.trim(), 
                            "video_key": videoKey
                        });
                    } else {
                        // Якщо вдалося розділити, додаємо окремі блоки
                        if (preTask.trim().length > 0) {
                            tasks.push({
                                "title": `Підготовка: ${finalPhase}`,
                                "stage": "Pre-Training",
                                "description": preTask.trim(),
                                "video_key": videoKey
                            });
                        }
                        if (mainTask.trim().length > 0) {
                            tasks.push({
                                "title": `Основна робота: ${finalPhase}`,
                                "stage": "Main Training",
                                "description": mainTask.trim(),
                                "video_key": videoKey
                            });
                        }
                         if (postTask.trim().length > 0) {
                            tasks.push({
                                "title": `Відновлення: ${finalPhase}`,
                                "stage": "Post-Training",
                                "description": postTask.trim(),
                                "video_key": videoKey
                            });
                        }
                    }
                }

                // Зберігаємо структурований план для Daily Individual
                structuredPlanData[`structured_plan_${dayIndex}`] = {
                    day: dayNames[dayIndex],
                    phase: finalPhase, 
                    activity: activityType,
                    tasks: tasks
                };
            });
            
            // ----------------------------------------------------
            // 3. ОБ'ЄДНАННЯ ТА ЗБЕРЕЖЕННЯ (Плоскі дані + Структуровані плани)
            // ----------------------------------------------------
            const combinedData = { ...flatData, ...structuredPlanData };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(combinedData));
            
            saveButton.textContent = 'Збережено! (✔)';
            setTimeout(() => {
                saveButton.textContent = 'Зберегти Тижневий План';
            }, 2000);
        } catch (e) {
            console.error("Помилка при збереженні даних:", e);
        }
    }

    // =========================================================
    // ФУНКЦІЯ: ІНІЦІАЛІЗАЦІЯ ШАБЛОНІВ (Залишаємо без змін)
    // =========================================================
    function initializeTemplates() {
        // ... (Ваш існуючий код initializeTemplates) ...
        const templates = [
            // СТРУКТУРОВАНІ ШАБЛОНИ: ВАЖЛИВО, щоб тут були слова "Розминка", "Основна", "Завершення"
            { name: 'tasks_md_
