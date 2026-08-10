-- ==============================================================================
-- SCRIPT DE CRÉATION DE LA TABLE PELERINS & MIGRATION DES DONNÉES EXISTANTES
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- ==============================================================================

-- 1. Création de la table pelerins
CREATE TABLE IF NOT EXISTS public.pelerins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    prenom TEXT,
    sexe TEXT DEFAULT 'H' CHECK (sexe IN ('H', 'F')),
    date_naissance DATE,
    num_passeport TEXT,
    date_expiration_passeport DATE,
    nationalite TEXT DEFAULT 'Algérienne',
    telephone TEXT,
    photo_url TEXT,
    num_visa TEXT,
    notes TEXT,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Création des Index pour des recherches rapides
CREATE INDEX IF NOT EXISTS idx_pelerins_nom ON public.pelerins(nom);
CREATE INDEX IF NOT EXISTS idx_pelerins_num_passeport ON public.pelerins(num_passeport);
CREATE INDEX IF NOT EXISTS idx_pelerins_telephone ON public.pelerins(telephone);
CREATE INDEX IF NOT EXISTS idx_pelerins_client_id ON public.pelerins(client_id);

-- 3. Activation de la sécurité RLS
ALTER TABLE public.pelerins ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS (Lecture & Gestion complètes pour les utilisateurs authentifiés)
DROP POLICY IF EXISTS "Lecture pelerins authentifié" ON public.pelerins;
CREATE POLICY "Lecture pelerins authentifié" ON public.pelerins
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Insertion pelerins authentifié" ON public.pelerins;
CREATE POLICY "Insertion pelerins authentifié" ON public.pelerins
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Modification pelerins authentifié" ON public.pelerins;
CREATE POLICY "Modification pelerins authentifié" ON public.pelerins
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Suppression pelerins authentifié" ON public.pelerins;
CREATE POLICY "Suppression pelerins authentifié" ON public.pelerins
    FOR DELETE TO authenticated USING (true);

-- 5. Procédure de Migration et Rétro-liaison automatique (Idempotente)
DO $$
DECLARE
    rec RECORD;
    p_item JSONB;
    enf_item JSONB;
    new_p_id UUID;
    existing_p_id UUID;
    updated_pelerins JSONB;
    updated_enfants JSONB;
    p_nom TEXT;
    p_sexe TEXT;
BEGIN
    FOR rec IN SELECT id, pelerins, enfants_sans_lit, telephone, client_id FROM public.omra_enregistrements LOOP
        updated_pelerins := '[]'::jsonb;
        updated_enfants := '[]'::jsonb;

        -- Traitement des pèlerins dans 'pelerins'
        IF rec.pelerins IS NOT NULL AND jsonb_typeof(rec.pelerins) = 'array' THEN
            FOR p_item IN SELECT * FROM jsonb_array_elements(rec.pelerins) LOOP
                p_nom := TRIM(COALESCE(p_item->>'nom', ''));
                p_sexe := COALESCE(p_item->>'sexe', 'H');
                
                -- Vérifier si un pelerin_id existe déjà
                IF p_item ? 'pelerin_id' AND (p_item->>'pelerin_id') IS NOT NULL AND (p_item->>'pelerin_id') <> '' THEN
                    updated_pelerins := updated_pelerins || p_item;
                ELSIF p_nom <> '' THEN
                    -- Créer un nouveau pèlerin dans la table
                    new_p_id := gen_random_uuid();
                    INSERT INTO public.pelerins (id, nom, sexe, telephone, client_id)
                    VALUES (
                        new_p_id, 
                        p_nom, 
                        CASE WHEN p_sexe IN ('H', 'F') THEN p_sexe ELSE 'H' END, 
                        rec.telephone, 
                        rec.client_id
                    );

                    -- Mettre à jour l'objet JSON avec pelerin_id
                    updated_pelerins := updated_pelerins || (p_item || jsonb_build_object('pelerin_id', new_p_id));
                ELSE
                    updated_pelerins := updated_pelerins || p_item;
                END IF;
            END LOOP;
        END IF;

        -- Traitement des enfants sans lit dans 'enfants_sans_lit'
        IF rec.enfants_sans_lit IS NOT NULL AND jsonb_typeof(rec.enfants_sans_lit) = 'array' THEN
            FOR enf_item IN SELECT * FROM jsonb_array_elements(rec.enfants_sans_lit) LOOP
                p_nom := TRIM(COALESCE(enf_item->>'nom', ''));

                IF enf_item ? 'pelerin_id' AND (enf_item->>'pelerin_id') IS NOT NULL AND (enf_item->>'pelerin_id') <> '' THEN
                    updated_enfants := updated_enfants || enf_item;
                ELSIF p_nom <> '' THEN
                    new_p_id := gen_random_uuid();
                    INSERT INTO public.pelerins (id, nom, sexe, telephone, client_id)
                    VALUES (new_p_id, p_nom, 'H', rec.telephone, rec.client_id);

                    updated_enfants := updated_enfants || (enf_item || jsonb_build_object('pelerin_id', new_p_id));
                ELSE
                    updated_enfants := updated_enfants || enf_item;
                END IF;
            END LOOP;
        END IF;

        -- Mettre à jour l'enregistrement avec les tableaux JSON enrichis
        UPDATE public.omra_enregistrements
        SET pelerins = updated_pelerins,
            enfants_sans_lit = updated_enfants
        WHERE id = rec.id;
    END LOOP;
END $$;
