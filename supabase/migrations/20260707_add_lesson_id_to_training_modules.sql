-- ============================================================
-- Maestro Studio — Add lesson_id to training_modules
-- Date: 2026-07-07
-- ============================================================

ALTER TABLE public.training_modules ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL;
