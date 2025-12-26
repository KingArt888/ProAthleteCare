// ==========================================================
// 1. КОНСТАНТИ ТА ДАНІ
// ==========================================================
const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedId = null;
let activeFilter = 'Усі'; // Поточний фільтр
let painChartInstance = null;

const RED_MARKER = '#DA3E52'; 
const GOLD_COLOR = '#FFC72C';
const getToday = () => new Date().toISOString().split('T')[0];

// АВТОРИЗАЦІЯ
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            loadInjuriesFromFirebase();
        } else {
            firebase.auth().signInAnonymously();
        }
    });
}

// ==========================================================
// 2. ЗАВАНТАЖЕННЯ ТА ФІЛЬТРАЦІЯ
// ==========================================================
async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        injuries = [];
        snapshot.forEach(doc => injuries.push({ id: doc.id, ...doc.data() }));
        injuries.sort((a, b) => new Date(a.date) - new Date(b.date));

        renderInjurySelector(); // Оновлюємо кнопки перемикання
        refreshUI();
    } catch (e) { console.error("Помилка:", e); }
}

// Функція оновлення інтерфейсу залежно від фільтра
function refreshUI() {
    renderPoints();
    initPainChart();
    renderInjuryList();
}

// Створення кнопок-перемикачів (Усі, Коліно, Спина...)
function renderInjurySelector() {
    const container = document.querySelector('.chart-card');
    let selector = document.getElementById('injury-filter-container');
    
    if (!selector) {
        selector = document.createElement('div');
        selector.id = 'injury-filter-container';
        selector.style.cssText = 'margin-bottom: 15px; display: flex; gap: 8px; flex-wrap: wrap;';
        container.insertBefore(selector, container.querySelector('.chart-area'));
    }

    const uniqueLocations = ['Усі', ...new Set(injuries.map(i => i.location))];
    
    selector.innerHTML = uniqueLocations.map(loc => `
        <button onclick="setFilter('${loc}')" style="
            padding: 5px 15px; border-radius: 20px; border: 1px solid ${GOLD_COLOR};
            background: ${activeFilter === loc ? GOLD_COLOR : 'transparent'};
            color: ${activeFilter === loc ? '#000' : GOLD_COLOR};
            cursor: pointer; font-size: 0.85em; transition: 0.3s;
        ">${loc}</button>
    `).join('');
}

window.setFilter = function(loc) {
    activeFilter = loc;
    renderInjurySelector();
    refreshUI();
};

// ==========================================================
// 3. ГРАФІК (РЕАГУЄ НА ФІЛЬТР)
// ==========================================================
function initPainChart() {
    const ctx = document.getElementById('painChart');
    if (!ctx) return;
    if (painChartInstance) painChartInstance.destroy();

    const filteredData = activeFilter === 'Усі' 
        ? injuries 
        : injuries.filter(i => i.location === activeFilter);

    if (filteredData.length === 0) return;

    painChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: filteredData.map(i => i.date),
            datasets: [{
                label: activeFilter,
                data: filteredData.map(i => i.pain),
                borderColor: activeFilter === 'Усі' ? GOLD_COLOR : RED_MARKER,
                backgroundColor: 'rgba(218, 62, 82, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 6,
                pointBackgroundColor: GOLD_COLOR
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 10, ticks: { color: '#fff' } },
                x: { ticks: { color: '#fff' } }
            },
            plugins: { legend: { display: true, labels: { color: '#fff' } } }
        }
    });
}

// ==========================================================
// 4. ІСТОРІЯ ТА ТОЧКИ (ТЕЖ ФІЛЬТРУЮТЬСЯ)
// ==========================================================
function renderInjuryList() {
    const listElement = document.getElementById('injury-list');
    if (!listElement) return;

    const filtered = activeFilter === 'Усі' 
        ? injuries 
        : injuries.filter(i => i.location === activeFilter);

    if (filtered.length === 0) {
        listElement.innerHTML = '<p class="placeholder-text">Записів не знайдено.</p>';
        return;
    }

    listElement.innerHTML = filtered.slice().reverse().map(inj => `
        <div style="background: #1a1a1a; padding: 12px; border-radius: 5px; margin-bottom: 10px; border-left: 4px solid ${RED_MARKER};">
            <div style="display: flex; justify-content: space-between;">
                <strong style="color: ${GOLD_COLOR}">${inj.location}</strong>
                <div style="display: flex; gap: 10px;">
                    <span onclick="editEntry('${inj.id}')" style="color: ${GOLD_COLOR}; cursor: pointer; font-size: 0.8em;">Оновити</span>
                    <span onclick="deleteEntry('${inj.id}')" style="color: ${RED_MARKER}; cursor: pointer; font-size: 0.8em;">Видалити</span>
                </div>
            </div>
            <p style="color: #ccc; font-size: 0.9em; margin: 5px 0;">Біль: ${inj.pain}/10 | ${inj.date}</p>
            <small style="color: #888;">${inj.notes || ''}</small>
        </div>
    `).join('');
}

function renderPoints() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    // Точки на силуеті показуємо завжди (всі), щоб бачити загальну картину
    injuries.forEach(inj => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        const isDimmed = activeFilter !== 'Усі' && inj.location !== activeFilter;
        el.style.cssText = `
            position: absolute; width: 8px; height: 8px; 
            border-radius: 50%; border: 1px solid white; 
            transform: translate(-50%, -50%); cursor: pointer; 
            background-color: ${isDimmed ? '#444' : RED_MARKER}; 
            opacity: ${isDimmed ? 0.3 : 1};
            left: ${inj.coordX}%; top: ${inj.coordY}%; z-index: 100;
        `;
        el.onclick = (e) => { e.stopPropagation(); editEntry(inj.id); };
        container.appendChild(el);
    });
}

// ==========================================================
// 5. ФОРМА ТА ЗБЕРЕЖЕННЯ
// ==========================================================
window.editEntry = function(id) {
    const inj = injuries.find(i => i.id === id);
    if (!inj) return;
    selectedId = id;
    document.getElementById('injury-location').value = inj.location;
    document.getElementById('injury-notes').value = inj.notes || "";
    document.getElementById('injury-date').value = inj.date;
    const radio = document.querySelector(`input[name="pain"][value="${inj.pain}"]`);
    if (radio) radio.checked = true;
    document.getElementById('save-injury-button').textContent = "Зберегти зміни";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteEntry = async function(id) {
    if (!confirm("Видалити запис?")) return;
    await db.collection(INJURY_COLLECTION).doc(id).delete();
    loadInjuriesFromFirebase();
};

document.addEventListener('DOMContentLoaded', () => {
    const map = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    
    if (map) {
        map.onclick = (e) => {
            if (e.target.classList.contains('injury-marker')) return;
            const rect = map.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            marker.style.display = 'block';
            marker.style.left = x + '%'; marker.style.top = y + '%';
            document.getElementById('coordX').value = x.toFixed(2);
            document.getElementById('coordY').value = y.toFixed(2);
            selectedId = null;
            document.getElementById('injury-form').reset();
            document.getElementById('save-injury-button').textContent = "Записати травму";
        };
    }

    document.getElementById('injury-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            userId: currentUserId,
            location: document.getElementById('injury-location').value,
            date: document.getElementById('injury-date').value,
            pain: parseInt(document.querySelector('input[name="pain"]:checked')?.value || 1),
            notes: document.getElementById('injury-notes').value,
            coordX: document.getElementById('coordX').value,
            coordY: document.getElementById('coordY').value
        };
        if (selectedId) await db.collection(INJURY_COLLECTION).doc(selectedId).update(data);
        else await db.collection(INJURY_COLLECTION).add(data);
        loadInjuriesFromFirebase();
        alert("Збережено!");
    };
});
