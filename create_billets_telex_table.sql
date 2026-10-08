-- Table pour l'historique des Billets Télex / E-Tickets Multi-destinations
CREATE TABLE IF NOT EXISTS public.billets_telex (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pnr text NOT NULL,
  numero_billet text,
  compagnie_id uuid,
  compagnie_nom text NOT NULL,
  compagnie_code text,
  passagers jsonb NOT NULL DEFAULT '[]'::jsonb,
  passager_nom text NOT NULL,
  prix numeric DEFAULT 0,
  devise text DEFAULT 'DZD',
  vols jsonb NOT NULL DEFAULT '[]'::jsonb,
  statut text DEFAULT 'CONFIRMÉ',
  emetteur text,
  date_emission timestamp with time zone DEFAULT timezone('utc'::text, now()),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT billets_telex_pkey PRIMARY KEY (id)
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_billets_telex_pnr ON public.billets_telex(pnr);
CREATE INDEX IF NOT EXISTS idx_billets_telex_passager ON public.billets_telex(passager_nom);
CREATE INDEX IF NOT EXISTS idx_billets_telex_created_at ON public.billets_telex(created_at DESC);

-- Enable RLS
ALTER TABLE public.billets_telex ENABLE ROW LEVEL SECURITY;

-- Policies pour billets_telex (accessible aux utilisateurs authentifiés)
DROP POLICY IF EXISTS "Allow authenticated full access to billets_telex" ON public.billets_telex;
CREATE POLICY "Allow authenticated full access to billets_telex"
  ON public.billets_telex
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy de lecture publique ou anonyme si nécessaire
DROP POLICY IF EXISTS "Allow public read billets_telex" ON public.billets_telex;
CREATE POLICY "Allow public read billets_telex"
  ON public.billets_telex
  FOR SELECT
  TO anon
  USING (true);
