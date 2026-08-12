-- ==============================================================================
-- SCRIPT DE MIGRATION : REMARQUES DE L'ÉQUIPE SUR LES CLIENTS
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- ==============================================================================

-- 1. Création de la table 'client_remarques'
CREATE TABLE IF NOT EXISTS public.client_remarques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    auteur_nom TEXT NOT NULL,
    auteur_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    auteur_role TEXT DEFAULT 'agent',
    remarque TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Activation de la sécurité RLS
ALTER TABLE public.client_remarques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tous les acces client_remarques pour authentifies" ON public.client_remarques;
DROP POLICY IF EXISTS "Lecture client_remarques pour tous" ON public.client_remarques;
DROP POLICY IF EXISTS "Insertion client_remarques pour tous" ON public.client_remarques;
DROP POLICY IF EXISTS "Suppression client_remarques pour tous" ON public.client_remarques;

CREATE POLICY "Tous les acces client_remarques pour authentifies" ON public.client_remarques
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Lecture client_remarques pour tous" ON public.client_remarques
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "Insertion client_remarques pour tous" ON public.client_remarques
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Suppression client_remarques pour tous" ON public.client_remarques
    FOR DELETE TO anon
    USING (true);

-- 3. Ajout de la colonne JSONB de compatibilité sur la table clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS remarques JSONB DEFAULT '[]'::jsonb;
