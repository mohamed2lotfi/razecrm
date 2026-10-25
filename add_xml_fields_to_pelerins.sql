-- ==============================================================================
-- EXTENSION DU DOSSIER COMPLET DES PÈLERINS (IMPORT XML XDS / NUSUK / SEJIL)
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- ==============================================================================

-- 1. Ajout des colonnes pour le dossier total du pèlerin
ALTER TABLE public.pelerins 
ADD COLUMN IF NOT EXISTS nom_arabe TEXT,
ADD COLUMN IF NOT EXISTS prenom_arabe TEXT,
ADD COLUMN IF NOT EXISTS nin TEXT,
ADD COLUMN IF NOT EXISTS lieu_naissance TEXT,
ADD COLUMN IF NOT EXISTS lieu_naissance_arabe TEXT,
ADD COLUMN IF NOT EXISTS date_emission_passeport DATE,
ADD COLUMN IF NOT EXISTS passport_scan_url TEXT;

-- 2. Index pour accélérer les recherches par Passeport et NIN
CREATE INDEX IF NOT EXISTS idx_pelerins_num_passeport_clean ON public.pelerins(num_passeport);
CREATE INDEX IF NOT EXISTS idx_pelerins_nin ON public.pelerins(nin);

-- 3. Débloquer la politique RLS (Row Level Security) pour permettre les imports et éditions
ALTER TABLE public.pelerins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for pelerins" ON public.pelerins;
CREATE POLICY "Allow all for pelerins" ON public.pelerins 
FOR ALL TO public, anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Commentaires pour documenter la table
COMMENT ON COLUMN public.pelerins.nom_arabe IS 'Nom du pèlerin en arabe (LastNameAr)';
COMMENT ON COLUMN public.pelerins.prenom_arabe IS 'Prénom du pèlerin en arabe (FirstNameAr)';
COMMENT ON COLUMN public.pelerins.nin IS 'Numéro d''Identification Nationale (18 chiffres)';
COMMENT ON COLUMN public.pelerins.lieu_naissance IS 'Lieu de naissance en français / latin';
COMMENT ON COLUMN public.pelerins.lieu_naissance_arabe IS 'Lieu de naissance en arabe';
COMMENT ON COLUMN public.pelerins.date_emission_passeport IS 'Date de délivrance du passeport';
COMMENT ON COLUMN public.pelerins.passport_scan_url IS 'URL ou base64 du scan de la page passeport';

