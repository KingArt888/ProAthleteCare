// ФУНКЦІЇ ДЛЯ INJURY STORY (injury.html)
// ==========================================================

// Функція-хелпер для отримання поточної дати у форматі YYYY-MM-DD
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

// Ініціалізація або отримання даних травм
let injuries = JSON.parse(localStorage.getItem('athleteInjuries')) || [];
let selectedInjury = null;
let currentPainChart = null; // Змінна для зберігання об'єкта Chart.js

function saveInjuries() {
    localStorage.setItem('athleteInjuries', JSON.stringify(injuries));
}

// ----------------------------------------------------------
// ЛОГІКА КАРТИ ТРАВМ
// ----------------------------------------------------------
function setupBodyMap() {
    const mapContainer = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    const coordXInput = document.getElementById('coordX');
    const coordYInput = document.getElementById('coordY');
    const notesSection = document.getElementById('notes-section');
    const injuryForm = document.getElementById('injury-form');
    const injuryLocationInput = document.getElementById('injury-location');

    // Якщо ключових елементів немає, виходимо
    if (!mapContainer || !injuryForm || !marker) return;


    // 1. Обробка кліку на карту (встановлення місця травми)
    mapContainer.addEventListener('click', function(e) {
        
        // Перевіряємо, чи клікнули саме на зображення або контейнер, а не на вже існуючий маркер
        if (e.target.classList.contains('injury-marker')) return; 

        const rect = mapContainer.getBoundingClientRect();
        const x = e.clientX - rect.left; 
        const y = e.clientY - rect.top;

        // Перетворюємо у відсотки для адаптивності
        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;

        // Позиціонуємо червоний обідок (візуальний фідбек)
        marker.style.left = `${xPercent}%`;
        marker.style.top = `${yPercent}%`;
        
        // Відображаємо місце для нотаток
        notesSection.style.display = 'block';

        // Зберігаємо координати у приховані поля форми
        coordXInput.value = xPercent.toFixed(2);
        coordYInput.value = yPercent.toFixed(2);
        
        // Скидаємо вибір поточної травми для створення нової
        selectedInjury = null; 
        injuryForm.reset(); // Скидаємо форму
        document.getElementById('injury-date').value = getTodayDateString(); // Встановлюємо сьогоднішню дату
        document.getElementById('injury-notes').value = '';
        
        renderInjuryMarkers(); // Оновлюємо відображення маркерів
    });

    // 2. Рендеринг збережених маркерів та їх функціональність
    function renderInjuryMarkers() {
        // Видаляємо всі існуючі маркери травм
        mapContainer.querySelectorAll('.injury-marker').forEach(m => m.remove());

        injuries.forEach((injury) => {
            const injuryEl = document.createElement('div');
            injuryEl.classList.add('injury-marker');
            injuryEl.style.left = `${injury.coordX}%`;
            injuryEl.style.top = `${injury.coordY}%`;
            
            // Встановлюємо клас, якщо травма обрана
            if (selectedInjury && selectedInjury.id === injury.id) {
                 injuryEl.style.backgroundColor = '#FFC72C'; // Виділення золотим
                 injuryEl.style.width = '16px';
                 injuryEl.style.height = '16px';
            }

            // Додаємо інформацію про травму при наведенні
            const latestPain = injury.painHistory.length > 0 ? injury.painHistory[injury.painHistory.length - 1].pain : injury.pain;
            injuryEl.title = `${injury.location} (${injury.date})\nОстанній біль: ${latestPain}/10`;
            
            // Обробка кліку на збережений маркер
            injuryEl.addEventListener('click', function(e) {
                e.stopPropagation(); // Запобігаємо спрацюванню кліку на карту
                selectedInjury = injury;
                displayInjuryDetails(injury);
                renderInjuryMarkers(); // Оновлюємо виділення
                
                // Переміщуємо червоний обідок на місце обраної травми
                marker.style.left = `${injury.coordX}%`;
                marker.style.top = `${injury.coordY}%`;
            });

            mapContainer.appendChild(injuryEl);
        });
    }

    // 3. Відображення деталей травми (при кліку на маркер)
    function displayInjuryDetails(injury) {
        const listContainer = document.getElementById('injury-list');
        const latestPain = injury.painHistory.length > 0 ? injury.painHistory[injury.painHistory.length - 1].pain : injury.pain;
        
        listContainer.innerHTML = `
            <div style="padding: 10px; border: 1px solid #333; border-radius: 6px;">
                <h3>${injury.location}</h3>
                <p><strong>Дата початку:</strong> ${injury.date}</p>
                <p><strong>Поточний біль:</strong> <span style="color:#DA3E52; font-weight:bold;">${latestPain}</span>/10</p>
                <p style="font-style: italic;">"${injury.notes || 'Опис відсутній.'}"</p>
            </div>
        `;
        
        // Оновлюємо форму для ОНОВЛЕННЯ болю
        document.getElementById('injury-date').value = injury.date;
        injuryLocationInput.value = injury.location;
        document.getElementById('injury-notes').value = injury.notes;
        coordXInput.value = injury.coordX;
        coordYInput.value = injury.coordY;
        
        // Встановлюємо поточний рівень болю у формі
        const painRatingEl = document.getElementById('pain-rating-group').querySelector(`input[value="${latestPain}"]`);
        if (painRatingEl) painRatingEl.checked = true;

        notesSection.style.display = 'block';

        renderPainChart(); 
    }

    // 4. Обробка відправки форми (додавання/оновлення)
    injuryForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const currentPain = document.querySelector('input[name="pain"]:checked').value;
        const today = getTodayDateString();

        const newInjuryData = {
            date: document.getElementById('injury-date').value,
            location: injuryLocationInput.value,
            pain: currentPain,
            coordX: coordXInput.value,
            coordY: coordYInput.value,
            notes: document.getElementById('injury-notes').value,
        };
        
        if (!newInjuryData.coordX || !newInjuryData.coordY) {
            alert("Будь ласка, клікніть на силует, щоб відмітити місце травми.");
            return;
        }

        if (selectedInjury) {
            // ОНОВЛЕННЯ СТАРОЇ ТРАВМИ (оновлюємо деталі та біль)
            const index = injuries.findIndex(i => i.id === selectedInjury.id);
            
            let updatedPainHistory = selectedInjury.painHistory || [];
            
            // Якщо сьогоднішня дата вже є, не додаємо, інакше додаємо новий запис
            if (!updatedPainHistory.some(h => h.date === today)) {
                updatedPainHistory.push({ date: today, pain: currentPain });
            } else {
                // Якщо є, оновлюємо бал
                updatedPainHistory = updatedPainHistory.map(h => h.date === today ? { ...h, pain: currentPain } : h);
            }
            
            injuries[index] = { 
                ...selectedInjury, 
                ...newInjuryData,
                id: selectedInjury.id,
                painHistory: updatedPainHistory.sort((a, b) => new Date(a.date) - new Date(b.date))
            };
            
            alert(`Травма "${newInjuryData.location}" оновлена!`);

        } else {
            // СТВОРЕННЯ НОВОЇ ТРАВМИ
            const newInjury = {
                ...newInjuryData,
                id: Date.now(), 
                painHistory: [{ date: newInjuryData.date, pain: newInjuryData.pain }] 
            };
            injuries.push(newInjury);
            alert(`Нова травма "${newInjuryData.location}" збережена!`);
        }

        saveInjuries();
        renderInjuryMarkers();
        injuryForm.reset();
        notesSection.style.display = 'none';
        
        // Переміщуємо червоний обідок назад
        marker.style.left = '-100px';
        marker.style.top = '-100px';

        displayInjuryList();
        selectedInjury = null; 
    });

    // 5. Відображення списку усіх травм
    function displayInjuryList() {
        const listContainer = document.getElementById('injury-list');
        if (injuries.length === 0) {
            listContainer.innerHTML = '<p class="placeholder-text">Історія травм порожня. Додайте першу травму!</p>';
            return;
        }

        let html = injuries.map(injury => {
            const latestPain = injury.painHistory.length > 0 ? injury.painHistory[injury.painHistory.length - 1].pain : injury.pain;
            return `
                <div class="injury-item" style="padding: 10px; border-bottom: 1px dashed #333; cursor: pointer;" data-id="${injury.id}">
                    <p style="color: #FFC72C; font-weight: bold; margin: 0;">${injury.location} (${injury.date})</p>
                    <p style="margin: 0; font-size: 0.9em;">Поточний біль: <span style="color:#DA3E52;">${latestPain}</span>/10 | Записів: ${injury.painHistory.length}</p>
                </div>
            `;
        }).join('');

        listContainer.innerHTML = html;
        
        // Додаємо обробники кліків до елементів списку
        listContainer.querySelectorAll('.injury-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.getAttribute('data-id'));
                selectedInjury = injuries.find(i => i.id === id);
                displayInjuryDetails(selectedInjury);
                renderInjuryMarkers();
            });
        });
    }

    // 6. Функція для відображення графіка болю
    function renderPainChart() {
        const ctx = document.getElementById('painChart');
        if (!selectedInjury || !ctx) {
            if (currentPainChart) currentPainChart.destroy();
            ctx.parentNode.innerHTML = '<p class="placeholder-text">Оберіть травму для перегляду динаміки.</p>';
            return;
        }

        if (currentPainChart) currentPainChart.destroy();

        const painData = selectedInjury.painHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const data = {
            labels: painData.map(d => d.date),
            datasets: [{
                label: `Біль "${selectedInjury.location}"`,
                data: painData.map(d => parseInt(d.pain)),
                borderColor: 'rgb(218, 62, 82)', 
                backgroundColor: 'rgba(218, 62, 82, 0.4)',
                tension: 0.3,
                fill: true
            }]
        };

        const config = {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { min: 1, max: 10, ticks: { stepSize: 1, color: '#CCCCCC' }, grid: { color: '#333333' } },
                    x: { ticks: { color: '#CCCCCC' }, grid: { color: '#333333' } }
                },
                plugins: {
                    legend: { labels: { color: '#CCCCCC' } },
                    title: { display: false }
                }
            }
        };

        currentPainChart = new Chart(ctx, config);
    }
    
    // Початкова ініціалізація сторінки
    document.getElementById('injury-date').value = getTodayDateString();
    displayInjuryList();
    renderInjuryMarkers();
}


// ==========================================================
// ОСНОВНА ІНІЦІАЛІЗАЦІЯ (Додайте логіку для Wellness тут)
// ==========================================================

document.addEventListener('DOMContentLoaded', function() {
    // ... Ваш існуючий код ініціалізації Wellness Control ...
    
    // Ініціалізація Injury Story
    if (window.location.pathname.split('/').pop() === 'injury.html') {
        setupBodyMap();
    }
    
});
