-- ==============================================================================
-- SCRIPT DE MISE À JOUR : TRIGGER AUTOMATIQUE ALERTE ASSIGNATION DE DEVIS
-- CRM Agence El-Mokhtar - Dialecte: PostgreSQL / Supabase
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- ==============================================================================

-- 1. Fonction Trigger : Détection et création de l'alerte d'assignation (avec anti-doublon)
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

    -- Si un agent est assigné et qu'il s'agit d'une nouvelle attribution ou d'un changement
    IF v_agent_id IS NOT NULL AND (TG_OP = 'INSERT' OR v_prev_agent_id IS DISTINCT FROM v_agent_id) THEN
        
        -- Protection Anti-Doublon : éviter les créations en double si déclenché plusieurs fois de suite
        IF EXISTS (
            SELECT 1 FROM public.alerts a
            JOIN public.alert_recipients ar ON ar.alert_id = a.id
            WHERE a.entity_type = 'pipeline'
              AND a.entity_id = NEW.id
              AND ar.recipient_id = v_agent_id
              AND a.created_at >= timezone('utc'::text, now()) - INTERVAL '30 seconds'
        ) THEN
            RETURN NEW;
        END IF;

        -- Mapper la priorité textuelle vers l'ENUM alert_priority_enum
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

        -- 1. Insérer l'alerte
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
            'Devis assigné : ' || v_nom_prospect || CASE WHEN v_destination IS NOT NULL AND v_destination != '' THEN ' • ' || v_destination ELSE '' END,
            'Vous avez été assigné au devis "' || COALESCE(v_nom_devis, 'Devis prospect') || '". Priorité : ' || COALESCE(v_priorite, 'normale') || '.',
            v_priority_enum,
            'active',
            timezone('utc'::text, now()),
            'pipeline',
            NEW.id,
            jsonb_build_object(
                'nom_prospect', v_nom_prospect, 
                'destination', v_destination, 
                'nom_devis', v_nom_devis,
                'agent_nom', v_agent_nom
            ),
            auth.uid()
        )
        RETURNING id INTO v_alert_id;

        -- 2. Assigner l'alerte à l'agent concerné
        INSERT INTO public.alert_recipients (alert_id, recipient_id, is_seen, is_done)
        VALUES (v_alert_id, v_agent_id, FALSE, FALSE)
        ON CONFLICT (alert_id, recipient_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attacher le Trigger sur la table pipeline
DROP TRIGGER IF EXISTS trg_pipeline_notify_assigned ON public.pipeline;
CREATE TRIGGER trg_pipeline_notify_assigned
    AFTER INSERT OR UPDATE OF details_devis, nom_prospect ON public.pipeline
    FOR EACH ROW EXECUTE FUNCTION public.fn_notify_devis_assigned();
