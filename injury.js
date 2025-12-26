// ==========================================================
// 1. НАЛАШТУВАННЯ ТА СТАН
// ==========================================================
const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedId = null;
let painChartInstance = null;
let activeLocationFilter = null;

const RED_MARKER = '#DA3E52'; // Активна травма
const GOLD_COLOR = '#FFC72C'; // Вилікувана травма / Стиль ProAtletCare

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
// 2. РОБОТА З ДАНИМИ
// ==========================================================
async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        injuries = [];
        snapshot.forEach(doc => injuries.push({ id: doc.id, ...doc.data() }));
        
        // Сортуємо для хронології графіка
        injuries.sort((a, b) => new Date(a.date) - new Date(b.date));

        refreshUI();
    } catch (e) { console.error("Помилка Firebase:", e); }
}

function refreshUI() {
    renderPoints();
    renderInjuryList();
    updatePainChart();
    fixInputStyles(); // Примусовий фікс кольорів
}

// ==========================================================
// 3. ГРАФІК ТА ТОЧКИ (ЛОГІКА КОЛЬОРІВ)
// ==========================================================
function updatePainChart() {
    const ctx = document.getElementById('painChart');
    if (!ctx) return;
    if (painChartInstance) painChartInstance.destroy();

    const displayData = activeLocationFilter 
        ? injuries.filter(i => i.location === activeLocationFilter)
        : injuries;

    if (displayData.length === 0) return;

    painChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: displayData.map(i => i.date),
            datasets: [{
                label: activeLocationFilter || "Загальна динаміка болю",
                data: displayData.map(i => i.pain),
                borderColor: activeLocationFilter ? RED_MARKER : GOLD_COLOR,
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
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });
}

function renderPoints() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    // Відображаємо останній стан для кожної унікальної локації
    const latestByLoc = {};
    injuries.forEach(inj => { latestByLoc[inj.location] = inj; });

    Object.values(latestByLoc).forEach(inj => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        
        // КОЛІР: Червоний якщо болить, Жовтий якщо вилікувано (біль 0)
        const isHealed = parseInt(inj.pain) === 0;
        const markerColor = isHealed ? GOLD_COLOR : RED_MARKER;
        const isSelected = activeLocationFilter === inj.location;

        el.style.cssText = `
            position: absolute; width: 10px; height: 10px; 
            border-radius: 50%; border: 1.5px solid white; 
            transform: translate(-50%, -50%); cursor: pointer; 
            background-color: ${markerColor}; 
            box-shadow: ${isSelected ? '0 0 12px ' + markerColor : '0 0 5px rgba(0,0,0,0.5)'};
            left: ${inj.coordX}%; top: ${inj.coordY}%; z-index: 100;
            transition: 0.3s;
        `;
        el.onclick = (e) => { 
            e.stopPropagation(); 
            selectLocation(inj.location); 
            editEntry(inj.id); 
        };
        container.appendChild(el);
    });
}

// ==========================================================
// 4. ІСТОРІЯ ТА ФОРМА
// ==========================================================
function renderInjuryList() {
    const listElement = document.getElementById('injury-list');
    if (!listElement) return;

    const uniqueLocs = [...new Set(injuries.map(i => i.location))];

    let html = `
        <div style="margin-bottom: 15px; display: flex; gap: 8px; flex-wrap: wrap;">
            <button onclick="selectLocation(null)" style="background: ${!activeLocationFilter ? GOLD_COLOR : '#333'}; color: ${!activeLocationFilter ? '#000' : '#fff'}; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8em;">Усі травми</button>
            ${uniqueLocs.map(loc => `
                <button onclick="selectLocation('${loc}')" style="background: ${activeLocationFilter === loc ? RED_MARKER : '#444'}; color: #fff; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8em;">${loc}</button>
            `).join('')}
        </div>
    `;

    html += injuries.slice().reverse().map(inj => `
        <div style="background: #1a1a1a; padding: 12px; border-radius: 5px; margin-bottom: 10px; border-left: 4px solid ${parseInt(inj.pain) === 0 ? GOLD_COLOR : RED_MARKER}; cursor: pointer;" onclick="selectLocation('${inj.location}')">
            <div style="display: flex; justify-content: space-between;">
                <strong style="color: ${GOLD_COLOR}">${inj.location}</strong>
                <span style="color: #888; font-size: 0.8em;">${inj.date}</span>
            </div>
            <div style="color: #ccc; font-size: 0.85em; margin-top: 5px;">Біль: ${inj.pain}/10 | ${inj.notes || 'Без опису'}</div>
            <div style="margin-top: 8px; display: flex; gap: 15px;">
                <small onclick="event.stopPropagation(); editEntry('${inj.id}')" style="color: gold; text-decoration: underline;">Оновити</small>
                <small onclick="event.stopPropagation(); deleteEntry('${inj.id}')" style="color: ${RED_MARKER}; text-decoration: underline;">Видалити</small>
            </div>
        </div>
    `).join('');

    listElement.innerHTML = html;
}

window.selectLocation = (loc) => { activeLocationFilter = loc; refreshUI(); };

window.editEntry = (id) => {
    const inj = injuries.find(i => i.id === id);
    if (!inj) return;
    selectedId = id;
    document.getElementById('notes-section').style.display = 'block';
    document.getElementById('injury-location').value = inj.location;
    document.getElementById('injury-notes').value = inj.notes || "";
    document.getElementById('injury-date').value = inj.date;
    const radio = document.querySelector(`input[name="pain"][value="${inj.pain}"]`);
    if (radio) radio.checked = true;
    document.getElementById('save-injury-button').textContent = "Оновити стан";
    fixInputStyles();
};

window.deleteEntry = async (id) => {
    if (confirm("Видалити цей запис?")) {
        await db.collection(INJURY_COLLECTION).doc(id).delete();
        loadInjuriesFromFirebase();
    }
};

// ==========================================================
// 5. ФІКС КОЛЬОРІВ ТА АВТО-ДАТА
// ==========================================================
function fixInputStyles() {
    const styleFix = { backgroundColor: '#1a1a1a', color: '#CCCCCC', border: '1px solid #333' };
    const elIds = ['injury-location', 'injury-date', 'injury-notes'];
    elIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) Object.assign(el.style, styleFix);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const map = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    
    // Встановлюємо дату на сьогодні за замовчуванням
    document.getElementById('injury-date').value = getToday();

    if (map) {
        map.onclick = (e) => {
            if (e.target.classList.contains('injury-marker')) return;
            const rect = map.getBoundingClientRect();
            marker.style.display = 'block';
            marker.style.backgroundColor = RED_MARKER;
            marker.style.left = ((e.clientX - rect.left) / rect.width) * 100 + '%';
            marker.style.top = ((e.clientY - rect.top) / rect.height) * 100 + '%';
            
            document.getElementById('coordX').value = (((e.clientX - rect.left) / rect.width) * 100).toFixed(2);
            document.getElementById('coordY').value = (((e.clientY - rect.top) / rect.height) * 100).toFixed(2);
            
            selectedId = null;
            document.getElementById('injury-form').reset();
            document.getElementById('injury-date').value = getToday();
            document.getElementById('notes-section').style.display = 'block';
            document.getElementById('save-injury-button').textContent = "Записати травму";
            fixInputStyles();
        };
    }

    document.getElementById('injury-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            userId: currentUserId,
            location: document.getElementById('injury-location').value,
            date: document.getElementById('injury-date').value,
            pain: parseInt(document.querySelector('input[name="pain"]:checked')?.value || 0),
            notes: document.getElementById('injury-notes').value,
            coordX: document.getElementById('coordX').value,
            coordY: document.getElementById('coordY').value,
            serverTimestamp: firebase.firestore.FieldValue.serverTimestamp() // Дані для тренера
        };
        
        try {
            if (selectedId) await db.collection(INJURY_COLLECTION).doc(selectedId).update(data);
            else await db.collection(INJURY_COLLECTION).add(data);
            
            loadInjuriesFromFirebase();
            alert("Збережено в ProAtletCare!");
            if (marker) marker.style.display = 'none';
        } catch (err) { alert("Помилка: " + err.message); }
    };
});
