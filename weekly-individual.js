// =========================================================
// weekly-individual.js - V22.1 (ПОВНИЙ КОД)
// =========================================================

const STORAGE_KEY = 'weeklyPlanData';
const COLOR_MAP = {
    'MD': { status: 'MD', colorClass: 'color-red' },
    'MD+1': { status: 'MD+1', colorClass: 'color-dark-green' }, 
    'MD+2': { status: 'MD+2', colorClass: 'color-green' }, 
    'MD+3': { status: 'MD+3', colorClass: 'color-neutral' }, 
    'MD-1': { status: 'MD-1', colorClass: 'color-yellow' }, 
    'MD-2': { status: 'MD-2', colorClass: 'color-deep-green' }, 
    'MD-3': { status: 'MD-3', colorClass: 'color-orange' }, 
    'MD-4': { status: 'MD-4', colorClass: 'color-blue' }, 
    'REST': { status: 'REST', colorClass: 'color-neutral' }, 
    'TRAIN': { status: 'TRAIN', colorClass: 'color-neutral' },
};

document.addEventListener('DOMContentLoaded', () => {
    
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dynamicMatchFields = document.getElementById('dynamic-match-fields');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    const form = document.getElementById('weekly-plan-form');
    const saveButton = document.querySelector('.save-button'); 

    if (activitySelects.length === 0 || dayCells.length === 0 || !form) {
        console.error("Помилка: Не знайдено необхідних елементів таблиці або форми.");
        return; 
    }

    // =========================================================
    // ФУНКЦІЯ: ІНІЦІАЛІЗАЦІЯ ШАБЛОНІВ (V22.1 - Професійний Список)
    // =========================================================
    function initializeTemplates() {
        const templates = [
            { name: 'tasks_md_plus_2', defaultText: 
                `**Фаза: Поглиблене Відновлення (MD+2)**
- **Самомасаж (Ролінг/Перкусія):** 10 хв (фокус на квадрицепси, сідниці, спина).
- **Мобілізація суглобів:** 15 хв (комплекс на гомілкостоп, тазостегновий суглоб).
- **Легкий Стретчинг (статичний):** 15 хв.
- **Гідратація:** Посилений контроль водного балансу.`
            },
            { name: 'tasks_md_plus_1', defaultText: 
                `**Фаза: Активне Відновлення (MD+1)**
- **Кардіо в легкій зоні (LSD):** 20-30 хв (пульс 120-130 уд/хв) або велотренажер.
- **Превентивні вправи:** 15 хв (зміцнення CORE та ротаторної манжети).
- **Робота з м'ячем (легка):** Індивідуальні технічні елементи (30 хв).
- **Харчування:** Підвищене споживання білка та вуглеводів.`
            },
            { name: 'tasks_md_minus_4', defaultText: 
                `**Фаза: Силовий Розвиток (MD-4)**
- **Силова активація:** 10 хв (динамічна розминка, активація сідничних м'язів).
- **Тренування в залі (MAX Load):** 45-60 хв. Фокус на **максимальну/вибухову силу** ніг.
- **Пліометрика:** 3-5 сетів, 5 повторень (боксові стрибки/бар'єри).`
            },
            { name: 'tasks_md_minus_3', defaultText: 
                `**Фаза: Розвиток CORE та Швидкості (MD-3)**
- **CORE-тренування (функціональне):** 20 хв (планки, анти-ротаційні вправи).
- **Швидкість (Спринти):** 5-7 x 30 м (95-100% інтенсивності), **повне відновлення**.
- **Координація:** 10 хв (координаційні драбини).`
            },
            { name: 'tasks_md_minus_2', defaultText: 
                `**Фаза: Спеціальна Сила/Витривалість (MD-2)**
- **Зал (Верх Тіла):** 30 хв (фокус на баланс сили).
- **Ігрові вправи:** Середня/Висока інтенсивність, фокус на **командну тактику/витривалість**.
- **Ролінг:** 10 хв (для підтримки еластичності).`
            },
            { name: 'tasks_md_minus_1', defaultText: 
                `**Фаза: Передматчева Підготовка (MD-1)**
- **Нейро активація:** 10 хв (сходи, реакція).
- **Легка ігрова розминка:** 30 хв (з акцентом на швидкість).
- **Пріоритет:** Якісний сон та відновлення (мінімум 8 годин).`
            }
        ];

        templates.forEach(template => {
            const textarea = document.querySelector(`textarea[name="${template.name}"]`);
            if (textarea && textarea.value.trim() === '') {
