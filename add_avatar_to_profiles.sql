-- Script de mise à jour pour ajouter l'avatar et les champs de profil
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telephone text;

-- Création du bucket de stockage pour les avatars si nécessaire
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Politique pour permettre aux utilisateurs authentifiés d'uploader leur avatar
DROP POLICY IF EXISTS "Avatar public access" ON storage.objects;
CREATE POLICY "Avatar public access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar upload for authenticated" ON storage.objects;
CREATE POLICY "Avatar upload for authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar update for authenticated" ON storage.objects;
CREATE POLICY "Avatar update for authenticated"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');
