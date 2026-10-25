-- ==============================================================================
-- MIGRATION : POCKETAPP / WEBVIEWAPP POUR ROLE 'MANAGER'
-- Table manager_devis + Support Rôle Manager + Storage Photos
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- ==============================================================================

-- 1. Permettre le rôle 'manager' dans la table profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'agent', 'client', 'manager'));

-- 2. Création de la table des devis transmis aux managers
CREATE TABLE IF NOT EXISTS public.manager_devis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES public.pipeline(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_nom TEXT,
    manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    manager_nom TEXT,
    manager_email TEXT,
    agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    agent_nom TEXT NOT NULL DEFAULT 'Agent',
    date_devis DATE DEFAULT CURRENT_DATE,
    date_depart DATE,
    date_retour DATE,
    destination TEXT,
    destination_emoji TEXT DEFAULT '📍',
    description_demande TEXT,
    notes_agent TEXT,
    priorite TEXT DEFAULT 'Moyenne',
    status TEXT DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'repondu', 'archive')),
    reponse_texte TEXT,
    reponse_photo_url TEXT,
    reponse_date TIMESTAMPTZ,
    reponse_manager_nom TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Index pour optimiser la réactivité de l'application mobile (PocketApp)
CREATE INDEX IF NOT EXISTS idx_manager_devis_manager ON public.manager_devis(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_devis_pipeline ON public.manager_devis(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_manager_devis_status ON public.manager_devis(status);
CREATE INDEX IF NOT EXISTS idx_manager_devis_created_at ON public.manager_devis(created_at DESC);

-- 3. Sécurité Row Level Security (RLS)
ALTER TABLE public.manager_devis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tous les acces manager_devis pour authentifies" ON public.manager_devis;
DROP POLICY IF EXISTS "Lecture manager_devis pour tous" ON public.manager_devis;
DROP POLICY IF EXISTS "Insertion manager_devis pour tous" ON public.manager_devis;
DROP POLICY IF EXISTS "Mise a jour manager_devis pour tous" ON public.manager_devis;
DROP POLICY IF EXISTS "Suppression manager_devis pour tous" ON public.manager_devis;

CREATE POLICY "Tous les acces manager_devis pour authentifies" ON public.manager_devis 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Lecture manager_devis pour tous" ON public.manager_devis 
    FOR SELECT TO anon USING (true);

CREATE POLICY "Insertion manager_devis pour tous" ON public.manager_devis 
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Mise a jour manager_devis pour tous" ON public.manager_devis 
    FOR UPDATE TO anon USING (true);

CREATE POLICY "Suppression manager_devis pour tous" ON public.manager_devis 
    FOR DELETE TO anon USING (true);

-- 4. Bucket de stockage pour les photos réponses des managers
INSERT INTO storage.buckets (id, name, public) 
VALUES ('manager_devis_photos', 'manager_devis_photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Lecture photos devis manager" ON storage.objects;
DROP POLICY IF EXISTS "Upload photos devis manager" ON storage.objects;
DROP POLICY IF EXISTS "Update photos devis manager" ON storage.objects;

CREATE POLICY "Lecture photos devis manager" ON storage.objects
    FOR SELECT USING (bucket_id = 'manager_devis_photos');

CREATE POLICY "Upload photos devis manager" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'manager_devis_photos');

CREATE POLICY "Update photos devis manager" ON storage.objects
    FOR UPDATE USING (bucket_id = 'manager_devis_photos');

-- 5. Optionnel : Donner le rôle 'manager' à un utilisateur existant pour tester
-- UPDATE public.profiles SET role = 'manager' WHERE email = 'votre_email@domaine.com';
