import { supabase } from '@/lib/supabase';

/**
 * Journalise une action admin sensible (changement de rôle, permissions,
 * etc.) dans admin_audit_log. Best-effort et non bloquant : une erreur de
 * journalisation ne doit jamais empêcher l'action elle-même.
 */
export function logAdminAction(
  actorId: string,
  actorName: string | null,
  action: string,
  targetType: string,
  targetId: string | null,
  details?: Record<string, unknown>
) {
  supabase.from('admin_audit_log').insert({
    actor_id: actorId,
    actor_name: actorName,
    action,
    target_type: targetType,
    target_id: targetId,
    details: details ?? null,
  }).then(({ error }) => {
    if (error) console.error('Erreur lors de la journalisation admin :', error.message);
  });
}
