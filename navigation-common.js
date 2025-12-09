// navigation-common.js
function setupMenuToggle() {
    const toggleButton = document.getElementById('menu-toggle-button');
    const sidebar = document.getElementById('main-sidebar');

    if (toggleButton && sidebar) {
        toggleButton.addEventListener('click', () => {
            // Використовуємо клас 'active', як визначено в CSS
            sidebar.classList.toggle('active'); 
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupMenuToggle(); 
});
