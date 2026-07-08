-- ============================================================
-- Maestro Studio — Exercise Audios Storage Bucket
-- Date: 2026-07-08
-- ============================================================

-- 1. Insérer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-audios', 'exercise-audios', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Créer la politique d'accès public aux fichiers
CREATE POLICY "Allow public read access to exercise audios"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'exercise-audios');

-- 3. Créer la politique d'écriture pour les utilisateurs authentifiés (administrateurs)
CREATE POLICY "Allow auth write access to exercise audios"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'exercise-audios');

-- 4. Permettre la suppression pour les utilisateurs authentifiés
CREATE POLICY "Allow auth delete access to exercise audios"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'exercise-audios');
