-- ==============================================================================
-- SCRIPT DE MIGRATION GLOBAL : PROFILS, RÔLES ET SÉCURITÉ SUPABASE
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- ==============================================================================

-- 1. Création de la table 'profiles' dans le schéma public
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nom TEXT,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'agent', 'client')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Mise à jour de la contrainte si la table existait déjà
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'agent', 'client'));

-- 2. Activation et politiques RLS sur profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tous les acces profils pour authentifies" ON public.profiles;
DROP POLICY IF EXISTS "Lecture profils pour tous" ON public.profiles;
DROP POLICY IF EXISTS "Insertion profils pour tous" ON public.profiles;

CREATE POLICY "Tous les acces profils pour authentifies" ON public.profiles
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Lecture profils pour tous" ON public.profiles
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "Insertion profils pour tous" ON public.profiles
    FOR INSERT TO anon
    WITH CHECK (true);

-- 3. Fonction & Trigger pour créer automatiquement un profil à chaque nouvel utilisateur Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nom, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nom', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'client')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        nom = COALESCE(EXCLUDED.nom, public.profiles.nom),
        role = COALESCE(public.profiles.role, EXCLUDED.role);
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Initialisation des utilisateurs existants avec le rôle 'admin' par défaut
INSERT INTO public.profiles (id, email, nom, role)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'nom', split_part(email, '@', 1)),
    'admin'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 5. Politiques RLS pour la table employees (RH)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tous les acces employes pour authentifies" ON public.employees;

CREATE POLICY "Tous les acces employes pour authentifies" ON public.employees
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Politiques RLS pour la table clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tous les acces clients pour authentifies" ON public.clients;
DROP POLICY IF EXISTS "Insertion clients public" ON public.clients;

CREATE POLICY "Tous les acces clients pour authentifies" ON public.clients
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Insertion clients public" ON public.clients
    FOR INSERT TO anon
    WITH CHECK (true);
