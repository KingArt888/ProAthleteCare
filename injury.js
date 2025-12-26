const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedId = null; 

const getToday = () => new Date().toISOString().split('T')[0];

// АВТОРИЗАЦІЯ (як у wellness.js)
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            loadInjuriesFromFirebase();
        } else {
            firebase.auth().signInAnonymously().catch(e => console.error("Auth error:", e));
        }
    });
}

async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        injuries = [];
        snapshot.forEach(doc => injuries.push({ id: doc.id, ...doc.data() }));
        renderInjuryMarkers();
    } catch (e) { console.error("Load error:", e); }
}

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
        
        // ПРИМУСОВО ПОКАЗУЄМО ВІКНО ДОПИСУ
        if (notesSection) notesSection.setAttribute('style', 'display: block !important');
        
        selectedId = null; 
        document.getElementById('injury-form').reset();
        document.getElementById('injury-date').value = getToday();
    };
}

function renderInjuryMarkers() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(injury => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        el.style.cssText = `position: absolute; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; transform: translate(-50%, -50%); cursor: pointer; background-color: #DA3E52; left: ${injury.coordX}%; top: ${injury.coordY}%; z-index: 10;`;

        el.onclick = (e) => {
            e.stopPropagation();
            selectedId = injury.id;
            const notesSection = document.getElementById('notes-section');
            if (notesSection) notesSection.setAttribute('style', 'display: block !important');

            document.getElementById('injury-location').value = injury.location;
            document.getElementById('injury-notes').value = injury.notes || "";
            document.getElementById('injury-date').value = injury.date;
            document.getElementById('coordX').value = injury.coordX;
            document.getElementById('coordY').value = injury.coordY;
            const radio = document.querySelector(`input[name="pain"][value="${injury.pain}"]`);
            if (radio) radio.checked = true;
        };
        container.appendChild(el);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupBodyMap();
    const form = document.getElementById('injury-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            if (!currentUserId) return alert("Авторизація...");
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
                if (selectedId) {
                    await db.collection(INJURY_COLLECTION).doc(selectedId).update(data);
                } else {
                    await db.collection(INJURY_COLLECTION).add(data);
                }
                loadInjuriesFromFirebase();
                alert("Збережено в ProAtletCare!");
            } catch (err) { console.error("Firebase Error:", err); }
        };
    }
});
