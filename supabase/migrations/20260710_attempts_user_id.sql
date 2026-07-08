-- ============================================================
-- ADD USER_ID COLUMN TO ATTEMPTS TABLE AND CONFIG RLS
-- ============================================================

-- 1. Ajouter la colonne user_id référençant auth.users
ALTER TABLE public.attempts 
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Mettre à jour l'identifiant pour les lignes existantes si possible (ex: premier admin ou profil trouvé)
DO $$
DECLARE
  default_uid uuid;
BEGIN
  SELECT id INTO default_uid FROM auth.users LIMIT 1;
  IF default_uid IS NOT NULL THEN
    UPDATE public.attempts SET user_id = default_uid WHERE user_id IS NULL;
  END IF;
END $$;

-- 3. Modifier la politique RLS pour sécuriser la table attempts
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_attempts" ON public.attempts;
DROP POLICY IF EXISTS "anon_insert_attempts" ON public.attempts;
DROP POLICY IF EXISTS "anon_update_attempts" ON public.attempts;
DROP POLICY IF EXISTS "anon_delete_attempts" ON public.attempts;

-- Lecture : les choristes lisent leurs propres tentatives, le staff lit tout
CREATE POLICY "select_attempts_policy" ON public.attempts 
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR public.is_staff());

-- Insertion : chaque utilisateur authentifié insère sa propre tentative
CREATE POLICY "insert_attempts_policy" ON public.attempts 
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
