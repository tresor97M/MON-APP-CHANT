-- ============================================================
-- Maestro Studio — Add Roles and Learning Profiles
-- Date: 2026-07-04
-- Adds columns: role, learning_profile, instrument, admin_permissions to user_profiles
-- ============================================================

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student',
ADD COLUMN IF NOT EXISTS learning_profile text,
ADD COLUMN IF NOT EXISTS instrument text,
ADD COLUMN IF NOT EXISTS admin_permissions jsonb DEFAULT '[]'::jsonb;
