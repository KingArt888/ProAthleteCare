const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedId = null;
let painChartInstance = null;

const RED_MARKER = '#DA3E52'; 
const getToday = () => new Date().toISOString().split('T')[0];

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

// 2. ЗАВАНТАЖЕННЯ ТА ВІДОБРАЖЕННЯ
async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        injuries = [];
        snapshot.forEach(doc => injuries.push({ id: doc.id, ...doc.data() }));
        injuries.sort((a, b) => new Date(a.date) - new Date(b.date));

        renderPoints();      
        initPainChart();    
        renderInjuryList(); // Ця функція тепер малює список з кнопками
    } catch (e) { 
        console.error("Помилка завантаження:", e);
    }
}

// 3. СПИСОК ТРАВМ З КНОПКАМИ (ВИДАЛИТИ/РЕДАГУВАТИ)
function renderInjuryList() {
    const listElement = document.getElementById('injury-list');
    if (!listElement) return;

    if (injuries.length === 0) {
        listElement.innerHTML = '<p class="placeholder-text">Записів поки немає.</p>';
        return;
    }

    // Сортуємо для списку: нові зверху
    listElement.innerHTML = injuries.slice().reverse().map(inj => `
        <div class="injury-item" style="background: #1a1a1a; padding: 12px; border-radius: 5px; margin-bottom: 10px; border-left: 4px solid ${RED_MARKER}; color: white;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <strong style="color: gold; font-size: 1.1em;">${inj.location}</strong><br>
                    <small style="color: #888;">${inj.date}</small>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="editEntry('${inj.id}')" style="background: none; border: 1px solid gold; color: gold; cursor: pointer; padding: 2px 8px; border-radius: 3px; font-size: 0.8em;">Оновити</button>
                    <button onclick="deleteEntry('${inj.id}')" style="background: none; border: 1px solid ${RED_MARKER}; color: ${RED_MARKER}; cursor: pointer; padding: 2px 8px; border-radius: 3px; font-size: 0.8em;">Видалити</button>
                </div>
            </div>
            <p style="margin: 8px 0 0; font-size: 0.9em; color: #ccc;">Біль: ${inj.pain}/10. ${inj.notes || ''}</p>
        </div>
    `).join('');
}

// 4. ФУНКЦІЇ КЕРУВАННЯ
window.editEntry = function(id) {
    const inj = injuries.find(i => i.id === id);
    if (!inj) return;

    selectedId = id;
    document.getElementById('injury-location').value = inj.location;
    document.getElementById('injury-notes').value = inj.notes || "";
    document.getElementById('injury-date').value = inj.date;
    
    const radio = document.querySelector(`input[name="pain"][value="${inj.pain}"]`);
    if (radio) radio.checked = true;

    // Скролимо до форми
    document.getElementById('injury-form').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('save-injury-button').textContent = "Зберегти зміни";
};

window.deleteEntry = async function(id) {
    if (!confirm("Видалити цей запис про травму?")) return;
    try {
        await db.collection(INJURY_COLLECTION).doc(id).delete();
        loadInjuriesFromFirebase();
    } catch (e) {
        alert("Помилка видалення: " + e.message);
    }
};

// 5. МАЛЕНЬКІ ТОЧКИ ТА ГРАФІК
function renderPoints() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(inj => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        el.style.cssText = `
            position: absolute; width: 8px; height: 8px; 
            border-radius: 50%; border: 1px solid white; 
            transform: translate(-50%, -50%); cursor: pointer; 
            background-color: ${RED_MARKER}; left: ${inj.coordX}%; top: ${inj.coordY}%; 
            z-index: 100;
        `;
        el.onclick = (e) => { e.stopPropagation(); editEntry(inj.id); };
        container.appendChild(el);
    });
}

function initPainChart() {
    const ctx = document.getElementById('painChart');
    if (!ctx || injuries.length === 0) return;
    if (painChartInstance) painChartInstance.destroy();

    painChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: injuries.map(i => i.date),
            datasets: [{
                label: 'Біль',
                data: injuries.map(i => i.pain),
                borderColor: RED_MARKER,
                backgroundColor: 'rgba(218, 62, 82, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 10, ticks: { color: '#fff' } },
                x: { ticks: { color: '#fff' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// 6. КАРТА ТА ЗБЕРЕЖЕННЯ
function setupBodyMap() {
    const map = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    if (!map || !marker) return;

    map.onclick = (e) => {
        if (e.target.classList.contains('injury-marker')) return;
        const rect = map.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        marker.style.display = 'block';
        marker.style.border = `2px solid ${RED_MARKER}`;
        marker.style.left = x + '%';
        marker.style.top = y + '%';
        
        document.getElementById('coordX').value = x.toFixed(2);
        document.getElementById('coordY').value = y.toFixed(2);
        
        selectedId = null;
        document.getElementById('injury-form').reset();
        document.getElementById('save-injury-button').textContent = "Записати травму";
    };
}

document.addEventListener('DOMContentLoaded', () => {
    setupBodyMap();
    const form = document.getElementById('injury-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const data = {
                userId: currentUserId,
                location: document.getElementById('injury-location').value,
                date: document.getElementById('injury-date').value,
                pain: parseInt(form.querySelector('input[name="pain"]:checked')?.value || 1),
                notes: document.getElementById('injury-notes').value,
                coordX: document.getElementById('coordX').value,
                coordY: document.getElementById('coordY').value
            };
            try {
                if (selectedId) await db.collection(INJURY_COLLECTION).doc(selectedId).update(data);
                else await db.collection(INJURY_COLLECTION).add(data);
                loadInjuriesFromFirebase();
                alert("Збережено в ProAthleteCare!");
                form.reset();
                marker.style.display = 'none';
            } catch (err) { alert("Помилка: " + err.message); }
        };
    }
});
