-- ============================================================
-- Maestro Studio — New Tables Migration
-- Date: 2026-07-04
-- Adds: user_profiles, conversations, messages, forum_posts, forum_replies
-- ============================================================

-- ============ USER PROFILES ============
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,  -- references auth.users
  display_name text NOT NULL DEFAULT '',
  username text UNIQUE,
  bio text,
  location text,
  phone text,
  avatar_url text,
  show_email boolean NOT NULL DEFAULT false,
  show_progress boolean NOT NULL DEFAULT true,
  allow_messages boolean NOT NULL DEFAULT true,
  notify_email boolean NOT NULL DEFAULT true,
  notify_security boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON user_profiles;
CREATE POLICY "profiles_select" ON user_profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "profiles_insert" ON user_profiles;
CREATE POLICY "profiles_insert" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "profiles_update" ON user_profiles;
CREATE POLICY "profiles_update" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ CONVERSATIONS ============
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a uuid NOT NULL,  -- user_id
  participant_b uuid NOT NULL,  -- user_id
  last_message text,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(participant_a, participant_b)
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations FOR SELECT TO authenticated
  USING (auth.uid() = participant_a OR auth.uid() = participant_b);
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
CREATE POLICY "conversations_insert" ON conversations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "conversations_update" ON conversations;
CREATE POLICY "conversations_update" ON conversations FOR UPDATE TO authenticated
  USING (auth.uid() = participant_a OR auth.uid() = participant_b);

-- ============ MESSAGES ============
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,  -- user_id
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages FOR UPDATE TO authenticated USING (true);

-- ============ FORUM POSTS ============
CREATE TABLE IF NOT EXISTS forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT 'Anonyme',
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'Général',
  solved boolean NOT NULL DEFAULT false,
  likes int NOT NULL DEFAULT 0,
  views int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "forum_posts_select" ON forum_posts;
CREATE POLICY "forum_posts_select" ON forum_posts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "forum_posts_insert" ON forum_posts;
CREATE POLICY "forum_posts_insert" ON forum_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "forum_posts_update" ON forum_posts;
CREATE POLICY "forum_posts_update" ON forum_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (true);
DROP POLICY IF EXISTS "forum_posts_delete" ON forum_posts;
CREATE POLICY "forum_posts_delete" ON forum_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ FORUM REPLIES ============
CREATE TABLE IF NOT EXISTS forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT 'Anonyme',
  content text NOT NULL,
  likes int NOT NULL DEFAULT 0,
  is_accepted boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "forum_replies_select" ON forum_replies;
CREATE POLICY "forum_replies_select" ON forum_replies FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "forum_replies_insert" ON forum_replies;
CREATE POLICY "forum_replies_insert" ON forum_replies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "forum_replies_update" ON forum_replies;
CREATE POLICY "forum_replies_update" ON forum_replies FOR UPDATE TO authenticated USING (auth.uid() = user_id OR true);
DROP POLICY IF EXISTS "forum_replies_delete" ON forum_replies;
CREATE POLICY "forum_replies_delete" ON forum_replies FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_a ON conversations(participant_a);
CREATE INDEX IF NOT EXISTS idx_conversations_b ON conversations(participant_b);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_cat ON forum_posts(category);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(post_id);

-- ============ SEED DATA (demo) ============
-- Demo forum posts (will work for anon users too)
INSERT INTO forum_posts (user_id, author_name, title, content, category, solved, likes, views)
VALUES
  (gen_random_uuid(), 'Léa B.', 'Comment améliorer ma justesse sur les notes aiguës ?',
   'Je travaille depuis 3 mois sur ma justesse vocale, mais dès que j''essaie de monter au-dessus du La4, je commence à détonner. Est-ce que quelqu''un a des conseils ?',
   'Justesse', true, 18, 234),
  (gen_random_uuid(), 'Marc D.', 'Exercices de respiration diaphragmatique pour débutants',
   'Bonjour à tous ! Je cherche des exercices simples pour travailler la respiration diaphragmatique. Merci d''avance.',
   'Respiration', false, 9, 145),
  (gen_random_uuid(), 'Sophie L.', 'Le vibrato : naturel ou technique ? Débat ouvert',
   'Selon vous, le vibrato est-il quelque chose qui vient naturellement ou faut-il le travailler techniquement ? Je suis curieuse d''avoir vos avis.',
   'Vibrato', false, 41, 512)
ON CONFLICT DO NOTHING;
