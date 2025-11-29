// ФУНКЦІЇ ДЛЯ LOAD SEASON (load-season.js)
// ==========================================================

let loadData = []; // Початкові дані будуть заповнені тестовими або з localStorage
let currentRollingChart = null;
let currentWeeklyChart = null;
let currentGaugeChart = null; // 👈 НОВА ЗМІННА ДЛЯ СПІДОМЕТРА

// Тестові дані, що імітують 28 днів S-RPE Load
// Це дозволить ACWR одразу працювати при першому запуску
const TEST_LOAD_HISTORY = [
    // День 1 (Сьогодні-1) до День 28 (Сьогодні-28). Load = Duration * RPE
    100, 300, 400, 0, 500, 450, 0, // Тиждень 1 (1750 AU)
    600, 750, 700, 0, 550, 650, 0, // Тиждень 2 (3250 AU)
    450, 600, 500, 0, 400, 500, 0, // Тиждень 3 (2450 AU)
    400, 500, 450, 0, 300, 400, 0  // Тиждень 4 (2050 AU)
];

// Функція-хелпер для отримання поточної дати у форматі YYYY-MM-DD
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

// Хелпер для отримання початку тижня (Понеділок)
function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(d.setDate(diff));
    return startOfWeek.toISOString().split('T')[0];
}

// ==========================================================
// ЛОГІКА ЗБЕРЕЖЕННЯ ТА ІНІЦІАЛІЗАЦІЯ ДАНИХ
// ==========================================================

function loadInitialData() {
    const storedData = JSON.parse(localStorage.getItem('athleteLoadData'));

    if (storedData && storedData.length > 0) {
        loadData = storedData;
    } else {
        // Якщо немає збережених даних, генеруємо тестові дані за останні 28 днів
        loadData = generateTestData(TEST_LOAD_HISTORY);
        saveLoadData(); // Зберігаємо тестові дані для першого запуску
    }
}

function generateTestData(loads) {
    const today = new Date();
    const data = [];

    for (let i = 0; i < loads.length; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (loads.length - 1) + i); // Забезпечуємо 28 послідовних днів
        
        const internalLoad = loads[i];
        
        // Генеруємо RPE і Duration, щоб InternalLoad був приблизно правильним
        let rpe = 5;
        let duration = internalLoad / rpe;
        
        if (internalLoad === 0) {
            rpe = 1;
            duration = 0;
        } else if (duration < 10 && internalLoad > 0) { // Якщо InternalLoad є, але Duration занадто малий, збільшуємо RPE
             rpe = 8;
             duration = internalLoad / rpe;
        }

        data.push({
            date: date.toISOString().split('T')[0],
            duration: Math.round(duration),
            rpe: Math.round(rpe),
            distance: (Math.random() * 5).toFixed(1) * (internalLoad > 0 ? 1 : 0),
            internalLoad: internalLoad
        });
    }
    return data;
}

function saveLoadData() {
    loadData.sort((a, b) => new Date(a.date) - new Date(b.date));
    localStorage.setItem('athleteLoadData', JSON.stringify(loadData));
    calculateAndDisplayLoads();
}

// ----------------------------------------------------------
// ЛОГІКА ФОРМИ (Daily Input)
// ----------------------------------------------------------
function setupLoadForm() {
    const loadForm = document.getElementById('load-form');
    const loadDateInput = document.getElementById('load-date');
    
    if (!loadForm) return;

    loadDateInput.value = getTodayDateString();

    loadForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const date = loadDateInput.value;
        const duration = parseInt(document.getElementById('load-duration').value);
        const distance = parseFloat(document.getElementById('load-distance').value);
        
        // 🚨 ВИПРАВЛЕННЯ RPE: Перевірка та отримання значення
        const rpeEl = document.querySelector('input[name="rpe"]:checked');
        
        if (!rpeEl) {
             alert("Будь ласка, виберіть суб'єктивне навантаження (RPE) від 1 до 10.");
             return;
        }
        const rpe = parseInt(rpeEl.value);
        
        const internalLoad = duration * rpe;

        const existingIndex = loadData.findIndex(d => d.date === date);

        const newEntry = {
            date: date,
            duration: duration,
            rpe: rpe,
            distance: distance,
            internalLoad: internalLoad 
        };

        if (existingIndex !== -1) {
            loadData[existingIndex] = newEntry;
            alert(`Дані за ${date} оновлено. Internal Load: ${internalLoad} AU.`);
        } else {
            loadData.push(newEntry);
            alert(`Дані за ${date} збережено. Internal Load: ${internalLoad} AU.`);
        }

        saveLoadData();
        // Залишаємо форму заповненою поточною датою для подальшого введення
        document.getElementById('load-duration').value = 60;
        document.getElementById('load-distance').value = 0.0;
        // Скидаємо вибір RPE (або залишаємо на 1)
        document.getElementById('rpe1').checked = true;
    });
}

// ==========================================================
// ОСНОВНА ЛОГІКА РОЗРАХУНКІВ НАВАНТАЖЕННЯ
