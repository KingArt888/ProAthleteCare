// ==========================================================
// 1. СТАН ТА КОНСТАНТИ ProAtletCare
// ==========================================================
const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedId = null; 

const getToday = () => new Date().toISOString().split('T')[0];

// СЛУХАЧ АВТОРИЗАЦІЇ
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log("Атлет авторизований:", currentUserId);
            loadInjuriesFromFirebase();
        } else {
            // Анонімний вхід для нових користувачів
            firebase.auth().signInAnonymously().catch(e => console.error("Помилка входу:", e));
        }
    });
}

// ==========================================================
// 2. ФУНКЦІЇ FIREBASE
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

// ==========================================================
// 3. ІНТЕРФЕЙС
// ==========================================================

function setupBodyMap() {
    const mapContainer = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    const notesSection = document.getElementById('notes-section'); 
    
    if (!mapContainer || !marker) return;

    mapContainer.onclick = function(e) {
        if (e.target.classList.contains('injury-marker')) return;

        const rect = mapContainer.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        marker.style.display = 'block';
        marker.style.left = x + '%';
        marker.style.top = y + '%';
        
        document.getElementById('coordX').value = x.toFixed(2);
        document.getElementById('coordY').value = y.toFixed(2);
        
        // ПРИМУСОВО ПОКАЗУЄМО ТА ОЧИЩАЄМО ПОЛЕ ДОПИСУ
        if (notesSection) notesSection.style.display = 'block';
        
        selectedId = null; 
        document.getElementById('injury-form').reset();
        document.getElementById('injury-date').value = getToday();
        
        const btn = document.querySelector('#injury-form .gold-button');
        if (btn) btn.textContent = "Записати травму";
    };
}

function renderInjuryMarkers() {
    const container = document.getElementById('bodyMapContainer');
    const notesSection = document.getElementById('notes-section');
    if (!container) return;

    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(injury => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        
        // Колір залежить від рівня болю
        const color = injury.pain >= 7 ? '#FF0000' : (injury.pain >= 4 ? '#FFA500' : '#DA3E52');
        
        el.style.cssText = `
            position: absolute; width: 16px; height: 16px;
            border-radius: 50%; border: 2px solid white;
            transform: translate(-50%, -50%); cursor: pointer;
            background-color: ${color}; left: ${injury.coordX}%; top: ${injury.coordY}%;
            z-index: 10; box-shadow: 0 0 5px rgba(0,0,0,0.5);
        `;

        el.onclick = (e) => {
            e.stopPropagation();
            selectedId = injury.id;
            
            if (notesSection) notesSection.style.display = 'block';

            document.getElementById('injury-location').value = injury.location;
            document.getElementById('injury-notes').value = injury.notes || "";
            document.getElementById('injury-date').value = injury.date;
            document.getElementById('coordX').value = injury.coordX;
            document.getElementById('coordY').value = injury.coordY;
            
            const radio = document.querySelector(`input[name="pain"][value="${injury.pain}"]`);
            if (radio) radio.checked = true;

            const btn = document.querySelector('#injury-form .gold-button');
            if (btn) btn.textContent = "Оновити дані";
        };
        container.appendChild(el);
    });
}

// ==========================================================
// 4. ЗАПУСК
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    setupBodyMap();
    
    const form = document.getElementById('injury-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            if (!currentUserId) return alert("Помилка авторизації!");

            const data = {
                userId: currentUserId,
                location: document.getElementById('injury-location').value,
                date: document.getElementById('injury-date').value,
                pain: parseInt(form.querySelector('input[name="pain"]:checked')?.value || 1),
                notes: document.getElementById('injury-notes').value,
                coordX: document.getElementById('coordX').value,
                coordY: document.getElementById('coordY').value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                if (selectedId) {
                    await db.collection(INJURY_COLLECTION).doc(selectedId).update(data);
                    alert("Дані оновлено!");
                } else {
                    await db.collection(INJURY_COLLECTION).add(data);
                    alert("Травму записано!");
                }
                loadInjuriesFromFirebase();
                form.reset();
                selectedId = null;
            } catch (err) { 
                console.error("Firebase Error:", err); 
                alert("Помилка доступу. Перевірте правила (Rules) у консолі Firebase.");
            }
        };
    }
});
