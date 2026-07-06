-- ============================================================
-- Maestro Studio — Grant Super Admin RLS Privileges
-- Date: 2026-07-06
-- ============================================================

SET ROLE postgres;

-- Autoriser le super_admin à modifier n'importe quel profil utilisateur (changement de rôle)
DROP POLICY IF EXISTS "super_admin_update_profiles" ON user_profiles;
CREATE POLICY "super_admin_update_profiles" ON user_profiles FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);
