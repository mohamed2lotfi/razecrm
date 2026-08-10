-- ==============================================================================
-- SCRIPT DE MIGRATION : ENRICHISSEMENT DE LA TABLE HOTELS (MASTER DATA)
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- ==============================================================================

-- 1. Ajout des nouvelles colonnes à la table public.hotels
ALTER TABLE public.hotels 
ADD COLUMN IF NOT EXISTS nom_ar TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT,
ADD COLUMN IF NOT EXISTS petit_dejeuner BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS image TEXT,
ADD COLUMN IF NOT EXISTS gallery TEXT[],
ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS distance_metres INTEGER,
ADD COLUMN IF NOT EXISTS temps_marche TEXT,
ADD COLUMN IF NOT EXISTS porte_proche TEXT,
ADD COLUMN IF NOT EXISTS vue_haram BOOLEAN DEFAULT false;

-- 2. Activation de la sécurité RLS et permissions
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture hotels pour tous" ON public.hotels;
DROP POLICY IF EXISTS "Modification hotels pour authentifies" ON public.hotels;

CREATE POLICY "Lecture hotels pour tous" ON public.hotels
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Modification hotels pour authentifies" ON public.hotels
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Nettoyage des anciens hôtels de test et insertion des hôtels officiels de l'Agence El-Mokhtar
DELETE FROM public.hotels WHERE nom ILIKE '%Fairmont%' OR nom ILIKE '%Pullman%' OR nom ILIKE '%Swissôtel%';

-- Hôtels La Mecque (Mecca)
INSERT INTO public.hotels (
    nom, nom_ar, description, description_ar, 
    location, nbr_etoiles, petit_dejeuner, 
    lat, lng, distance_metres, temps_marche, porte_proche, vue_haram, 
    image, gallery
) VALUES 
(
    'Hôtel Shada Makkah (Tilal)',
    'فندق شدا مكة (تلال)',
    'Hôtel contemporain et raffiné situé à seulement 150 mètres du parvis sacré du Haram, garantissant confort moderne et accès ultra-rapide aux prières.',
    'فندق أنيق وراقٍ يقع على بعد 150 متراً فقط من ساحات الحرم المكي الشريف، يوفر راحة تامة وسرعة وصول فائقة للصلوات.',
    'mecca',
    '4',
    true,
    21.4195,
    39.8272,
    150,
    '2 à 3 min à pied',
    'Porte Roi Abdulaziz & Esplanade Ajyad',
    true,
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    ARRAY[
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'
    ]
),
(
    'Hôtel Fajr Al Nusuk Ajyad (Ex: Lou''louat Al Sharq)',
    'فندق فجر النسك أجياد (لؤلؤة الشرق)',
    'Hôtel très apprécié situé dans la rue Ajyad Al Masafi, réputé pour sa propreté et son accès piéton direct sans navette vers le parvis.',
    'فندق معروف ومفضل في شارع أجياد المصافي، يتميز بالنظافة وحسن الاستقبال وسهولة الوصول إلى الحرم سيراً على الأقدام دون الحاجة لمواصلات.',
    'mecca',
    '4',
    true,
    21.4168,
    39.8296,
    450,
    '6 à 7 min à pied',
    'Rue Ajyad Al Masafi & Porte Ajyad',
    false,
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    ARRAY[
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80'
    ]
),
(
    'Hôtel Abraj Al Nawazi',
    'فندق أبراج النوازي',
    'Grand complexe hôtelier idéal pour les familles et groupes, offrant d''excellents tarifs avec service de navette continue 24h/24 vers le Haram.',
    'مجمع فندقي فسيح يتميز بغرفه الواسعة وخدماته العائلية وأسعاره التنافسية مع توفر حافلات نقل منتظمة إلى ساحات الحرم.',
    'mecca',
    '4',
    false,
    21.4132,
    39.8288,
    800,
    '10 à 12 min (ou navette 24h/24)',
    'Ajyad & Navettes directes Haram',
    false,
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    ARRAY[
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80'
    ]
);

-- Hôtels Médine (Medina)
INSERT INTO public.hotels (
    nom, nom_ar, description, description_ar, 
    location, nbr_etoiles, petit_dejeuner, 
    lat, lng, distance_metres, temps_marche, porte_proche, vue_haram, 
    image, gallery
) VALUES 
(
    'Dar Al Taqwa Hotel Madinah',
    'فندق دار التقوى المدينة المنورة',
    'Hôtel de prestige à Médine situé directement face à l''esplanade nord de la Mosquée du Prophète (ﷺ) avec vue sur le Dôme Vert.',
    'أحد أفخم فنادق المدينة المنورة على الإطلاق، يقع مباشرة أمام الساحة الشمالية للمسجد النبوي الشريف وبإطلالة على القبة الخضراء.',
    'medina',
    '5',
    true,
    24.4705,
    39.6118,
    0,
    '1 min à pied (Face au parvis)',
    'Porte des Femmes & Bab Al-Salam',
    true,
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80',
    ARRAY[
        'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'
    ]
),
(
    'The Oberoi Madinah',
    'فندق أوبروي المدينة المنورة',
    'Service princier 5 étoiles et emplacement exceptionnel à 50 mètres de la cour nord de la Mosquée du Prophète.',
    'خدمة ملكية رفيعة المستوى وموقع استثنائي يجعل أداء الصلوات في المسجد النبوي غاية في اليسر على بعد 50 متراً.',
    'medina',
    '5',
    true,
    24.4712,
    39.6110,
    50,
    '1 min à pied',
    'Cour Nord du Haram',
    true,
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
    ARRAY[
        'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80'
    ]
),
(
    'Anwar Al Madinah Mövenpick',
    'فندق أنوار المدينة موفنبيك',
    'Le plus grand complexe hôtelier de Médine avec accès direct au parvis, ascenseurs dédiés et centre commercial.',
    'أكبر مجمع فندقي متكامل في المدينة المنورة مع مصاعد مباشرة إلى ساحات الحرم ومركز تسوق متكامل.',
    'medina',
    '5',
    true,
    24.4715,
    39.6095,
    80,
    '2 min à pied',
    'Porte Roi Fahd',
    true,
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    ARRAY[
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80'
    ]
);
