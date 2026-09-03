-- ==============================================================================
-- SCRIPT DE MISE À JOUR : RPC & POLITIQUES RLS POUR LE DÉCALAGE D'ALERTES (SNOOZE)
-- CRM Agence El-Mokhtar - Dialecte: PostgreSQL / Supabase
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- ==============================================================================

-- 1. Fonction RPC sécurisée pour décaler une alerte de X minutes
CREATE OR REPLACE FUNCTION public.snooze_alert(p_alert_id UUID, p_minutes INTEGER DEFAULT 5)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.alerts
    SET alert_at = timezone('utc'::text, now()) + (COALESCE(p_minutes, 5) || ' minutes')::interval,
        status = 'scheduled',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_alert_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donner les droits d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.snooze_alert(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.snooze_alert(UUID, INTEGER) TO anon;

-- 2. Mettre à jour la politique UPDATE sur public.alerts pour autoriser les destinataires et admins
DROP POLICY IF EXISTS "Modification alertes pour auteur" ON public.alerts;
DROP POLICY IF EXISTS "Modification alertes pour authentifies" ON public.alerts;

CREATE POLICY "Modification alertes pour authentifies"
    ON public.alerts FOR UPDATE TO authenticated
    USING (
        created_by = auth.uid() 
        OR created_by IS NULL 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'agent'))
        OR EXISTS (SELECT 1 FROM public.alert_recipients WHERE alert_id = alerts.id AND recipient_id = auth.uid())
    )
    WITH CHECK (true);
