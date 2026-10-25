-- ==============================================================================
-- FIX RLS : ACCÈS AUX ALERTES POUR LA POCKETAPP (WEBVIEWAPP / MOBILE)
-- CRM Agence El-Mokhtar - Dialecte: PostgreSQL / Supabase
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- ==============================================================================

-- 1. Autoriser la lecture des alertes pour anon et authentifié (comme pour manager_devis)
DROP POLICY IF EXISTS "Lecture alertes pour tous" ON public.alerts;
DROP POLICY IF EXISTS "Lecture alertes pour anon" ON public.alerts;

CREATE POLICY "Lecture alertes pour tous"
    ON public.alerts FOR SELECT
    USING (true);

-- 2. Autoriser la lecture et la mise à jour des destinataires d'alertes
DROP POLICY IF EXISTS "Lecture alert_recipients pour tous" ON public.alert_recipients;
DROP POLICY IF EXISTS "Lecture alert_recipients pour anon" ON public.alert_recipients;
DROP POLICY IF EXISTS "Mise a jour alert_recipients pour tous" ON public.alert_recipients;
DROP POLICY IF EXISTS "Mise a jour alert_recipients pour anon" ON public.alert_recipients;

CREATE POLICY "Lecture alert_recipients pour tous"
    ON public.alert_recipients FOR SELECT
    USING (true);

CREATE POLICY "Mise a jour alert_recipients pour tous"
    ON public.alert_recipients FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 3. Activer la réplication Realtime pour la table alert_recipients si pas déjà fait
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND tablename = 'alert_recipients'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_recipients;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND tablename = 'alerts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
    END IF;
END $$;
