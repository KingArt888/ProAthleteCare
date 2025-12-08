/* weekly-individual.js */

document.addEventListener('DOMContentLoaded', () => {
    // 1. КОНФІГУРАЦІЯ
    const DAYS_OF_WEEK = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота", "Неділя"];
    
    // MD Status Mapping: Активність -> MD Status -> CSS Class
    const MD_STATUSES = {
        'MATCH': { status: 'MD', class: 'color-red' },
        'TRAIN': { status: 'MD+2', class: 'color-green' }, // Базове тренування - середнє навантаження
        'REST': { status: 'REST', class: 'color-neutral' },
    };

    // MD Status Cycle Mapping (для днів після матчу/тренування)
    // Це приклад: після MD іде MD+1, потім MD+2 і т.д.
    const MD_CYCLE = [
        'MD',      // 0 - Match Day
        'MD+1',    // 1 - Високе (color-dark-green)
        'MD+2',    // 2 - Середнє (color-green)
        'MD-1',    // 3 - Низьке (color-yellow)
        'MD-2',    // 4
        'MD-3',    // 5
        'MD-4',    // 6
        'REST'     // 7+
    ];

    const MD_CYCLE_CLASSES = {
        'MD': 'color-red',
        'MD+1': 'color-dark-green',
        'MD+2': 'color-green',
        'MD-1': 'color-yellow',
        'MD-2': 'color-deep-green',
        'MD-3': 'color-orange',
        'MD-4': 'color-blue',
        'REST': 'color-neutral'
    };
    
    // Структура для зберігання шаблонів для кожного дня
    let dayTemplates = {}; // { 0: [{category: 'Mobility_Core', count: 3}, ...], ... }

    // HTML-елементи
    const activitySelectors = document.querySelectorAll('.activity-type-select');
    const mdStatusContainers = document.querySelectorAll('.cycle-day');
    const dayTitleContainers = document.querySelectorAll('.day-md-title');
    const taskDayContainers = document.querySelectorAll('.task-day-container');
    
    // Модальне вікно
    const modal = document.getElementById('exercise-selection-modal');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const qualityFiltersContainer = document.getElementById('quality-filters');
    const exerciseListContainer = document.getElementById('exercise-list-container');
    const addSelectedBtn = document.getElementById('add-selected-btn');
    const selectedCountSpan = document.getElementById('selected-count');
    
    let currentTemplateElement = null; // Поточний елемент шаблону, який відкрив модалку
    let selectedExercises = new Set();
    
    // Ініціалізація dayTemplates (приклад початкового заповнення)
    for (let i = 0; i < 7; i++) {
        dayTemplates[i] = [
            { id: `temp_MC_${i}`, category: 'Mobility_Core', count: 2, exercises: [] },
            { id: `temp_SL_${i}`, category: 'Strength_Lower', count: 1, exercises: [] },
        ];
    }
    
    // --- 2. ЛОГІКА MD-СТАТУСІВ ТА ЦИКЛУ ---

    /**
     * Оновлює MD-статус для всіх днів тижня.
     */
    function updateMDStatuses() {
        const activities = Array.from(activitySelectors).map(select => select.value);
        let mdIndex = -1; // Індекс дня, який є MD

        // 1. Знаходимо останній MD (Match Day)
        for (let i = 6; i >= 0; i--) {
            if (activities[i] === 'MATCH') {
                mdIndex = i;
                break;
            }
        }

        // 2. Розраховуємо та оновлюємо статуси
        for (let i = 0; i < 7; i++) {
            const dayStatusElement = mdStatusContainers[i].querySelector('.md-status');
            const activity = activities[i];
            
            let status, className;

            if (activity === 'REST') {
                // Якщо обрано REST, статус REST
                status = 'REST';
                className = MD_CYCLE_CLASSES['REST'];
            } else if (activity === 'MATCH') {
                // Якщо обрано MATCH, статус MD
                status = 'MD';
                className = MD_CYCLE_CLASSES['MD'];
            } else {
                // Якщо обрано TRAIN, розраховуємо статус відносно останнього MD
                if (mdIndex !== -1) {
                    let diff = (i - mdIndex + 7) % 7; // Кількість днів від останнього MD
                    
                    // Індекс у циклі MD_CYCLE
                    let cycleIndex = diff; 
                    if (cycleIndex >= MD_CYCLE.length) cycleIndex = MD_CYCLE.length - 1;

                    status = MD_CYCLE[cycleIndex];
                    className = MD_CYCLE_CLASSES[status];

                } else {
                    // Якщо немає матчу, всі тренування - MD+2
                    status = 'TRAIN';
                    className = MD_STATUSES['TRAIN'].class;
                }
            }

            // Оновлення HTML
            dayStatusElement.textContent = status;
            dayStatusElement.className = `md-status ${className}`;
            dayTitleContainers[i].querySelector('.md-status-label').innerHTML = `(<span class="${className}">${status}</span>)`;
            
            // Зберігаємо поточний статус у data-атрибут для використання у шаблонах
            mdStatusContainers[i].dataset.mdStatus = status;
        }
        
        // Перегенеруємо шаблони після оновлення статусів
        renderAllTemplates();
    }

    // Додаємо слухачі подій для зміни активності
    activitySelectors.forEach(select => {
        select.addEventListener('change', updateMDStatuses);
    });
    
    // --- 3. ЛОГІКА ШАБЛОНІВ ВПРАВ ---
    
    /**
     * Генерує HTML для одного шаблону (категорія + лічильник).
     */
    function createTemplateHTML(template, dayIndex) {
        const templateEl = document.createElement('div');
        templateEl.classList.add('template-group');
        templateEl.innerHTML = `
            <h5 class="template-stage-header">${template.category.replace('_', ' ')}</h5>
            <div class="template-row" data-template-id="${template.id}">
                <button type="button" class="template-category-button" data-day-index="${dayIndex}" data-category="${template.category}">
                    Вибрати вправи (${template.exercises.length})
                </button>
                <div class="count-controls">
                    <button type="button" class="count-control-btn count-minus">-</button>
                    <span class="count-display">${template.count}</span>
                    <button type="button" class="count-control-btn count-plus">+</button>
                </div>
            </div>
            <div class="generated-exercises-list">
                </div>
        `;
        
        // Обробка кнопок +/-
        templateEl.querySelector('.count-minus').addEventListener('click', (e) => handleCountChange(e, dayIndex, template.id, -1));
        templateEl.querySelector('.count-plus').addEventListener('click', (e) => handleCountChange(e, dayIndex, template.id, 1));
        
        // Обробка кнопки вибору вправ
        templateEl.querySelector('.template-category-button').addEventListener('click', (e) => openExerciseModal(e, dayIndex, template.id));

        // Рендеринг згенерованих вправ
        const exerciseList = templateEl.querySelector('.generated-exercises-list');
        template.exercises.forEach(ex => {
            exerciseList.appendChild(createExerciseItemHTML(ex));
        });

        // Додати кнопку "Додати вручну"
        const addManualBtn = document.createElement('button');
        addManualBtn.type = 'button';
        addManualBtn.classList.add('add-manual-exercise-btn');
        addManualBtn.textContent = 'Додати вправу вручну';
        addManualBtn.addEventListener('click', () => addManualExercise(dayIndex, template.id));
        templateEl.appendChild(addManualBtn);
        
        return templateEl;
    }

    /**
     * Обробляє зміну кількості вправ у шаблоні (+/-).
     */
    function handleCountChange(e, dayIndex, templateId, delta) {
        const template = dayTemplates[dayIndex].find(t => t.id === templateId);
        if (!template) return;

        let newCount = template.count + delta;
        if (newCount < 0) newCount = 0;
        
        template.count = newCount;
        
        // Оновлюємо відображення
        const display = e.target.closest('.count-controls').querySelector('.count-display');
        display.textContent = newCount;
        
        // Тут можна додати логіку автоматичного генерування/видалення вправ
        console.log(`Day ${dayIndex}, Template ${templateId}: Count updated to ${newCount}`);
    }

    /**
     * Генерує HTML-елемент для однієї згенерованої/обраної вправи.
     */
    function createExerciseItemHTML(exercise) {
        const item = document.createElement('div');
        item.classList.add('exercise-item');
        item.dataset.exerciseId = exercise.id;
        item.innerHTML = `
            <input type="text" value="${exercise.name}" placeholder="Назва вправи" required>
            <label>Параметри (Підходи x Повтори x Вага/Час):</label>
            <input type="text" value="${exercise.params || ''}" placeholder="3x10 / 30 сек.">
            <label>Примітка тренера:</label>
            <textarea rows="2" placeholder="Фокус на техніці/вибуховості">${exercise.note || ''}</textarea>
            <div class="exercise-actions">
                <button type="button" class="replace-btn" data-ex-id="${exercise.id}">🔁 Замінити</button>
                <button type="button" class="remove-btn" data-ex-id="${exercise.id}">🗑️ Видалити</button>
            </div>
        `;
        
        // Додаємо обробники подій для кнопок
        item.querySelector('.remove-btn').addEventListener('click', (e) => removeExercise(e, exercise.id));
        item.querySelector('.replace-btn').addEventListener('click', (e) => replaceExercise(e, exercise.id));
        
        return item;
    }
    
    /**
     * Додає порожню форму для вправи, створеної вручну.
     */
    function addManualExercise(dayIndex, templateId) {
        const template = dayTemplates[dayIndex].find(t => t.id === templateId);
        if (!template) return;

        const manualId = `manual_${Date.now()}`;
        const newManualExercise = { id: manualId, name: 'Нова вправа вручну', params: '', note: '' };
        
        template.exercises.push(newManualExercise);
        
        const container = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"] .template-row[data-template-id="${templateId}"]`).nextElementSibling;
        
        container.appendChild(createExerciseItemHTML(newManualExercise));
        
        // Оновлюємо кнопку вибору
        const button = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"] .template-row[data-template-id="${templateId}"] .template-category-button`);
        button.textContent = `Вибрати вправи (${template.exercises.length})`;
    }
    
    /**
     * Видаляє вправу з шаблону.
     */
    function removeExercise(e, exerciseId) {
        if (!confirm('Ви впевнені, що хочете видалити цю вправу?')) return;

        // Знаходимо шаблон, що містить цю вправу
        for (const dayIndex in dayTemplates) {
            for (const template of dayTemplates[dayIndex]) {
                const initialLength = template.exercises.length;
                template.exercises = template.exercises.filter(ex => ex.id !== exerciseId);
                
                if (template.exercises.length < initialLength) {
                    // Вправа була видалена, оновлюємо DOM та лічильник
                    e.target.closest('.exercise-item').remove();
                    const button = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"] .template-row[data-template-id="${template.id}"] .template-category-button`);
                    if (button) {
                        button.textContent = `Вибрати вправи (${template.exercises.length})`;
                    }
                    return;
                }
            }
        }
    }

    /**
     * Запускає процес рендерингу всіх шаблонів для всіх днів.
     */
    function renderAllTemplates() {
        taskDayContainers.forEach(container => {
            const dayIndex = container.dataset.dayIndex;
            container.innerHTML = ''; // Очищаємо контейнер
            
            dayTemplates[dayIndex].forEach(template => {
                container.appendChild(createTemplateHTML(template, dayIndex));
            });
        });
    }

    // --- 4. ЛОГІКА МОДАЛЬНОГО ВІКНА ---
    
    /**
     * Відкриває модальне вікно для вибору вправ.
     */
    function openExerciseModal(e, dayIndex, templateId) {
        currentTemplateElement = dayTemplates[dayIndex].find(t => t.id === templateId);
        if (!currentTemplateElement) return;

        const category = currentTemplateElement.category;
        const currentMDStatus = mdStatusContainers[dayIndex].dataset.mdStatus;
        
        document.getElementById('modal-title-context').textContent = 
            `Вибір вправ: ${category.replace('_', ' ')} (MD Status: ${currentMDStatus})`;
        
        // Очищаємо та генеруємо фільтри та список
        renderQualityFilters();
        renderExerciseList(category);
        
        // Очищаємо та заповнюємо вибрані вправи
        selectedExercises.clear();
        currentTemplateElement.exercises.forEach(ex => selectedExercises.add(ex.id));
        updateSelectedCount();
        
        modal.style.display = 'flex';
    }

    /**
     * Генерує кнопки фільтрів якості.
     */
    function renderQualityFilters() {
        qualityFiltersContainer.innerHTML = '';
        ALL_QUALITIES.forEach(quality => {
            const btn = document.createElement('button');
            btn.classList.add('quality-filter-btn');
            btn.textContent = quality;
            btn.dataset.quality = quality;
            btn.addEventListener('click', filterExercises);
            qualityFiltersContainer.appendChild(btn);
        });
    }

    /**
     * Фільтрує список вправ за якістю.
     */
    function filterExercises(e) {
        const quality = e.target.dataset.quality;
        e.target.classList.toggle('active');
        
        const activeFilters = Array.from(qualityFiltersContainer.querySelectorAll('.quality-filter-btn.active'))
                                .map(btn => btn.dataset.quality);
        
        renderExerciseList(currentTemplateElement.category, activeFilters);
    }

    /**
     * Генерує список вправ для модального вікна.
     */
    function renderExerciseList(category, activeFilters = []) {
        exerciseListContainer.innerHTML = '';
        const exercises = EXERCISE_LIBRARY[category] || [];
        
        exercises.forEach(exercise => {
            // Фільтрація
            if (activeFilters.length > 0 && !activeFilters.includes(exercise.quality)) {
                return;
            }
            
            const item = document.createElement('div');
            item.classList.add('exercise-select-item');
            if (selectedExercises.has(exercise.id)) {
                item.classList.add('selected-item');
            }
            item.dataset.exerciseId = exercise.id;
            
            item.innerHTML = `
                <input type="checkbox" class="exercise-checkbox" id="ex-${exercise.id}" ${selectedExercises.has(exercise.id) ? 'checked' : ''}>
                <label for="ex-${exercise.id}">
                    ${exercise.name} <span class="md-status ${MD_CYCLE_CLASSES[exercise.quality] || 'color-neutral'}">${exercise.quality}</span>
                    <span class="media-hint">Медіа: ${exercise.media}</span>
                </label>
            `;
            
            // Обробка кліку на вправу
            item.addEventListener('click', (e) => {
                const checkbox = item.querySelector('.exercise-checkbox');
                // Запобігаємо подвійному обробленню, якщо клік був прямо на чекбоксі
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                }
                toggleExerciseSelection(item, exercise.id, checkbox.checked);
            });
            
            // Додаткова обробка кліку на чекбокс
            item.querySelector('.exercise-checkbox').addEventListener('change', (e) => {
                toggleExerciseSelection(item, exercise.id, e.target.checked);
            });

            exerciseListContainer.appendChild(item);
        });
    }

    /**
     * Додає/видаляє вправу до списку вибраних.
     */
    function toggleExerciseSelection(item, id, isChecked) {
        if (isChecked) {
            selectedExercises.add(id);
            item.classList.add('selected-item');
        } else {
            selectedExercises.delete(id);
            item.classList.remove('selected-item');
        }
        updateSelectedCount();
    }
    
    /**
     * Оновлює лічильник вибраних в модальному вікні.
     */
    function updateSelectedCount() {
        selectedCountSpan.textContent = selectedExercises.size;
        addSelectedBtn.style.display = selectedExercises.size > 0 ? 'block' : 'none';
    }

    /**
     * Зберігає вибрані вправи у поточний шаблон та закриває модальне вікно.
     */
    addSelectedBtn.addEventListener('click', () => {
        if (!currentTemplateElement) return;

        // Перетворюємо Set на масив об'єктів вправ
        const newExercises = Array.from(selectedExercises).map(id => {
            // Пошук по всій бібліотеці (може бути оптимізовано)
            for (const key in EXERCISE_LIBRARY) {
                const found = EXERCISE_LIBRARY[key].find(ex => ex.id === id);
                if (found) return found;
            }
            return { id: id, name: 'Невідома вправа', quality: 'N/A' };
        });

        currentTemplateElement.exercises = newExercises;
        
        // Встановлюємо кількість вправ = кількості вибраних
        currentTemplateElement.count = newExercises.length;
        
        // Повторно рендеримо шаблони
        renderAllTemplates();
        
        // Закриваємо модальне вікно
        modal.style.display = 'none';
    });
    
    // Закриття модального вікна
    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // --- 5. ІНІЦІАЛІЗАЦІЯ ---
    
    // Ініціалізуємо статуси та шаблони при завантаженні сторінки
    updateMDStatuses();
});
