-- ============================================================
-- Maestro Studio — Correction du rôle par défaut + Journal d'audit admin
-- Date: 2026-07-12
--
-- 1. BUG : user_profiles.role avait pour défaut 'student', une valeur qui
--    n'existe nulle part dans le reste de l'app (le type TypeScript `Role`,
--    ROLE_LABELS, lib/permissions.ts attendent 'choriste'). Comme aucun
--    trigger ne définit explicitement le rôle à l'inscription, TOUS les
--    nouveaux utilisateurs recevaient 'student' — ce qui cassait
--    l'affichage de leur rôle (ROLE_LABELS['student'] => undefined) même
--    si les vérifications de permission (normalize() -> 'choriste' par
--    défaut) continuaient à fonctionner par coïncidence.
--
-- 2. Journal d'audit des actions admin sensibles (changement de rôle,
--    permissions) — traçabilité demandée en plus du correctif RLS déjà
--    appliqué (20260711030000_security_hotfix.sql) qui empêche
--    l'auto-élévation mais ne journalisait rien.
-- ============================================================

-- ============ 1. Corriger le défaut + backfill des lignes existantes ============
ALTER TABLE public.user_profiles ALTER COLUMN role SET DEFAULT 'choriste';

UPDATE public.user_profiles SET role = 'choriste' WHERE role = 'student';

-- ============ 2. Table de journal d'audit ============
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_log_select" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_select" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.is_staff());

-- Seul l'auteur authentifié peut journaliser sa propre action, et seulement
-- s'il est staff — empêche un utilisateur normal d'insérer de fausses
-- entrées ou d'usurper l'identité d'un autre acteur dans le journal.
DROP POLICY IF EXISTS "admin_audit_log_insert" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_insert" ON public.admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND public.is_staff());

-- Journal en lecture/écriture seule : pas de policy UPDATE/DELETE, un
-- journal d'audit ne doit pas pouvoir être modifié après coup.
