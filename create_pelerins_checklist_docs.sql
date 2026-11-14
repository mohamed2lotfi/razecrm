-- ==============================================================================
-- SCRIPT DE MIGRATION : CHECKLIST DES DOCUMENTS PAR PÈLERIN (MUATAMIR)
-- 4 Documents suivis : Visa, Billet, Badge, Contrat
-- ==============================================================================

-- 1. Ajout de la colonne checklist_docs à la table pelerins si elle existe
ALTER TABLE public.pelerins
ADD COLUMN IF NOT EXISTS checklist_docs JSONB DEFAULT '{"visa": false, "billet": false, "badge": false, "contrat": false, "remarque": ""}'::jsonb;

-- 2. Index GIN pour des recherches rapides sur les documents pèlerins
CREATE INDEX IF NOT EXISTS idx_pelerins_checklist_docs ON public.pelerins USING GIN (checklist_docs);

-- 3. Commentaires explicatifs
COMMENT ON COLUMN public.pelerins.checklist_docs IS 'Checklist de suivi des 4 documents du pèlerin : visa, billet, badge, contrat';

-- 4. Note d'intégration pour les groupes CRM :
-- Les documents sont également persistés directement au niveau de chaque pèlerin dans les colonnes
-- "pelerins" et "enfants_sans_lit" (JSONB) de la table public.omra_enregistrements.
