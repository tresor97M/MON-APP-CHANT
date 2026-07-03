/*
# Learning OS — Core schema (single-tenant demo, no auth)

1. Purpose
   A universal skill-learning platform. First domain: Chant (singing).
   Architecture is generic so Piano, Guitare, Langues, etc. can be added by
   inserting rows into `skills` / `paths` / `modules` / `lessons` / `exercises`.

2. New Tables
   - skills          : top-level domain (Chant, Piano, Guitare, ...)
   - paths           : a learning journey inside a skill (e.g. "Débutant Chant")
   - modules         : a group of lessons inside a path (Respiration, Justesse, ...)
   - lessons         : a single lesson inside a module
   - exercises       : a practice unit inside a lesson (with type + scoring config)
   - attempts        : one user attempt on an exercise, with score + AI feedback
   - user_progress   : per-lesson completion state + score
   - user_stats      : aggregate XP, streak, level, daily goal
   - badges          : catalog of achievements
   - user_badges     : badges earned
   - leagues         : weekly leaderboard groups
   - league_members  : membership + weekly XP

3. Security
   Single-tenant demo (no sign-in). RLS enabled on every table.
   Policies use `TO anon, authenticated` with `USING (true)` because the data
   is intentionally shared/public for this demo.

4. Notes
   - All ids are uuid with gen_random_uuid().
   - created_at / updated_at default to now().
   - `exercises.type` drives the player UI (pitch, rhythm, breathing, quiz, ...).
*/

-- ============ SKILLS ============
CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  tagline text,
  description text,
  icon text NOT NULL DEFAULT 'Music',
  color text NOT NULL DEFAULT 'primary',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_skills" ON skills;
CREATE POLICY "anon_select_skills" ON skills FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_skills" ON skills;
CREATE POLICY "anon_insert_skills" ON skills FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_skills" ON skills;
CREATE POLICY "anon_update_skills" ON skills FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_skills" ON skills;
CREATE POLICY "anon_delete_skills" ON skills FOR DELETE TO anon, authenticated USING (true);

-- ============ PATHS ============
CREATE TABLE IF NOT EXISTS paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  level text NOT NULL DEFAULT 'Débutant',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE paths ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_paths" ON paths;
CREATE POLICY "anon_select_paths" ON paths FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_paths" ON paths;
CREATE POLICY "anon_insert_paths" ON paths FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_paths" ON paths;
CREATE POLICY "anon_update_paths" ON paths FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_paths" ON paths;
CREATE POLICY "anon_delete_paths" ON paths FOR DELETE TO anon, authenticated USING (true);

-- ============ MODULES ============
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL REFERENCES paths(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'CircleDot',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_modules" ON modules;
CREATE POLICY "anon_select_modules" ON modules FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_modules" ON modules;
CREATE POLICY "anon_insert_modules" ON modules FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_modules" ON modules;
CREATE POLICY "anon_update_modules" ON modules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_modules" ON modules;
CREATE POLICY "anon_delete_modules" ON modules FOR DELETE TO anon, authenticated USING (true);

-- ============ LESSONS ============
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  xp_reward int NOT NULL DEFAULT 10,
  duration_min int NOT NULL DEFAULT 5,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_lessons" ON lessons;
CREATE POLICY "anon_select_lessons" ON lessons FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lessons" ON lessons;
CREATE POLICY "anon_insert_lessons" ON lessons FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lessons" ON lessons;
CREATE POLICY "anon_update_lessons" ON lessons FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lessons" ON lessons;
CREATE POLICY "anon_delete_lessons" ON lessons FOR DELETE TO anon, authenticated USING (true);

-- ============ EXERCISES ============
CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'pitch',
  prompt text NOT NULL,
  target jsonb,
  scoring jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_exercises" ON exercises;
CREATE POLICY "anon_select_exercises" ON exercises FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_exercises" ON exercises;
CREATE POLICY "anon_insert_exercises" ON exercises FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_exercises" ON exercises;
CREATE POLICY "anon_update_exercises" ON exercises FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_exercises" ON exercises;
CREATE POLICY "anon_delete_exercises" ON exercises FOR DELETE TO anon, authenticated USING (true);

-- ============ ATTEMPTS ============
CREATE TABLE IF NOT EXISTS attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  score int NOT NULL DEFAULT 0,
  accuracy numeric(5,2) DEFAULT 0,
  duration_ms int,
  feedback jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_attempts" ON attempts;
CREATE POLICY "anon_select_attempts" ON attempts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_attempts" ON attempts;
CREATE POLICY "anon_insert_attempts" ON attempts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_attempts" ON attempts;
CREATE POLICY "anon_update_attempts" ON attempts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_attempts" ON attempts;
CREATE POLICY "anon_delete_attempts" ON attempts FOR DELETE TO anon, authenticated USING (true);

-- ============ USER PROGRESS ============
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'locked',
  best_score int NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_user_progress" ON user_progress;
CREATE POLICY "anon_select_user_progress" ON user_progress FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_user_progress" ON user_progress;
CREATE POLICY "anon_insert_user_progress" ON user_progress FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_user_progress" ON user_progress;
CREATE POLICY "anon_update_user_progress" ON user_progress FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_user_progress" ON user_progress;
CREATE POLICY "anon_delete_user_progress" ON user_progress FOR DELETE TO anon, authenticated USING (true);

-- ============ USER STATS ============
CREATE TABLE IF NOT EXISTS user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_xp int NOT NULL DEFAULT 0,
  level int NOT NULL DEFAULT 1,
  streak_days int NOT NULL DEFAULT 0,
  last_active_date date,
  daily_goal_xp int NOT NULL DEFAULT 50,
  daily_xp int NOT NULL DEFAULT 0,
  weekly_xp int NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_user_stats" ON user_stats;
CREATE POLICY "anon_select_user_stats" ON user_stats FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_user_stats" ON user_stats;
CREATE POLICY "anon_insert_user_stats" ON user_stats FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_user_stats" ON user_stats;
CREATE POLICY "anon_update_user_stats" ON user_stats FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_user_stats" ON user_stats;
CREATE POLICY "anon_delete_user_stats" ON user_stats FOR DELETE TO anon, authenticated USING (true);

-- ============ BADGES ============
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'Award',
  tier text NOT NULL DEFAULT 'bronze',
  condition jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_badges" ON badges;
CREATE POLICY "anon_select_badges" ON badges FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_badges" ON badges;
CREATE POLICY "anon_insert_badges" ON badges FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_badges" ON badges;
CREATE POLICY "anon_update_badges" ON badges FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_badges" ON badges;
CREATE POLICY "anon_delete_badges" ON badges FOR DELETE TO anon, authenticated USING (true);

-- ============ USER BADGES ============
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now()
);
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_user_badges" ON user_badges;
CREATE POLICY "anon_select_user_badges" ON user_badges FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_user_badges" ON user_badges;
CREATE POLICY "anon_insert_user_badges" ON user_badges FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_user_badges" ON user_badges;
CREATE POLICY "anon_update_user_badges" ON user_badges FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_user_badges" ON user_badges;
CREATE POLICY "anon_delete_user_badges" ON user_badges FOR DELETE TO anon, authenticated USING (true);

-- ============ LEAGUES ============
CREATE TABLE IF NOT EXISTS leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tier text NOT NULL DEFAULT 'bronze',
  week_start date NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_leagues" ON leagues;
CREATE POLICY "anon_select_leagues" ON leagues FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_leagues" ON leagues;
CREATE POLICY "anon_insert_leagues" ON leagues FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_leagues" ON leagues;
CREATE POLICY "anon_update_leagues" ON leagues FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_leagues" ON leagues;
CREATE POLICY "anon_delete_leagues" ON leagues FOR DELETE TO anon, authenticated USING (true);

-- ============ LEAGUE MEMBERS ============
CREATE TABLE IF NOT EXISTS league_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_emoji text NOT NULL DEFAULT '🎤',
  weekly_xp int NOT NULL DEFAULT 0,
  is_current_user boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_league_members" ON league_members;
CREATE POLICY "anon_select_league_members" ON league_members FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_league_members" ON league_members;
CREATE POLICY "anon_insert_league_members" ON league_members FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_league_members" ON league_members;
CREATE POLICY "anon_update_league_members" ON league_members FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_league_members" ON league_members;
CREATE POLICY "anon_delete_league_members" ON league_members FOR DELETE TO anon, authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_paths_skill ON paths(skill_id);
CREATE INDEX IF NOT EXISTS idx_modules_path ON modules(path_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_exercises_lesson ON exercises(lesson_id);
CREATE INDEX IF NOT EXISTS idx_attempts_exercise ON attempts(exercise_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson ON user_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_league_members_league ON league_members(league_id);
