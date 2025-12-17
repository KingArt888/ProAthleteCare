// weekly-individual.js
// ПОТРЕБУЄ exercise_library.js ДЛЯ РОБОТИ

const WEEKLY_STORAGE_KEY = 'weeklyPlanData'; // ЗМІНА: Усунення конфлікту
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
// ... (інший код залишено без змін)
function saveData(newWeeklyPlan = null, templatesFromUI = null) {
    const saveButton = document.querySelector('.save-button');
    try {
        // ВИКОРИСТАННЯ WEEKLY_STORAGE_KEY
        let existingData = JSON.parse(localStorage.getItem(WEEKLY_STORAGE_KEY) || '{}');
        const activityData = {};
        let finalPlanData = {};
// ...
        const combinedData = { ...existingData, ...activityData, ...templateData, ...finalPlanData };
        // ВИКОРИСТАННЯ WEEKLY_STORAGE_KEY
        localStorage.setItem(WEEKLY_STORAGE_KEY, JSON.stringify(combinedData));
// ...
// ...
function generateWeeklyPlan(mdStatuses, templates) {
// ...
        const savedData = JSON.parse(localStorage.getItem(WEEKLY_STORAGE_KEY) || '{}'); // ВИКОРИСТАННЯ WEEKLY_STORAGE_KEY
        const manualPlanKey = `day_plan_${dayIndex}`;
// ...
// ...
function loadData() {
    try {
        const savedData = localStorage.getItem(WEEKLY_STORAGE_KEY); // ВИКОРИСТАННЯ WEEKLY_STORAGE_KEY
        let data = savedData ? JSON.parse(savedData) : {};
// ...
// ... (решта коду)
