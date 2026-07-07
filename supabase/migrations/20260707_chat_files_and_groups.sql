-- ============================================================
-- Maestro Studio — Chat Files, Group Conversations & Call Signals
-- Date: 2026-07-07
-- ============================================================

-- ============ EXTEND MESSAGES TABLE ============
-- Add message_type and file metadata columns
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_mime text;

-- ============ TABLES CREATION ============

-- 1. group_conversations
CREATE TABLE IF NOT EXISTS group_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar text NOT NULL DEFAULT 'GR',
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_message text,
  last_message_at timestamptz DEFAULT now()
);

-- 2. group_members
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES group_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'member', -- 'admin' | 'member'
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- 3. group_messages
CREATE TABLE IF NOT EXISTS group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES group_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  file_url text,
  file_name text,
  file_mime text,
  created_at timestamptz DEFAULT now()
);

-- ============ RLS ENABLEMENT ============
ALTER TABLE group_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============

-- Policies for group_conversations
DROP POLICY IF EXISTS "group_convs_select" ON group_conversations;
CREATE POLICY "group_convs_select" ON group_conversations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = group_conversations.id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "group_convs_insert" ON group_conversations;
CREATE POLICY "group_convs_insert" ON group_conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "group_convs_update" ON group_conversations;
CREATE POLICY "group_convs_update" ON group_conversations FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = group_conversations.id AND user_id = auth.uid())
);

-- Policies for group_members
DROP POLICY IF EXISTS "group_members_select" ON group_members;
CREATE POLICY "group_members_select" ON group_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "group_members_insert" ON group_members;
CREATE POLICY "group_members_insert" ON group_members FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "group_members_delete" ON group_members;
CREATE POLICY "group_members_delete" ON group_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policies for group_messages
DROP POLICY IF EXISTS "group_messages_select" ON group_messages;
CREATE POLICY "group_messages_select" ON group_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "group_messages_insert" ON group_messages;
CREATE POLICY "group_messages_insert" ON group_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created ON group_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);

-- ============ STORAGE BUCKET & POLICIES ============
-- Ensure the public 'chat-files' bucket is initialized in storage schema
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload files to 'chat-files'
DROP POLICY IF EXISTS "Allow authenticated inserts to chat-files" ON storage.objects;
CREATE POLICY "Allow authenticated inserts to chat-files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-files');

-- Policy to allow public access to view/download chat attachments
DROP POLICY IF EXISTS "Allow public select from chat-files" ON storage.objects;
CREATE POLICY "Allow public select from chat-files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'chat-files');

-- ============ MEMBERS VALIDATION / MANAGEMENT POLICY UPDATE ============
-- Autoriser les administrateurs (admin) et super-administrateurs (super_admin) à modifier les profils
DROP POLICY IF EXISTS "super_admin_update_profiles" ON user_profiles;
DROP POLICY IF EXISTS "admin_and_super_admin_update_profiles" ON user_profiles;

CREATE POLICY "admin_and_super_admin_update_profiles" ON user_profiles
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid() AND user_profiles.role IN ('admin', 'super_admin')
  )
);
