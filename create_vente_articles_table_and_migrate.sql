-- ==============================================================================
-- MIGRATION: CRÉATION DE LA TABLE 'vente_articles' ET MIGRATION DES DONNÉES JSON
-- ==============================================================================

-- 1. Création de la table relationnelle vente_articles
CREATE TABLE IF NOT EXISTS public.vente_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vente_id UUID NOT NULL REFERENCES public.ventes(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  fournisseur_id UUID REFERENCES public.fournisseurs(id) ON DELETE SET NULL,
  designation TEXT NOT NULL DEFAULT 'Prestation',
  
  -- ── 3 Montants Financiers Clés ──────────────────────────────────────────
  -- Montant d'achat auprès du fournisseur (dépense agence)
  prix_achat NUMERIC NOT NULL DEFAULT 0,
  -- Commission / Marge brute / Bénéfice dégagé par l'agence
  commission NUMERIC NOT NULL DEFAULT 0,
  -- Montant de vente facturé au client (prix_achat + commission)
  prix_vente NUMERIC NOT NULL DEFAULT 0,
  
  -- ── Quantité & Destination ──────────────────────────────────────────────
  quantite NUMERIC NOT NULL DEFAULT 1,
  destination TEXT,
  
  -- ── Champs spécifiques pour la catégorie VISA ────────────────────────────
  visa_country_id UUID REFERENCES public.visa_countries(id) ON DELETE SET NULL,
  visa_type_id UUID REFERENCES public.visa_types(id) ON DELETE SET NULL,
  visa_dossier JSONB DEFAULT '[]'::jsonb,
  
  -- ── Champs spécifiques pour la catégorie BILLETTERIE ──────────────────────
  airline_id UUID REFERENCES public.airlines(id) ON DELETE SET NULL,
  compagnie_nom TEXT,
  numero_billet TEXT,
  pnr TEXT,
  itineraire TEXT,
  classe_vol TEXT,
  
  -- ── Champs spécifiques pour HÉBERGEMENT / AUTRES SERVICES ────────────────
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE SET NULL,
  details_specifiques JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  
  -- ── Ordre & Timestamps ───────────────────────────────────────────────────
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Création des Index pour optimiser les performances de jointure et filtres
CREATE INDEX IF NOT EXISTS idx_vente_articles_vente_id ON public.vente_articles(vente_id);
CREATE INDEX IF NOT EXISTS idx_vente_articles_service_id ON public.vente_articles(service_id);
CREATE INDEX IF NOT EXISTS idx_vente_articles_fournisseur_id ON public.vente_articles(fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_vente_articles_airline_id ON public.vente_articles(airline_id);
CREATE INDEX IF NOT EXISTS idx_vente_articles_visa_country_id ON public.vente_articles(visa_country_id);
CREATE INDEX IF NOT EXISTS idx_vente_articles_visa_type_id ON public.vente_articles(visa_type_id);
CREATE INDEX IF NOT EXISTS idx_vente_articles_created_at ON public.vente_articles(created_at);

-- 3. Activation de Row Level Security (RLS)
ALTER TABLE public.vente_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permettre tout accès sur vente_articles" ON public.vente_articles;
CREATE POLICY "Permettre tout accès sur vente_articles" 
ON public.vente_articles 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. Script de Migration automatique des données existantes
DO $$
DECLARE
  v_rec RECORD;
  art_elem JSONB;
  art_idx INTEGER;
  
  resolved_service_id UUID;
  resolved_fournisseur_id UUID;
  resolved_airline_id UUID;
  resolved_country_id UUID;
  resolved_visa_type_id UUID;
  
  v_pa NUMERIC;
  v_pv NUMERIC;
  v_comm NUMERIC;
  v_desig TEXT;
  v_dest TEXT;
  v_pnr TEXT;
  v_billet TEXT;
BEGIN
  -- Vider temporairement si déjà migré pour éviter les doublons lors de relances
  TRUNCATE TABLE public.vente_articles CASCADE;

  -- Boucle sur toutes les ventes existantes
  FOR v_rec IN SELECT * FROM public.ventes LOOP
    
    -- Si la vente a des articles dans la colonne JSONB
    IF v_rec.articles IS NOT NULL AND jsonb_typeof(v_rec.articles) = 'array' AND jsonb_array_length(v_rec.articles) > 0 THEN
      art_idx := 0;
      FOR art_elem IN SELECT * FROM jsonb_array_elements(v_rec.articles) LOOP
        art_idx := art_idx + 1;
        
        -- Extraction des montants
        v_pa := COALESCE(NULLIF(art_elem->>'prix_achat', '')::numeric, NULLIF(art_elem->>'tarif_base', '')::numeric, 0);
        v_pv := COALESCE(NULLIF(art_elem->>'prix_vente', '')::numeric, NULLIF(art_elem->>'total', '')::numeric, 0);
        v_comm := COALESCE(NULLIF(art_elem->>'commission', '')::numeric, (v_pv - v_pa), 0);
        
        -- Extraction de la désignation
        v_desig := COALESCE(NULLIF(art_elem->>'designation', ''), NULLIF(art_elem->>'description', ''), NULLIF(art_elem->>'details', ''), 'Prestation ' || COALESCE(art_elem->>'categorie', ''));
        v_dest := COALESCE(NULLIF(art_elem->>'destination', ''), v_rec.destination, '');
        
        -- Résolution du service_id
        resolved_service_id := NULL;
        IF art_elem->>'service_id' IS NOT NULL AND art_elem->>'service_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          resolved_service_id := (art_elem->>'service_id')::uuid;
        ELSIF art_elem->>'categorie' IS NOT NULL THEN
          SELECT id INTO resolved_service_id FROM public.services WHERE LOWER(nom) = LOWER(art_elem->>'categorie') LIMIT 1;
        END IF;
        IF resolved_service_id IS NULL THEN
          resolved_service_id := v_rec.service_id;
        END IF;
        
        -- Résolution du fournisseur_id
        resolved_fournisseur_id := NULL;
        IF art_elem->>'fournisseur_id' IS NOT NULL AND art_elem->>'fournisseur_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          resolved_fournisseur_id := (art_elem->>'fournisseur_id')::uuid;
        END IF;
        IF resolved_fournisseur_id IS NULL THEN
          resolved_fournisseur_id := v_rec.fournisseur_id;
        END IF;
        
        -- Résolution visa_country_id et visa_type_id
        resolved_country_id := NULL;
        IF art_elem->>'visa_country_id' IS NOT NULL AND art_elem->>'visa_country_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          resolved_country_id := (art_elem->>'visa_country_id')::uuid;
        END IF;
        
        resolved_visa_type_id := NULL;
        IF art_elem->>'visa_type_id' IS NOT NULL AND art_elem->>'visa_type_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          resolved_visa_type_id := (art_elem->>'visa_type_id')::uuid;
        END IF;
        
        -- Résolution airline_id
        resolved_airline_id := NULL;
        IF art_elem->>'airline_id' IS NOT NULL AND art_elem->>'airline_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          resolved_airline_id := (art_elem->>'airline_id')::uuid;
        END IF;
        
        v_pnr := art_elem->>'pnr';
        v_billet := art_elem->>'numero_billet';
        
        -- Insertion dans la table vente_articles
        INSERT INTO public.vente_articles (
          vente_id,
          service_id,
          fournisseur_id,
          designation,
          prix_achat,
          commission,
          prix_vente,
          quantite,
          destination,
          visa_country_id,
          visa_type_id,
          visa_dossier,
          airline_id,
          pnr,
          numero_billet,
          notes,
          ordre,
          created_at
        ) VALUES (
          v_rec.id,
          resolved_service_id,
          resolved_fournisseur_id,
          v_desig,
          v_pa,
          v_comm,
          v_pv,
          COALESCE(NULLIF(art_elem->>'quantite', '')::numeric, 1),
          v_dest,
          resolved_country_id,
          resolved_visa_type_id,
          COALESCE(art_elem->'visa_dossier', '[]'::jsonb),
          resolved_airline_id,
          v_pnr,
          v_billet,
          art_elem->>'notes',
          art_idx,
          COALESCE(v_rec.date_vente, v_rec.created_at, now())
        );
      END LOOP;
      
    ELSE
      -- Pour les ventes legacy sans tableau d'articles
      INSERT INTO public.vente_articles (
        vente_id,
        service_id,
        fournisseur_id,
        designation,
        prix_achat,
        commission,
        prix_vente,
        quantite,
        destination,
        ordre,
        created_at
      ) VALUES (
        v_rec.id,
        v_rec.service_id,
        v_rec.fournisseur_id,
        COALESCE(NULLIF(v_rec.details, ''), 'Prestation de vente'),
        COALESCE(v_rec.tarif_base, 0),
        COALESCE(v_rec.commission, 0),
        COALESCE(v_rec.total, 0),
        1,
        v_rec.destination,
        1,
        COALESCE(v_rec.date_vente, v_rec.created_at, now())
      );
    END IF;
    
  END LOOP;
END $$;

-- 5. Suppression définitive de l'ancienne colonne JSON 'articles' dans 'ventes'
ALTER TABLE public.ventes DROP COLUMN IF EXISTS articles;

-- 6. Rechargement du cache de schéma PostgREST
NOTIFY pgrst, 'reload schema';

COMMENT ON TABLE public.vente_articles IS 'Articles et prestations détaillés rattachés aux ventes, avec suivi financier strict (achat, commission, vente), catégories de service, fournisseurs et détails spécifiques (visas, vols)';
