-- ============================================================
-- Maestro Studio — Seed Data (Données d'Exemple)
-- Date: 2026-07-04
-- Remplissage des cours, modules, leçons, exercices, badges et membres de ligue
-- ============================================================

-- 1. Nettoyage des anciennes données pour repartir à propre
TRUNCATE league_members, user_badges, badges, attempts, user_progress, exercises, lessons, modules, paths, skills CASCADE;

-- ============ SKILL ============
INSERT INTO skills (id, slug, name, tagline, description, icon, color, sort_order, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'chant',
  'Chant',
  'Libérez votre voix et apprenez la technique vocale',
  'Un parcours complet combinant approche scientifique et exercices pratiques pour maîtriser la justesse, le souffle et le vibrato.',
  'Music',
  'primary',
  0,
  true
);

-- ============ PATH ============
INSERT INTO paths (id, skill_id, slug, name, description, level, sort_order)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'debutant-chant',
  'Débutant Chant',
  'Maîtrisez les fondamentaux du chant moderne et classique',
  'Débutant',
  0
);

-- ============ MODULES ============
INSERT INTO modules (id, path_id, name, description, icon, sort_order)
VALUES 
(
  '33333333-3333-3333-3333-333333333331',
  '22222222-2222-2222-2222-222222222222',
  'Respiration & Soutien',
  'Apprenez à utiliser votre diaphragme et contrôler votre flux d''air.',
  'Wind',
  0
),
(
  '33333333-3333-3333-3333-333333333332',
  '22222222-2222-2222-2222-222222222222',
  'Justesse Vocale',
  'Entraînez votre oreille et votre voix à cibler les notes avec précision.',
  'Activity',
  1
),
(
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'Maîtrise du Vibrato',
  'Développez une oscillation naturelle et contrôlée de votre voix.',
  'TrendingUp',
  2
);

-- ============ LESSONS ============
INSERT INTO lessons (id, module_id, name, description, sort_order, xp_reward, duration_min)
VALUES
-- Module Respiration
(
  '44444444-4444-4444-4444-444444444411',
  '33333333-3333-3333-3333-333333333331',
  'Le Diaphragme et la Respiration abdominale',
  'Découvrez le moteur physique de votre voix et apprenez à le relâcher.',
  0, 20, 5
),
(
  '44444444-4444-4444-4444-444444444412',
  '33333333-3333-3333-3333-333333333331',
  'Le contrôle du débit d''air',
  'Pratiquez l''expiration constante et régulière avec l''exercice du sifflement.',
  1, 20, 6
),
-- Module Justesse
(
  '44444444-4444-4444-4444-444444444421',
  '33333333-3333-3333-3333-333333333332',
  'Les notes tenues et stables',
  'Chantez et maintenez une note unique sans dévier du ton.',
  0, 25, 5
),
(
  '44444444-4444-4444-4444-444444444422',
  '33333333-3333-3333-3333-333333333332',
  'Les intervalles simples',
  'Passez d''une note à une autre de manière nette et précise.',
  1, 25, 7
),
-- Module Vibrato
(
  '44444444-4444-4444-4444-444444444431',
  '33333333-3333-3333-3333-333333333333',
  'Comprendre l''oscillation vocale',
  'Apprenez à basculer doucement entre deux demi-tons rapprochés.',
  0, 30, 8
);

-- ============ EXERCISES ============
INSERT INTO exercises (id, lesson_id, name, type, prompt, target, scoring)
VALUES
-- Exercices Leçon Diaphragme
(
  '55555555-5555-5555-5555-555555555511',
  '44444444-4444-4444-4444-444444444411',
  'Inhalation Profonde',
  'breathing',
  'Inspirez profondément par le nez en gonflant le ventre pendant 4 secondes.',
  '{"duration_sec": 4, "pattern": "inhale"}'::jsonb,
  '{"min_duration": 3.8}'::jsonb
),
(
  '55555555-5555-5555-5555-555555555512',
  '44444444-4444-4444-4444-444444444411',
  'Rétention d''air',
  'breathing',
  'Bloquez votre respiration sans forcer ni fermer la gorge pendant 4 secondes.',
  '{"duration_sec": 4, "pattern": "hold"}'::jsonb,
  '{"min_duration": 4.0}'::jsonb
),
-- Exercices Leçon Débit d'air
(
  '55555555-5555-5555-5555-555555555521',
  '44444444-4444-4444-4444-444444444412',
  'L''exercice du sifflement continu',
  'breathing',
  'Expirez de l''air en faisant un son "Ssss" continu et régulier.',
  '{"duration_sec": 8, "pattern": "exhale_s"}'::jsonb,
  '{"stability_factor": 0.85}'::jsonb
),
-- Exercices Leçon Notes tenues
(
  '55555555-5555-5555-5555-555555555531',
  '44444444-4444-4444-4444-444444444421',
  'Maintenir le Do3 (C3)',
  'pitch',
  'Chantez un son "Ah" stable calé sur la note Do3.',
  '{"target_pitch_hz": 130.81, "duration_sec": 5}'::jsonb,
  '{"tolerance_cents": 20}'::jsonb
),
-- Exercices Leçon Intervalles
(
  '55555555-5555-5555-5555-555555555541',
  '44444444-4444-4444-4444-444444444422',
  'Saut d''Octave Do3 - Do4',
  'pitch',
  'Chantez un Do3 puis montez proprement vers le Do4.',
  '{"sequence": [130.81, 261.63], "duration_per_note": 3}'::jsonb,
  '{"accuracy_minimum": 80}'::jsonb
);

-- ============ PROGRESS INITIALISATION (Pour que le dashboard affiche des cours disponibles) ============
INSERT INTO user_progress (id, lesson_id, status, best_score, completed)
VALUES
('66666666-6666-6666-6666-666666666611', '44444444-4444-4444-4444-444444444411', 'available', 0, false),
('66666666-6666-6666-6666-666666666612', '44444444-4444-4444-4444-444444444412', 'available', 0, false),
('66666666-6666-6666-6666-666666666621', '44444444-4444-4444-4444-444444444421', 'available', 0, false),
('66666666-6666-6666-6666-666666666622', '44444444-4444-4444-4444-444444444422', 'available', 0, false),
('66666666-6666-6666-6666-666666666631', '44444444-4444-4444-4444-444444444431', 'available', 0, false);

-- ============ BADGES ============
INSERT INTO badges (id, slug, name, description, icon, tier)
VALUES 
(
  '77777777-7777-7777-7777-777777777771',
  'premiere-lecon',
  'Première Leçon',
  'Félicitations pour avoir complété votre premier exercice de chant !',
  'Award',
  'bronze'
),
(
  '77777777-7777-7777-7777-777777777772',
  'justesse-or',
  'Justesse Or',
  'Obtenez un score de 95% ou plus sur un exercice de justesse.',
  'Zap',
  'gold'
),
(
  '77777777-7777-7777-7777-777777777773',
  'vibrato-maitre',
  'Vibrato Maître',
  'Complétez le module Vibrato avancé.',
  'Star',
  'silver'
);

-- ============ LEAGUE MEMBERS (Pour peupler le classement) ============
-- Supposons une ligue de test
INSERT INTO leagues (id, name, tier, week_start)
VALUES ('88888888-8888-8888-8888-888888888888', 'Ligue Rubis', 'gold', CURRENT_DATE);

INSERT INTO league_members (league_id, display_name, avatar_emoji, weekly_xp, is_current_user, sort_order)
VALUES
('88888888-8888-8888-8888-888888888888', 'Léa B.', '🎤', 290, false, 1),
('88888888-8888-8888-8888-888888888888', 'Marc D.', '🎶', 245, false, 2),
('88888888-8888-8888-8888-888888888888', 'Sophie L.', '🎵', 180, false, 3),
('88888888-8888-8888-8888-888888888888', 'Jules B.', '🎧', 120, false, 4),
('88888888-8888-8888-8888-888888888888', 'Vous (Démo)', '🎤', 85, true, 5);
