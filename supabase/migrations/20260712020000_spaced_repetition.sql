-- ============================================================
-- Maestro Studio — Répétition espacée pour la mémorisation des cantiques
-- Date: 2026-07-12
--
-- hymn_progress avait déjà self_rating mais rien ne s'en servait pour
-- planifier une prochaine révision. Ajoute les colonnes nécessaires à un
-- algorithme SM-2 simplifié (voir lib/spaced-repetition.ts).
-- ============================================================

ALTER TABLE public.hymn_progress
  ADD COLUMN IF NOT EXISTS next_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_interval_days integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ease_factor numeric(3,2) NOT NULL DEFAULT 2.5;

CREATE INDEX IF NOT EXISTS idx_hymn_progress_next_review ON public.hymn_progress(user_id, next_review_at);
