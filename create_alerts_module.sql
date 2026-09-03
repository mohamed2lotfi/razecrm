-- ==============================================================================
-- SCRIPT DE MIGRATION GLOBAL : MODULE ALERTES & NOTIFICATIONS MULTI-AGENTS
-- CRM Agence El-Mokhtar - Dialecte: PostgreSQL 14+ / Supabase
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- ==============================================================================

-- 1. Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Types ENUM
DO $$ BEGIN
    CREATE TYPE alert_priority_enum AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_status_enum AS ENUM ('draft', 'scheduled', 'active', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. Table Principale : alerts (Données du message & métadonnées globales)
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    priority alert_priority_enum NOT NULL DEFAULT 'normal',
    status alert_status_enum NOT NULL DEFAULT 'active',
    alert_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    
    -- Référence polymorphe optionnelle (ex: 'client', 'pipeline', 'devis', 'omra_groupe')
    entity_type VARCHAR(50) DEFAULT NULL,
    entity_id UUID DEFAULT NULL,
    
    -- Métadonnées extensibles (liens de redirection, tags, action buttons)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit & Auteur
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Table de Jonction & Statut par Agent : alert_recipients
CREATE TABLE IF NOT EXISTS public.alert_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Statut individuel par agent
    is_seen BOOLEAN NOT NULL DEFAULT FALSE,
    seen_at TIMESTAMPTZ DEFAULT NULL,
    
    is_done BOOLEAN NOT NULL DEFAULT FALSE,
    done_at TIMESTAMPTZ DEFAULT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    
    -- Unicité pour éviter les doublons d'attribution
    CONSTRAINT uq_alert_recipient UNIQUE (alert_id, recipient_id)
);

-- ==============================================================================
-- 5. INDEX DE PERFORMANCE
-- ==============================================================================

-- Index filtré ultra-rapide pour le compteur badge de la cloche (Bell Icon)
CREATE INDEX IF NOT EXISTS idx_alert_recipients_unseen_badge
    ON public.alert_recipients (recipient_id)
    WHERE is_seen = FALSE;

-- Index pour le flux de notifications de l'agent
CREATE INDEX IF NOT EXISTS idx_alert_recipients_feed
    ON public.alert_recipients (recipient_id, is_done, created_at DESC);

-- Index pour les jointures et cascades
CREATE INDEX IF NOT EXISTS idx_alert_recipients_alert_id
    ON public.alert_recipients (alert_id);

CREATE INDEX IF NOT EXISTS idx_alerts_entity
    ON public.alerts (entity_type, entity_id);

-- Index pour le Worker Cron (alertes planifiées prêtes à déclencher)
CREATE INDEX IF NOT EXISTS idx_alerts_cron_trigger
    ON public.alerts (alert_at, status)
    WHERE status = 'scheduled';

-- ==============================================================================
-- 6. TRIGGERS AUTO-UPDATE (updated_at)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_alerts_updated_at ON public.alerts;
CREATE TRIGGER trg_alerts_updated_at
    BEFORE UPDATE ON public.alerts
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_alert_recipients_updated_at ON public.alert_recipients;
CREATE TRIGGER trg_alert_recipients_updated_at
    BEFORE UPDATE ON public.alert_recipients
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ==============================================================================
-- 7. SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture alertes pour tous authentifies" ON public.alerts;
DROP POLICY IF EXISTS "Creation alertes pour authentifies" ON public.alerts;
DROP POLICY IF EXISTS "Modification alertes pour auteur" ON public.alerts;
DROP POLICY IF EXISTS "Suppression alertes pour auteur" ON public.alerts;

-- Politiques sur ALERTS
CREATE POLICY "Lecture alertes pour tous authentifies"
    ON public.alerts FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Creation alertes pour authentifies"
    ON public.alerts FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Modification alertes pour auteur"
    ON public.alerts FOR UPDATE TO authenticated
    USING (created_by = auth.uid() OR created_by IS NULL)
    WITH CHECK (true);

CREATE POLICY "Suppression alertes pour auteur ou admin"
    ON public.alerts FOR DELETE TO authenticated
    USING (
        created_by = auth.uid() 
        OR created_by IS NULL 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Politiques sur ALERT_RECIPIENTS
DROP POLICY IF EXISTS "Lecture destinataires pour authentifies" ON public.alert_recipients;
DROP POLICY IF EXISTS "Insertion destinataires pour authentifies" ON public.alert_recipients;
DROP POLICY IF EXISTS "Mise a jour statut par destinataire" ON public.alert_recipients;
DROP POLICY IF EXISTS "Suppression destinataires pour authentifies" ON public.alert_recipients;

CREATE POLICY "Lecture destinataires pour authentifies"
    ON public.alert_recipients FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Insertion destinataires pour authentifies"
    ON public.alert_recipients FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Mise a jour statut par destinataire"
    ON public.alert_recipients FOR UPDATE TO authenticated
    USING (recipient_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (true);

CREATE POLICY "Suppression destinataires pour authentifies"
    ON public.alert_recipients FOR DELETE TO authenticated
    USING (recipient_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==============================================================================
-- 8. FONCTION RPC ATOMIQUE : Création d'alerte multi-destinataires
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_alert_with_recipients(
    p_title VARCHAR(255),
    p_content TEXT,
    p_priority alert_priority_enum DEFAULT 'normal',
    p_alert_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    p_entity_type VARCHAR(50) DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_recipient_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_alert_id UUID;
    v_recipient UUID;
    v_status alert_status_enum;
BEGIN
    -- Détermination du statut selon la date d'alerte
    IF p_alert_at > timezone('utc'::text, now()) THEN
        v_status := 'scheduled';
    ELSE
        v_status := 'active';
    END IF;

    -- Insertion du corps de l'alerte
    INSERT INTO public.alerts (
        title,
        content,
        priority,
        status,
        alert_at,
        entity_type,
        entity_id,
        metadata,
        created_by
    ) VALUES (
        p_title,
        p_content,
        p_priority,
        v_status,
        COALESCE(p_alert_at, timezone('utc'::text, now())),
        p_entity_type,
        p_entity_id,
        p_metadata,
        auth.uid()
    )
    RETURNING id INTO v_alert_id;

    -- Si aucun destinataire fourni, assigner à tous les agents et admins
    IF p_recipient_ids IS NULL OR array_length(p_recipient_ids, 1) IS NULL THEN
        INSERT INTO public.alert_recipients (alert_id, recipient_id)
        SELECT v_alert_id, p.id
        FROM public.profiles p
        WHERE p.role IN ('admin', 'agent');
    ELSE
        -- Insertion pour chaque destinataire spécifié
        FOREACH v_recipient IN ARRAY p_recipient_ids
        LOOP
            INSERT INTO public.alert_recipients (alert_id, recipient_id)
            VALUES (v_alert_id, v_recipient)
            ON CONFLICT (alert_id, recipient_id) DO NOTHING;
        END LOOP;
    END IF;

    RETURN v_alert_id;
END;
$$;

-- ==============================================================================
-- 9. FONCTION RPC & TRIGGER : Alerte Automatique d'Assignation de Devis (Pipeline)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_notify_devis_assigned()
RETURNS TRIGGER AS $$
DECLARE
    v_agent_id UUID;
    v_agent_nom TEXT;
    v_nom_prospect TEXT;
    v_nom_devis TEXT;
    v_destination TEXT;
    v_priorite TEXT;
    v_priority_enum alert_priority_enum := 'normal';
    v_alert_id UUID;
    v_prev_agent_id UUID := NULL;
BEGIN
    -- Extraire agent_id depuis le JSON details_devis
    BEGIN
        IF NEW.details_devis IS NOT NULL AND NEW.details_devis != '' AND NEW.details_devis LIKE '{%' THEN
            v_agent_id := (NEW.details_devis::jsonb->>'agent_id')::uuid;
            v_agent_nom := NEW.details_devis::jsonb->>'agent_nom';
            v_nom_devis := NEW.details_devis::jsonb->>'nom_devis';
            v_destination := NEW.details_devis::jsonb->>'destination';
            v_priorite := LOWER(COALESCE(NEW.details_devis::jsonb->>'priorite', 'moyenne'));

            IF TG_OP = 'UPDATE' AND OLD.details_devis IS NOT NULL AND OLD.details_devis LIKE '{%' THEN
                v_prev_agent_id := (OLD.details_devis::jsonb->>'agent_id')::uuid;
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN NEW;
    END;

    -- Si un agent est assigné et qu'il s'agit d'une nouvelle assignation
    IF v_agent_id IS NOT NULL AND (TG_OP = 'INSERT' OR v_prev_agent_id IS DISTINCT FROM v_agent_id) THEN
        IF v_priorite LIKE '%urgent%' THEN
            v_priority_enum := 'urgent';
        ELSIF v_priorite LIKE '%haut%' OR v_priorite LIKE '%high%' THEN
            v_priority_enum := 'high';
        ELSIF v_priorite LIKE '%bas%' OR v_priorite LIKE '%low%' THEN
            v_priority_enum := 'low';
        ELSE
            v_priority_enum := 'normal';
        END IF;

        v_nom_prospect := COALESCE(NEW.nom_prospect, 'Client');

        -- Créer l'alerte
        INSERT INTO public.alerts (
            title,
            content,
            priority,
            status,
            alert_at,
            entity_type,
            entity_id,
            metadata,
            created_by
        ) VALUES (
            'Devis assigné : ' || v_nom_prospect || CASE WHEN v_destination IS NOT NULL THEN ' • ' || v_destination ELSE '' END,
            'Vous avez été assigné au devis "' || COALESCE(v_nom_devis, 'Devis prospect') || '". Priorité : ' || COALESCE(v_priorite, 'normale') || '.',
            v_priority_enum,
            'active',
            timezone('utc'::text, now()),
            'pipeline',
            NEW.id,
            jsonb_build_object('nom_prospect', v_nom_prospect, 'destination', v_destination, 'nom_devis', v_nom_devis),
            auth.uid()
        )
        RETURNING id INTO v_alert_id;

        -- Créer l'assignation destinataire
        INSERT INTO public.alert_recipients (alert_id, recipient_id)
        VALUES (v_alert_id, v_agent_id)
        ON CONFLICT (alert_id, recipient_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur la table pipeline
DROP TRIGGER IF EXISTS trg_pipeline_notify_assigned ON public.pipeline;
CREATE TRIGGER trg_pipeline_notify_assigned
    AFTER INSERT OR UPDATE ON public.pipeline
    FOR EACH ROW EXECUTE FUNCTION public.fn_notify_devis_assigned();

