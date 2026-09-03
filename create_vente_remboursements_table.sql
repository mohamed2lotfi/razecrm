-- ==============================================================================
-- MIGRATION: CRÉATION DE LA TABLE 'vente_remboursements'
-- CRM Agence El-Mokhtar - Dialecte: PostgreSQL / Supabase
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.vente_remboursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vente_id UUID NOT NULL REFERENCES public.ventes(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_nom TEXT,
  date_remboursement DATE NOT NULL DEFAULT CURRENT_DATE,
  montant_initial NUMERIC NOT NULL DEFAULT 0,
  montant_encaisse NUMERIC NOT NULL DEFAULT 0,
  penalite_fournisseur NUMERIC NOT NULL DEFAULT 0,
  penalite_agence NUMERIC NOT NULL DEFAULT 0,
  montant_rembourse_client NUMERIC NOT NULL DEFAULT 0,
  moyen_paiement TEXT NOT NULL DEFAULT 'Espèce',
  num_recu_remboursement TEXT,
  motif TEXT,
  agent_id UUID,
  agent_nom TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index pour optimiser les performances de requêtes
CREATE INDEX IF NOT EXISTS idx_vente_remboursements_vente_id ON public.vente_remboursements(vente_id);
CREATE INDEX IF NOT EXISTS idx_vente_remboursements_client_id ON public.vente_remboursements(client_id);
CREATE INDEX IF NOT EXISTS idx_vente_remboursements_date ON public.vente_remboursements(date_remboursement);
CREATE INDEX IF NOT EXISTS idx_vente_remboursements_created_at ON public.vente_remboursements(created_at);

-- Row Level Security (RLS)
ALTER TABLE public.vente_remboursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permettre tout acces sur vente_remboursements" ON public.vente_remboursements;
CREATE POLICY "Permettre tout acces sur vente_remboursements" 
ON public.vente_remboursements 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Notifier PostgREST pour recharger le schéma
NOTIFY pgrst, 'reload schema';

COMMENT ON TABLE public.vente_remboursements IS 'Table historique des remboursements clients et de la double pénalité (Fournisseur & Agence)';
