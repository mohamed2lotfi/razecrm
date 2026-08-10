-- ==============================================================================
-- FIX RLS POUR LA TABLE EMPLOYEES (RH)
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase
-- ==============================================================================

-- 1. Activer RLS sur la table employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 2. Nettoyer les anciennes politiques pour éviter les conflits
DROP POLICY IF EXISTS "Lecture des employes" ON public.employees;
DROP POLICY IF EXISTS "Insertion des employes" ON public.employees;
DROP POLICY IF EXISTS "Modification des employes" ON public.employees;
DROP POLICY IF EXISTS "Suppression des employes" ON public.employees;
DROP POLICY IF EXISTS "Tous les acces employes pour authentifies" ON public.employees;

-- 3. Autoriser toutes les opérations (SELECT, INSERT, UPDATE, DELETE) pour les utilisateurs connectés
CREATE POLICY "Tous les acces employes pour authentifies" ON public.employees
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
