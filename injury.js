// ==========================================================
// 1. КОНСТАНТИ ТА СТАН
// ==========================================================
const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedId = null;
let painChart = null; 

const RED_MARKER = '#DA3E52'; // Твій червоний
const getToday = () => new Date().toISOString().split('T')[0];

// АВТОРИЗАЦІЯ (Анонімний вхід для ProAtletCare)
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
// 2. РОБОТА З FIREBASE ТА ДИНАМІКОЮ
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

        renderPoints();
        updatePainChart(); // Шукає існуючий canvas
        renderHistoryList(); // Вставляє текст у твій notes-section або нижче
    } catch (e) { 
        console.error("Помилка:", e);
    }
}

// МАЛЕНЬКІ ЧЕРВОНІ ТОЧКИ
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
            z-index: 10;
        `;
        el.onclick = (e) => {
            e.stopPropagation();
            selectedId = inj.id;
            document.getElementById('notes-section').style.display = 'block';
            document.getElementById('injury-location').value = inj.location;
            document.getElementById('injury-notes').value = inj.notes || "";
            document.getElementById('injury-date').value = inj.date;
            const radio = document.querySelector(`input[name="pain"][value="${inj.pain}"]`);
            if (radio) radio.checked = true;
        };
        container.appendChild(el);
    });
}

// ОНОВЛЕННЯ ГРАФІКА (Використовує canvas, який має бути у твоєму HTML)
function updatePainChart() {
    // Шукаємо canvas за ID, який зазвичай є в шаблонах (painChart або подібний)
    const ctx = document.getElementById('painChart') || document.getElementById('wellnessChart'); 
    if (!ctx || injuries.length === 0) return;

    if (painChart) painChart.destroy();

    painChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: injuries.map(i => i.date),
            datasets: [{
                label: 'Біль',
                data: injuries.map(i => i.pain),
                borderColor: RED_MARKER,
                tension: 0.3,
                fill: false
            }]
        },
        options: {
            scales: { y: { min: 0, max: 10, ticks: {color: '#fff'} } }
        }
    });
}

// ==========================================================
// 3. ЛОГІКА КАРТИ (БЕЗ ЗМІНИ HTML)
// ==========================================================
function setupBodyMap() {
    const map = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    const notesSection = document.getElementById('notes-section');

    if (!map || !marker) return;

    map.onclick = (e) => {
        if (e.target.classList.contains('injury-marker')) return;
        const rect = map.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        marker.style.display = 'block';
        marker.style.width = '10px';
        marker.style.height = '10px';
        marker.style.backgroundColor = RED_MARKER;
        marker.style.left = x + '%';
        marker.style.top = y + '%';
        
        document.getElementById('coordX').value = x.toFixed(2);
        document.getElementById('coordY').value = y.toFixed(2);
        
        if (notesSection) notesSection.style.display = 'block';
        selectedId = null;
        document.getElementById('injury-form').reset();
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
                alert("Збережено!");
            } catch (err) { alert(err.message); }
        };
    }
});
