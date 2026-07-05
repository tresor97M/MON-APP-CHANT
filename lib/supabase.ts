import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'los-auth',
  },
});

export type Skill = {
  id: string; slug: string; name: string; tagline: string | null;
  description: string | null; icon: string; color: string; sort_order: number; is_active: boolean;
};
export type Path = {
  id: string; skill_id: string; slug: string; name: string;
  description: string | null; level: string; sort_order: number;
};
export type Module = {
  id: string; path_id: string; name: string; description: string | null;
  icon: string; sort_order: number;
};
export type Lesson = {
  id: string; module_id: string; name: string; description: string | null;
  sort_order: number; xp_reward: number; duration_min: number;
};
export type Exercise = {
  id: string; lesson_id: string; name: string;
  type: 'breathing' | 'pitch' | 'rhythm' | 'quiz';
  prompt: string; target: Record<string, unknown> | null;
  scoring: Record<string, unknown> | null; sort_order: number;
};
export type UserProgress = {
  id: string; lesson_id: string; status: 'locked' | 'available' | 'completed';
  best_score: number; completed: boolean; updated_at: string;
};
export type UserStats = {
  id: string; total_xp: number; level: number; streak_days: number;
  last_active_date: string | null; daily_goal_xp: number; daily_xp: number; weekly_xp: number;
};
export type Badge = {
  id: string; slug: string; name: string; description: string | null;
  icon: string; tier: 'bronze' | 'silver' | 'gold'; condition: Record<string, unknown> | null;
};
export type UserBadge = { id: string; badge_id: string; earned_at: string };
export type LeagueMember = {
  id: string; league_id: string; display_name: string; avatar_emoji: string;
  weekly_xp: number; is_current_user: boolean; sort_order: number;
};
export type Attempt = {
  id: string; exercise_id: string; score: number; accuracy: number;
  duration_ms: number | null; feedback: Record<string, unknown> | null; created_at: string;
};

// ============ NEW TABLES ============
export type UserProfile = {
  id: string; user_id: string; display_name: string; username: string | null;
  bio: string | null; location: string | null; phone: string | null; avatar_url: string | null;
  show_email: boolean; show_progress: boolean; allow_messages: boolean;
  notify_email: boolean; notify_security: boolean;
  role: string; learning_profile: string | null; instrument: string | null;
  admin_permissions: string[] | null;
  created_at: string; updated_at: string;
};

export type Conversation = {
  id: string; participant_a: string; participant_b: string;
  last_message: string | null; last_message_at: string; created_at: string;
};

export type Message = {
  id: string; conversation_id: string; sender_id: string;
  content: string; read: boolean; created_at: string;
};

export type ForumPost = {
  id: string; user_id: string; author_name: string;
  title: string; content: string; category: string;
  solved: boolean; likes: number; views: number;
  created_at: string; updated_at: string;
};

export type ForumReply = {
  id: string; post_id: string; user_id: string; author_name: string;
  content: string; likes: number; is_accepted: boolean; created_at: string;
};

