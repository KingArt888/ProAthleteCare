const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedId = null;
let painChartInstance = null;
let activeLocationFilter = null; // Фільтр для хронології

const RED_MARKER = '#DA3E52'; 
const GOLD_COLOR = '#FFC72C';

// 1. АВТОРИЗАЦІЯ
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

// 2. ЗАВАНТАЖЕННЯ ДАНИХ
async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        injuries = [];
        snapshot.forEach(doc => injuries.push({ id: doc.id, ...doc.data() }));
        
        // Сортування для правильної хронології на графіку
        injuries.sort((a, b) => new Date(a.date) - new Date(b.date));

        refreshUI();
    } catch (e) { console.error("Помилка завантаження:", e); }
}

function refreshUI() {
    renderPoints();
    renderInjuryList();
    updatePainChart(); // Оновлюємо графік згідно з обраною травмою
}

// 3. ГРАФІК ХРОНОЛОГІЇ ВІДНОВЛЕННЯ
function updatePainChart() {
    const ctx = document.getElementById('painChart');
    if (!ctx) return;
    if (painChartInstance) painChartInstance.destroy();

    // Фільтруємо дані: якщо вибрана травма — показуємо її прогрес, інакше — все разом
    const displayData = activeLocationFilter 
        ? injuries.filter(i => i.location === activeLocationFilter)
        : injuries;

    if (displayData.length === 0) return;

    painChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: displayData.map(i => i.date),
            datasets: [{
                label: activeLocationFilter ? `Відновлення: ${activeLocationFilter}` : "Загальна хронологія болю",
                data: displayData.map(i => i.pain),
                borderColor: activeLocationFilter ? RED_MARKER : GOLD_COLOR,
                backgroundColor: 'rgba(218, 62, 82, 0.1)',
                borderWidth: 3,
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
                y: { min: 0, max: 10, ticks: { color: '#fff' }, title: { display: true, text: 'Рівень болю', color: '#888' } },
                x: { ticks: { color: '#fff' } }
            },
            plugins: {
                legend: { labels: { color: '#fff' } }
            }
        }
    });
}

// 4. ІСТОРІЯ ТРАВМ З ФУНКЦІЄЮ ВИБОРУ
function renderInjuryList() {
    const listElement = document.getElementById('injury-list');
    if (!listElement) return;

    if (injuries.length === 0) {
        listElement.innerHTML = '<p style="color:#666;">Записів ще немає.</p>';
        return;
    }

    // Створюємо кнопки швидкого фільтру
    const locations = [...new Set(injuries.map(i => i.location))];
    let html = `
        <div style="margin-bottom: 15px; display: flex; gap: 8px; flex-wrap: wrap;">
            <button onclick="selectFilter(null)" style="background: ${!activeLocationFilter ? GOLD_COLOR : '#333'}; color: ${!activeLocationFilter ? '#000' : '#fff'}; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8em;">Усі</button>
            ${locations.map(loc => `
                <button onclick="selectFilter('${loc}')" style="background: ${activeLocationFilter === loc ? RED_MARKER : '#333'}; color: #fff; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8em;">${loc}</button>
            `).join('')}
        </div>
    `;

    // Список записів
    html += injuries.slice().reverse().map(inj => `
        <div class="injury-item" 
             onclick="selectFilter('${inj.location}')"
             style="background: #1a1a1a; padding: 12px; border-radius: 5px; margin-bottom: 10px; cursor: pointer; border-left: 4px solid ${activeLocationFilter === inj.location ? RED_MARKER : '#444'}; transition: 0.3s;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <strong style="color: ${GOLD_COLOR}">${inj.location}</strong><br>
                    <small style="color: #888;">${inj.date}</small>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="event.stopPropagation(); editEntry('${inj.id}')" style="background:none; border:1px solid gold; color:gold; padding: 2px 6px; border-radius:3px; font-size: 0.75em;">Оновити</button>
                    <button onclick="event.stopPropagation(); deleteEntry('${inj.id}')" style="background:none; border:1px solid ${RED_MARKER}; color:${RED_MARKER}; padding: 2px 6px; border-radius:3px; font-size: 0.75em;">Видалити</button>
                </div>
            </div>
            <p style="margin: 8px 0 0; font-size: 0.9em; color: #ccc;">Рівень болю: ${inj.pain}/10. ${inj.notes || ''}</p>
        </div>
    `).join('');

    listElement.innerHTML = html;
}

window.selectFilter = function(loc) {
    activeLocationFilter = loc;
    refreshUI();
};

// 5. ТОЧКИ ТА РЕДАГУВАННЯ
function renderPoints() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(inj => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        const isHighlight = activeLocationFilter === inj.location;
        el.style.cssText = `
            position: absolute; width: 10px; height: 10px; 
            border-radius: 50%; border: 1px solid white; 
            transform: translate(-50%, -50%); cursor: pointer; 
            background-color: ${isHighlight ? RED_MARKER : '#666'}; 
            box-shadow: ${isHighlight ? '0 0 8px ' + RED_MARKER : 'none'};
            left: ${inj.coordX}%; top: ${inj.coordY}%; z-index: 100;
        `;
        el.onclick = (e) => { e.stopPropagation(); selectFilter(inj.location); };
        container.appendChild(el);
    });
}

window.editEntry = function(id) {
    const inj = injuries.find(i => i.id === id);
    if (!inj) return;
    selectedId = id;
    
    // ПРИМУСОВО ПОКАЗУЄМО ВІКНО ДОПИСУ
    const notesSection = document.getElementById('notes-section');
    if (notesSection) notesSection.style.display = 'block';

    document.getElementById('injury-location').value = inj.location;
    document.getElementById('injury-notes').value = inj.notes || "";
    document.getElementById('injury-date').value = inj.date;
    const radio = document.querySelector(`input[name="pain"][value="${inj.pain}"]`);
    if (radio) radio.checked = true;

    document.getElementById('save-injury-button').textContent = "Зберегти оновлення";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteEntry = async function(id) {
    if (!confirm("Видалити цей запис?")) return;
    await db.collection(INJURY_COLLECTION).doc(id).delete();
    loadInjuriesFromFirebase();
};

// 6. ІНІЦІАЛІЗАЦІЯ КАРТИ ТА ФОРМИ
document.addEventListener('DOMContentLoaded', () => {
    const map = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    const notesSection = document.getElementById('notes-section');

    if (map) {
        map.onclick = (e) => {
            if (e.target.classList.contains('injury-marker')) return;
            const rect = map.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            marker.style.display = 'block';
            marker.style.left = x + '%';
            marker.style.top = y + '%';
            
            document.getElementById('coordX').value = x.toFixed(2);
            document.getElementById('coordY').value = y.toFixed(2);
            
            // Показуємо форму
            if (notesSection) notesSection.style.display = 'block';
            
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
        try {
            if (selectedId) await db.collection(INJURY_COLLECTION).doc(selectedId).update(data);
            else await db.collection(INJURY_COLLECTION).add(data);
            loadInjuriesFromFirebase();
            alert("Дані оновлено!");
            if (marker) marker.style.display = 'none';
        } catch (err) { alert("Помилка: " + err.message); }
    };
});
