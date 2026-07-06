import { supabase } from '@/lib/supabase';

/** Bucket selon le type de fichier de cantique. */
export function bucketForType(type: 'partition_pdf' | 'image' | 'audio'): string {
  return type === 'audio' ? 'audios' : 'partitions';
}

/** URL signée (1h) pour un fichier privé. */
export async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

/** Upload d'un fichier ; retourne le chemin de stockage. */
export async function uploadFile(bucket: string, file: File, prefix: string): Promise<{ path: string | null; error: string | null }> {
  const ext = file.name.split('.').pop() || 'bin';
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) return { path: null, error: error.message };
  return { path, error: null };
}
