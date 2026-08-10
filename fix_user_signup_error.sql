-- ==============================================================================
-- FIX : ERREUR "Database error saving new user"
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- ==============================================================================

-- 1. Autoriser le rôle 'client' en plus de 'admin' et 'agent' dans la table profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'agent', 'client'));

-- 2. Sécuriser et optimiser la fonction de création automatique de profil
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
    -- En cas d'erreur de profil, ne jamais bloquer la création de l'utilisateur dans auth.users
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Rebrancher le trigger sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Assurer les politiques RLS sur la table profiles
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

-- 5. Assurer les politiques RLS sur la table clients
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
