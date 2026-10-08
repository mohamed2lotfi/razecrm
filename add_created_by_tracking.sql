-- ==============================================================================
-- MIGRATION : AJOUT DE LA TRAÇABILITÉ DES CRÉATEURS ("FAIT PAR")
-- TABLES CONCERNÉES :
--   - public.ventes
--   - public.vente_paiements
--   - public.omra_enregistrements
--   - public.omra_paiements
--   - public.omra_paiements_commissions
--   - public.omra_groupes
-- ==============================================================================

-- 1. Ajout des colonnes 'created_by' et 'created_by_name'
ALTER TABLE public.ventes 
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

ALTER TABLE public.vente_paiements 
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

ALTER TABLE public.omra_enregistrements 
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

ALTER TABLE public.omra_paiements 
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

ALTER TABLE public.omra_paiements_commissions 
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

ALTER TABLE public.omra_groupes 
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- 2. Création d'index pour optimiser les filtres et les recherches par agent
CREATE INDEX IF NOT EXISTS idx_ventes_created_by ON public.ventes(created_by);
CREATE INDEX IF NOT EXISTS idx_vente_paiements_created_by ON public.vente_paiements(created_by);
CREATE INDEX IF NOT EXISTS idx_omra_enregistrements_created_by ON public.omra_enregistrements(created_by);
CREATE INDEX IF NOT EXISTS idx_omra_paiements_created_by ON public.omra_paiements(created_by);

-- 3. Migration des données existantes : rattacher toutes les ventes et paiements actuels à l'Administrateur
DO $$
DECLARE
  v_admin_id UUID;
  v_admin_nom TEXT;
BEGIN
  -- Trouver l'administrateur principal (dans profiles ou auth.users)
  SELECT id, nom INTO v_admin_id, v_admin_nom 
  FROM public.profiles 
  WHERE role = 'admin' 
  ORDER BY created_at ASC 
  LIMIT 1;

  -- Si aucun profil admin n'est trouvé, chercher le premier profil existant
  IF v_admin_id IS NULL THEN
    SELECT id, nom INTO v_admin_id, v_admin_nom 
    FROM public.profiles 
    ORDER BY created_at ASC 
    LIMIT 1;
  END IF;

  -- Si toujours nul, chercher dans auth.users
  IF v_admin_id IS NULL THEN
    SELECT id, email INTO v_admin_id, v_admin_nom 
    FROM auth.users 
    ORDER BY created_at ASC 
    LIMIT 1;
  END IF;

  -- Nom de repli si le nom est vide
  IF v_admin_nom IS NULL OR v_admin_nom = '' THEN
    v_admin_nom := 'Administrateur';
  END IF;

  -- Mise à jour des enregistrements existants (si created_by est NULL)
  IF v_admin_id IS NOT NULL THEN
    -- Ventes
    UPDATE public.ventes 
    SET created_by = v_admin_id,
        created_by_name = COALESCE(created_by_name, v_admin_nom)
    WHERE created_by IS NULL;

    -- Paiements Ventes
    UPDATE public.vente_paiements 
    SET created_by = v_admin_id,
        created_by_name = COALESCE(created_by_name, v_admin_nom)
    WHERE created_by IS NULL;

    -- Enregistrements Omra
    UPDATE public.omra_enregistrements 
    SET created_by = v_admin_id,
        created_by_name = COALESCE(created_by_name, v_admin_nom)
    WHERE created_by IS NULL;

    -- Paiements Omra
    UPDATE public.omra_paiements 
    SET created_by = v_admin_id,
        created_by_name = COALESCE(created_by_name, v_admin_nom)
    WHERE created_by IS NULL;

    -- Commissions Omra
    UPDATE public.omra_paiements_commissions 
    SET created_by = v_admin_id,
        created_by_name = COALESCE(created_by_name, v_admin_nom)
    WHERE created_by IS NULL;

    -- Groupes Omra
    UPDATE public.omra_groupes 
    SET created_by = v_admin_id,
        created_by_name = COALESCE(created_by_name, v_admin_nom)
    WHERE created_by IS NULL;
  ELSE
    -- Au cas où aucune table utilisateur n'est encore peuplée, définir le nom générique
    UPDATE public.ventes SET created_by_name = 'Administrateur' WHERE created_by_name IS NULL;
    UPDATE public.vente_paiements SET created_by_name = 'Administrateur' WHERE created_by_name IS NULL;
    UPDATE public.omra_enregistrements SET created_by_name = 'Administrateur' WHERE created_by_name IS NULL;
    UPDATE public.omra_paiements SET created_by_name = 'Administrateur' WHERE created_by_name IS NULL;
  END IF;

  -- Synchroniser les noms à partir des profils pour toute ligne ayant un created_by mais sans nom
  UPDATE public.ventes v
  SET created_by_name = p.nom
  FROM public.profiles p
  WHERE v.created_by = p.id AND (v.created_by_name IS NULL OR v.created_by_name = '');

  UPDATE public.vente_paiements vp
  SET created_by_name = p.nom
  FROM public.profiles p
  WHERE vp.created_by = p.id AND (vp.created_by_name IS NULL OR vp.created_by_name = '');

  UPDATE public.omra_enregistrements oe
  SET created_by_name = p.nom
  FROM public.profiles p
  WHERE oe.created_by = p.id AND (oe.created_by_name IS NULL OR oe.created_by_name = '');

  UPDATE public.omra_paiements op
  SET created_by_name = p.nom
  FROM public.profiles p
  WHERE op.created_by = p.id AND (op.created_by_name IS NULL OR op.created_by_name = '');

END $$;

COMMENT ON COLUMN public.ventes.created_by IS 'Identifiant UUID de l''utilisateur (agent/admin) ayant créé la vente';
COMMENT ON COLUMN public.ventes.created_by_name IS 'Nom ou identifiant de l''agent ayant créé la vente';
COMMENT ON COLUMN public.vente_paiements.created_by IS 'Identifiant UUID de l''utilisateur ayant encaissé le paiement';
COMMENT ON COLUMN public.vente_paiements.created_by_name IS 'Nom de l''agent ayant encaissé le paiement';
COMMENT ON COLUMN public.omra_enregistrements.created_by IS 'Identifiant UUID de l''agent ayant inscrit le pèlerin / dossier';
COMMENT ON COLUMN public.omra_enregistrements.created_by_name IS 'Nom de l''agent ayant inscrit le pèlerin / dossier';
COMMENT ON COLUMN public.omra_paiements.created_by IS 'Identifiant UUID de l''agent ayant enregistré le versement Omra';
COMMENT ON COLUMN public.omra_paiements.created_by_name IS 'Nom de l''agent ayant enregistré le versement Omra';
