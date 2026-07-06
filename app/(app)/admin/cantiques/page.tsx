'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Search, Pencil, Trash2, Music } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useHymns } from '@/hooks/use-hymns';
import { cn } from '@/lib/utils';
import {
  HYMN_CATEGORIES, LEARNING_STATUS_LABELS, LEARNING_STATUS_COLORS,
  type Hymn, type LearningStatus,
} from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { HymnFormDialog } from '@/components/admin/hymn-form-dialog';

export default function AdminCantiquesPage() {
  const { user } = useAuth();
  const { hymns, loading, refresh } = useHymns();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Hymn | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Ouverture directe en édition via ?edit=<id>
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && hymns.length > 0 && !dialogOpen) {
      const h = hymns.find(x => x.id === editId);
      if (h) {
        setEditing(h);
        setDialogOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, hymns]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hymns;
    return hymns.filter(
      h => h.title.toLowerCase().includes(q) || String(h.number || '').includes(q),
    );
  }, [hymns, search]);

  const updateStatus = async (hymn: Hymn, status: LearningStatus) => {
    await supabase.from('hymns').update({ learning_status: status, updated_at: new Date().toISOString() }).eq('id', hymn.id);
    refresh();
  };

  const deleteHymn = async (hymn: Hymn) => {
    if (!confirm(`Supprimer « ${hymn.title} » ? Les fichiers et la programmation liés seront aussi supprimés.`)) return;
    await supabase.from('hymns').delete().eq('id', hymn.id);
    refresh();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Gestion des cantiques</h1>
          <p className="text-sm text-muted-foreground">{hymns.length} cantique{hymns.length > 1 ? 's' : ''} au répertoire</p>
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Nouveau cantique
        </button>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un cantique..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-muted-foreground"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-muted text-muted-foreground">
              <Music className="w-6 h-6" />
            </div>
            <p className="text-sm text-muted-foreground">Aucun cantique. Créez le premier.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th scope="col" className="px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider w-16">N°</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Titre</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Catégorie</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Statut</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => (
                  <tr key={h.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{h.number ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{h.title}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{HYMN_CATEGORIES[h.category]}</td>
                    <td className="px-4 py-3">
                      <select
                        value={h.learning_status}
                        onChange={e => updateStatus(h, e.target.value as LearningStatus)}
                        aria-label={`Statut de ${h.title}`}
                        className={cn(
                          'text-xs font-semibold rounded-lg border px-2 py-1 outline-none bg-transparent cursor-pointer',
                          LEARNING_STATUS_COLORS[h.learning_status],
                        )}
                      >
                        {Object.entries(LEARNING_STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => { setEditing(h); setDialogOpen(true); }}
                          aria-label={`Modifier ${h.title}`}
                          className="grid place-items-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteHymn(h)}
                          aria-label={`Supprimer ${h.title}`}
                          className="grid place-items-center w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <HymnFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        hymn={editing}
        userId={user?.id || null}
        onSaved={refresh}
      />
    </div>
  );
}
