// exercise_library.js
// ... (початок файлу) ...

// =========================================================
// НОВИЙ РОЗДІЛ: ЯКОСТІ НАВАНТАЖЕННЯ ДЛЯ ФІЛЬТРАЦІЇ
// =========================================================
const QUALITIES = [
    'Strength',
    'Endurance',
    'Speed',
    'Power',
    'Mobility',
    'Activation',
    'Recovery',
    'Other'
];

const EXERCISE_LIBRARY = {
    
    // =========================================================
    // 1. PRE-TRAINING (ПЕРЕДТРЕНУВАЛЬНА ПІДГОТОВКА)
    // =========================================================
    "Pre-Training": {
        // ДОДАЄМО ПОЛЕ 'qualities'
        "Mobility": { 
             qualities: ['Mobility'], 
             exercises: [
                 { name: "Обертання у кульшовому суглобі (Hip Circles)", description: "...", videoKey: "hip_circles_v1" },
                 { name: "Кішка-Корова (Cat-Cow Stretch)", description: "...", videoKey: "cat_cow_v1" },
                 // ... інші вправи
             ]
        },
        "Activation": {
             qualities: ['Activation'],
             exercises: [
                 { name: "Сідничний місток (Glute Bridge)", description: "...", videoKey: "glute_bridge_v1" },
                 { name: "Планка з дотягуванням (Shoulder Taps)", description: "...", videoKey: "shoulder_taps_v1" },
                 // ... інші вправи
             ]
        }
    },

    // =========================================================
    // 2. MAIN TRAINING (ОСНОВНЕ ТРЕНУВАННЯ)
    // =========================================================
    "Main Training": {
        "Legs": {
             qualities: ['Strength', 'Power', 'Endurance'],
             exercises: [
                 { name: "Присідання зі штангою (Back Squat)", description: "...", videoKey: "back_squat_v1" },
                 { name: "Румунська тяга з гантелями (RDL)", description: "...", videoKey: "rdl_dumbbell_v1" },
                 // ... інші вправи
             ]
        },
        "Core": {
             qualities: ['Strength', 'Endurance'],
             exercises: [
                 { name: "Скручування 'Велосипед' (Bicycle Crunch)", description: "...", videoKey: "bicycle_crunch_v1" },
                 { name: "Планка на ліктях (Elbow Plank)", description: "...", videoKey: "plank_elbow_v1" },
                 // ... інші вправи
             ]
        },
        "UpperBody": {
             qualities: ['Strength', 'Endurance'],
             exercises: [
                 { name: "Жим лежачи (Bench Press)", description: "...", videoKey: "bench_press_v1" },
                 { name: "Тяга гантелей в нахилі (Dumbbell Row)", description: "...", videoKey: "dumbbell_row_v1" },
                 // ... інші вправи
             ]
        }
    },

    // =========================================================
    // 3. POST-TRAINING (ПІСЛЯТРЕНУВАЛЬНЕ ВІДНОВЛЕННЯ)
    // =========================================================
    "Post-Training": {
        "Recovery": {
             qualities: ['Recovery', 'Mobility'],
             exercises: [
                 { name: "Розтяжка згиначів стегна (Hip Flexor Stretch)", description: "...", videoKey: "hip_flexor_stretch_v1" },
                 // ... інші вправи
             ]
        },
        "FoamRolling": {
             qualities: ['Recovery'],
             exercises: [
                 { name: "Рол для квадрицепсів", description: "...", videoKey: "foam_quads_v1" },
                 // ... інші вправи
             ]
        }
    }
};

// Вам потрібно буде перенести всі ваші вправи з масивів Mobility, Activation, Legs, Core, UpperBody, Recovery, FoamRolling 
// в нові структури: EXERCISE_LIBRARY[...][category].exercises. 
// Також, в кожному розділі, де є вправи, замінити:
// "Mobility": [ ... ] 
// НА:
// "Mobility": { qualities: ['Mobility'], exercises: [ ... ] },
