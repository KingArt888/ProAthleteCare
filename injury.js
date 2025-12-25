// ==========================================================
// ФУНКЦІЇ ДЛЯ INJURY STORY (Multi-user Firebase version)
// ==========================================

const INJURY_COLLECTION = 'injuries';
let currentUser = null; // Тут будемо зберігати дані того, хто увійшов
let injuries = []; 
let selectedInjury = null;
let currentPainChart = null;

// Функція для отримання дати
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

// ----------------------------------------------------------
// 1. АВТОРИЗАЦІЯ ТА ВІДСТЕЖЕННЯ КОРИСТУВАЧА
// ----------------------------------------------------------

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // Користувач увійшов
        currentUser = user;
        console.log("Увійшов користувач:", user.uid);
        loadInjuriesFromFirebase(); // Завантажуємо дані саме цього юзера
    } else {
        // Користувач не увійшов — перенаправляємо на логін або просимо увійти
        console.log("Користувач не авторизований");
        // window.location.href = 'login.html'; // Якщо у вас буде сторінка входу
        alert("Будь ласка, увійдіть у систему, щоб бачити свої дані.");
    }
});

// ----------------------------------------------------------
// 2. РОБОТА З FIREBASE (Фільтрація за UID)
// ----------------------------------------------------------

async function loadInjuriesFromFirebase() {
    if (!currentUser) return;

    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUser.uid) // ФІЛЬТР: тільки мої дані
            .get();

        injuries = [];
        snapshot.forEach(doc => {
            injuries.push({ id: doc.id, ...doc.data() });
        });
        
        renderInjuryMarkers();
        updateAthleteStatus();
        displayAllInjuriesList();
    } catch (error) {
        console.error("Помилка завантаження:", error);
    }
}

async function saveInjuryToFirebase(injuryData) {
    if (!currentUser) return;

    try {
        if (selectedInjury) {
            // Оновлення
            await db.collection(INJURY_COLLECTION).doc(selectedInjury.id).update(injuryData);
        } else {
            // Нова травма з прив'язкою до UID
            await db.collection(INJURY_COLLECTION).add({
                userId: currentUser.uid, // Прив'язуємо до конкретного користувача
                userEmail: currentUser.email,
                ...injuryData,
                status: 'active',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        await loadInjuriesFromFirebase();
    } catch (error) {
        console.error("Помилка збереження:", error);
    }
}

// ----------------------------------------------------------
// 3. УПРАВЛІННЯ КАРТОЮ (Body Map)
// ----------------------------------------------------------

function setupBodyMap() {
    const mapContainer = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    const notesSection = document.getElementById('notes-section');
    const injuryForm = document.getElementById('injury-form');

    if (!mapContainer || !injuryForm) return;

    mapContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('injury-marker')) return;

        const rect = mapContainer.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        marker.style.left = `${x}%`;
        marker.style.top = `${y}%`;
        
        document.getElementById('coordX').value = x.toFixed(2);
        document.getElementById('coordY').value = y.toFixed(2);
        
        selectedInjury = null; 
        injuryForm.reset();
        document.getElementById('injury-date').value = getTodayDateString();
        notesSection.style.display = 'block';
    });

    window.renderInjuryMarkers = function() {
        mapContainer.querySelectorAll('.injury-marker').forEach(m => m.remove());

        injuries.forEach(injury => {
            const el = document.createElement('div');
            el.className = 'injury-marker';
            el.style.left = `${injury.coordX}%`;
            el.style.top = `${injury.coordY}%`;
            
            // Колір: зелений (закрита), золотий (обрана), червоний (активна)
            if (injury.status === 'closed') el.style.backgroundColor = 'rgba(80, 200, 120, 0.7)';
            else if (selectedInjury && selectedInjury.id === injury.id) el.style.backgroundColor = '#FFC72C';
            else el.style.backgroundColor = '#DA3E52';

            el.onclick = (e) => {
                e.stopPropagation();
                selectedInjury = injury;
                displayInjuryDetails(injury);
                renderInjuryMarkers();
            };
            mapContainer.appendChild(el);
        });
    };
}

// ----------------------------------------------------------
// 4. ДЕТАЛІ, ГРАФІК ТА СТАТУС
// ----------------------------------------------------------

function displayInjuryDetails(injury) {
    const detailsContainer = document.getElementById('injury-list');
    const painHistory = injury.painHistory || [];
    const latestPain = painHistory.length > 0 ? painHistory[painHistory.length - 1].pain : injury.pain;

    detailsContainer.innerHTML = `
        <div class="injury-detail-card" style="padding:15px; background:#111; border:1px solid #333; border-radius:8px;">
            <h3 style="color:#FFC72C; margin:0;">${injury.location}</h3>
            <p>Статус: <strong>${injury.status === 'active' ? 'Активна' : 'Закрита'}</strong></p>
            <p>Біль: <span style="color:#DA3E52; font-weight:bold;">${latestPain}/10</span></p>
            <p style="font-style:italic; color:#888;">${injury.notes || ''}</p>
            <button class="gold-button" onclick="toggleInjuryStatus('${injury.id}')" style="width:100%;">
                ${injury.status === 'active' ? 'Закрити лікування' : 'Відновити кейс'}
            </button>
        </div>
    `;

    renderPainChart(painHistory, injury.location);
}

async function toggleInjuryStatus(id) {
    const injury = injuries.find(i => i.id === id);
    const newStatus = injury.status === 'active' ? 'closed' : 'active';
    await db.collection(INJURY_COLLECTION).doc(id).update({ status: newStatus });
    await loadInjuriesFromFirebase();
}

function renderPainChart(history, location) {
    const ctx = document.getElementById('painChart').getContext('2d');
    if (currentPainChart) currentPainChart.destroy();

    currentPainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: history.map(h => h.date),
            datasets: [{
                label: `Біль: ${location}`,
                data: history.map(h => h.pain),
                borderColor: '#FFC72C',
                backgroundColor: 'rgba(255, 199, 44, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            scales: {
                y: { min: 0, max: 10, ticks: { color: '#fff' } },
                x: { ticks: { color: '#fff' } }
            },
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });
}

function updateAthleteStatus() {
    const isActive = injuries.some(i => i.status === 'active');
    const statusEl = document.getElementById('athlete-status-display');
    if (statusEl) {
        statusEl.innerHTML = isActive 
            ? `Статус: <span style="color:#FFC72C">Відновлення 🩹</span>` 
            : `Статус: <span style="color:#50C878">Здоровий 💪</span>`;
    }
}

function displayAllInjuriesList() {
    const container = document.getElementById('injury-list-all');
    if (!container) return;
    container.innerHTML = injuries.map(i => `
        <div style="padding:8px; border-bottom:1px solid #222; font-size:0.9em;">
            <span style="color:${i.status === 'active' ? '#DA3E52' : '#50C878'}">●</span> ${i.location} (${i.date})
        </div>
    `).join('');
}

// ----------------------------------------------------------
// 5. ІНІЦІАЛІЗАЦІЯ
// ----------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    setupBodyMap();
    
    const form = document.getElementById('injury-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            if (!currentUser) { alert("Будь ласка, увійдіть!"); return; }

            const pain = document.querySelector('input[name="pain"]:checked').value;
            const date = document.getElementById('injury-date').value;
            
            const data = {
                location: document.getElementById('injury-location').value,
                date: date,
                pain: pain,
                notes: document.getElementById('injury-notes').value,
                coordX: document.getElementById('coordX').value,
                coordY: document.getElementById('coordY').value,
                painHistory: selectedInjury 
                    ? [...(selectedInjury.painHistory || []), { date, pain }]
                    : [{ date, pain }]
            };

            await saveInjuryToFirebase(data);
            alert("Збережено!");
            form.reset();
        };
    }
});
