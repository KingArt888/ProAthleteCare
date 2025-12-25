const INJURY_COLLECTION = 'injuries';
let currentUser = null;
let injuries = [];
let selectedInjury = null;
let currentPainChart = null;

function getTodayDateString() { return new Date().toISOString().split('T')[0]; }

// Ініціалізація користувача
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadInjuriesFromFirebase();
    } else {
        console.warn("Injury: Користувач не авторизований");
    }
});

async function loadInjuriesFromFirebase() {
    if (!currentUser) return;
    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUser.uid)
            .get();
        injuries = [];
        snapshot.forEach(doc => injuries.push({ id: doc.id, ...doc.data() }));
        renderInjuryMarkers();
        updateAthleteStatus();
    } catch (e) { console.error(e); }
}

async function saveInjuryToFirebase(data) {
    if (!currentUser) return;
    try {
        if (selectedInjury) {
            await db.collection(INJURY_COLLECTION).doc(selectedInjury.id).update(data);
        } else {
            await db.collection(INJURY_COLLECTION).add({
                userId: currentUser.uid,
                ...data,
                status: 'active',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        await loadInjuriesFromFirebase();
    } catch (e) { console.error(e); }
}

async function deleteInjury(id) {
    if (!confirm("Видалити цю травму назавжди?")) return;
    await db.collection(INJURY_COLLECTION).doc(id).delete();
    location.reload();
}

function setupBodyMap() {
    const map = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    if (!map) return;

    map.addEventListener('click', (e) => {
        if (e.target.classList.contains('injury-marker')) return;
        const rect = map.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        marker.style.left = `${x}%`;
        marker.style.top = `${y}%`;
        document.getElementById('coordX').value = x.toFixed(2);
        document.getElementById('coordY').value = y.toFixed(2);
        
        selectedInjury = null;
        document.getElementById('injury-form').reset();
    });
}

function renderInjuryMarkers() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(injury => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        el.style.cssText = `position:absolute; width:12px; height:12px; border-radius:50%; border:2px solid white; transform:translate(-50%,-50%); cursor:pointer;`;
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

function displayInjuryDetails(injury) {
    const list = document.getElementById('injury-list');
    if (!list) return;

    list.innerHTML = `
        <div class="injury-info-box" style="background:#111; padding:15px; border-radius:8px; border-left:4px solid #FFC72C;">
            <h4 style="color:#FFC72C; margin:0;">${injury.location}</h4>
            <p>Статус: <strong>${injury.status === 'active' ? 'Активна' : 'Закрита'}</strong></p>
            <button onclick="deleteInjury('${injury.id}')" style="background:#DA3E52; color:white; border:none; padding:5px; cursor:pointer; border-radius:4px; margin-top:10px;">Видалити кейс</button>
        </div>
    `;
    renderPainChart(injury.painHistory || [], injury.location);
}

function renderPainChart(history, location) {
    const ctx = document.getElementById('painChart')?.getContext('2d');
    if (!ctx) return;
    if (currentPainChart) currentPainChart.destroy();
    currentPainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: history.map(h => h.date),
            datasets: [{ label: location, data: history.map(h => h.pain), borderColor: '#FFC72C', fill: true }]
        },
        options: { scales: { y: { min: 0, max: 10, ticks: { color: '#fff' } }, x: { ticks: { color: '#fff' } } } }
    });
}

function updateAthleteStatus() {
    const el = document.getElementById('athlete-status-display');
    if (!el) return;
    const active = injuries.some(i => i.status === 'active');
    el.innerHTML = active ? `Статус: <span style="color:#FFC72C">Відновлення</span>` : `Статус: <span style="color:#50C878">Здоровий</span>`;
}

document.addEventListener('DOMContentLoaded', () => {
    setupBodyMap();
    const form = document.getElementById('injury-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const pain = form.querySelector('input[name="pain"]:checked')?.value;
            const date = document.getElementById('injury-date').value;
            const data = {
                location: document.getElementById('injury-location').value,
                date: date,
                pain: pain,
                notes: document.getElementById('injury-notes').value,
                coordX: document.getElementById('coordX').value,
                coordY: document.getElementById('coordY').value,
                painHistory: selectedInjury ? [...(selectedInjury.painHistory || []), {date, pain}] : [{date, pain}]
            };
            await saveInjuryToFirebase(data);
            alert("Дані оновлено!");
            location.reload();
        };
    }
});
