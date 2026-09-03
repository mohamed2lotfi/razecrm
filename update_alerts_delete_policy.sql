-- ==============================================================================
-- MISE À JOUR RLS : AUTORISATION DE SUPPRESSION D'ALERTES POUR L'ADMIN & AUTEUR
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- ==============================================================================

-- 1. Politique de suppression sur public.alerts
DROP POLICY IF EXISTS "Suppression alertes pour auteur" ON public.alerts;
DROP POLICY IF EXISTS "Suppression alertes pour auteur ou admin" ON public.alerts;

CREATE POLICY "Suppression alertes pour auteur ou admin"
    ON public.alerts FOR DELETE TO authenticated
    USING (
        created_by = auth.uid() 
        OR created_by IS NULL 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 2. Politique de suppression sur public.alert_recipients
DROP POLICY IF EXISTS "Suppression destinataires pour authentifies" ON public.alert_recipients;
DROP POLICY IF EXISTS "Suppression destinataires pour auteur ou admin" ON public.alert_recipients;

CREATE POLICY "Suppression destinataires pour auteur ou admin"
    ON public.alert_recipients FOR DELETE TO authenticated
    USING (
        recipient_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM public.alerts a
            WHERE a.id = alert_recipients.alert_id 
              AND (a.created_by = auth.uid() OR a.created_by IS NULL)
        )
    );
