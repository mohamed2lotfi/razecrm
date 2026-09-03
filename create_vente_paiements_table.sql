-- ==============================================================================
-- MIGRATION: CRÉATION DE LA TABLE 'vente_paiements' (MULTI-TRANCHES & MULTI-DEVISES)
-- ==============================================================================

-- 1. Création de la table 'vente_paiements'
CREATE TABLE IF NOT EXISTS public.vente_paiements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vente_id UUID NOT NULL REFERENCES public.ventes(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  nom_payeur TEXT,
  passager_nom TEXT,
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  montant_original NUMERIC NOT NULL DEFAULT 0,
  devise TEXT NOT NULL DEFAULT 'DZD',
  taux_change NUMERIC DEFAULT 1,
  montant_dzd NUMERIC NOT NULL DEFAULT 0,
  moyen_paiement TEXT NOT NULL DEFAULT 'Espèce',
  num_recu TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Création des Index pour optimiser les performances de requêtes et filtres
CREATE INDEX IF NOT EXISTS idx_vente_paiements_vente_id ON public.vente_paiements(vente_id);
CREATE INDEX IF NOT EXISTS idx_vente_paiements_client_id ON public.vente_paiements(client_id);
CREATE INDEX IF NOT EXISTS idx_vente_paiements_date_paiement ON public.vente_paiements(date_paiement);
CREATE INDEX IF NOT EXISTS idx_vente_paiements_created_at ON public.vente_paiements(created_at);

-- 3. Activation de Row Level Security (RLS)
ALTER TABLE public.vente_paiements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permettre tout accès sur vente_paiements" ON public.vente_paiements;
CREATE POLICY "Permettre tout accès sur vente_paiements" 
ON public.vente_paiements 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. Recharger le cache du schéma PostgREST
NOTIFY pgrst, 'reload schema';

COMMENT ON TABLE public.vente_paiements IS 'Table des paiements, tranches et acomptes multi-devises pour les ventes (Billeterie, Hôtels, Visas, Séjours, etc.)';
COMMENT ON COLUMN public.vente_paiements.montant_original IS 'Montant dans la devise originale saisie (ex: 200 EUR)';
COMMENT ON COLUMN public.vente_paiements.devise IS 'Code de la devise (DZD, EUR, USD, SAR, CAD, GBP...)';
COMMENT ON COLUMN public.vente_paiements.taux_change IS 'Taux de change vers DZD appliqué lors du versement';
COMMENT ON COLUMN public.vente_paiements.montant_dzd IS 'Montant équivalent converti en Dinars Algériens (DZD)';
