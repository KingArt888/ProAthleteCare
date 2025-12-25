// ==========================================================
// 1. КОНСТАНТИ ТА СТАН
// ==========================================================
const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedInjury = null;
let currentPainChart = null;

const getToday = () => new Date().toISOString().split('T')[0];

// СЛУХАЧ АВТОРИЗАЦІЇ
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUserId = user.uid;
        console.log("Авторизовано як:", currentUserId);
        loadInjuriesFromFirebase();
    } else {
        console.warn("Користувач не авторизований. Перевірте сторінку входу.");
    }
});

// ==========================================================
// 2. ЗАВАНТАЖЕННЯ ТА ВІДОБРАЖЕННЯ
// ==========================================================

async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
        // Завантажуємо лише дані поточного користувача
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        injuries = [];
        snapshot.forEach(doc => {
            injuries.push({ id: doc.id, ...doc.data() });
        });
        
        renderInjuryMarkers();
        displayInjuryList();
    } catch (e) { 
        console.error("Помилка завантаження даних:", e); 
    }
}

function renderInjuryMarkers() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;

    // Очищаємо старі маркери
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(injury => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        el.style.cssText = `
            position: absolute; width: 16px; height: 16px;
            border-radius: 50%; border: 2px solid white;
            transform: translate(-50%, -50%); cursor: pointer; z-index: 100;
            background-color: ${injury.status === 'closed' ? '#50C878' : '#DA3E52'};
            left: ${injury.coordX}%; top: ${injury.coordY}%;
        `;

        el.onclick = (e) => {
            e.stopPropagation();
            selectedInjury = injury;
            fillFormWithData(injury);
        };
        container.appendChild(el);
    });
}

function fillFormWithData(injury) {
    // Заповнюємо поля форми
    document.getElementById('injury-location').value = injury.location || "";
    document.getElementById('injury-date').value = injury.date || getToday();
    document.getElementById('coordX').value = injury.coordX;
    document.getElementById('coordY').value = injury.coordY;

    // ВАЖЛИВО: Поле коментаря, яке "пропадало"
    const notesField = document.getElementById('injury-notes');
    if (notesField) {
        notesField.value = injury.notes || "";
        // Переконуємося, що блок видимий
        const notesSection = document.getElementById('notes-section');
        if (notesSection) notesSection.style.display = 'block';
    }

    // Встановлюємо шкалу болю
    const radio = document.querySelector(`input[name="pain"][value="${injury.pain}"]`);
    if (radio) radio.checked = true;

    renderPainChart(injury);
}

// ==========================================================
// 3. ЛОГІКА КАРТИ ТА ЗБЕРЕЖЕННЯ
// ==========================================================

function setupBodyMap() {
    const mapContainer = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    const notesSection = document.getElementById('notes-section');
    
    if (!mapContainer || !marker) return;

    mapContainer.onclick = function(e) {
        // Якщо клікнули не на маркер, а на порожнє місце силуету
        if (e.target.classList.contains('injury-marker')) return;

        const rect = mapContainer.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        marker.style.display = 'block';
        marker.style.left = x + '%';
        marker.style.top = y + '%';
        
        document.getElementById('coordX').value = x.toFixed(2);
        document.getElementById('coordY').value = y.toFixed(2);
        
        // Робимо поле коментарів видимим для нового запису
        if (notesSection) notesSection.style.display = 'block';

        selectedInjury = null;
        document.getElementById('injury-form').reset();
        document.getElementById('injury-date').value = getToday();
    };
}

// ==========================================================
// 4. ІНІЦІАЛІЗАЦІЯ ПРИ ЗАВАНТАЖЕННІ
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    setupBodyMap();
    
    // Робимо поле коментаря видимим від самого початку (як ви хотіли)
    const notesSection = document.getElementById('notes-section');
    if (notesSection) notesSection.style.display = 'block';

    const form = document.getElementById('injury-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            if (!currentUserId) {
                alert("Помилка: Ви не авторизовані!");
                return;
            }

            const x = document.getElementById('coordX').value;
            if (!x) {
                alert("Будь ласка, спочатку клікніть на силует людини!");
                return;
            }

            const data = {
                userId: currentUserId,
                location: document.getElementById('injury-location').value,
                date: document.getElementById('injury-date').value,
                pain: parseInt(form.querySelector('input[name="pain"]:checked')?.value || 1),
                notes: document.getElementById('injury-notes').value, // Збереження коментаря
                coordX: x,
                coordY: document.getElementById('coordY').value,
                status: 'active',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                if (selectedInjury) {
                    await db.collection(INJURY_COLLECTION).doc(selectedInjury.id).update(data);
                } else {
                    await db.collection(INJURY_COLLECTION).add(data);
                }
                alert("Дані збережено!");
                loadInjuriesFromFirebase();
                form.reset();
                document.getElementById('injury-date').value = getToday();
            } catch (err) {
                console.error("Помилка при збереженні:", err);
                alert("Сталася помилка. Перевірте консоль.");
            }
        };
    }
});

// Допоміжна функція списку (під картою)
function displayInjuryList() {
    const list = document.getElementById('injury-list');
    if (!list) return;
    if (injuries.length === 0) {
        list.innerHTML = '<p class="placeholder-text">Немає активних травм.</p>';
        return;
    }
    list.innerHTML = injuries.map(i => `
        <div style="border-left: 3px solid #FFC72C; padding-left: 10px; margin-bottom: 10px; background: #111; padding: 10px; border-radius: 5px;">
            <strong style="color: #FFC72C;">${i.location}</strong><br>
            <small>${i.date} | Біль: ${i.pain}/10</small>
        </div>
    `).join('');
}
