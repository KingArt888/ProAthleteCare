// weekly-individual.js
// ПОТРЕБУЄ exercise_library.js ДЛЯ РОБОТИ

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

const dayNamesShort = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];

// ===========================================
// 1. ШАБЛОНИ
// ===========================================
const templateStages = {
    'Pre-Training': ['Mobility','Activation'],
    'Main Training': ['Legs','Core','UpperBody'],
    'Post-Training': ['Recovery','FoamRolling']
};

// ===========================================
// 2. Допоміжні функції
// ===========================================
function generateRandomExercises(stage, category, count){
    const categoryData = EXERCISE_LIBRARY[stage]?.[category] ?? null;
    if(!categoryData?.exercises?.length) return [];
    const shuffled = [...categoryData.exercises].sort(()=>0.5-Math.random());
    return shuffled.slice(0,count);
}

// ===========================================
// 3. Завантаження та збереження
// ===========================================
function loadPlanFromStorage() {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const weeklyPlan = { activityType: [], mdStatus: [], templates: [] };

    for(let i=0;i<7;i++){
        weeklyPlan.activityType[i] = saved[`activity_${i}`] || 'TRAIN';
    }

    weeklyPlan.mdStatus = weeklyPlan.activityType.map(val=>val==='MATCH'?'MD':(val==='REST'?'REST':'TRAIN'));

    weeklyPlan.templates = saved.templates || Array(7).fill(null).map(()=>({}));

    console.log('Дані тижневого плану завантажені', weeklyPlan);
    return weeklyPlan;
}

function savePlanToStorage(weeklyPlan){
    const data = {};
    weeklyPlan.activityType.forEach((val,i)=>{
        data[`activity_${i}`] = val;
    });
    data.templates = weeklyPlan.templates;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
    console.log('Збережено план у localStorage');
}

// ===========================================
// 4. Рендер MD статусів
// ===========================================
function renderMDStatus(weeklyPlan){
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    weeklyPlan.mdStatus.forEach((status,index)=>{
        const style = COLOR_MAP[status] ?? COLOR_MAP['TRAIN'];
        const cell = dayCells[index];
        const mdEl = cell.querySelector('.md-status');
        if(mdEl){
            mdEl.textContent = style.status;
            Object.values(COLOR_MAP).forEach(m=>mdEl.classList.remove(m.colorClass));
            mdEl.classList.add(style.colorClass);
        }
        const mdTitleEl = document.getElementById(`md-title-${index}`);
        if(mdTitleEl){
            mdTitleEl.innerHTML = `<span class="md-status-label">${style.status}</span> <span class="day-name-label">(${dayNamesShort[index]})</span>`;
        }
    });
}

// ===========================================
// 5. Ініціалізація шаблонів
// ===========================================
function renderTemplates(weeklyPlan){
    for(let i=0;i<7;i++){
        const dayBlock = document.querySelector(`.task-day-container[data-day-index="${i}"]`);
        if(!dayBlock) continue;

        const mdStatus = weeklyPlan.mdStatus[i];
        const savedTemplate = weeklyPlan.templates[i] ?? {};
        let html = `<div class="template-exercise-fields" data-md-status-editor="${mdStatus}">`;

        for(const stage of Object.keys(templateStages)){
            if(mdStatus!=='REST') html += `<h5 class="template-stage-header">${stage}</h5>`;
            templateStages[stage].forEach(category=>{
                const count = savedTemplate[stage]?.[category] ?? 0;
                html += `
                    <div class="template-row template-tag-row">
                        <button type="button" class="template-category-button ${count>0?'active-template':''}"
                                data-day-index="${i}" data-md-status="${mdStatus}" data-stage="${stage}" data-category="${category}" data-count="${count}">
                            ${category} (${count})
                        </button>
                        <div class="count-controls">
                            <button type="button" class="count-control-btn count-minus" data-step="-1" data-category="${category}" data-day-index="${i}">-</button>
                            <button type="button" class="count-control-btn count-plus" data-step="1" data-category="${category}" data-day-index="${i}">+</button>
                        </div>
                        <button type="button" class="add-manual-exercise-btn" data-day-index="${i}" data-md-status="${mdStatus}" data-stage="${stage}" data-category="${category}">+</button>
                    </div>
                `;
            });
        }

        html += `</div>`;
        dayBlock.querySelectorAll('.template-exercise-fields').forEach(el=>el.remove());
        dayBlock.insertAdjacentHTML('afterbegin', html);
    }

    addTemplateListeners();
}

// ===========================================
// 6. Логіка кнопок шаблонів
// ===========================================
function addTemplateListeners(){
    document.querySelectorAll('.count-control-btn').forEach(btn=>{
        btn.addEventListener('click',e=>{
            const dayIndex = e.target.dataset.dayIndex;
            const category = e.target.dataset.category;
            const step = parseInt(e.target.dataset.step);
            const button = document.querySelector(`.template-category-button[data-day-index="${dayIndex}"][data-category="${category}"]`);
            if(button){
                let count = parseInt(button.dataset.count);
                count = Math.max(0,Math.min(5,count+step));
                button.dataset.count = count;
                button.innerHTML = `${category} (${count})`;
                if(count>0) button.classList.add('active-template'); else button.classList.remove('active-template');
            }
        });
    });

    document.querySelectorAll('.template-category-button, .add-manual-exercise-btn').forEach(btn=>{
        btn.addEventListener('click',e=>{
            const target = e.target.closest('.template-category-button') || e.target.closest('.add-manual-exercise-btn');
            if(!target) return;
            const {dayIndex, mdStatus, stage, category} = target.dataset;
            openExerciseModal(dayIndex, mdStatus, stage, category);
        });
    });
}

// ===========================================
// 7. Модальне вікно та вибір вправ
// ===========================================
let currentExerciseContext = null;
let selectedExercises = [];

function renderExerciseList(exercises){
    const container = document.getElementById('exercise-list-container');
    const addBtn = document.getElementById('add-selected-btn');
    if(!container || !addBtn) return;
    selectedExercises=[];
    container.innerHTML='';

    if(!exercises.length){
        container.innerHTML='<p>Не знайдено вправ.</p>';
        addBtn.style.display='none';
        return;
    }

    exercises.forEach(ex=>{
        const id = `ex-${Math.random().toString(36).substr(2,7)}`;
        container.innerHTML += `
        <div class="exercise-select-item" data-name="${ex.name}" data-stage="${ex.stage}" data-category="${ex.category}">
            <input type="checkbox" class="exercise-checkbox" id="${id}" data-name="${ex.name}">
            <label for="${id}"><strong>${ex.name}</strong><p>${ex.description || ''}</p></label>
        </div>`;
    });

    container.querySelectorAll('.exercise-checkbox').forEach(cb=>{
        cb.addEventListener('change',e=>{
            const item = e.target.closest('.exercise-select-item');
            const exObj = { name:item.dataset.name, stage:item.dataset.stage, category:item.dataset.category };
            const idx = selectedExercises.findIndex(x=>x.name===exObj.name && x.stage===exObj.stage && x.category===exObj.category);
            if(e.target.checked){
                if(idx===-1) selectedExercises.push(exObj);
            }else{
                if(idx!==-1) selectedExercises.splice(idx,1);
            }
            addBtn.textContent = `Додати вибрані (${selectedExercises.length})`;
            addBtn.style.display = selectedExercises.length? 'block':'none';
        });
    });
}

function openExerciseModal(dayIndex, mdStatus, stage, category){
    const modal = document.getElementById('exercise-selection-modal');
    if(!modal) return;
    currentExerciseContext={dayIndex, mdStatus, stage, category};
    const initialExercises = EXERCISE_LIBRARY[stage]?.[category]?.exercises.map(ex=>({...ex, stage, category})) || [];
    renderExerciseList(initialExercises);
    document.getElementById('modal-title-context').textContent=`Вибір вправи: ${stage} / ${category} (День ${dayNamesShort[dayIndex]})`;
    modal.style.display='flex';
}

function closeExerciseModal(){
    const modal = document.getElementById('exercise-selection-modal');
    if(modal) modal.style.display='none';
    currentExerciseContext=null;
    selectedExercises=[];
}

function handleSelectionComplete(){
    if(!currentExerciseContext || !selectedExercises.length) return;
    const dayBlock = document.querySelector(`.task-day-container[data-day-index="${currentExerciseContext.dayIndex}"]`);
    if(!dayBlock) return;
    selectedExercises.forEach(ex=>{
        const html = `
        <div class="exercise-item manual-added" data-day-index="${currentExerciseContext.dayIndex}" data-stage="${ex.stage}" data-category="${ex.category}">
            <div class="exercise-fields">
                <label>Назва вправи:</label>
                <input type="text" value="${ex.name}">
                <label>Опис:</label>
                <textarea>${ex.description||''}</textarea>
            </div>
        </div>`;
        let list = dayBlock.querySelector('.generated-exercises-list');
        if(!list){
            list = document.createElement('div');
            list.className='generated-exercises-list';
            list.innerHTML='<h4>Згенерований план (ручне редагування)</h4>';
            dayBlock.appendChild(list);
        }
        list.insertAdjacentHTML('beforeend',html);
    });
    closeExerciseModal();
}

// ===========================================
// 8. Ініціалізація
// ===========================================
document.addEventListener('DOMContentLoaded',()=>{
    const weeklyPlan = loadPlanFromStorage();
    renderMDStatus(weeklyPlan);
    renderTemplates(weeklyPlan);

    // select activity change
    document.querySelectorAll('.activity-type-select').forEach(sel=>{
        sel.addEventListener('change',e=>{
            const dayIndex=parseInt(e.target.parentNode.dataset.dayIndex);
            weeklyPlan.activityType[dayIndex]=e.target.value;
            weeklyPlan.mdStatus[dayIndex]=e.target.value==='MATCH'?'MD':(e.target.value==='REST'?'REST':'TRAIN');
            renderMDStatus(weeklyPlan);
            renderTemplates(weeklyPlan);
        });
    });

    // кнопка збереження
    const form = document.getElementById('weekly-plan-form');
    if(form){
        form.addEventListener('submit',e=>{
            e.preventDefault();
            savePlanToStorage(weeklyPlan);
        });
    }

    // модальне вікно
    const addBtn=document.getElementById('add-selected-btn');
    if(addBtn) addBtn.addEventListener('click',handleSelectionComplete);

    const modal=document.getElementById('exercise-selection-modal');
    if(modal){
        modal.addEventListener('click',e=>{
            if(e.target.id==='exercise-selection-modal'||e.target.classList.contains('close-modal-btn')){
                closeExerciseModal();
            }
        });
    }
});
