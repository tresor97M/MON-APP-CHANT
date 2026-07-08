-- ============================================================
-- Maestro Studio — Add publish_at to announcements
-- Date: 2026-07-08
-- ============================================================

-- 1. Ajouter la colonne publish_at avec défaut now()
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS publish_at timestamptz NOT NULL DEFAULT now();

-- 2. Recréer la politique de sélection RLS pour filtrer sur publish_at <= now()
-- (les administrateurs peuvent voir toutes les annonces, les utilisateurs normaux ne voient que les annonces publiées)
DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
DROP POLICY IF EXISTS "announcements_select_policy" ON public.announcements;

CREATE POLICY "announcements_select_policy" ON public.announcements
  FOR SELECT TO authenticated
  USING (
    -- Admins/Super admins can see all announcements
    (EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND (user_profiles.location = 'admin' OR user_profiles.location = 'super_admin' OR user_profiles.bio = 'admin' OR user_profiles.bio = 'super_admin')
    ))
    OR
    -- Choristes can only see published ones
    (publish_at <= now())
  );
