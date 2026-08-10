-- ==============================================================================
-- MIGRATION SCRIPT : TABLE 'destinations' & TABLE 'packages'
-- ==============================================================================

-- 1. Table: destinations
CREATE TABLE IF NOT EXISTS public.destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    nom_ar VARCHAR(255),
    emoji VARCHAR(32) DEFAULT '✈️',
    description TEXT,
    description_ar TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_destinations_nom ON public.destinations(nom);

-- RLS: destinations
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view destinations" ON public.destinations;
CREATE POLICY "Public can view destinations" 
ON public.destinations FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage destinations" ON public.destinations;
CREATE POLICY "Authenticated users can manage destinations" 
ON public.destinations FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Données initiales pour les destinations courantes
INSERT INTO public.destinations (nom, nom_ar, emoji, description)
VALUES 
    ('Turquie', 'تركيا', '🇹🇷', 'Istanbul, Antalya, Cappadoce, Trabzon'),
    ('Émirats Arabes Unis (Dubaï)', 'الإمارات العربية المتحدة (دبي)', '🇦🇪', 'Dubaï, Abu Dhabi, Sharjah'),
    ('Malaisie', 'ماليزيا', '🇲🇾', 'Kuala Lumpur, Langkawi, Penang'),
    ('Arabie Saoudite', 'المملكة العربية السعودية', '🇸🇦', 'Riyad, Djeddah, AlUla'),
    ('Égypte', 'مصر', '🇪🇬', 'Le Caire, Charm el-Cheikh, Hurghada'),
    ('Tunisie', 'تونس', '🇹🇳', 'Tunis, Hammamet, Sousse, Djerba'),
    ('Espagne', 'إسبانيا', '🇪🇸', 'Madrid, Barcelone, Andalousie'),
    ('France', 'فرنسا', '🇫🇷', 'Paris, Côte d''Azur'),
    ('Thaïlande', 'تايلاند', '🇹🇭', 'Bangkok, Phuket, Koh Samui')
ON CONFLICT DO NOTHING;


-- 2. Table: packages
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    nom_ar VARCHAR(255),
    destination_id UUID REFERENCES public.destinations(id) ON DELETE SET NULL,
    type VARCHAR(64) DEFAULT 'organise' NOT NULL, -- 'organise' (Voyage organisé) | 'a_la_carte' (Voyage à la carte)
    duree VARCHAR(128) DEFAULT '7 jours / 6 nuits',
    duree_ar VARCHAR(128) DEFAULT '7 أيام / 6 ليالي',
    date_debut_validite DATE,
    date_fin_validite DATE,
    billet_avion_inclus BOOLEAN DEFAULT true NOT NULL,
    compagnie_id VARCHAR(255), -- Nom ou ID de la compagnie aérienne
    departs JSONB DEFAULT '[]'::jsonb NOT NULL, -- [{ id, label, date_depart, date_retour, note }]
    transfert_inclus BOOLEAN DEFAULT true NOT NULL, -- Transfert aéroport-hôtel
    visa_status VARCHAR(64) DEFAULT 'non_incluse' NOT NULL, -- 'incluse', 'non_incluse', 'traitement_dossier', 'none'
    hotels JSONB DEFAULT '[]'::jsonb NOT NULL, -- [{ id, nom, location, etoiles, formule, tarifs: { quadruple, triple, double, single } }]
    description TEXT,
    description_ar TEXT,
    programme JSONB DEFAULT '[]'::jsonb, -- [{ jour: 1, titre: "Arrivée", detail: "..." }]
    inclusions JSONB DEFAULT '[]'::jsonb, -- ["Vol aller-retour", "Hôtel 5*", "Transfert VIP"]
    exclusions JSONB DEFAULT '[]'::jsonb, -- ["Dépenses personnelles", "Assurance optionnelle"]
    image_url TEXT,
    galerie JSONB DEFAULT '[]'::jsonb,
    statut VARCHAR(32) DEFAULT 'actif' NOT NULL, -- 'actif', 'brouillon', 'archive'
    en_vedette BOOLEAN DEFAULT false NOT NULL, -- Affichage prioritaire vitrine
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_packages_destination ON public.packages(destination_id);
CREATE INDEX IF NOT EXISTS idx_packages_statut ON public.packages(statut);
CREATE INDEX IF NOT EXISTS idx_packages_type ON public.packages(type);

-- RLS: packages
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active packages" ON public.packages;
CREATE POLICY "Public can view active packages" 
ON public.packages FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage packages" ON public.packages;
CREATE POLICY "Authenticated users can manage packages" 
ON public.packages FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
