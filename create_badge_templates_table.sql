-- Migration : Création de la table des templates de badges
CREATE TABLE IF NOT EXISTS public.badge_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nom text NOT NULL DEFAULT 'Modèle de Badge Omra',
  width_mm integer DEFAULT 86,
  height_mm integer DEFAULT 54,
  orientation text DEFAULT 'horizontal', -- 'horizontal' ou 'vertical'
  background_url text,
  tokens jsonb DEFAULT '[]'::jsonb,
  is_default boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT badge_templates_pkey PRIMARY KEY (id)
);

-- Activation de RLS
ALTER TABLE public.badge_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "badge_templates_select" ON public.badge_templates;
CREATE POLICY "badge_templates_select" ON public.badge_templates
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "badge_templates_all" ON public.badge_templates;
CREATE POLICY "badge_templates_all" ON public.badge_templates
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
