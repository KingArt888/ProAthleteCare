// exercise_library.js

const EXERCISE_LIBRARY = {
    
    'Pre-Training': {
        'Mobility': [
            { name: 'Динамічна розтяжка стегна (Hip Circles)', videoKey: 'hip_mob', description: '2x10 на кожну ногу' },
            { name: 'Оберти плечима з гумкою', videoKey: 'band_rot', description: '3x10 вперед/назад' },
            { name: 'Відкриття грудного відділу (T-Spine)', videoKey: 't_spine', description: '2x12, повільно' }
        ],
        'Activation': [
            { name: 'Глюте містки (Glute Bridge)', videoKey: 'g_bridge', description: '3x15, фіксація 2 сек' },
            { name: 'Планка на ліктях (Plank)', videoKey: 'plank', description: '3 підходи по 45-60 сек' },
            { name: 'Бічні підйоми ніг (Side Leg Raise)', videoKey: 'side_lr', description: '2x15 на кожну сторону' }
        ]
    },

    'Main Training': {
        'Legs': [
            { name: 'Присідання зі штангою (Back Squat)', videoKey: 'BSquat', description: '5x5, 75% 1RM' },
            { name: 'Румунська тяга (RDL)', videoKey: 'RDL', description: '3x8, акцент на біцепс стегна' },
            { name: 'Болгарські присідання (BSS)', videoKey: 'BSS', description: '3x10 на кожну ногу, з гантелями' },
            { name: 'Жим ногами (Leg Press)', videoKey: 'LPress', description: '4x12, середнє навантаження' },
            { name: 'Випади назад (Reverse Lunge)', videoKey: 'RevLunge', description: '3x10 на кожну ногу' }
        ],
        'Core': [
            { name: 'Скручування V-up', videoKey: 'v_up', description: '3x15, контрольовано' },
            { name: 'Велосипед (Bicycle Crunch)', videoKey: 'b_crunch', description: '3x20, без ривків' },
            { name: 'Підйом ніг у висі', videoKey: 'leg_raise', description: '3x10-12' }
        ],
        'UpperBody': [
            { name: 'Жим лежачи (Bench Press)', videoKey: 'BP', description: '4x6, 80% 1RM' },
            { name: 'Тяга блоку до пояса (Row)', videoKey: 'row', description: '3x10, середній хват' },
            { name: 'Віджимання на брусах', videoKey: 'dips', description: '3 підходи до відмови' }
        ]
    },

    'Post-Training': {
        'Recovery': [
            { name: 'Статична розтяжка квадрицепсів', videoKey: 'quad_stretch', description: '30 сек на ногу' },
            { name: 'Легке кардіо (велотренажер)', videoKey: 'bike_rec', description: '10 хв, пульс 120-130' }
        ],
        'FoamRolling': [ 
            { name: 'Масаж на ролі: Квадрицепси та згиначі стегна', videoKey: 'roll_quad', description: '2 хв на кожну ногу, повільно' },
            { name: 'Масаж на ролі: Сідничні м’язи (Glutes)', videoKey: 'roll_glute', description: '1.5 хв на кожну сторону' },
            { name: 'Масаж на ролі: Верхня частина спини', videoKey: 'roll_back', description: '2 хв, від лопаток до попереку' },
        ]
    }
};
