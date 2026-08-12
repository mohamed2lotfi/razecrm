-- ==============================================================================
-- MIGRATION : TABLES DÉDIÉES POUR LES DEVIS (SIMULATIONS & REMARQUES DEVIS)
-- ==============================================================================

-- 1. Table des Simulations de Devis (Plusieurs simulations par demande de devis)
CREATE TABLE IF NOT EXISTS public.devis_simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES public.pipeline(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    nom TEXT NOT NULL DEFAULT 'Simulation Standard',
    total_devis NUMERIC DEFAULT 0,
    chambres JSONB DEFAULT '[]'::jsonb,
    pax_counts JSONB DEFAULT '{}'::jsonb,
    calculation JSONB DEFAULT '{}'::jsonb,
    cost_items JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Index de performance pour les simulations
CREATE INDEX IF NOT EXISTS idx_devis_simulations_pipeline ON public.devis_simulations(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_devis_simulations_client ON public.devis_simulations(client_id);

-- Sécurité RLS pour devis_simulations
ALTER TABLE public.devis_simulations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tous les acces devis_simulations pour authentifies" ON public.devis_simulations;
DROP POLICY IF EXISTS "Lecture devis_simulations pour tous" ON public.devis_simulations;
DROP POLICY IF EXISTS "Insertion devis_simulations pour tous" ON public.devis_simulations;
DROP POLICY IF EXISTS "Mise a jour devis_simulations pour tous" ON public.devis_simulations;
DROP POLICY IF EXISTS "Suppression devis_simulations pour tous" ON public.devis_simulations;

CREATE POLICY "Tous les acces devis_simulations pour authentifies" ON public.devis_simulations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Lecture devis_simulations pour tous" ON public.devis_simulations FOR SELECT TO anon USING (true);
CREATE POLICY "Insertion devis_simulations pour tous" ON public.devis_simulations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Mise a jour devis_simulations pour tous" ON public.devis_simulations FOR UPDATE TO anon USING (true);
CREATE POLICY "Suppression devis_simulations pour tous" ON public.devis_simulations FOR DELETE TO anon USING (true);

-- ------------------------------------------------------------------------------

-- 2. Table des Remarques Internes sur les Devis
CREATE TABLE IF NOT EXISTS public.devis_remarques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES public.pipeline(id) ON DELETE CASCADE,
    auteur_nom TEXT NOT NULL,
    auteur_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    auteur_role TEXT DEFAULT 'agent',
    remarque TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Index de performance pour les remarques devis
CREATE INDEX IF NOT EXISTS idx_devis_remarques_pipeline ON public.devis_remarques(pipeline_id);

-- Sécurité RLS pour devis_remarques
ALTER TABLE public.devis_remarques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tous les acces devis_remarques pour authentifies" ON public.devis_remarques;
DROP POLICY IF EXISTS "Lecture devis_remarques pour tous" ON public.devis_remarques;
DROP POLICY IF EXISTS "Insertion devis_remarques pour tous" ON public.devis_remarques;
DROP POLICY IF EXISTS "Suppression devis_remarques pour tous" ON public.devis_remarques;

CREATE POLICY "Tous les acces devis_remarques pour authentifies" ON public.devis_remarques FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Lecture devis_remarques pour tous" ON public.devis_remarques FOR SELECT TO anon USING (true);
CREATE POLICY "Insertion devis_remarques pour tous" ON public.devis_remarques FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Suppression devis_remarques pour tous" ON public.devis_remarques FOR DELETE TO anon USING (true);
