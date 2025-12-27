function updateACWRGauge(acwrValue) {
    const needle = document.getElementById('gauge-needle');
    const display = document.getElementById('acwr-value');
    const statusDisplay = document.getElementById('acwr-status');

    if (!needle || !display) return;

    // Розрахунок кута:
    // -90deg = ACWR 0 (Червона зона зліва)
    // -45deg = ACWR 0.8 (Межа недотренованості)
    // 0deg   = ACWR 1.05 (Центр, ідеальна зона)
    // +45deg = ACWR 1.3 (Межа ризику)
    // +90deg = ACWR 2.0+ (Небезпека справа)

    let degree = -90; 

    if (acwrValue <= 0.8) {
        // Зона 0 -> 0.8 займає кут від -90 до -45 (45 градусів)
        degree = -90 + (acwrValue / 0.8) * 45;
    } else if (acwrValue <= 1.3) {
        // Зона 0.8 -> 1.3 займає кут від -45 до +45 (90 градусів) - "Sweet Spot"
        degree = -45 + ((acwrValue - 0.8) / 0.5) * 90;
    } else {
        // Зона 1.3 -> 2.0 займає кут від 45 до 90 (45 градусів)
        degree = 45 + ((acwrValue - 1.3) / 0.7) * 45;
    }

    // Обмеження, щоб стрілка не заходила за горизонт
    const finalDegree = Math.min(95, Math.max(-95, degree));

    // Анімація
    needle.style.transform = `translateX(-50%) rotate(${finalDegree}deg)`;
    
    // Оновлення тексту
    display.textContent = acwrValue.toFixed(2);

    // Логіка статусів та кольорів
    if (statusDisplay) {
        if (acwrValue < 0.8) {
            statusDisplay.textContent = 'НЕДОТРЕНОВАНІСТЬ';
            statusDisplay.className = 'status-warning';
            display.style.color = '#f0ad4e';
        } else if (acwrValue <= 1.3) {
            statusDisplay.textContent = 'ОПТИМАЛЬНА ФОРМА';
            statusDisplay.className = 'status-safe';
            display.style.color = '#5cb85c';
        } else {
            statusDisplay.textContent = 'РИЗИК ТРАВМИ';
            statusDisplay.className = 'status-danger';
            display.style.color = '#d9534f';
        }
    }
}
