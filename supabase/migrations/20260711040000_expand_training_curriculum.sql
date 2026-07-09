-- ============================================================
-- Maestro Studio — Enrichissement du parcours de formation
-- Date: 2026-07-11
--
-- Le parcours initial (seed_data.sql) ne comptait que 3 modules et
-- 5 leçons. On ajoute :
--   - Des leçons supplémentaires dans les 3 modules existants
--     (Respiration, Justesse, Vibrato).
--   - 3 nouveaux modules couvrant les catégories d'exercices restantes :
--     Chant (mélodie), Harmonisation, Vocalises.
-- Chaque exercice a un `target` conforme à son type (target_pitch_hz
-- pour une note tenue, sequence/duration_per_note pour une suite de
-- notes, chord_hz pour une harmonisation, pattern pour la respiration)
-- et une durée adaptée à la tâche (15s à 60s).
--
-- Insertions additives uniquement (pas de TRUNCATE) : sûr à exécuter
-- sur une base de production existante, ne touche pas aux données
-- déjà présentes (progression, tentatives, etc.).
-- ============================================================

-- ============ NOUVEAUX MODULES ============
INSERT INTO modules (id, path_id, name, description, icon, sort_order)
VALUES
(
  '33333333-3333-3333-3333-333333333334',
  '22222222-2222-2222-2222-222222222222',
  'Chant & Interprétation',
  'Chantez de courtes phrases mélodiques avec justesse et musicalité.',
  'Music2',
  3
),
(
  '33333333-3333-3333-3333-333333333335',
  '22222222-2222-2222-2222-222222222222',
  'Harmonisation',
  'Apprenez à tenir votre voix au sein d''un accord, sans vous laisser entraîner.',
  'Users',
  4
),
(
  '33333333-3333-3333-3333-333333333336',
  '22222222-2222-2222-2222-222222222222',
  'Vocalises',
  'Échauffez et déliez votre voix avec des motifs vocaux classiques.',
  'Waves',
  5
)
ON CONFLICT (id) DO NOTHING;

-- ============ NOUVELLES LEÇONS (modules existants) ============
INSERT INTO lessons (id, module_id, name, description, sort_order, xp_reward, duration_min)
VALUES
-- Respiration & Soutien (module ...331)
('44444444-4444-4444-4444-444444444413', '33333333-3333-3333-3333-333333333331', 'La respiration carrée', 'Inspire, tiens, expire, tiens : un rythme égal en 4 temps pour stabiliser le souffle.', 2, 25, 6),
('44444444-4444-4444-4444-444444444414', '33333333-3333-3333-3333-333333333331', 'Soutien abdominal en legato', 'Maintenez un flux d''air constant sur une expiration longue et régulière.', 3, 25, 6),
-- Justesse Vocale (module ...332)
('44444444-4444-4444-4444-444444444423', '33333333-3333-3333-3333-333333333332', 'Intervalles de tierce et de quinte', 'Enchaînez deux notes avec un écart précis, sans glisser.', 2, 30, 7),
('44444444-4444-4444-4444-444444444424', '33333333-3333-3333-3333-333333333332', 'Justesse sur une phrase courte', 'Gardez la même justesse du début à la fin d''une petite phrase chantée.', 3, 30, 8),
-- Maîtrise du Vibrato (module ...333)
('44444444-4444-4444-4444-444444444432', '33333333-3333-3333-3333-333333333333', 'Vibrato contrôlé sur note tenue', 'Ajoutez une oscillation régulière (4-8 Hz) sans perdre la note centrale.', 1, 30, 7),
('44444444-4444-4444-4444-444444444433', '33333333-3333-3333-3333-333333333333', 'Vibrato en fin de phrase', 'Introduisez le vibrato naturellement sur la fin d''une tenue, pas dès le début.', 2, 35, 8)
ON CONFLICT (id) DO NOTHING;

-- ============ NOUVELLES LEÇONS (nouveaux modules) ============
INSERT INTO lessons (id, module_id, name, description, sort_order, xp_reward, duration_min)
VALUES
-- Chant & Interprétation (module ...334)
('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333334', 'Phrase mélodique simple', 'Chantez un court motif Do-Ré-Mi-Fa-Sol avec justesse et fluidité.', 0, 30, 8),
('44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333334', 'Mélodie avec nuances', 'Reproduisez une phrase mélodique plus longue en respectant les hauteurs.', 1, 35, 10),
-- Harmonisation (module ...335)
('44444444-4444-4444-4444-444444444451', '33333333-3333-3333-3333-333333333335', 'Tenir sa voix dans un accord parfait', 'Chantez votre note pendant qu''un accord complet joue autour de vous.', 0, 30, 8),
('44444444-4444-4444-4444-444444444452', '33333333-3333-3333-3333-333333333335', 'Harmonisation à deux voix (tierce)', 'Tenez votre note pendant qu''une seconde voix chante une tierce au-dessus.', 1, 35, 10),
-- Vocalises (module ...336)
('44444444-4444-4444-4444-444444444461', '33333333-3333-3333-3333-333333333336', 'Vocalise gamme montante-descendante', 'Échauffement classique : 1-2-3-4-5-4-3-2-1 sur "Ah".', 0, 25, 6),
('44444444-4444-4444-4444-444444444462', '33333333-3333-3333-3333-333333333336', 'Vocalise en arpège', 'Enchaînez les notes d''un arpège majeur pour délier le passage de registre.', 1, 30, 8)
ON CONFLICT (id) DO NOTHING;

-- ============ NOUVEAUX EXERCICES ============
INSERT INTO exercises (id, lesson_id, name, type, prompt, target, scoring)
VALUES
-- Respiration carrée (leçon ...413) : cycle complet inspire/tiens/expire/tiens
('55555555-5555-5555-5555-555555555513', '44444444-4444-4444-4444-444444444413', 'Cycle respiratoire carré', 'breathing', 'Suis le guide sonore : inspire 4s, tiens 4s, expire 4s.', '{"pattern": {"inhale": 4, "hold": 4, "exhale": 4}, "duration_sec": 20}'::jsonb, '{"min_sustain_ratio": 0.6}'::jsonb),
-- Soutien abdominal legato (leçon ...414) : expiration longue
('55555555-5555-5555-5555-555555555515', '44444444-4444-4444-4444-444444444414', 'Expiration longue et stable', 'breathing', 'Expirez sur un "Sss" ou "Ah" continu, le plus stable et long possible.', '{"pattern": {"inhale": 3, "hold": 1, "exhale": 15}, "duration_sec": 25}'::jsonb, '{"min_sustain_ratio": 0.7}'::jsonb),

-- Intervalles tierce/quinte (leçon ...423)
('55555555-5555-5555-5555-555555555516', '44444444-4444-4444-4444-444444444423', 'Tierce Do-Mi', 'pitch', 'Chantez Do puis Mi, sans glisser entre les deux notes.', '{"sequence": [261.63, 329.63], "duration_per_note": 3, "duration_sec": 18}'::jsonb, '{"accuracy_minimum": 80}'::jsonb),
('55555555-5555-5555-5555-555555555517', '44444444-4444-4444-4444-444444444423', 'Quinte Do-Sol', 'pitch', 'Chantez Do puis Sol, en visant chaque note avec précision.', '{"sequence": [261.63, 392.00], "duration_per_note": 3, "duration_sec": 18}'::jsonb, '{"accuracy_minimum": 80}'::jsonb),

-- Justesse sur phrase courte (leçon ...424)
('55555555-5555-5555-5555-555555555518', '44444444-4444-4444-4444-444444444424', 'Phrase Do-Mi-Sol-Mi-Do', 'melody', 'Chantez cette courte phrase en respectant chaque hauteur de note.', '{"sequence": [261.63, 329.63, 392.00, 329.63, 261.63], "duration_per_note": 1.2, "duration_sec": 20}'::jsonb, '{"accuracy_minimum": 75}'::jsonb),

-- Vibrato contrôlé (leçon ...432)
('55555555-5555-5555-5555-555555555519', '44444444-4444-4444-4444-444444444432', 'Vibrato sur La3', 'vibrato', 'Tenez la note La3 et ajoutez un vibrato régulier après 1-2 secondes.', '{"target_pitch_hz": 220.00, "duration_sec": 20}'::jsonb, '{"vibrato_rate_hz": [4, 8], "vibrato_depth_cents": [15, 60]}'::jsonb),

-- Vibrato en fin de phrase (leçon ...433)
('55555555-5555-5555-5555-555555555520', '44444444-4444-4444-4444-444444444433', 'Vibrato différé sur Do4', 'vibrato', 'Tenez le Do4 droit au début, puis laissez le vibrato apparaître en fin de tenue.', '{"target_pitch_hz": 261.63, "duration_sec": 20}'::jsonb, '{"vibrato_rate_hz": [4, 8], "vibrato_depth_cents": [15, 60]}'::jsonb),

-- Phrase mélodique simple (leçon ...441)
('55555555-5555-5555-5555-555555555527', '44444444-4444-4444-4444-444444444441', 'Motif Do-Ré-Mi-Fa-Sol', 'melody', 'Écoutez puis chantez ce court motif ascendant.', '{"sequence": [261.63, 293.66, 329.63, 349.23, 392.00], "duration_per_note": 0.6, "duration_sec": 25}'::jsonb, '{"accuracy_minimum": 75}'::jsonb),

-- Mélodie avec nuances (leçon ...442)
('55555555-5555-5555-5555-555555555522', '44444444-4444-4444-4444-444444444442', 'Phrase mélodique complète', 'melody', 'Reproduisez cette phrase plus longue, du début à la fin.', '{"sequence": [261.63, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66, 261.63], "duration_per_note": 0.7, "duration_sec": 35}'::jsonb, '{"accuracy_minimum": 70}'::jsonb),

-- Tenir sa voix dans un accord (leçon ...451)
('55555555-5555-5555-5555-555555555523', '44444444-4444-4444-4444-444444444451', 'Voix tenue dans un accord de Do majeur', 'harmony', 'Écoutez l''accord (Do-Mi-Sol), puis chantez et tenez la note Do dedans.', '{"target_pitch_hz": 261.63, "chord_hz": [261.63, 329.63, 392.00], "duration_sec": 25}'::jsonb, '{"accuracy_minimum": 75}'::jsonb),

-- Harmonisation à deux voix (leçon ...452)
('55555555-5555-5555-5555-555555555524', '44444444-4444-4444-4444-444444444452', 'Tierce harmonique sur Mi', 'harmony', 'Une voix chante Do en fond : tenez le Mi au-dessus, sans dériver vers le Do.', '{"target_pitch_hz": 329.63, "chord_hz": [261.63, 329.63], "duration_sec": 25}'::jsonb, '{"accuracy_minimum": 75}'::jsonb),

-- Vocalise gamme (leçon ...461)
('55555555-5555-5555-5555-555555555525', '44444444-4444-4444-4444-444444444461', 'Gamme 1-2-3-4-5-4-3-2-1 sur Do', 'vocalise', 'Chantez la gamme montante puis descendante sur "Ah", sans casser le legato.', '{"sequence": [261.63, 293.66, 329.63, 349.23, 392.00, 349.23, 329.63, 293.66, 261.63], "duration_per_note": 0.5, "duration_sec": 20}'::jsonb, '{"accuracy_minimum": 75}'::jsonb),

-- Vocalise en arpège (leçon ...462)
('55555555-5555-5555-5555-555555555526', '44444444-4444-4444-4444-444444444462', 'Arpège de Do majeur', 'vocalise', 'Enchaînez Do-Mi-Sol-Do à l''octave sur "Ah", en gardant chaque note stable.', '{"sequence": [261.63, 329.63, 392.00, 523.25], "duration_per_note": 0.6, "duration_sec": 20}'::jsonb, '{"accuracy_minimum": 75}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============ DÉVERROUILLAGE INITIAL (cohérent avec seed_data.sql qui
-- rendait déjà toutes les leçons disponibles pour la démo) ============
INSERT INTO user_progress (id, lesson_id, status, best_score, completed)
VALUES
('66666666-6666-6666-6666-666666666613', '44444444-4444-4444-4444-444444444413', 'available', 0, false),
('66666666-6666-6666-6666-666666666614', '44444444-4444-4444-4444-444444444414', 'available', 0, false),
('66666666-6666-6666-6666-666666666623', '44444444-4444-4444-4444-444444444423', 'available', 0, false),
('66666666-6666-6666-6666-666666666624', '44444444-4444-4444-4444-444444444424', 'available', 0, false),
('66666666-6666-6666-6666-666666666632', '44444444-4444-4444-4444-444444444432', 'available', 0, false),
('66666666-6666-6666-6666-666666666633', '44444444-4444-4444-4444-444444444433', 'available', 0, false),
('66666666-6666-6666-6666-666666666641', '44444444-4444-4444-4444-444444444441', 'available', 0, false),
('66666666-6666-6666-6666-666666666642', '44444444-4444-4444-4444-444444444442', 'available', 0, false),
('66666666-6666-6666-6666-666666666651', '44444444-4444-4444-4444-444444444451', 'available', 0, false),
('66666666-6666-6666-6666-666666666652', '44444444-4444-4444-4444-444444444452', 'available', 0, false),
('66666666-6666-6666-6666-666666666661', '44444444-4444-4444-4444-444444444461', 'available', 0, false),
('66666666-6666-6666-6666-666666666662', '44444444-4444-4444-4444-444444444462', 'available', 0, false)
ON CONFLICT (id) DO NOTHING;
