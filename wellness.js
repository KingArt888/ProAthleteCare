// ==============================================
// 4. АКТИВАЦІЯ ФУНКЦІОНАЛУ Wellness 
// ==============================================
document.addEventListener('DOMContentLoaded', function() {
    
    // currentPath використовується для перевірки, чи ми на правильній сторінці
    // У HTML ви використовуєте 'wellness.html' (це правильно)
    const currentPath = window.location.pathname.split('/').pop().split('?')[0]; 

    if (currentPath === 'wellness.html') {
        
        // Ініціалізуємо графіки з наявними даними
        initCharts();
        
        // Перевірка обмеження при завантаженні сторінки
        checkDailyRestriction();

        const form = document.getElementById('wellness-form');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Перевірка, чи форма вже відправлена сьогодні
                if (checkDailyRestriction()) {
                    return;
                }
                
                // --- ВАЛІДАЦІЯ ---
                const requiredRatings = form.querySelectorAll('.rating-group');
                let allChecked = true;
                requiredRatings.forEach(group => {
                    if (!group.querySelector('input:checked')) {
                        allChecked = false;
                    }
                });

                if (!allChecked) {
                    alert("Будь ласка, заповніть усі 6 точок даних перед відправкою.");
                    return;
                }
                
                // --- ЛОГІКА ЗБЕРЕЖЕННЯ ---
                
                const submissionData = {};
                form.querySelectorAll('input[type="radio"]:checked').forEach(input => {
                    // !!! ВАЖЛИВО: Перетворюємо значення на число
                    submissionData[input.name] = parseInt(input.value, 10);
                });
                
                const todayDate = getTodayDateString();
                
                // 1. Зберігаємо дані в історію
                saveWellnessHistory(todayDate, submissionData);
                // 2. Зберігаємо дату останньої відправки
                localStorage.setItem('lastWellnessSubmissionDate', todayDate);
                
                // *** ВИПРАВЛЕННЯ ДЛЯ МОБІЛЬНИХ ГРАФІКІВ: Використовуємо затримку 100мс ***
                // Це дає браузеру час оновити DOM після подання форми, 
                // що критично для коректного відображення Chart.js на малих екранах.
                setTimeout(() => {
                    initCharts(); 
                    checkDailyRestriction();
                    alert("Ваші дані Wellness успішно записані!");
                }, 100);
            });
        }
    }
});
