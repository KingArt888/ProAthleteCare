const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedId = null;
let painChartInstance = null;
let activeLocationFilter = null; // Фільтр за назвою травми

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

// 2. ЗАВАНТАЖЕННЯ
async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        injuries = [];
        snapshot.forEach(doc => injuries.push({ id: doc.id, ...doc.data() }));
        
        // Сортуємо для графіка
        injuries.sort((a, b) => new Date(a.date) - new Date(b.date));

        refreshAll();
    } catch (e) { console.error("Firebase Error:", e); }
}

function refreshAll() {
    renderPoints();
    renderInjuryList();
    updateChart(); 
}

// 3. ГРАФІК (РЕАГУЄ НА КЛІК В СПИСКУ)
function updateChart() {
    const ctx = document.getElementById('painChart');
    if (!ctx) return;
    if (painChartInstance) painChartInstance.destroy();

    // Якщо фільтр не обрано — показуємо всі точки, якщо обрано — тільки цю локацію
    const chartData = activeLocationFilter 
        ? injuries.filter(i => i.location === activeLocationFilter)
        : injuries;

    if (chartData.length === 0) return;

    painChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(i => i.date),
            datasets: [{
                label: activeLocationFilter || "Усі травми",
                data: chartData.map(i => i.pain),
                borderColor: activeLocationFilter ? RED_MARKER : GOLD_COLOR,
                backgroundColor: 'rgba(218, 62, 82, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 6
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

// 4. СПИСОК ІСТОРІЇ (ТЕПЕР ІНТЕРАКТИВНИЙ)
function renderInjuryList() {
    const listElement = document.getElementById('injury-list');
    if (!listElement) return;

    if (injuries.length === 0) {
        listElement.innerHTML = '<p class="placeholder-text">Записів немає.</p>';
        return;
    }

    // Групуємо для унікальних назв у списку (щоб не дублювати "Коліно" 10 разів)
    const uniqueLocations = [...new Set(injuries.map(i => i.location))];

    listElement.innerHTML = `
        <div style="margin-bottom: 15px; display: flex; gap: 5px; flex-wrap: wrap;">
            <button onclick="filterByLocation(null)" style="background: ${!activeLocationFilter ? GOLD_COLOR : '#333'}; color: ${!activeLocationFilter ? '#000' : '#fff'}; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">Всі</button>
            ${uniqueLocations.map(loc => `
                <button onclick="filterByLocation('${loc}')" style="background: ${activeLocationFilter === loc ? RED_MARKER : '#333'}; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">${loc}</button>
            `).join('')}
        </div>
        <div id="entries-container">
            ${injuries.slice().reverse().map(inj => `
                <div class="injury-item" 
                     onclick="filterByLocation('${inj.location}')"
                     style="background: #1a1a1a; padding: 10px; border-radius: 5px; margin-bottom: 8px; border-left: 4px solid ${activeLocationFilter === inj.location ? RED_MARKER : '#444'}; cursor: pointer; transition: 0.3s;">
                    <div style="display: flex; justify-content: space-between;">
                        <strong style="color: ${GOLD_COLOR}">${inj.location}</strong>
                        <div style="font-size: 0.8em;">
                            <span onclick="event.stopPropagation(); editEntry('${inj.id}')" style="color: #aaa; margin-right: 10px;">Оновити</span>
                            <span onclick="event.stopPropagation(); deleteEntry('${inj.id}')" style="color: ${RED_MARKER};">Видалити</span>
                        </div>
                    </div>
                    <div style="color: #eee; font-size: 0.85em; margin-top: 4px;">Біль: ${inj.pain}/10 | ${inj.date}</div>
                </div>
            `).join('')}
        </div>
    `;
}

window.filterByLocation = function(loc) {
    activeLocationFilter = loc;
    refreshAll();
};

// 5. КАРТА ТА ТОЧКИ
function renderPoints() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(inj => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        const isSelected = activeLocationFilter === inj.location;
        el.style.cssText = `
            position: absolute; width: 8px; height: 8px; 
            border-radius: 50%; border: 1px solid white; 
            transform: translate(-50%, -50%); cursor: pointer; 
            background-color: ${isSelected ? RED_MARKER : '#666'}; 
            box-shadow: ${isSelected ? '0 0 10px ' + RED_MARKER : 'none'};
            left: ${inj.coordX}%; top: ${inj.coordY}%; z-index: 100;
        `;
        el.onclick = (e) => { e.stopPropagation(); filterByLocation(inj.location); editEntry(inj.id); };
        container.appendChild(el);
    });
}

// 6. ФОРМА ТА ЗБЕРЕЖЕННЯ
window.editEntry = function(id) {
    const inj = injuries.find(i => i.id === id);
    if (!inj) return;
    selectedId = id;
    document.getElementById('notes-section').style.display = 'block';
    document.getElementById('injury-location').value = inj.location;
    document.getElementById('injury-notes').value = inj.notes || "";
    document.getElementById('injury-date').value = inj.date;
    const radio = document.querySelector(`input[name="pain"][value="${inj.pain}"]`);
    if (radio) radio.checked = true;
    document.getElementById('save-injury-button').textContent = "Оновити запис";
};

window.deleteEntry = async function(id) {
    if (confirm("Видалити?")) {
        await db.collection(INJURY_COLLECTION).doc(id).delete();
        loadInjuriesFromFirebase();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const map = document.getElementById('bodyMapContainer');
    if (map) {
        map.onclick = (e) => {
            if (e.target.classList.contains('injury-marker')) return;
            const rect = map.getBoundingClientRect();
            document.getElementById('click-marker').style.display = 'block';
            document.getElementById('click-marker').style.left = ((e.clientX - rect.left) / rect.width) * 100 + '%';
            document.getElementById('click-marker').style.top = ((e.clientY - rect.top) / rect.height) * 100 + '%';
            document.getElementById('coordX').value = (((e.clientX - rect.left) / rect.width) * 100).toFixed(2);
            document.getElementById('coordY').value = (((e.clientY - rect.top) / rect.height) * 100).toFixed(2);
            selectedId = null;
            document.getElementById('injury-form').reset();
            document.getElementById('notes-section').style.display = 'block';
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
