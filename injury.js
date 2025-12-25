// ==========================================================
// 1. ПІДГОТОВКА ДАНИХ ТА КОНСТАНТИ
// ==========================================================
const INJURY_COLLECTION = 'injuries';
let injuries = [];
let selectedInjury = null;
let currentPainChart = null;

// Функція-хелпер для дати
function getTodayDateString() { 
    return new Date().toISOString().split('T')[0]; 
}

// ==========================================================
// 2. РОБОТА З FIREBASE
// ==========================================================

// Ми не оголошуємо 'db' тут, бо вона вже є в HTML
async function loadInjuriesFromFirebase() {
    try {
        // Використовуємо колекцію 'injuries'
        const snapshot = await db.collection(INJURY_COLLECTION).get();
        injuries = [];
        snapshot.forEach(doc => {
            injuries.push({ id: doc.id, ...doc.data() });
        });
        
        renderAll();
    } catch (e) { 
        console.error("Помилка завантаження:", e); 
    }
}

// ==========================================================
// 3. ЛОГІКА КАРТИ (КЛІКИ ТА МАРКЕРИ)
// ==========================================================
function setupBodyMap() {
    const mapContainer = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    
    if (!mapContainer || !marker) return;

    mapContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('injury-marker')) return;

        const rect = mapContainer.getBoundingClientRect();
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

        marker.style.left = `${xPercent}%`;
        marker.style.top = `${yPercent}%`;
        
        document.getElementById('coordX').value = xPercent.toFixed(2);
        document.getElementById('coordY').value = yPercent.toFixed(2);
        
        selectedInjury = null;
        document.getElementById('injury-form').reset();
        document.getElementById('injury-date').value = getTodayDateString();
    });
}

function renderInjuryMarkers() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;

    // Видаляємо старі маркери перед малюванням нових
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(injury => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        el.style.cssText = `
            position: absolute; width: 14px; height: 14px;
            border-radius: 50%; border: 2px solid white;
            transform: translate(-50%, -50%); cursor: pointer; z-index: 10;
        `;
        el.style.left = `${injury.coordX}%`;
        el.style.top = `${injury.coordY}%`;
        el.style.backgroundColor = injury.status === 'closed' ? '#50C878' : '#DA3E52';

        el.onclick = (e) => {
            e.stopPropagation();
            selectedInjury = injury;
            displayInjuryDetails(injury);
        };
        container.appendChild(el);
    });
}

// ==========================================================
// 4. ГРАФІК ТА ДЕТАЛІ
// ==========================================================
function displayInjuryDetails(injury) {
    const detailBox = document.getElementById('injury-list');
    if (!detailBox) return;

    detailBox.innerHTML = `
        <div style="background:#111; padding:15px; border-radius:8px; border-left:4px solid #FFC72C;">
            <h4 style="color:#FFC72C;">${injury.location}</h4>
            <p>Статус: <strong>${injury.status === 'active' ? 'Активна' : 'Закрита'}</strong></p>
            <p>Біль: <strong>${injury.pain}/10</strong></p>
            <p><em>${injury.notes || ''}</em></p>
            <button onclick="deleteInjury('${injury.id}')" style="background:#DA3E52; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px;">Видалити</button>
        </div>
    `;
    renderPainChart(injury);
}

function renderPainChart(injury) {
    const ctx = document.getElementById('painChart');
    if (!ctx) return;
    if (currentPainChart) currentPainChart.destroy();
    
    // Якщо у вас немає історії, малюємо одну точку
    const history = injury.painHistory || [{date: injury.date, pain: injury.pain}];

    currentPainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: history.map(h => h.date),
            datasets: [{
                label: 'Рівень болю',
                data: history.map(h => h.pain),
                borderColor: '#FFC72C',
                tension: 0.3,
                fill: false
            }]
        },
        options: {
            scales: { y: { min: 0, max: 10 } }
        }
    });
}

// ==========================================================
// 5. ІНІЦІАЛІЗАЦІЯ
// ==========================================================
function renderAll() {
    renderInjuryMarkers();
}

async function deleteInjury(id) {
    if (!confirm("Видалити?")) return;
    await db.collection(INJURY_COLLECTION).doc(id).delete();
    loadInjuriesFromFirebase();
}

document.addEventListener('DOMContentLoaded', () => {
    setupBodyMap();
    loadInjuriesFromFirebase();

    const form = document.getElementById('injury-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const pain = form.querySelector('input[name="pain"]:checked')?.value || 1;
            const data = {
                location: document.getElementById('injury-location').value,
                date: document.getElementById('injury-date').value,
                pain: pain,
                notes: document.getElementById('injury-notes').value,
                coordX: document.getElementById('coordX').value,
                coordY: document.getElementById('coordY').value,
                status: 'active',
                painHistory: [{date: document.getElementById('injury-date').value, pain: pain}]
            };

            try {
                await db.collection(INJURY_COLLECTION).add(data);
                form.reset();
                loadInjuriesFromFirebase();
                alert("Травму збережено!");
            } catch (error) {
                console.error("Помилка запису:", error);
            }
        };
    }
});
