'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Table2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useHymns } from '@/hooks/use-hymns';
import { useSchedule, toDateKey } from '@/hooks/use-schedule';
import { cn } from '@/lib/utils';
import { OCCASION_LABELS, type HymnScheduleEntry, type Occasion } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

type Range = 'semaine' | 'mois' | 'trimestre';

export default function AdminCalendrierPage() {
  const { user } = useAuth();
  const { hymns } = useHymns();
  const [range, setRange] = useState<Range>('mois');
  const [anchor, setAnchor] = useState(() => new Date());
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState({ date: toDateKey(new Date()), hymn_id: '', occasion: 'culte' as Occasion, notes: '' });

  const { from, to } = useMemo(() => {
    const a = new Date(anchor);
    a.setHours(0, 0, 0, 0);
    if (range === 'semaine') {
      const start = new Date(a);
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: toDateKey(start), to: toDateKey(end) };
    }
    if (range === 'mois') {
      return {
        from: toDateKey(new Date(a.getFullYear(), a.getMonth(), 1)),
        to: toDateKey(new Date(a.getFullYear(), a.getMonth() + 1, 0)),
      };
    }
    return {
      from: toDateKey(new Date(a.getFullYear(), a.getMonth(), 1)),
      to: toDateKey(new Date(a.getFullYear(), a.getMonth() + 3, 0)),
    };
  }, [anchor, range]);

  const { entries, loading, refresh } = useSchedule(from, to);

  const navigate = (dir: -1 | 1) => {
    const d = new Date(anchor);
    if (range === 'semaine') d.setDate(d.getDate() + dir * 7);
    else if (range === 'mois') d.setMonth(d.getMonth() + dir);
    else d.setMonth(d.getMonth() + dir * 3);
    setAnchor(d);
  };

  const updateEntry = async (entry: HymnScheduleEntry, patch: Partial<HymnScheduleEntry>) => {
    await supabase
      .from('hymn_schedule')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', entry.id);
    refresh();
  };

  const deleteEntry = async (entry: HymnScheduleEntry) => {
    await supabase.from('hymn_schedule').delete().eq('id', entry.id);
    refresh();
  };

  const addEntry = async () => {
    if (!newRow.date) return;
    setAdding(true);
    await supabase.from('hymn_schedule').insert({
      scheduled_date: newRow.date,
      hymn_id: newRow.hymn_id || null,
      occasion: newRow.occasion,
      notes: newRow.notes.trim() || null,
      created_by: user?.id || null,
    });
    setNewRow(r => ({ ...r, hymn_id: '', notes: '' }));
    setAdding(false);
    refresh();
  };

  const periodLabel = useMemo(() => {
    if (range === 'semaine') return `Semaine du ${new Date(from + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
    if (range === 'mois') return anchor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return `${new Date(from + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })} — ${new Date(to + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`;
  }, [range, anchor, from, to]);

  const cellCls =
    'w-full bg-transparent text-sm text-foreground outline-none px-2 py-1.5 rounded-lg focus:bg-muted focus:ring-1 focus:ring-primary/40 transition-colors';

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Calendrier du répertoire</h1>
        <p className="text-sm text-muted-foreground">
          Feuille éditable — chaque modification est visible immédiatement par tous les membres.
        </p>
      </header>

      {/* Contrôles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} aria-label="Période précédente"
            className="grid place-items-center w-9 h-9 rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setAnchor(new Date())}
            className="px-3 py-2 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors">
            Aujourd&apos;hui
          </button>
          <button type="button" onClick={() => navigate(1)} aria-label="Période suivante"
            className="grid place-items-center w-9 h-9 rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="ml-2 text-sm font-semibold text-foreground capitalize">{periodLabel}</span>
        </div>
        <div className="flex rounded-xl border border-border bg-card p-1" role="tablist" aria-label="Période affichée">
          {(['semaine', 'mois', 'trimestre'] as Range[]).map(r => (
            <button key={r} type="button" role="tab" aria-selected={range === r} onClick={() => setRange(r)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors',
                range === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Ligne d'ajout rapide */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Ajout rapide</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <input
            type="date"
            value={newRow.date}
            onChange={e => setNewRow(r => ({ ...r, date: e.target.value }))}
            aria-label="Date"
            className="px-3 py-2 rounded-xl border border-border bg-card text-sm text-foreground outline-none focus:border-primary"
          />
          <select
            value={newRow.hymn_id}
            onChange={e => setNewRow(r => ({ ...r, hymn_id: e.target.value }))}
            aria-label="Cantique"
            className="px-3 py-2 rounded-xl border border-border bg-card text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">— Choisir un cantique —</option>
            {hymns.map(h => (
              <option key={h.id} value={h.id}>
                {h.number != null ? `N°${h.number} — ` : ''}{h.title}
              </option>
            ))}
          </select>
          <select
            value={newRow.occasion}
            onChange={e => setNewRow(r => ({ ...r, occasion: e.target.value as Occasion }))}
            aria-label="Occasion"
            className="px-3 py-2 rounded-xl border border-border bg-card text-sm text-foreground outline-none focus:border-primary"
          >
            {Object.entries(OCCASION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input
            type="text"
            value={newRow.notes}
            onChange={e => setNewRow(r => ({ ...r, notes: e.target.value }))}
            placeholder="Notes (optionnel)"
            aria-label="Notes"
            className="px-3 py-2 rounded-xl border border-border bg-card text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={addEntry}
            disabled={adding || !newRow.date}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      </div>

      {/* Sheet éditable */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-muted text-muted-foreground">
              <Table2 className="w-6 h-6" />
            </div>
            <p className="text-sm text-muted-foreground">Aucune programmation sur cette période. Utilisez l&apos;ajout rapide.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th scope="col" className="px-3 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider w-40">Date</th>
                  <th scope="col" className="px-3 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-56">Cantique</th>
                  <th scope="col" className="px-3 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider w-36">Occasion</th>
                  <th scope="col" className="px-3 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-48">Notes</th>
                  <th scope="col" className="px-3 py-3 w-12"><span className="sr-only">Supprimer</span></th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-2 py-1.5">
                      <input
                        type="date"
                        value={e.scheduled_date}
                        onChange={ev => updateEntry(e, { scheduled_date: ev.target.value })}
                        aria-label="Date programmée"
                        className={cellCls}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={e.hymn_id || ''}
                        onChange={ev => updateEntry(e, { hymn_id: ev.target.value || null })}
                        aria-label="Cantique programmé"
                        className={cellCls}
                      >
                        <option value="">— Aucun —</option>
                        {hymns.map(h => (
                          <option key={h.id} value={h.id}>
                            {h.number != null ? `N°${h.number} — ` : ''}{h.title}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={e.occasion}
                        onChange={ev => updateEntry(e, { occasion: ev.target.value as Occasion })}
                        aria-label="Occasion"
                        className={cellCls}
                      >
                        {Object.entries(OCCASION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <NotesCell entry={e} onSave={notes => updateEntry(e, { notes })} />
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => deleteEntry(e)}
                        aria-label="Supprimer cette ligne"
                        className="grid place-items-center w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/** Cellule de notes avec sauvegarde au blur (évite un update à chaque frappe). */
function NotesCell({ entry, onSave }: { entry: HymnScheduleEntry; onSave: (notes: string | null) => void }) {
  const [value, setValue] = useState(entry.notes || '');
  return (
    <input
      type="text"
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={() => {
        const v = value.trim() || null;
        if (v !== entry.notes) onSave(v);
      }}
      placeholder="—"
      aria-label="Notes"
      className="w-full bg-transparent text-sm text-foreground outline-none px-2 py-1.5 rounded-lg focus:bg-muted focus:ring-1 focus:ring-primary/40 transition-colors placeholder:text-muted-foreground"
    />
  );
}
