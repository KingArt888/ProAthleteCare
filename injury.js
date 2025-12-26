// ==========================================================
// 1. КОНСТАНТИ (БЕЗ ЗМІНИ ТВОГО HTML)
// ==========================================================
const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedId = null;
let painChartInstance = null; // Для графіка

const RED_MARKER = '#DA3E52'; // Твій червоний
const getToday = () => new Date().toISOString().split('T')[0];

// АВТОРИЗАЦІЯ (як у wellness.js)
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log("Атлет авторизований:", currentUserId);
            loadInjuriesFromFirebase();
        } else {
            firebase.auth().signInAnonymously().catch(e => console.error("Помилка входу:", e));
        }
    });
}

// ==========================================================
// 2. ЗАВАНТАЖЕННЯ ТА ГРАФІК
// ==========================================================
async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        injuries = [];
        snapshot.forEach(doc => injuries.push({ id: doc.id, ...doc.data() }));
        
        // Сортуємо для графіка (від старих до нових)
        injuries.sort((a, b) => new Date(a.date) - new Date(b.date));

        renderPoints();      // Малюємо маленькі червоні точки
        initPainChart();    // Малюємо графік у твій <canvas id="painChart">
        renderInjuryList(); // Малюємо історію у твій <div id="injury-list">
    } catch (e) { 
        console.error("Помилка завантаження:", e);
    }
}

// ГРАФІК БОЛЮ (Використовує твій id="painChart")
function initPainChart() {
    const ctx = document.getElementById('painChart');
    if (!ctx || injuries.length === 0) return;

    if (painChartInstance) painChartInstance.destroy();

    painChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: injuries.map(i => i.date.split('-').slice(1).join('.')),
            datasets: [{
                label: 'Рівень болю',
                data: injuries.map(i => i.pain),
                borderColor: RED_MARKER,
                backgroundColor: 'rgba(218, 62, 82, 0.2)',
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 10, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                x: { ticks: { color: '#fff' }, grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// ІСТОРІЯ ТРАВМ (Використовує твій id="injury-list")
function renderInjuryList() {
    const listElement = document.getElementById('injury-list');
    if (!listElement) return;

    if (injuries.length === 0) {
        listElement.innerHTML = '<p class="placeholder-text">Записів поки немає.</p>';
        return;
    }

    listElement.innerHTML = injuries.slice().reverse().map(inj => `
        <div style="background: #1a1a1a; padding: 12px; border-radius: 5px; margin-bottom: 10px; border-left: 4px solid ${RED_MARKER};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="color: #FFC72C; font-size: 1.1em;">${inj.location}</strong>
                <span style="color: #888; font-size: 0.85em;">${inj.date}</span>
            </div>
            <div style="color: #eee; margin-top: 5px; font-size: 0.9em;">
                Біль: <strong>${inj.pain}/10</strong><br>
                <span style="color: #bbb;">${inj.notes || 'Опис відсутній'}</span>
            </div>
        </div>
    `).join('');
}

// ==========================================================
// 3. ТОЧКИ ТА КАРТА
// ==========================================================
function renderPoints() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(inj => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        // РОБИМО ТОЧКУ МАЛЕНЬКОЮ (8px) ТА ЧЕРВОНОЮ
        el.style.cssText = `
            position: absolute; width: 8px; height: 8px; 
            border-radius: 50%; border: 1px solid white; 
            transform: translate(-50%, -50%); cursor: pointer; 
            background-color: ${RED_MARKER}; left: ${inj.coordX}%; top: ${inj.coordY}%; 
            z-index: 100; box-shadow: 0 0 5px rgba(0,0,0,0.5);
        `;
        el.onclick = (e) => {
            e.stopPropagation();
            selectedId = inj.id;
            document.getElementById('injury-location').value = inj.location;
            document.getElementById('injury-notes').value = inj.notes || "";
            document.getElementById('injury-date').value = inj.date;
            const radio = document.querySelector(`input[name="pain"][value="${inj.pain}"]`);
            if (radio) radio.checked = true;
            document.getElementById('save-injury-button').textContent = "Оновити стан";
        };
        container.appendChild(el);
    });
}

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
        marker.style.backgroundColor = 'transparent';
        marker.style.border = `2px solid ${RED_MARKER}`;
        marker.style.left = x + '%';
        marker.style.top = y + '%';
        
        document.getElementById('coordX').value = x.toFixed(2);
        document.getElementById('coordY').value = y.toFixed(2);
        
        selectedId = null;
        document.getElementById('injury-form').reset();
        document.getElementById('injury-date').value = getToday();
        document.getElementById('save-injury-button').textContent = "Записати травму";
    };
}

// ==========================================================
// 4. ЗБЕРЕЖЕННЯ
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    setupBodyMap();
    const form = document.getElementById('injury-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            if (!currentUserId) return alert("Чекаємо авторизацію...");

            const data = {
                userId: currentUserId,
                location: document.getElementById('injury-location').value,
                date: document.getElementById('injury-date').value,
                pain: parseInt(form.querySelector('input[name="pain"]:checked')?.value || 1),
                notes: document.getElementById('injury-notes').value,
                coordX: document.getElementById('coordX').value,
                coordY: document.getElementById('coordY').value,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                if (selectedId) {
                    await db.collection(INJURY_COLLECTION).doc(selectedId).update(data);
                } else {
                    await db.collection(INJURY_COLLECTION).add(data);
                }
                loadInjuriesFromFirebase();
                alert("ProAthleteCare: Травму записано!");
            } catch (err) { 
                console.error("Firebase Error:", err);
                alert("Помилка доступу. Перевірте Rules у Firebase!");
            }
        };
    }
});
