-- ============================================================
-- Maestro Studio — Create Quiz Questions Table
-- Date: 2026-07-06
-- ============================================================

SET ROLE postgres;

CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
  question text NOT NULL,
  options text[] NOT NULL,
  correct_answer_index integer NOT NULL,
  explanation text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Activer Row Level Security (RLS)
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

-- Politique de lecture : Tout le monde (anonyme et authentifié) peut lire les quiz
DROP POLICY IF EXISTS "quiz_select" ON quiz_questions;
CREATE POLICY "quiz_select" ON quiz_questions FOR SELECT TO anon, authenticated USING (true);

-- Politique d'administration : Seuls les admins/super_admins peuvent faire le CRUD
DROP POLICY IF EXISTS "quiz_admin" ON quiz_questions;
CREATE POLICY "quiz_admin" ON quiz_questions FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
  )
);

-- ============ SEED QUESTIONS ============
INSERT INTO quiz_questions (lesson_id, question, options, correct_answer_index, explanation)
VALUES
-- Leçon 1 (Respiration abdominale)
(
  '44444444-4444-4444-4444-444444444411',
  'Quel muscle sépare le thorax de l''abdomen et gère la respiration ?',
  ARRAY['Le diaphragme', 'Les abdominaux', 'Les cordes vocales', 'Le cœur'],
  0,
  'Le diaphragme est le muscle respiratoire principal.'
),
(
  '44444444-4444-4444-4444-444444444411',
  'Pour une bonne respiration de chant, il faut ?',
  ARRAY['Lever les épaules', 'Gonfler le haut du thorax', 'Détendre le ventre à l''inspiration', 'Bloquer la gorge'],
  2,
  'La respiration abdominale nécessite de relâcher le ventre pour laisser descendre le diaphragme.'
),
-- Leçon 2 (Le contrôle du débit d'air)
(
  '44444444-4444-4444-4444-444444444412',
  'L''exercice du sifflement (ou du S) sert à ?',
  ARRAY['Se faire remarquer', 'Stabiliser le flux d''air', 'Chanter plus aigu', 'Échauffer les cordes vocales'],
  1,
  'Siffler régulièrement apprend à réguler la pression diaphragmatique.'
),
-- Leçon 3 (Les notes tenues et stables)
(
  '44444444-4444-4444-4444-444444444421',
  'Quelle est la clé d''une note tenue et stable ?',
  ARRAY['La puissance pulmonaire', 'L''oreille attentive et le soutien abdominal constant', 'La chance', 'La forme de la bouche'],
  1,
  'Chanter juste et stable requiert un soutien régulier et une bonne écoute.'
),
-- Leçon 4 (Les intervalles simples)
(
  '44444444-4444-4444-4444-444444444422',
  'Qu''est-ce qu''une tierce ?',
  ARRAY['2 notes', 'Un intervalle de 3 degrés', 'Un rythme', 'Un type de voix'],
  1,
  'La tierce est l''intervalle entre la 1ère et la 3ème note de la gamme.'
),
(
  '44444444-4444-4444-4444-444444444422',
  'La justesse dépend surtout de ?',
  ARRAY['La force', 'L''oreille et le contrôle', 'Le micro', 'La chance'],
  1,
  'Chanter juste = entendre la note et ajuster sa hauteur.'
);
