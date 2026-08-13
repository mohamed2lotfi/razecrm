-- ==============================================================================
-- SCRIPT : CRÉATION DU STORAGE BUCKET 'website-sliders' DANS SUPABASE
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- ==============================================================================

-- 1. Création du Bucket de stockage public 'website-sliders'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'website-sliders', 
    'website-sliders', 
    true, 
    10485760, -- Limite de 10 Mo par image
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml'];

-- 2. Politiques de sécurité RLS pour le bucket 'website-sliders'
DROP POLICY IF EXISTS "Public Access website-sliders" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload website-sliders" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update website-sliders" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete website-sliders" ON storage.objects;

-- Lecture publique : accessible à tout le monde (visiteurs du site web)
CREATE POLICY "Public Access website-sliders" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'website-sliders');

-- Upload pour utilisateurs authentifiés (CRM Admin / Agents)
CREATE POLICY "Authenticated upload website-sliders" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'website-sliders');

-- Mise à jour pour utilisateurs authentifiés
CREATE POLICY "Authenticated update website-sliders" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'website-sliders');

-- Suppression pour utilisateurs authentifiés
CREATE POLICY "Authenticated delete website-sliders" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'website-sliders');
