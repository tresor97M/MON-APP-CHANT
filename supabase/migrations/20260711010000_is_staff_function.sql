-- ============================================================
-- Maestro Studio — Helper functions for RLS role checks
-- Date: 2026-07-11
--
-- Contexte: `public.is_staff()` était déjà référencée dans
-- 20260710_attempts_user_id.sql mais n'avait jamais été définie
-- dans les migrations versionnées (bug trouvé lors de l'audit
-- sécurité). On la définit ici de façon canonique, alignée sur
-- lib/permissions.ts (STAFF_ROLES = admin, super_admin, maitre).
-- SECURITY DEFINER + search_path fixe : pratique recommandée
-- Supabase pour éviter la récursion RLS quand une policy sur
-- user_profiles a besoin d'interroger user_profiles elle-même.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'maitre')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$;
