-- Migration : Ajout des colonnes code et checklist à la table omra_groupes

ALTER TABLE public.omra_groupes
ADD COLUMN IF NOT EXISTS code text,
ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb;

-- Index pour recherche rapide par code
CREATE INDEX IF NOT EXISTS idx_omra_groupes_code ON public.omra_groupes(code);
