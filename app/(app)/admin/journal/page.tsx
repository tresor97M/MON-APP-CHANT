'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { supabase, type AdminAuditLogEntry } from '@/lib/supabase';
import { ScrollText, ShieldAlert } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  role_change: 'Changement de rôle / permissions',
};

export default function AdminAuditLogPage() {
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<AdminAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!userProfile || userProfile.role !== 'super_admin')) {
      router.replace('/admin');
    }
  }, [userProfile, authLoading, router]);

  useEffect(() => {
    if (userProfile?.role !== 'super_admin') return;
    supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setEntries(data || []);
        setLoading(false);
      });
  }, [userProfile]);

  if (authLoading || !userProfile || userProfile.role !== 'super_admin') {
    return <div className="p-8 text-center text-sm text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-primary" />
          Journal d'audit
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Historique des actions administratives sensibles (rôles, permissions).
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-sm text-muted-foreground">Chargement du journal...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground flex flex-col items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-muted-foreground/40" />
            Aucune action journalisée pour le moment.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entries.map((e) => (
              <div key={e.id} className="px-5 py-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-foreground">{ACTION_LABELS[e.action] || e.action}</span>
                  <span className="text-[11px] text-muted-foreground">{new Date(e.created_at).toLocaleString('fr-FR')}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Par <span className="font-medium text-foreground/80">{e.actor_name || 'Inconnu'}</span>
                  {e.details && (e.details as any).target_user && (
                    <> · sur <span className="font-medium text-foreground/80">{(e.details as any).target_user}</span></>
                  )}
                </p>
                {e.details && (e.details as any).role_before !== undefined && (
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    Rôle : {(e.details as any).role_before || '—'} → <span className="font-semibold">{(e.details as any).role_after}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
