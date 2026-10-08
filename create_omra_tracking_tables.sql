-- ==============================================================================
-- MODULE TRACKING OMRA (RÉSERVÉ ADMIN)
-- 3 Tables :
-- 1. omra_tracking_visas   : Groupes Visas Saoudiens (Nusuk, Libre / En Groupe, SAR, Transport)
-- 2. omra_tracking_billets : Blocs Sièges Omra (PNR, Compagnie, ADT/CHD/INF, Tarifs unitaires & total)
-- 3. omra_tracking_diwan   : Déclarations & Groupes Diwan (Nom, Groupe Omra lié, Nbr Assafers, 5000 DZD/assafir)
-- ==============================================================================

-- 1. TABLE TRACKING VISAS SAUDI / NUSUK
CREATE TABLE IF NOT EXISTS public.omra_tracking_visas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'groupe', -- 'libre' ou 'groupe'
  groupe_id uuid REFERENCES public.omra_groupes(id) ON DELETE SET NULL,
  groupe_nom text,
  nusuk_group_no text NOT NULL,
  date_emission date NOT NULL DEFAULT CURRENT_DATE,
  tarif_total_sar numeric NOT NULL DEFAULT 0,
  avec_transport boolean NOT NULL DEFAULT false,
  frais_transport_sar numeric DEFAULT 0,
  nbr_visas integer DEFAULT 0,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT omra_tracking_visas_pkey PRIMARY KEY (id)
);

-- 2. TABLE TRACKING BILLETS / BLOCS SIÈGES
CREATE TABLE IF NOT EXISTS public.omra_tracking_billets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date_vol date NOT NULL DEFAULT CURRENT_DATE,
  compagnie_id uuid REFERENCES public.compagnies_aeriennes(id) ON DELETE SET NULL,
  compagnie_nom text NOT NULL,
  pnr text NOT NULL,
  adt_count integer NOT NULL DEFAULT 0,
  chd_count integer NOT NULL DEFAULT 0,
  inf_count integer NOT NULL DEFAULT 0,
  total_places integer NOT NULL DEFAULT 0,
  tarif_adt numeric NOT NULL DEFAULT 0,
  tarif_chd numeric NOT NULL DEFAULT 0,
  tarif_inf numeric NOT NULL DEFAULT 0,
  tarif_total numeric NOT NULL DEFAULT 0,
  groupe_id uuid REFERENCES public.omra_groupes(id) ON DELETE SET NULL,
  groupe_nom text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT omra_tracking_billets_pkey PRIMARY KEY (id)
);

-- 3. TABLE TRACKING GROUPES DIWAN
CREATE TABLE IF NOT EXISTS public.omra_tracking_diwan (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nom_groupe text NOT NULL,
  groupe_id uuid REFERENCES public.omra_groupes(id) ON DELETE SET NULL,
  groupe_nom text,
  adt_count integer NOT NULL DEFAULT 0,
  chd_count integer NOT NULL DEFAULT 0,
  nombre_assafers integer NOT NULL DEFAULT 0,
  tarif_par_assafir numeric NOT NULL DEFAULT 5000,
  tarif_total numeric NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'DÉCLARÉ', -- 'EN_ATTENTE', 'DÉCLARÉ', 'VALIDÉ', 'PAYÉ'
  date_declaration date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT omra_tracking_diwan_pkey PRIMARY KEY (id)
);

-- Si la table existe déjà, ajout des colonnes ADT et CHD
ALTER TABLE public.omra_tracking_diwan ADD COLUMN IF NOT EXISTS adt_count integer DEFAULT 0;
ALTER TABLE public.omra_tracking_diwan ADD COLUMN IF NOT EXISTS chd_count integer DEFAULT 0;

-- Index pour performances de recherche
CREATE INDEX IF NOT EXISTS idx_tracking_visas_nusuk ON public.omra_tracking_visas(nusuk_group_no);
CREATE INDEX IF NOT EXISTS idx_tracking_visas_groupe ON public.omra_tracking_visas(groupe_id);
CREATE INDEX IF NOT EXISTS idx_tracking_visas_date ON public.omra_tracking_visas(date_emission DESC);

CREATE INDEX IF NOT EXISTS idx_tracking_billets_pnr ON public.omra_tracking_billets(pnr);
CREATE INDEX IF NOT EXISTS idx_tracking_billets_compagnie ON public.omra_tracking_billets(compagnie_nom);
CREATE INDEX IF NOT EXISTS idx_tracking_billets_date ON public.omra_tracking_billets(date_vol DESC);

CREATE INDEX IF NOT EXISTS idx_tracking_diwan_groupe ON public.omra_tracking_diwan(groupe_id);
CREATE INDEX IF NOT EXISTS idx_tracking_diwan_date ON public.omra_tracking_diwan(date_declaration DESC);

-- Activation de la Row Level Security (RLS)
ALTER TABLE public.omra_tracking_visas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omra_tracking_billets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omra_tracking_diwan ENABLE ROW LEVEL SECURITY;

-- Policies d'accès pour utilisateurs authentifiés
DROP POLICY IF EXISTS "Full access to omra_tracking_visas for authenticated" ON public.omra_tracking_visas;
CREATE POLICY "Full access to omra_tracking_visas for authenticated"
  ON public.omra_tracking_visas FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access to omra_tracking_billets for authenticated" ON public.omra_tracking_billets;
CREATE POLICY "Full access to omra_tracking_billets for authenticated"
  ON public.omra_tracking_billets FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access to omra_tracking_diwan for authenticated" ON public.omra_tracking_diwan;
CREATE POLICY "Full access to omra_tracking_diwan for authenticated"
  ON public.omra_tracking_diwan FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policy de lecture publique si besoin
DROP POLICY IF EXISTS "Public read omra_tracking_visas" ON public.omra_tracking_visas;
CREATE POLICY "Public read omra_tracking_visas" ON public.omra_tracking_visas FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public read omra_tracking_billets" ON public.omra_tracking_billets;
CREATE POLICY "Public read omra_tracking_billets" ON public.omra_tracking_billets FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public read omra_tracking_diwan" ON public.omra_tracking_diwan;
CREATE POLICY "Public read omra_tracking_diwan" ON public.omra_tracking_diwan FOR SELECT TO anon USING (true);
