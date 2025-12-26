// ==========================================================
// 1. СТАН ТА КОНСТАНТИ ProAtletCare
// ==========================================================
const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedId = null; // Для відстеження, чи ми редагуємо існуючу травму

const getToday = () => new Date().toISOString().split('T')[0];

// СЛУХАЧ АВТОРИЗАЦІЇ (Виправлено для анонімного входу)
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log("Атлет ідентифікований:", currentUserId);
            loadInjuriesFromFirebase();
        } else {
            // Входимо анонімно, щоб отримати UID для записів
            try {
                await firebase.auth().signInAnonymously();
            } catch (e) {
                console.error("Помилка входу:", e);
            }
        }
    });
}

// ==========================================================
// 2. ФУНКЦІЇ FIREBASE (ЗАВАНТАЖЕННЯ ТА ВИДАЛЕННЯ)
// ==========================================================

async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        injuries = [];
        snapshot.forEach(doc => {
            injuries.push({ id: doc.id, ...doc.data() });
        });
        renderInjuryMarkers();
    } catch (e) { 
        console.error("Помилка завантаження травм:", e); 
    }
}

// Функція видалення запису
async function deleteInjury(id) {
    if (!confirm("Видалити цей запис про травму?")) return;
    try {
        await db.collection(INJURY_COLLECTION).doc(id).delete();
        alert("Запис видалено");
        loadInjuriesFromFirebase();
        document.getElementById('injury-form').reset();
        selectedId = null;
    } catch (e) {
        console.error("Помилка видалення:", e);
    }
}

// ==========================================================
// 3. ІНТЕРФЕЙС (КАРТА ТА ФОРМА)
// ==========================================================

function setupBodyMap() {
    const mapContainer = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    
    if (!mapContainer || !marker) return;

    mapContainer.onclick = function(e) {
        // Якщо клікнули на існуючий маркер - не ставимо новий
        if (e.target.classList.contains('injury-marker')) return;

        const rect = mapContainer.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        marker.style.display = 'block';
        marker.style.left = x + '%';
        marker.style.top = y + '%';
        
        document.getElementById('coordX').value = x.toFixed(2);
        document.getElementById('coordY').value = y.toFixed(2);
        
        selectedId = null; // Це новий запис
        document.getElementById('injury-form').reset();
        document.getElementById('injury-date').value = getToday();
        
        const btn = document.querySelector('#injury-form .gold-button');
        if (btn) btn.textContent = "Записати травму";
    };
}

function renderInjuryMarkers() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;

    // Очищаємо старі маркери
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(injury => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        
        // Колір залежить від болю (червоніший, якщо болить сильніше)
        const intensity = injury.pain >= 7 ? '#FF0000' : (injury.pain >= 4 ? '#FFA500' : '#DA3E52');
        
        el.style.cssText = `
            position: absolute; width: 16px; height: 16px;
            border-radius: 50%; border: 2px solid white;
            transform: translate(-50%, -50%); cursor: pointer;
            background-color: ${intensity}; 
            left: ${injury.coordX}%; top: ${injury.coordY}%;
            box-shadow: 0 0 8px rgba(0,0,0,0.6);
            z-index: 10;
        `;

        el.onclick = (e) => {
            e.stopPropagation();
            selectedId = injury.id;
            
            // Заповнюємо форму даними обраної травми
            document.getElementById('injury-location').value = injury.location;
            document.getElementById('injury-notes').value = injury.notes || "";
            document.getElementById('injury-date').value = injury.date;
            document.getElementById('coordX').value = injury.coordX;
            document.getElementById('coordY').value = injury.coordY;
            
            const radio = document.querySelector(`input[name="pain"][value="${injury.pain}"]`);
            if (radio) radio.checked = true;

            const clickMarker = document.getElementById('click-marker');
            if (clickMarker) clickMarker.style.display = 'none';

            const btn = document.querySelector('#injury-form .gold-button');
            if (btn) btn.textContent = "Оновити дані";
            
            alert(`Травму обрано: ${injury.location}. Можна змінити дані або додати коментар.`);
        };
        container.appendChild(el);
    });
}

// ==========================================================
// 4. ЗАПУСК
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    setupBodyMap();
    document.getElementById('injury-date').value = getToday();

    const form = document.getElementById('injury-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            if (!currentUserId) return alert("Зачекайте авторизації...");

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
                    alert("Дані про травму оновлено!");
                } else {
                    await db.collection(INJURY_COLLECTION).add(data);
                    alert("Травму успішно записано!");
                }
                
                loadInjuriesFromFirebase();
                form.reset();
                document.getElementById('injury-date').value = getToday();
                selectedId = null;
                const clickMarker = document.getElementById('click-marker');
                if (clickMarker) clickMarker.style.display = 'none';
            } catch (err) { 
                console.error("Помилка запису:", err);
                alert("Помилка доступу. Перевірте правила Firestore.");
            }
        };
    }
});
