-- ==============================================================================
-- MIGRATION SCRIPT : TABLE 'website_testimonials'
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- ==============================================================================

-- 1. Création de la table website_testimonials
CREATE TABLE IF NOT EXISTS public.website_testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT,
    handle TEXT,
    handle_ar TEXT,
    tag TEXT,
    tag_ar TEXT,
    text TEXT NOT NULL,
    text_ar TEXT,
    rating INTEGER DEFAULT 5,
    verified TEXT DEFAULT 'Client Vérifié',
    verified_ar TEXT DEFAULT 'عميل موثق',
    date_text TEXT DEFAULT 'Récemment',
    date_text_ar TEXT DEFAULT 'مؤخراً',
    avatar_url TEXT,
    avatar_gradient TEXT DEFAULT 'from-emerald-600 to-teal-800',
    column_index INTEGER DEFAULT 1, -- 1, 2 ou 3 pour affichage 3 colonnes
    is_active BOOLEAN DEFAULT true,
    ordre INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour tri rapide
CREATE INDEX IF NOT EXISTS idx_website_testimonials_ordre ON public.website_testimonials(ordre);
CREATE INDEX IF NOT EXISTS idx_website_testimonials_active ON public.website_testimonials(is_active);

-- 2. Sécurité RLS
ALTER TABLE public.website_testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view website_testimonials" ON public.website_testimonials;
CREATE POLICY "Public can view website_testimonials" 
ON public.website_testimonials FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage website_testimonials" ON public.website_testimonials;
CREATE POLICY "Authenticated users can manage website_testimonials" 
ON public.website_testimonials FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3. Données initiales des témoignages
INSERT INTO public.website_testimonials (name, name_ar, handle, handle_ar, tag, tag_ar, text, text_ar, rating, verified, verified_ar, date_text, date_text_ar, avatar_gradient, column_index, ordre)
VALUES
(
    'Karim Meziane',
    'كريم مزيان',
    '@karim.travels • Alger',
    'karim.travels@ • الجزائر',
    '✈️ Vol Direct Alger - Istanbul',
    '✈️ حجز طيران مباشر وتذاكر إلكترونية',
    '« Réservation de nos billets d''avion pour Istanbul en moins de 3 minutes sur la plateforme ! Émission instantanée des billets électroniques, choix des sièges côte à côte et zéro mauvaise surprise sur les bagages à l''aéroport. »',
    '« حجز تذاكر الطيران إلى إسطنبول تم في أقل من 3 دقائق على المنصة! إصدار فوري للتذاكر الإلكترونية، واختيار المقاعد المتجاورة وبدون أي مفاجآت في الأمتعة بالمطار. »',
    5,
    'Billet Confirmé & Émis',
    'تذكرة مؤكدة ومصدرة',
    'Il y a 3 jours',
    'منذ 3 أيام',
    'from-emerald-600 to-teal-800',
    1,
    1
),
(
    'Sarah & Yacine Benali',
    'سارة وياسين بن علي',
    '@sarah_ben • Oran',
    'sarah_ben@ • وهران',
    '🇹🇷 Séjour Combiné Istanbul & Antalya',
    '🇹🇷 باقة مدمجة إسطنبول وأنطاليا',
    '« Le package multi-hôtels en Turquie était sensationnel ! 4 nuits dans un hôtel de charme au cœur de Sultanahmet puis 4 nuits dans un resort 5★ All-Inclusive à Antalya avec vols intérieurs inclus. »',
    '« الباقة المتعددة الفنادق في تركيا كانت استثنائية! 4 ليالٍ في فندق ساحر بقلب السلطان أحمد ثم 4 ليالٍ في منتجع 5 نجوم شامل كلياً في أنطاليا مع الرحلات الداخلية المنسقة بدقة. »',
    5,
    'Package Séjour Validé',
    'باقة سفر مكتملة',
    'Il y a 1 semaine',
    'منذ أسبوع',
    'from-amber-600 to-orange-800',
    1,
    2
),
(
    'Dr. Amine Tahari',
    'د. أمين طاهري',
    '@amine_tah • Constantine',
    'amine_tah@ • قسنطينة',
    '🚐 Transfert VIP Van Mercedes',
    '🚐 نقل خاص بسيارة فان VIP',
    '« Adieu les bus bondés et les heures d''attente ! Dès notre atterrissage, notre chauffeur privé nous attendait avec une pancarte et un van Mercedes Vito spacieux et climatisé avec Wi-Fi. Confort absolu. »',
    '« وداعاً للحافلات المزدحمة وساعات الانتظار! بمجرد هبوط الطائرة، كان سائقنا الخاص في انتظارنا بلافتة وسيارة فان مرسيدس فيتو مريحة ومكيفة مع واي فاي. راحة مطلقة لعائلتي. »',
    5,
    'Transfert Privé VIP',
    'نقل خاص VIP',
    'Il y a 2 semaines',
    'منذ أسبوعين',
    'from-blue-600 to-indigo-800',
    1,
    3
),
(
    'Hadj Mustapha B.',
    'الحاج مصطفى بوعلام',
    '@mustapha_hadj • Alger',
    'mustapha_hadj@ • الجزائر',
    '🕋 Omra Prestige & Hôtel au pied du Haram',
    '🕋 عمرة متميزة وفندق بساحة الحرم',
    '« Une organisation exemplaire du départ jusqu''au retour. Notre hôtel à La Mecque était à 100 mètres de l''esplanade du Haram avec une vue imprenable. L''accompagnement spirituel et Nusuk au top. »',
    '« تنظيم محكم ومثالي من مطار الجزائر إلى غاية العودة. فندقنا في مكة كان على بعد 100 متر فقط من ساحة الحرم المكي مع إطلالة رائعة. المرافقة الإرشادية وإجراءات نسك كانت في قمة التميز. »',
    5,
    'Pèlerinage Confirmé',
    'معتمر موثق',
    'Il y a 5 jours',
    'منذ 5 أيام',
    'from-yellow-600 to-amber-800',
    2,
    4
),
(
    'Sofiane & Rania Khelil',
    'سفيان ورانية خليل',
    '@sofiane_kh • Blida',
    'sofiane_kh@ • البليدة',
    '🇹🇷 Circuit Cappadoce & Istanbul',
    '🇹🇷 جولة كابادوكيا وإسطنبول',
    '« Le combiné hôtel troglodyte en Cappadoce avec l''envolée en montgolfière et l''hôtel 5★ sur le Bosphore était magique. Les transferts privés entre les aéroports et les hôtels à l''heure exacte. »',
    '« الجمع بين الإقامة في فندق الكهف في كابادوكيا وتجربة المنطاد، ثم فندق 5 نجوم على مضيق البوسفور كان ساحراً. النقل الخاص بين المطارات والفنادق كان دقيقاً في الموعد بالثانية. »',
    5,
    'Circuit Clé en Main',
    'رحلة سياحية كاملة',
    'Il y a 10 jours',
    'منذ 10 أيام',
    'from-indigo-600 to-violet-800',
    2,
    5
),
(
    'Leila Hamidi',
    'ليلى حميدي',
    '@leila_travel • Tlemcen',
    'leila_travel@ • تلمسان',
    '🚐 Chauffeur Dédié & Berline Privée',
    '🚐 سيارة خاصة وسائق مخصص',
    '« Pour notre voyage, nous avons opté pour le forfait avec voiture privée dédiée pour toutes nos excursions au lieu des navettes collectives. Une liberté totale et des chauffeurs très professionnels. »',
    '« في شهر العسل اخترنا باقة السيارة الخاصة لجميع جولاتنا بدل الحافلات السياحية. حرية كاملة وسائقون في غاية اللطف والمهنية. تجربة نوصي بها الجميع. »',
    5,
    'Prestation VIP Privée',
    'خدمة VIP خاصة',
    'Il y a 1 mois',
    'منذ شهر',
    'from-purple-600 to-fuchsia-800',
    2,
    6
),
(
    'Farid & Amina Zerrouki',
    'فريد وأمينة زروقي',
    '@farid_zer • Sétif',
    'farid_zer@ • سطيف',
    '🚐 Van VIP Famille & Bagages',
    '🚐 فان مرسيدس عائلي خاص',
    '« Voyager avec 3 enfants et 5 valises peut vite devenir stressant, mais le service de transfert en van VIP privé a tout changé ! Chauffeur chaleureux, sièges enfants installés et bouteilles d''eau fraîches. »',
    '« السفر مع 3 أطفال و5 حقائب كان سيكون معقداً، لكن خدمة التوصيل بالفان الخاص أنقذت رحلتنا! سائق خدوم، مقاعد أطفال مجهزة، ومياه باردة. تجربة مريحة جداً. »',
    5,
    'Famille Confort VIP',
    'راحة عائلية VIP',
    'Il y a 4 jours',
    'منذ 4 أيام',
    'from-emerald-700 to-green-900',
    3,
    7
),
(
    'Fatima Zohra K.',
    'فاطمة الزهراء قاسي',
    '@fz_kaci • Alger',
    'fz_kaci@ • الجزائر',
    '🕋 Omra VIP & Assistance 24/7',
    '🕋 عمرة مريحة ومرافقة 24/7',
    '« Voyage effectué avec mes parents âgés : l''assistance dédiée et les transferts privés en voiture climatisée ont fait toute la différence. Nos guides étaient joignables sur WhatsApp pour le moindre besoin. »',
    '« سافرت برفقة والديّ المسنين: المرافقة المخصصة وتوفير سيارات النقل الفردية المكيفة صنعت فارقاً كبيراً في رحلتنا. المرشدون كانوا دائماً متاحين على واتساب لأي مساعدة. »',
    5,
    'Pèlerine Vérifiée',
    'معتمرة موثقة',
    'Il y a 2 semaines',
    'منذ أسبوعين',
    'from-pink-600 to-rose-800',
    3,
    8
),
(
    'Walid Bencherif',
    'وليد بن شريف',
    '@walid_b • Batna',
    'walid_b@ • باتنة',
    '🇹🇷 Istanbul Multi-Hôtels (Taksim & Bosphore)',
    '🇹🇷 تقسيم وأورتاكوي فندقان مختلفان',
    '« La possibilité de fractionner notre séjour entre 2 hôtels différents (3 nuits à Taksim pour le shopping + 3 nuits à Ortaköy sur le Bosphore) sans aucun surcoût logistique est un énorme plus ! »',
    '« إمكانية تقسيم الإقامة بين فندقين مختلفين (3 ليالٍ في تقسيم للتسوق + 3 ليالٍ في أورتاكوي على البوسفور) بدون أي تعقيد لوجستي هي ميزة ممتازة لهذه الوكالة. »',
    5,
    'Séjour Personnalisé',
    'باقة مخصصة',
    'Il y a 1 mois',
    'منذ شهر',
    'from-orange-600 to-amber-800',
    3,
    9
)
ON CONFLICT (id) DO NOTHING;
