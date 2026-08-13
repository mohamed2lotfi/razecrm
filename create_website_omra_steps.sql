-- ==============================================================================
-- MIGRATION SCRIPT : TABLE 'website_omra_steps' & STORAGE BUCKET 'website-sliders'
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- ==============================================================================

-- 0. Création du Bucket de stockage public pour les sliders
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'website-sliders', 
    'website-sliders', 
    true, 
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Access website-sliders" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload website-sliders" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update website-sliders" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete website-sliders" ON storage.objects;

CREATE POLICY "Public Access website-sliders" ON storage.objects FOR SELECT TO public USING (bucket_id = 'website-sliders');
CREATE POLICY "Authenticated upload website-sliders" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'website-sliders');
CREATE POLICY "Authenticated update website-sliders" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'website-sliders');
CREATE POLICY "Authenticated delete website-sliders" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'website-sliders');

-- 1. Création de la table website_omra_steps
CREATE TABLE IF NOT EXISTS public.website_omra_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_number VARCHAR(10) NOT NULL, -- '01', '02', ..., '10'
    location_fr TEXT NOT NULL,
    location_ar TEXT NOT NULL,
    location_badge_fr TEXT,
    location_badge_ar TEXT,
    title_fr TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    desc_fr TEXT NOT NULL,
    desc_ar TEXT NOT NULL,
    perks_fr JSONB DEFAULT '[]'::jsonb,
    perks_ar JSONB DEFAULT '[]'::jsonb,
    icon_name VARCHAR(50) DEFAULT 'MapPin',
    images JSONB DEFAULT '[]'::jsonb, -- [{ id, url, title_fr, title_ar, desc_fr, desc_ar }]
    ordre INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_website_omra_steps_ordre ON public.website_omra_steps(ordre);

-- 2. Sécurité RLS
ALTER TABLE public.website_omra_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view website_omra_steps" ON public.website_omra_steps;
CREATE POLICY "Public can view website_omra_steps" 
ON public.website_omra_steps FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage website_omra_steps" ON public.website_omra_steps;
CREATE POLICY "Authenticated users can manage website_omra_steps" 
ON public.website_omra_steps FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3. Données initiales des 10 étapes avec sliders multi-images
INSERT INTO public.website_omra_steps (step_number, ordre, location_fr, location_ar, location_badge_fr, location_badge_ar, title_fr, title_ar, desc_fr, desc_ar, perks_fr, perks_ar, icon_name, images)
VALUES
(
    '01',
    1,
    'Aéroports d''Alger / Oran / Constantine',
    'مطار الجزائر / وهران / قسنطينة',
    'Départ d''Algérie',
    'انطلاق من الجزائر',
    'Départ d''Algérie vers Médine en Vol Direct',
    'الإنطلاق من الجزائر إلى المدينة في رحلة مباشرة',
    'Rendez-vous à l''aéroport avec accueil personnalisé par nos coordinateurs. Assistance complète à l''enregistrement et remise des pochettes de voyage, puis décollage en vol direct sans escale vers l''Aéroport International Prince Mohammad Bin Abdulaziz de Médine.',
    'تجمع المعتمرين في المطار، استقبال من طرف منسقي الوكالة وتسهيل إجراءات التسجيل وتسليم وثائق السفر، ثم الإقلاع في رحلة جوية مريحة ومباشرة دون توقف نحو مطار الأمير محمد بن عبد العزيز بالمدينة المنورة.',
    '["Vol direct sans escale", "Assistance personnalisée à l''aéroport", "Franchise bagages généreuse"]'::jsonb,
    '["رحلة مباشرة بدون ترانزيت", "مرافقة ومساعدة بالمطار", "أمتعة مسموحة سخية"]'::jsonb,
    'Plane',
    '[
        {
            "id": "img-01-1",
            "url": "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Aéroport International d''Alger",
            "title_ar": "مطار الجزائر الدولي",
            "desc_fr": "Accueil VIP et formalités rapides",
            "desc_ar": "استقبال راقٍ وتسهيل إجراءات السفر"
        },
        {
            "id": "img-01-2",
            "url": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Vol Direct Confortable",
            "title_ar": "رحلة جوية مباشرة ومريحة",
            "desc_fr": "Flotte moderne et collation à bord",
            "desc_ar": "أسطول طائرات حديث مع وجبات وضيافة"
        },
        {
            "id": "img-01-3",
            "url": "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Arrivée à Médine Al-Munawwarah",
            "title_ar": "الوصول إلى مطار الأمير محمد بالمدينة",
            "desc_fr": "Accueil chaleureux par l''équipe sur place",
            "desc_ar": "استقبال بالورود وتسهيل نقل الأمتعة"
        }
    ]'::jsonb
),
(
    '02',
    2,
    'Médine — Zone Centrale Markazia',
    'المدينة المنورة — المنطقة المركزية',
    'Masjid An-Nabawi',
    'المسجد النبوي الشريف',
    'Hébergement à Médine à Proximité Immédiate du Haram',
    'الإقامة في المدينة في فنادق قريبة من المسجد النبوي ومختارة بعناية',
    'Arrivée à Médine et transfert privatif vers votre hôtel. Installation dans des chambres raffinées au sein d''hôtels 4★ ou 5★ soigneusement sélectionnés, situés à quelques minutes à pied des portes de la Mosquée du Prophète (ﷺ).',
    'الوصول للمدينة المنورة والانتقال عبر حافلاتنا الخاصة للفندق. التسكين في غرف فاخرة ومجهزة بفنادق 4 و 5 نجوم تبعد خطوات معدودة عن ساحات المسجد النبوي الشريف لأداء الصلوات الخمس بكل راحة وسكينة.',
    '["Accès à pied immédiat (2 à 5 min)", "Hôtels 4★ et 5★ certifiés", "Buffets de petit-déjeuner inclus"]'::jsonb,
    '["قرب فائق من الحرم النبوي", "فنادق 4★ و 5★ مصنفة", "إفطار صباحي راقٍ ومتنوع"]'::jsonb,
    'Hotel',
    '[
        {
            "id": "img-02-1",
            "url": "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Hôtel de Prestige à Médine",
            "title_ar": "فندق راقٍ بالمنطقة المركزية",
            "desc_fr": "Chambres spacieuses à 2 pas du Haram",
            "desc_ar": "غرف فندقية مجهزة بإطلالات مميزة"
        },
        {
            "id": "img-02-2",
            "url": "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Confort & Suites Familiales",
            "title_ar": "أجنحة فندقية عائلية فاخرة",
            "desc_fr": "Service hôtelier d''exception 24h/24",
            "desc_ar": "خدمة غرف ممتازة على مدار الساعة"
        },
        {
            "id": "img-02-3",
            "url": "https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Buffets & Restauration Raffinée",
            "title_ar": "بوفيهات إفطار ومطاعم متنوعة",
            "desc_fr": "Saveurs orientales et internationales",
            "desc_ar": "تشكيلة أطباق لذيذة ومتنوعة"
        }
    ]'::jsonb
),
(
    '03',
    3,
    'Noble Rawdah Ash-Sharifah',
    'الروضة الشريفة — المسجد النبوي',
    'Jardin du Paradis',
    'روضة من رياض الجنة',
    'Prière Sacrée dans la Noble Rawdah & Salutations',
    'الصلاة في الروضة الشريفة والسلام على رسول الله ﷺ',
    'Réservation garantie des créneaux officiels via l''application Nusuk pour chaque pèlerin. Accompagnement spirituel pour prier dans la Noble Rawdah et adresser les salutations au Messager d''Allah (ﷺ) et à ses deux compagnons Abou Bakr et Omar (qu''Allah les agrée).',
    'حجز وتأكيد التصاريح الرسمية عبر منصة ''نسك'' المعتمدة لجميع المعتمرين. مرافقة خاصة للدخول إلى الروضة الشريفة للصلاة في هذا المكان المبارك والسلام على النبي ﷺ وصاحبيه أبي بكر وعمر رضي الله عنهما.',
    '["Permis Nusuk officiel garanti", "Encadrement par nos guides", "Créneaux dédiés hommes & femmes"]'::jsonb,
    '["تصريح نسك رسمي مضمون", "تنظيم وتوجيه روحي للمجموعات", "أوقات مخصصة للرجال والنساء"]'::jsonb,
    'Sparkles',
    '[
        {
            "id": "img-03-1",
            "url": "https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Mosquée du Prophète (ﷺ)",
            "title_ar": "المسجد النبوي الشريف",
            "desc_fr": "Moments de paix et de spiritualité",
            "desc_ar": "أجواء من السكينة والطمأنينة"
        },
        {
            "id": "img-03-2",
            "url": "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "La Noble Rawdah",
            "title_ar": "الروضة الشريفة المباركة",
            "desc_fr": "Prière et invocations exaucées",
            "desc_ar": "الصلاة والسلام على النبي وصاحبيه"
        }
    ]'::jsonb
),
(
    '04',
    4,
    'Quba, Uhud & Palmeraies de Médine',
    'قباء، أحد، والشهداء — المدينة',
    'Ziyarates Médine',
    'مزارات المدينة',
    'Visites Spirituelles & Historiques de Médine',
    'مزارات المدينة المنورة (مسجد قباء، جبل أحد، مقبرة الشهداء، ومزارع التمور)',
    'Circuit guidé en autocar avec nos guides : prière à la Mosquée de Quba (première mosquée bâtie en Islam), halte historique au Mont Uhud et recueillement au Cimetière des Martyrs, suivi de la visite d''une palmeraie réputée pour découvrir et déguster les dattes Ajwa de Médine.',
    'جولة ميدانية مع مرشدينا لزيارة مسجد قباء (أول مسجد أُسس على التقوى) والصلاة فيه، جبل أحد ومقبرة شهداء أحد لاستحضار السيرة النبوية العطرة، تليها زيارة مزرعة تمور نموذجية لشراء وتذوق تمور العجوة المباركة.',
    '["Autocars climatisés grand confort", "Récits historiques par nos imams", "Dégustation & achat de dattes Ajwa"]'::jsonb,
    '["حافلات حديثة ومكيفة للمزارات", "شرح تاريخي وروحي وافٍ", "زيارة مزارع تمور العجوة الأصلية"]'::jsonb,
    'Compass',
    '[
        {
            "id": "img-04-1",
            "url": "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Mosquée de Quba",
            "title_ar": "مسجد قباء المبارك",
            "desc_fr": "Première mosquée de l''Islam",
            "desc_ar": "أول مسجد أُسس على التقوى"
        },
        {
            "id": "img-04-2",
            "url": "https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Mont Uhud & Martyrs",
            "title_ar": "جبل أحد ومقبرة الشهداء",
            "desc_fr": "Recueillement historique et spirituel",
            "desc_ar": "استحضار بطولات الصحابة الكرام"
        },
        {
            "id": "img-04-3",
            "url": "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Palmeraies & Dattes Ajwa",
            "title_ar": "مزارع تمور العجوة بالمدينة",
            "desc_fr": "Dégustation directe de dattes fraîches",
            "desc_ar": "تذوق وشراء أجود أنواع تمور المدينة"
        }
    ]'::jsonb
),
(
    '05',
    5,
    'Route de l''Hégire Médine ➔ La Mecque',
    'طريق الهجرة السريع — نحو مكة',
    'Transfert Grand Confort',
    'تنقل VIP مريح',
    'Transfert vers La Mecque en Autocars Récents VIP',
    'النزول إلى مكة المكرمة في باصات جديدة ومجهزة بأحدث وسائل الراحة',
    'Départ pour La Mecque à bord d''autocars touristiques de dernière génération. Véhicules équipés d''une climatisation performante, de sièges ergonomiques grand confort, de prises USB et d''une distribution de rafraîchissements tout au long du trajet.',
    'الانطلاق نحو العاصمة المقدسة على متن أحدث حافلات النقل السياحي (موديل السنة) المزودة بتكييف عالي الكفاءة، مقاعد وثيرية مريحة قابلة للإمالة، منافذ شحن الهواتف، وتوزيع مياه وعصائر ومأكولات خفيفة طوال الطريق.',
    '["Flotte d''autocars récents", "Sièges inclinables & ports de charge", "Collation & boissons fraîches"]'::jsonb,
    '["أسطول حافلات حديث ومريح", "مقاعد مريحة ومنافذ شحن USB", "توزيع مياه وضيافة خفيفة"]'::jsonb,
    'Bus',
    '[
        {
            "id": "img-05-1",
            "url": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Autocars VIP Grand Tourisme",
            "title_ar": "حافلات سياحية VIP حديثة",
            "desc_fr": "Climatisation intégrale et sièges inclinables",
            "desc_ar": "راحة تامة وتكييف ممتاز طوال الرحلة"
        },
        {
            "id": "img-05-2",
            "url": "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Trajet Médine ➔ Makkah",
            "title_ar": "طريق الهجرة النبوية الشريفة",
            "desc_fr": "Accompagnement et chants spirituels",
            "desc_ar": "أجواء إيمانية مع التلبية والذكر"
        }
    ]'::jsonb
),
(
    '06',
    6,
    'Miqat Dhul Hulayfah (Abiyar Ali)',
    'ميقات ذو الحليفة (آبار علي)',
    'Entrée en Ihram',
    'الإحرام والتلبية',
    'Arrêt Sacré au Miqat Dhul Hulayfah & Entrée en Ihram',
    'التوقف في ميقات ذو الحليفة للإحرام والتلبية',
    'Halte rituelle au Miqat pour accomplir les prières, revêtir la tenue sacrée d''Ihram, formuler solennellement l''intention (Niyyah) de l''Omra avec notre guide, et débuter la récitation collective et fervente de la Talbiyah : « Labbayka Allahumma Labbayk ».',
    'التوقف عند مسجد الميقات للاغتسال والتطيب ولبس ثياب الإحرام للرجال، وعقد نية العمرة جماعياً خلف المرشد الديني مع انطلاق حناجر المعتمرين بالتلبية الموحدة: ''لبيك اللهم لبيك، لبيك لا شريك لك لبيك''.',
    '["Explication détaillée des interdits", "Temps dédié au recueillement", "Talbiyah collective encadrée"]'::jsonb,
    '["توجيه وتذكير بأحكام الإحرام", "وقت كافٍ للصلاة والتجهيز", "تلبية جماعية بصوت موحد"]'::jsonb,
    'Heart',
    '[
        {
            "id": "img-06-1",
            "url": "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Mosquée du Miqat Dhul Hulayfah",
            "title_ar": "مسجد الميقات (ذو الحليفة)",
            "desc_fr": "Lieu de sacralisation pour l''Omra",
            "desc_ar": "عقد النية ولبس الإحرام والتلبية"
        },
        {
            "id": "img-06-2",
            "url": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Émotion & Ferveur de l''Ihram",
            "title_ar": "خشوع وتلبية موحدة",
            "desc_fr": "« Labbayk Allahumma Labbayk »",
            "desc_ar": "لبيك اللهم عمرة لا رياء فيها ولا سُمعة"
        }
    ]'::jsonb
),
(
    '07',
    7,
    'Masjid Al-Haram — La Sainte Kaaba',
    'المسجد الحرام — الكعبة المشرفة',
    'Rituels de l''Omra',
    'أداء مناسك العمرة',
    'Arrivée à La Mecque & Accomplissement de l''Omra',
    'الوصول لمكة المكرمة وأداء مناسك العمرة بمرافقة وإرشاد',
    'Arrivée à La Mecque, installation à l''hôtel, puis entrée au Masjid Al-Haram sous la conduite d''un guide spirituel : Tawaf autour de la Sainte Kaaba, prière derrière le Maqam Ibrahim, eau bénite de Zamzam, Sa''i entre Safa et Marwah et désacralisation (Tahallul).',
    'الوصول إلى مكة وتفريغ الأمتعة بالفندق، ثم التوجه جماعياً تحت قيادة المرشد الديني إلى الحرم المكي لأداء الطواف حول الكعبة المشرفة، ركعتي الطواف خلف مقام إبراهيم، الشرب من ماء زمزم، ثم السعي بين الصفا والمروة والتحلل من الإحرام.',
    '["Accompagnement guidé du Tawaf au Sa''i", "Écoute claire des invocations", "Assistance dédiée aux aînés"]'::jsonb,
    '["مرافقة خطوة بخطوة أثناء الطواف والسعي", "توفير أجهزة صوتية لسماع الأدعية", "مساعدة كبار السن وذوي الاحتياجات"]'::jsonb,
    'Sparkles',
    '[
        {
            "id": "img-07-1",
            "url": "https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "La Sainte Kaaba — Masjid Al-Haram",
            "title_ar": "الكعبة المشرفة والحرم المكي",
            "desc_fr": "Tawaf autour de la Maison Sacrée",
            "desc_ar": "طواف الخشوع والدعاء المستجاب"
        },
        {
            "id": "img-07-2",
            "url": "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Le Sa''i entre Safa et Marwah",
            "title_ar": "السعي بين الصفا والمروة",
            "desc_fr": "Parcours sacré sous air climatisé",
            "desc_ar": "إتمام الأشواط السبعة والتحلل"
        },
        {
            "id": "img-07-3",
            "url": "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Eau Bénite de Zamzam",
            "title_ar": "الشرب من ماء زمزم المبارك",
            "desc_fr": "Boisson bénie et guérison",
            "desc_ar": "ماء زمزم لما شُرب له"
        }
    ]'::jsonb
),
(
    '08',
    8,
    'La Mecque — Hôtels 4★ & 5★',
    'مكة المكرمة — أبراج البيت / المنطقة المركزية',
    'Séjour Haut de Gamme',
    'إقامة فاخرة بمكة',
    'Séjour de Prestige dans des Hôtels d''Élite',
    'الإقامة في فنادق متميزة حسب اختيار ورغبة المعتمر',
    'Séjour dans des établissements de haut standing selon la formule choisie : hôtels avec vue directe sur la Kaaba (Abraj Al-Bait) ou hôtels 4★/5★ prestigieux avec navettes privées VIP 24h/24 pour rejoindre l''esplanade sacrée sans contrainte.',
    'التمتع بإقامة مريحة في فنادق عالمية المستوى حسب الباقة المختارة (أبراج البيت المطلة على الحرم، أو فنادق 5 نجوم فاخرة، أو فنادق راقية مع حافلات ترددية خاصة 24/24س) لضمان أقصى درجات الراحة والتفرغ للعبادة.',
    '["Formules Luxe, Confort et Économique", "Navettes privées 24h/24 disponibles", "Room service & conciergerie 24/7"]'::jsonb,
    '["خيارات متنوعة تلائم كل التطلعات", "حافلات ترددية خاصة على مدار الساعة", "خدمات فندقية متكاملة"]'::jsonb,
    'Hotel',
    '[
        {
            "id": "img-08-1",
            "url": "https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Vue Imprenable sur le Haram",
            "title_ar": "إطلالة مباشرة على الحرم المكي",
            "desc_fr": "Tours Abraj Al-Bait & Hôtels 5★",
            "desc_ar": "إقامة ملكية في قلب مكة المكرمة"
        },
        {
            "id": "img-08-2",
            "url": "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Chambres & Suites Spacieuses",
            "title_ar": "غرف وأجنحة فندقية راقية",
            "desc_fr": "Équipements modernes et confort optimal",
            "desc_ar": "أعلى معايير النظافة والراحة التامة"
        }
    ]'::jsonb
),
(
    '09',
    9,
    'Mina, Muzdalifah, Mont Arafat & Hira',
    'منى، مزدلفة، عرفات، وجبل النور',
    'Ziyarates La Mecque',
    'مزارات مكة المكرمة',
    'Visite Guidée des Lieux Saints de La Mecque',
    'مزارات مكة المكرمة (منى، مزدلفة، جبل عرفات، وجبل النور)',
    'Excursion mémorable sur les traces du Hajj et des événements majeurs de l''Islam : les vallées sacrées de Mina et Muzdalifah, le Mont Arafat (Jabal Ar-Rahmah) et le Mont Al-Nour abritant la célèbre Grotte de Hira où fut révélé le Saint Coran.',
    'رحلة تاريخية وإيمانية لاكتشاف مشاعر الحج المقدسة: وادي منى، مزدلفة، جبل الرحمة بصعيد عرفات الطاهر، والمرور بجبل النور الشاهد على نزول أول آيات القرآن الكريم في غار حراء، مع استعراض المعاني العظيمة لهذه المشاهد.',
    '["Découverte des sites sacrés du Hajj", "Récits historiques et spirituels", "Halte panoramique à Jabal Ar-Rahmah"]'::jsonb,
    '["استكشاف مشاعر الحج المباركة", "شرح تفصيلي لمحطات السيرة", "فرص لالتقاط صور تذكارية"]'::jsonb,
    'MapPin',
    '[
        {
            "id": "img-09-1",
            "url": "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Mont Arafat — Jabal Ar-Rahmah",
            "title_ar": "جبل الرحمة بصعيد عرفات الطاهر",
            "desc_fr": "Lieu emblématique du pèlerinage",
            "desc_ar": "وقفة إيمانية واستشعار لمشاعر الحج"
        },
        {
            "id": "img-09-2",
            "url": "https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Grotte de Hira — Mont Al-Nour",
            "title_ar": "جبل النور وغار حراء المبارك",
            "desc_fr": "Lieu de révélation de la première sourate",
            "desc_ar": "مهبط الوحي وأول آيات القرآن الكريم"
        }
    ]'::jsonb
),
(
    '10',
    10,
    'Aéroport de Djeddah ➔ Algérie',
    'مطار الملك عبد العزيز بجدة ➔ الجزائر',
    'Retour Béni avec Zamzam',
    'عودة ميمونة بالسلامة',
    'Vol Direct Retour Djeddah ➔ Algérie avec Eau de Zamzam',
    'العودة في رحلة مباشرة من مطار جدة إلى الجزائر مع ماء زمزم',
    'Accomplissement du Tawaf d''adieu (Tawaf Al-Wadaa), transfert VIP vers l''Aéroport International de Djeddah, assistance aux formalités de douane et remise du bidon de 5 litres d''eau bénite de Zamzam scellé pour chaque pèlerin.',
    'توديع بيت الله الحرام بعد أداء طواف الوداع، النقل بحافلاتنا إلى مطار الملك عبد العزيز بجدة، إتمام إجراءات العودة وتسليم كل معتمر عبوة 5 لتر أصلية ومختومة من ماء زمزم المبارك كهدية من الوكالة.',
    '["Bidon d''eau de Zamzam 5L offert", "Vol direct vers l''Algérie", "Accompagnement jusqu''à l''embarquement"]'::jsonb,
    '["عبوة ماء زمزم 5 لتر رسمية لكل معتمر", "رحلة عودة مباشرة ومريحة", "استقبال ووداع بالورود والدعاء"]'::jsonb,
    'Gift',
    '[
        {
            "id": "img-10-1",
            "url": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Eau de Zamzam 5L Offerte",
            "title_ar": "عبوة ماء زمزم الرسمية هدية",
            "desc_fr": "Bidon scellé et certifié offert par l''agence",
            "desc_ar": "عبوة 5 لتر أصلية ومغلفة لكل معتمر"
        },
        {
            "id": "img-10-2",
            "url": "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1000&auto=format&fit=crop",
            "title_fr": "Vol Direct Retour vers l''Algérie",
            "title_ar": "رحلة العودة المباركة إلى أرض الوطن",
            "desc_fr": "« Omra Maqboulah & Djanb Maghfour »",
            "desc_ar": "عمرة مقبولة وذنب مغفور وسعي مشكور"
        }
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
