-- ============================================================
-- Maestro Studio — Reconstruction du schéma manquant
-- Date: 2026-07-11
--
-- Contexte (audit sécurité) : lib/types.ts référence des tables
-- (Hymn, Rehearsal, Attendance, TrainingPath, ChoirStats, ...)
-- qui n'ont jamais été créées par une migration versionnée —
-- elles existent en production mais ont été créées manuellement,
-- donc impossible de reconstruire l'environnement depuis le repo.
--
-- Toutes les CREATE TABLE sont en IF NOT EXISTS : si la table
-- existe déjà en prod, cette instruction ne fait rien (aucune
-- perte de colonnes/données). En revanche ENABLE ROW LEVEL
-- SECURITY + les policies DROP/CREATE s'appliquent activement,
-- y compris sur les tables déjà existantes, pour combler les
-- trous RLS repérés dans l'audit.
-- ============================================================

-- ============ HYMNS ============
CREATE TABLE IF NOT EXISTS public.hymns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer,
  title text NOT NULL,
  author text,
  composer text,
  musical_key text,
  tempo text,
  category text NOT NULL DEFAULT 'autre'
    CHECK (category IN ('louange','adoration','repentance','communion','evangelisation','noel','paques','funerailles','mariage','autre')),
  language text NOT NULL DEFAULT 'fr',
  lyrics text,
  learning_status text NOT NULL DEFAULT 'nouveau'
    CHECK (learning_status IN ('nouveau','en_apprentissage','maitrise','repertoire_actif')),
  director_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.hymns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hymns_select" ON public.hymns;
CREATE POLICY "hymns_select" ON public.hymns FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "hymns_write" ON public.hymns;
CREATE POLICY "hymns_write" ON public.hymns FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============ HYMN FILES ============
CREATE TABLE IF NOT EXISTS public.hymn_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hymn_id uuid NOT NULL REFERENCES public.hymns(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('partition_pdf','image','audio')),
  voice_part text CHECK (voice_part IN ('soprano','alto','tenor','basse')),
  storage_path text NOT NULL,
  title text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.hymn_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hymn_files_select" ON public.hymn_files;
CREATE POLICY "hymn_files_select" ON public.hymn_files FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "hymn_files_write" ON public.hymn_files;
CREATE POLICY "hymn_files_write" ON public.hymn_files FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE INDEX IF NOT EXISTS idx_hymn_files_hymn ON public.hymn_files(hymn_id);

-- ============ HYMN SCHEDULE ============
CREATE TABLE IF NOT EXISTS public.hymn_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hymn_id uuid REFERENCES public.hymns(id) ON DELETE SET NULL,
  scheduled_date date NOT NULL,
  occasion text NOT NULL DEFAULT 'culte' CHECK (occasion IN ('culte','repetition','concert','evenement')),
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.hymn_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hymn_schedule_select" ON public.hymn_schedule;
CREATE POLICY "hymn_schedule_select" ON public.hymn_schedule FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "hymn_schedule_write" ON public.hymn_schedule;
CREATE POLICY "hymn_schedule_write" ON public.hymn_schedule FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE INDEX IF NOT EXISTS idx_hymn_schedule_hymn ON public.hymn_schedule(hymn_id);

-- ============ REHEARSALS ============
CREATE TABLE IF NOT EXISTS public.rehearsals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  rehearsal_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  location text,
  type text NOT NULL DEFAULT 'generale' CHECK (type IN ('generale','pupitre','formation')),
  voice_part text CHECK (voice_part IN ('soprano','alto','tenor','basse')),
  objectives text,
  status text NOT NULL DEFAULT 'planifiee' CHECK (status IN ('planifiee','en_cours','terminee','annulee')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rehearsals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rehearsals_select" ON public.rehearsals;
CREATE POLICY "rehearsals_select" ON public.rehearsals FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rehearsals_write" ON public.rehearsals;
CREATE POLICY "rehearsals_write" ON public.rehearsals FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============ REHEARSAL RSVPS ============
CREATE TABLE IF NOT EXISTS public.rehearsal_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rehearsal_id uuid NOT NULL REFERENCES public.rehearsals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response text NOT NULL DEFAULT 'peut_etre' CHECK (response IN ('present','absent','peut_etre')),
  absence_reason text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(rehearsal_id, user_id)
);
ALTER TABLE public.rehearsal_rsvps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rehearsal_rsvps_select" ON public.rehearsal_rsvps;
CREATE POLICY "rehearsal_rsvps_select" ON public.rehearsal_rsvps FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff());
DROP POLICY IF EXISTS "rehearsal_rsvps_insert" ON public.rehearsal_rsvps;
CREATE POLICY "rehearsal_rsvps_insert" ON public.rehearsal_rsvps FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "rehearsal_rsvps_update" ON public.rehearsal_rsvps;
CREATE POLICY "rehearsal_rsvps_update" ON public.rehearsal_rsvps FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_staff());
CREATE INDEX IF NOT EXISTS idx_rehearsal_rsvps_rehearsal ON public.rehearsal_rsvps(rehearsal_id);

-- ============ ATTENDANCE ============
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rehearsal_id uuid NOT NULL REFERENCES public.rehearsals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'absent' CHECK (status IN ('present','retard','absent_excuse','absent')),
  marked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  marked_at timestamptz DEFAULT now(),
  UNIQUE(rehearsal_id, user_id)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
CREATE POLICY "attendance_select" ON public.attendance FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff());
DROP POLICY IF EXISTS "attendance_write" ON public.attendance;
CREATE POLICY "attendance_write" ON public.attendance FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE INDEX IF NOT EXISTS idx_attendance_rehearsal ON public.attendance(rehearsal_id);

-- ============ HYMN PROGRESS ============
CREATE TABLE IF NOT EXISTS public.hymn_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hymn_id uuid NOT NULL REFERENCES public.hymns(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'a_apprendre' CHECK (status IN ('a_apprendre','en_cours','appris','valide')),
  self_rating integer CHECK (self_rating BETWEEN 1 AND 5),
  validated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_listened_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, hymn_id)
);
ALTER TABLE public.hymn_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hymn_progress_select" ON public.hymn_progress;
CREATE POLICY "hymn_progress_select" ON public.hymn_progress FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff());
DROP POLICY IF EXISTS "hymn_progress_insert" ON public.hymn_progress;
CREATE POLICY "hymn_progress_insert" ON public.hymn_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "hymn_progress_update" ON public.hymn_progress;
CREATE POLICY "hymn_progress_update" ON public.hymn_progress FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_staff());

-- ============ SKILL GAPS ============
CREATE TABLE IF NOT EXISTS public.skill_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('justesse','rythme','respiration','lecture','memorisation','technique_vocale')),
  severity integer NOT NULL DEFAULT 1,
  note text,
  status text NOT NULL DEFAULT 'identifiee' CHECK (status IN ('identifiee','en_travail','resolue')),
  identified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.skill_gaps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "skill_gaps_select" ON public.skill_gaps;
CREATE POLICY "skill_gaps_select" ON public.skill_gaps FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff());
DROP POLICY IF EXISTS "skill_gaps_write" ON public.skill_gaps;
CREATE POLICY "skill_gaps_write" ON public.skill_gaps FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============ TRAINING PATHS ============
CREATE TABLE IF NOT EXISTS public.training_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  target_gap_category text CHECK (target_gap_category IN ('justesse','rythme','respiration','lecture','memorisation','technique_vocale')),
  voice_part text CHECK (voice_part IN ('soprano','alto','tenor','basse')),
  is_open boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.training_paths ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "training_paths_select" ON public.training_paths;
CREATE POLICY "training_paths_select" ON public.training_paths FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "training_paths_write" ON public.training_paths;
CREATE POLICY "training_paths_write" ON public.training_paths FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============ TRAINING MODULES ============
-- (existe déjà en prod depuis 20260707_add_lesson_id_to_training_modules.sql,
--  ici on garantit sa présence complète + on active RLS si ce n'était pas fait)
CREATE TABLE IF NOT EXISTS public.training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL REFERENCES public.training_paths(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  resource_url text,
  hymn_id uuid REFERENCES public.hymns(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  xp_reward integer NOT NULL DEFAULT 10,
  sort_order integer NOT NULL DEFAULT 0
);
-- La table pouvait déjà exister sans toutes ses colonnes (migrations
-- antérieures jamais appliquées) : on les garantit explicitement.
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS path_id uuid REFERENCES public.training_paths(id) ON DELETE CASCADE;
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS resource_url text;
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS hymn_id uuid REFERENCES public.hymns(id) ON DELETE SET NULL;
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL;
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS xp_reward integer NOT NULL DEFAULT 10;
ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "training_modules_select" ON public.training_modules;
CREATE POLICY "training_modules_select" ON public.training_modules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "training_modules_write" ON public.training_modules;
CREATE POLICY "training_modules_write" ON public.training_modules FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============ TRAINING ASSIGNMENTS ============
CREATE TABLE IF NOT EXISTS public.training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL REFERENCES public.training_paths(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gap_id uuid REFERENCES public.skill_gaps(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'assigne' CHECK (status IN ('assigne','en_cours','termine')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "training_assignments_select" ON public.training_assignments;
CREATE POLICY "training_assignments_select" ON public.training_assignments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff());
DROP POLICY IF EXISTS "training_assignments_write" ON public.training_assignments;
CREATE POLICY "training_assignments_write" ON public.training_assignments FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "training_assignments_self_update" ON public.training_assignments;
CREATE POLICY "training_assignments_self_update" ON public.training_assignments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ MODULE COMPLETIONS ============
CREATE TABLE IF NOT EXISTS public.module_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(module_id, user_id)
);
ALTER TABLE public.module_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "module_completions_select" ON public.module_completions;
CREATE POLICY "module_completions_select" ON public.module_completions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff());
DROP POLICY IF EXISTS "module_completions_insert" ON public.module_completions;
CREATE POLICY "module_completions_insert" ON public.module_completions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============ ANNOUNCEMENTS ============
-- (existe déjà en prod depuis 20260708_announcements_publish_at.sql ;
--  les policies sont corrigées dans 20260711030000_security_hotfix.sql)
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  audience_role text,
  audience_voice text CHECK (audience_voice IN ('soprano','alto','tenor','basse')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  publish_at timestamptz NOT NULL DEFAULT now()
);
-- La table pouvait déjà exister sans toutes ses colonnes (ex: publish_at,
-- ajoutée par 20260708_announcements_publish_at.sql, jamais appliquée en prod).
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS audience_role text;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS audience_voice text;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS publish_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ============ CHOIR STATS ============
CREATE TABLE IF NOT EXISTS public.choir_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp integer NOT NULL DEFAULT 0,
  weekly_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak_weeks integer NOT NULL DEFAULT 0,
  last_active_date date,
  hymns_learned integer NOT NULL DEFAULT 0,
  attendance_rate numeric(5,2) NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.choir_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "choir_stats_select" ON public.choir_stats;
CREATE POLICY "choir_stats_select" ON public.choir_stats FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "choir_stats_write" ON public.choir_stats;
CREATE POLICY "choir_stats_write" ON public.choir_stats FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_staff()) WITH CHECK (user_id = auth.uid() OR public.is_staff());
