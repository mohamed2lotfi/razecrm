-- ==============================================================================
-- SCRIPT CORRIGÉ : CRÉATION DU STORAGE BUCKET & ENRICHISSEMENT DES VISAS & PAYS
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- ==============================================================================

-- 1. Création du Bucket de stockage public pour les médias (hôtels, visas, logos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-media', 'agency-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Politiques RLS pour le bucket agency-media
DROP POLICY IF EXISTS "Public Access agency-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload agency-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update agency-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete agency-media" ON storage.objects;

CREATE POLICY "Public Access agency-media" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'agency-media');

CREATE POLICY "Authenticated upload agency-media" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'agency-media');

CREATE POLICY "Authenticated update agency-media" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'agency-media');

CREATE POLICY "Authenticated delete agency-media" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'agency-media');

-- 3. Enrichissement de la table visa_countries avec drapeaux et codes ISO
ALTER TABLE public.visa_countries 
ADD COLUMN IF NOT EXISTS code_iso TEXT,
ADD COLUMN IF NOT EXISTS flag_icon TEXT,
ADD COLUMN IF NOT EXISTS nom_ar TEXT;

-- 4. Enrichissement de la table visa_types avec bilinguisme
ALTER TABLE public.visa_types
ADD COLUMN IF NOT EXISTS nom_ar TEXT,
ADD COLUMN IF NOT EXISTS duree_traitement_ar TEXT,
ADD COLUMN IF NOT EXISTS dossier_ar TEXT[];

-- 5. Activation des politiques de lecture publique sur les tables visas (pour le site web)
ALTER TABLE public.visa_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visa_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique visa_countries" ON public.visa_countries;
CREATE POLICY "Lecture publique visa_countries" ON public.visa_countries FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Gestion visa_countries auth" ON public.visa_countries;
CREATE POLICY "Gestion visa_countries auth" ON public.visa_countries FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Lecture publique visa_types" ON public.visa_types;
CREATE POLICY "Lecture publique visa_types" ON public.visa_types FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Gestion visa_types auth" ON public.visa_types;
CREATE POLICY "Gestion visa_types auth" ON public.visa_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Insertion / Mise à jour intelligente des pays et des visas avec gestion automatique des UUID
DO $$
DECLARE
    v_sa_id UUID;
    v_ae_id UUID;
    v_tr_id UUID;
    v_eg_id UUID;
    v_eu_id UUID;
    v_gb_id UUID;
    v_us_id UUID;
BEGIN
    -- 1. Arabie Saoudite
    SELECT id INTO v_sa_id FROM public.visa_countries WHERE nom ILIKE '%Saoudite%' OR code_iso = 'sa' LIMIT 1;
    IF v_sa_id IS NULL THEN
        INSERT INTO public.visa_countries (nom, nom_ar, code_iso, flag_icon)
        VALUES ('Arabie Saoudite (Omra & Tourisme)', 'المملكة العربية السعودية (عمرة وسياحة)', 'sa', '🇸🇦')
        RETURNING id INTO v_sa_id;
    ELSE
        UPDATE public.visa_countries
        SET nom = 'Arabie Saoudite (Omra & Tourisme)', nom_ar = 'المملكة العربية السعودية (عمرة وسياحة)', code_iso = 'sa', flag_icon = '🇸🇦'
        WHERE id = v_sa_id;
    END IF;

    -- 2. Émirats Arabes Unis (Dubaï)
    SELECT id INTO v_ae_id FROM public.visa_countries WHERE nom ILIKE '%Émirats%' OR nom ILIKE '%Duba%' OR code_iso = 'ae' LIMIT 1;
    IF v_ae_id IS NULL THEN
        INSERT INTO public.visa_countries (nom, nom_ar, code_iso, flag_icon)
        VALUES ('Émirats Arabes Unis (Dubaï)', 'الإمارات العربية المتحدة (دبي)', 'ae', '🇦🇪')
        RETURNING id INTO v_ae_id;
    ELSE
        UPDATE public.visa_countries
        SET nom = 'Émirats Arabes Unis (Dubaï)', nom_ar = 'الإمارات العربية المتحدة (دبي)', code_iso = 'ae', flag_icon = '🇦🇪'
        WHERE id = v_ae_id;
    END IF;

    -- 3. Turquie
    SELECT id INTO v_tr_id FROM public.visa_countries WHERE nom ILIKE '%Turquie%' OR code_iso = 'tr' LIMIT 1;
    IF v_tr_id IS NULL THEN
        INSERT INTO public.visa_countries (nom, nom_ar, code_iso, flag_icon)
        VALUES ('Turquie (E-Visa & Touristique)', 'تركيا (تأشيرة إلكترونية وسياحية)', 'tr', '🇹🇷')
        RETURNING id INTO v_tr_id;
    ELSE
        UPDATE public.visa_countries
        SET nom = 'Turquie (E-Visa & Touristique)', nom_ar = 'تركيا (تأشيرة إلكترونية وسياحية)', code_iso = 'tr', flag_icon = '🇹🇷'
        WHERE id = v_tr_id;
    END IF;

    -- 4. Égypte
    SELECT id INTO v_eg_id FROM public.visa_countries WHERE nom ILIKE '%Égypte%' OR nom ILIKE '%Egypte%' OR code_iso = 'eg' LIMIT 1;
    IF v_eg_id IS NULL THEN
        INSERT INTO public.visa_countries (nom, nom_ar, code_iso, flag_icon)
        VALUES ('Égypte', 'جمهورية مصر العربية', 'eg', '🇪🇬')
        RETURNING id INTO v_eg_id;
    ELSE
        UPDATE public.visa_countries
        SET nom = 'Égypte', nom_ar = 'جمهورية مصر العربية', code_iso = 'eg', flag_icon = '🇪🇬'
        WHERE id = v_eg_id;
    END IF;

    -- 5. Espace Schengen
    SELECT id INTO v_eu_id FROM public.visa_countries WHERE nom ILIKE '%Schengen%' OR code_iso = 'eu' LIMIT 1;
    IF v_eu_id IS NULL THEN
        INSERT INTO public.visa_countries (nom, nom_ar, code_iso, flag_icon)
        VALUES ('Espace Schengen', 'دول فضاء شنغن (Schengen)', 'eu', '🇪🇺')
        RETURNING id INTO v_eu_id;
    ELSE
        UPDATE public.visa_countries
        SET nom = 'Espace Schengen', nom_ar = 'دول فضاء شنغن (Schengen)', code_iso = 'eu', flag_icon = '🇪🇺'
        WHERE id = v_eu_id;
    END IF;

    -- 6. Royaume-Uni
    SELECT id INTO v_gb_id FROM public.visa_countries WHERE nom ILIKE '%Royaume%' OR code_iso = 'gb' LIMIT 1;
    IF v_gb_id IS NULL THEN
        INSERT INTO public.visa_countries (nom, nom_ar, code_iso, flag_icon)
        VALUES ('Royaume-Uni (UK)', 'المملكة المتحدة (بريطانيا)', 'gb', '🇬🇧')
        RETURNING id INTO v_gb_id;
    ELSE
        UPDATE public.visa_countries
        SET nom = 'Royaume-Uni (UK)', nom_ar = 'المملكة المتحدة (بريطانيا)', code_iso = 'gb', flag_icon = '🇬🇧'
        WHERE id = v_gb_id;
    END IF;

    -- 7. États-Unis
    SELECT id INTO v_us_id FROM public.visa_countries WHERE nom ILIKE '%Unis%' OR nom ILIKE '%USA%' OR code_iso = 'us' LIMIT 1;
    IF v_us_id IS NULL THEN
        INSERT INTO public.visa_countries (nom, nom_ar, code_iso, flag_icon)
        VALUES ('États-Unis (USA)', 'الولايات المتحدة الأمريكية', 'us', '🇺🇸')
        RETURNING id INTO v_us_id;
    ELSE
        UPDATE public.visa_countries
        SET nom = 'États-Unis (USA)', nom_ar = 'الولايات المتحدة الأمريكية', code_iso = 'us', flag_icon = '🇺🇸'
        WHERE id = v_us_id;
    END IF;

    -- Insertion / Mise à jour des Types de Visas standards
    -- Visa Arabie Saoudite
    IF v_sa_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.visa_types WHERE country_id = v_sa_id AND nom ILIKE '%Omra%') THEN
            INSERT INTO public.visa_types (country_id, nom, nom_ar, tarif_base, tarif_vente, duree_traitement, duree_traitement_ar, dossier, dossier_ar)
            VALUES (
                v_sa_id,
                'E-Visa Tourisme & Omra (1 An Multiple)',
                'تأشيرة سياحة وعمرة إلكترونية (سنة كاملة متعددة)',
                26000,
                32000,
                '24 à 48 heures',
                '24 إلى 48 ساعة',
                '["Copie numérique du passeport (Validité 6 mois min)", "Photo d''identité fond blanc numérisée"]'::jsonb,
                ARRAY['نسخة رقمية من جواز السفر (صلاحية 6 أشهر على الأقل)', 'صورة شمسية رقمية بخلفية بيضاء']
            );
        END IF;
    END IF;

    -- Visa Dubaï
    IF v_ae_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.visa_types WHERE country_id = v_ae_id AND nom ILIKE '%Duba%') THEN
            INSERT INTO public.visa_types (country_id, nom, nom_ar, tarif_base, tarif_vente, duree_traitement, duree_traitement_ar, dossier, dossier_ar)
            VALUES (
                v_ae_id,
                'Visa Dubaï Tourisme Express (30 Jours)',
                'تأشيرة دبي السياحية السريعة (30 يوماً)',
                17000,
                22000,
                '2 à 3 jours ouvrables',
                '2 إلى 3 أيام عمل',
                '["Copie couleur du passeport", "Photo d''identité numérique", "Billet d''avion A/R"]'::jsonb,
                ARRAY['نسخة ملونة من جواز السفر', 'صورة شمسية رقمية', 'تذكرة طيران ذهاب وإياب مؤكدة']
            );
        END IF;
    END IF;

    -- Visa Turquie
    IF v_tr_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.visa_types WHERE country_id = v_tr_id AND nom ILIKE '%Turquie%') THEN
            INSERT INTO public.visa_types (country_id, nom, nom_ar, tarif_base, tarif_vente, duree_traitement, duree_traitement_ar, dossier, dossier_ar)
            VALUES (
                v_tr_id,
                'E-Visa Turquie Électronique Instantané',
                'تأشيرة تركيا الإلكترونية الفورية',
                10000,
                14000,
                'Instantané (2 heures)',
                'فوري (خلال ساعتين)',
                '["Passeport valide au moins 6 mois", "Visa Schengen/USA valide si applicable"]'::jsonb,
                ARRAY['جواز سفر ساري المفعول لمدة 6 أشهر', 'تأشيرة شنغن أو أمريكا سارية المفعول']
            );
        END IF;
    END IF;

    -- Visa Égypte
    IF v_eg_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.visa_types WHERE country_id = v_eg_id AND nom ILIKE '%Égypte%') THEN
            INSERT INTO public.visa_types (country_id, nom, nom_ar, tarif_base, tarif_vente, duree_traitement, duree_traitement_ar, dossier, dossier_ar)
            VALUES (
                v_eg_id,
                'Visa Touristique Égypte avec Approbation',
                'تأشيرة مصر السياحية مع الموافقة الأمنية',
                13500,
                18500,
                '5 à 7 jours ouvrables',
                '5 إلى 7 أيام عمل',
                '["Passeport original", "2 Photos d''identité", "Attestation de travail"]'::jsonb,
                ARRAY['جواز السفر الأصلي', 'صورتان شمسيتان', 'شهادة عمل أو سجل تجاري']
            );
        END IF;
    END IF;

END $$;
