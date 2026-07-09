-- ============================================================
-- Maestro Studio — Correctif de sécurité RLS (Phase 0 audit)
-- Date: 2026-07-11
--
-- Corrige les failles trouvées lors de l'audit sécurité :
--  1. Auto-élévation de privilèges via user_profiles.role
--  2. RLS "USING (true)" en écriture sur les tables du parcours
--     d'apprentissage (skills/paths/modules/lessons/exercises/badges/leagues)
--  3. user_progress / user_stats / user_badges / league_members
--     sans user_id (non multi-utilisateur)
--  4. forum_replies_update avec un "OR true" qui neutralise le contrôle
--  5. messages_update en USING(true) (n'importe qui modifie les messages d'autrui)
--  6. announcements_select_policy qui teste bio/location au lieu de role
--  7. group_members_insert en WITH CHECK(true)
--  8. bucket exercise-audios ouvert en écriture à tout authenticated
--  9. attempts sans policy UPDATE/DELETE (aucune correction possible par le staff)
-- ============================================================

-- ============================================================
-- 1. Anti auto-élévation de privilèges (user_profiles.role / admin_permissions)
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.admin_permissions IS DISTINCT FROM OLD.admin_permissions)
     AND NOT public.is_admin()
  THEN
    RAISE EXCEPTION 'Modification du rôle ou des permissions admin non autorisée.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON public.user_profiles;
CREATE TRIGGER trg_prevent_role_self_escalation
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- ============================================================
-- 2. Tables du parcours d'apprentissage : lecture publique, écriture staff uniquement
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['skills','paths','modules','lessons','exercises','badges','leagues']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_update_%1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_write" ON public.%1$s', t);
    EXECUTE format(
      'CREATE POLICY "%1$s_write" ON public.%1$s FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff())',
      t
    );
  END LOOP;
END $$;

-- ============================================================
-- 3. user_progress / user_stats / user_badges / league_members : ajout user_id
-- ============================================================
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_stats    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_badges   ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.league_members ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_progress
DROP POLICY IF EXISTS "anon_select_user_progress" ON public.user_progress;
DROP POLICY IF EXISTS "anon_insert_user_progress" ON public.user_progress;
DROP POLICY IF EXISTS "anon_update_user_progress" ON public.user_progress;
DROP POLICY IF EXISTS "anon_delete_user_progress" ON public.user_progress;
CREATE POLICY "user_progress_select" ON public.user_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL OR public.is_staff());
CREATE POLICY "user_progress_insert" ON public.user_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "user_progress_update" ON public.user_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL OR public.is_staff());

-- user_stats
DROP POLICY IF EXISTS "anon_select_user_stats" ON public.user_stats;
DROP POLICY IF EXISTS "anon_insert_user_stats" ON public.user_stats;
DROP POLICY IF EXISTS "anon_update_user_stats" ON public.user_stats;
DROP POLICY IF EXISTS "anon_delete_user_stats" ON public.user_stats;
CREATE POLICY "user_stats_select" ON public.user_stats FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL OR public.is_staff());
CREATE POLICY "user_stats_insert" ON public.user_stats FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "user_stats_update" ON public.user_stats FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL OR public.is_staff());

-- user_badges (badges gagnés : lecture ouverte pour affichage public du profil, écriture restreinte)
DROP POLICY IF EXISTS "anon_select_user_badges" ON public.user_badges;
DROP POLICY IF EXISTS "anon_insert_user_badges" ON public.user_badges;
DROP POLICY IF EXISTS "anon_update_user_badges" ON public.user_badges;
DROP POLICY IF EXISTS "anon_delete_user_badges" ON public.user_badges;
CREATE POLICY "user_badges_select" ON public.user_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_badges_insert" ON public.user_badges FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- league_members (classement : lecture ouverte, écriture restreinte au propriétaire)
DROP POLICY IF EXISTS "anon_insert_league_members" ON public.league_members;
DROP POLICY IF EXISTS "anon_update_league_members" ON public.league_members;
DROP POLICY IF EXISTS "anon_delete_league_members" ON public.league_members;
CREATE POLICY "league_members_insert" ON public.league_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "league_members_update" ON public.league_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL OR public.is_staff());

-- ============================================================
-- 4. forum_replies_update : suppression du "OR true"
-- ============================================================
DROP POLICY IF EXISTS "forum_replies_update" ON public.forum_replies;
CREATE POLICY "forum_replies_update" ON public.forum_replies FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_staff());

-- ============================================================
-- 5. messages_update : restreint aux participants + trigger anti-falsification du contenu
-- ============================================================
DROP POLICY IF EXISTS "messages_update" ON public.messages;
CREATE POLICY "messages_update" ON public.messages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.prevent_message_content_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM OLD.sender_id AND (
    NEW.content IS DISTINCT FROM OLD.content OR
    NEW.file_url IS DISTINCT FROM OLD.file_url OR
    NEW.file_name IS DISTINCT FROM OLD.file_name OR
    NEW.file_mime IS DISTINCT FROM OLD.file_mime OR
    NEW.message_type IS DISTINCT FROM OLD.message_type
  ) THEN
    RAISE EXCEPTION 'Seul l''auteur du message peut modifier son contenu.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_message_content_tampering ON public.messages;
CREATE TRIGGER trg_prevent_message_content_tampering
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.prevent_message_content_tampering();

-- ============================================================
-- 6. announcements_select_policy : bug bio/location → role
-- ============================================================
DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
DROP POLICY IF EXISTS "announcements_select_policy" ON public.announcements;
CREATE POLICY "announcements_select_policy" ON public.announcements
  FOR SELECT TO authenticated
  USING (public.is_staff() OR publish_at <= now());

DROP POLICY IF EXISTS "announcements_write" ON public.announcements;
CREATE POLICY "announcements_write" ON public.announcements FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============================================================
-- 7. group_members_insert : plus de WITH CHECK(true)
--    Autorise : rejoindre soi-même, être ajouté par le créateur du groupe, ou par le staff.
-- ============================================================
DROP POLICY IF EXISTS "group_members_insert" ON public.group_members;
CREATE POLICY "group_members_insert" ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.group_conversations gc WHERE gc.id = group_id AND gc.created_by = auth.uid())
    OR public.is_staff()
  );

-- ============================================================
-- 8. Bucket exercise-audios : écriture réservée au staff
-- ============================================================
DROP POLICY IF EXISTS "Allow auth write access to exercise audios" ON storage.objects;
CREATE POLICY "Allow staff write access to exercise audios"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'exercise-audios' AND public.is_staff());

DROP POLICY IF EXISTS "Allow auth delete access to exercise audios" ON storage.objects;
CREATE POLICY "Allow staff delete access to exercise audios"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'exercise-audios' AND public.is_staff());

-- ============================================================
-- 9. attempts : policies UPDATE/DELETE manquantes (correction staff uniquement)
-- ============================================================
DROP POLICY IF EXISTS "update_attempts_policy" ON public.attempts;
CREATE POLICY "update_attempts_policy" ON public.attempts FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "delete_attempts_policy" ON public.attempts;
CREATE POLICY "delete_attempts_policy" ON public.attempts FOR DELETE TO authenticated
  USING (public.is_staff());
