-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT services_pkey PRIMARY KEY (id)
);
CREATE TABLE public.fournisseurs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT fournisseurs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.compagnies_aeriennes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  nom text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT compagnies_aeriennes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.intermediaires (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT intermediaires_pkey PRIMARY KEY (id)
);
CREATE TABLE public.hotels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  location text NOT NULL,
  nbr_etoiles text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT hotels_pkey PRIMARY KEY (id)
);
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  email text,
  telephone text,
  type text DEFAULT 'Particulier'::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pipeline (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nom_prospect text NOT NULL,
  email text,
  phone text,
  service_id uuid,
  details_demande text,
  details_devis text,
  devis_ia text,
  status text DEFAULT 'Nouveau'::text,
  date_creation timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  client_id uuid,
  CONSTRAINT pipeline_pkey PRIMARY KEY (id),
  CONSTRAINT pipeline_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id),
  CONSTRAINT pipeline_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.ventes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date_vente timestamp with time zone DEFAULT timezone('utc'::text, now()),
  client_nom text NOT NULL,
  client_id uuid,
  details text,
  fournisseur_id uuid,
  service_id uuid,
  tarif_base numeric DEFAULT 0,
  commission numeric DEFAULT 0,
  total numeric DEFAULT 0,
  etat text DEFAULT 'Reservé'::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT ventes_pkey PRIMARY KEY (id),
  CONSTRAINT ventes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT ventes_fournisseur_id_fkey FOREIGN KEY (fournisseur_id) REFERENCES public.fournisseurs(id),
  CONSTRAINT ventes_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.factures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type_doc text NOT NULL,
  transaction_id text NOT NULL,
  client_nom text NOT NULL,
  taxe numeric DEFAULT 0,
  deadline timestamp with time zone,
  moyen_paiement text,
  total_ht numeric DEFAULT 0,
  total_ttc numeric DEFAULT 0,
  date_creation timestamp with time zone DEFAULT timezone('utc'::text, now()),
  details text,
  service_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT factures_pkey PRIMARY KEY (id),
  CONSTRAINT factures_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.omra_groupes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nom text NOT NULL,
  date_depart date,
  date_retour date,
  compagnie text,
  nbr_places integer,
  hotels jsonb,
  tarif_billet numeric,
  reduction_chd_vol numeric,
  gratuites integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT omra_groupes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.omra_depenses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  titre text NOT NULL,
  categorie text,
  date_depense date,
  reference_paiement text,
  montant_original numeric,
  devise text,
  taux_change numeric,
  montant_dzd numeric,
  groupe_ids jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT omra_depenses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.omra_enregistrements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  groupe_id uuid,
  chambre_id text,
  hotel_id text,
  type_chambre text,
  pelerins jsonb,
  enfants_sans_lit jsonb,
  intermediaire_id uuid,
  paiement_rabatteur boolean,
  commission_custom numeric,
  telephone text,
  note text,
  reduction numeric,
  total_chambre numeric,
  total_resto numeric,
  total_enfants_sans_lit numeric,
  total_brut numeric,
  total_commission numeric,
  total_net numeric,
  date_creation timestamp with time zone DEFAULT now(),
  client_id uuid,
  CONSTRAINT omra_enregistrements_pkey PRIMARY KEY (id),
  CONSTRAINT omra_enregistrements_groupe_id_fkey FOREIGN KEY (groupe_id) REFERENCES public.omra_groupes(id),
  CONSTRAINT omra_enregistrements_intermediaire_id_fkey FOREIGN KEY (intermediaire_id) REFERENCES public.intermediaires(id),
  CONSTRAINT omra_enregistrements_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.omra_paiements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  groupe_id uuid,
  enregistrement_id uuid,
  nom_client text,
  date_paiement date,
  num_bon text,
  montant_original numeric,
  devise text,
  taux_change numeric,
  montant_dzd numeric,
  paiement_rabatteur boolean,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT omra_paiements_pkey PRIMARY KEY (id),
  CONSTRAINT omra_paiements_groupe_id_fkey FOREIGN KEY (groupe_id) REFERENCES public.omra_groupes(id),
  CONSTRAINT omra_paiements_enregistrement_id_fkey FOREIGN KEY (enregistrement_id) REFERENCES public.omra_enregistrements(id)
);
CREATE TABLE public.omra_paiements_commissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  groupe_id uuid,
  intermediaire_id uuid,
  montant numeric,
  date date,
  note text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT omra_paiements_commissions_pkey PRIMARY KEY (id),
  CONSTRAINT omra_paiements_commissions_groupe_id_fkey FOREIGN KEY (groupe_id) REFERENCES public.omra_groupes(id),
  CONSTRAINT omra_paiements_commissions_intermediaire_id_fkey FOREIGN KEY (intermediaire_id) REFERENCES public.intermediaires(id)
);
CREATE TABLE public.outcomes_enveloppes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  type_enveloppe text NOT NULL DEFAULT 'standard'::text,
  fournisseur_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT outcomes_enveloppes_pkey PRIMARY KEY (id),
  CONSTRAINT outcomes_enveloppes_fournisseur_id_fkey FOREIGN KEY (fournisseur_id) REFERENCES public.fournisseurs(id)
);
CREATE TABLE public.outcomes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  enveloppe_id uuid NOT NULL,
  montant numeric NOT NULL,
  devise text NOT NULL DEFAULT 'DZD'::text,
  taux_change numeric,
  montant_dzd numeric NOT NULL,
  reference_paiement text,
  date_paiement date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  sous_enveloppe_id uuid NOT NULL,
  description text,
  CONSTRAINT outcomes_pkey PRIMARY KEY (id),
  CONSTRAINT outcomes_enveloppe_id_fkey FOREIGN KEY (enveloppe_id) REFERENCES public.outcomes_enveloppes(id),
  CONSTRAINT outcomes_sous_enveloppe_id_fkey FOREIGN KEY (sous_enveloppe_id) REFERENCES public.outcomes_sous_enveloppes(id)
);
CREATE TABLE public.outcomes_sous_enveloppes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  enveloppe_id uuid NOT NULL,
  nom text NOT NULL,
  service_ids jsonb,
  compagnie text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT outcomes_sous_enveloppes_pkey PRIMARY KEY (id),
  CONSTRAINT outcomes_sous_enveloppes_enveloppe_id_fkey FOREIGN KEY (enveloppe_id) REFERENCES public.outcomes_enveloppes(id)
);
CREATE TABLE public.ai_settings (
  id integer NOT NULL DEFAULT 1,
  api_key text,
  system_prompt text,
  model_name text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT ai_settings_pkey PRIMARY KEY (id)
);