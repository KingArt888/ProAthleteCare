// navigation-common.js
function setupMenuToggle() {
    const toggleButton = document.getElementById('menu-toggle-button');
    // Ми додали ID="main-sidebar" в HTML, тому шукаємо по ньому:
    const finalSidebar = document.getElementById('main-sidebar'); 
    
    // КРИТИЧНА ПЕРЕВІРКА
    if (toggleButton && finalSidebar) {
        toggleButton.addEventListener('click', (event) => {
            // ... (Ваша логіка перемикання класів)
            finalSidebar.classList.toggle('active');
            
            // ... (Логіка зміни іконки)
            if (finalSidebar.classList.contains('active')) {
                toggleButton.textContent = '✕';
            } else {
                toggleButton.textContent = '☰';
            }
        });
        
        // ... (Ваша логіка закриття по кліку поза меню)
    }
}
// Викликається після завантаження DOM
document.addEventListener('DOMContentLoaded', () => {
    setupMenuToggle(); // Цей виклик є критичним!
    highlightActiveLink();
});
