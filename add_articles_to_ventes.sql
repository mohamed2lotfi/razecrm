-- ==============================================================================
-- MIGRATION: ADD ARTICLES (JSONB) & DESTINATION TO VENTES TABLE
-- ==============================================================================

-- 1. Add articles column to 'ventes' table if it does not exist
ALTER TABLE public.ventes 
ADD COLUMN IF NOT EXISTS articles jsonb DEFAULT '[]'::jsonb;

-- 2. Add destination column to 'ventes' table if it does not exist
ALTER TABLE public.ventes 
ADD COLUMN IF NOT EXISTS destination text;

-- 3. Optional: Index on articles for json queries
CREATE INDEX IF NOT EXISTS idx_ventes_articles ON public.ventes USING gin (articles);

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN public.ventes.articles IS 'Liste des articles/prestations de la vente avec catégorie, désignation, quantité, prix achat et prix vente';
COMMENT ON COLUMN public.ventes.destination IS 'Destination principale du voyage / prestation';
