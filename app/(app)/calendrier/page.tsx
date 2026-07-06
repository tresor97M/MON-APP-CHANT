'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, CalendarDays, Music } from 'lucide-react';
import { useSchedule, toDateKey } from '@/hooks/use-schedule';
import { cn } from '@/lib/utils';
import { OCCASION_LABELS, type HymnScheduleEntry, type Occasion } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type ViewMode = 'jour' | 'semaine' | 'mois';

const OCCASION_COLORS: Record<Occasion, string> = {
  culte: 'bg-primary/10 text-primary border-primary/20',
  repetition: 'bg-amber-100 text-amber-700 border-amber-200',
  concert: 'bg-rose-100 text-rose-700 border-rose-200',
  evenement: 'bg-sky-100 text-sky-700 border-sky-200',
};

export default function CalendrierPage() {
  const [view, setView] = useState<ViewMode>('semaine');
  const [anchor, setAnchor] = useState(() => new Date());

  const { from, to, days } = useMemo(() => {
    const a = new Date(anchor);
    a.setHours(0, 0, 0, 0);
    if (view === 'jour') {
      return { from: toDateKey(a), to: toDateKey(a), days: [new Date(a)] };
    }
    if (view === 'semaine') {
      const start = new Date(a);
      const dow = (start.getDay() + 6) % 7; // lundi = 0
      start.setDate(start.getDate() - dow);
      const list = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      });
      return { from: toDateKey(list[0]), to: toDateKey(list[6]), days: list };
    }
    // mois
    const start = new Date(a.getFullYear(), a.getMonth(), 1);
    const end = new Date(a.getFullYear(), a.getMonth() + 1, 0);
    const list: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      list.push(new Date(d));
    }
    return { from: toDateKey(start), to: toDateKey(end), days: list };
  }, [anchor, view]);

  const { entries, loading } = useSchedule(from, to);

  const byDate = useMemo(() => {
    const map = new Map<string, HymnScheduleEntry[]>();
    for (const e of entries) {
      const list = map.get(e.scheduled_date) || [];
      list.push(e);
      map.set(e.scheduled_date, list);
    }
    return map;
  }, [entries]);

  const navigate = (dir: -1 | 1) => {
    const d = new Date(anchor);
    if (view === 'jour') d.setDate(d.getDate() + dir);
    else if (view === 'semaine') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setAnchor(d);
  };

  const periodLabel = useMemo(() => {
    if (view === 'jour') {
      return anchor.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (view === 'semaine') {
      const first = days[0];
      const last = days[days.length - 1];
      return `${first.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${last.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return anchor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }, [view, anchor, days]);

  const todayKey = toDateKey(new Date());

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Calendrier du répertoire</h1>
        <p className="text-sm text-muted-foreground">Programme des cantiques — mis à jour en temps réel par la direction</p>
      </header>

      {/* Contrôles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Période précédente"
            className="grid place-items-center w-9 h-9 rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setAnchor(new Date())}
            className="px-3 py-2 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Aujourd&apos;hui
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            aria-label="Période suivante"
            className="grid place-items-center w-9 h-9 rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="ml-2 text-sm font-semibold text-foreground capitalize">{periodLabel}</span>
        </div>
        <div className="flex rounded-xl border border-border bg-card p-1" role="tablist" aria-label="Mode d'affichage">
          {(['jour', 'semaine', 'mois'] as ViewMode[]).map(v => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors',
                view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Grille */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : (
        <div className={cn(view === 'mois' && 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3', view !== 'mois' && 'space-y-3')}>
          {days
            .filter(d => view !== 'mois' || (byDate.get(toDateKey(d))?.length ?? 0) > 0)
            .map(d => {
              const key = toDateKey(d);
              const dayEntries = byDate.get(key) || [];
              const isToday = key === todayKey;
              return (
                <div
                  key={key}
                  className={cn(
                    'rounded-2xl border bg-card p-4 space-y-3',
                    isToday ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <CalendarDays className={cn('w-4 h-4', isToday ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
                    <h2 className={cn('text-sm font-bold capitalize', isToday ? 'text-primary' : 'text-foreground')}>
                      {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {isToday && <span className="ml-2 text-[10px] uppercase tracking-wider">Aujourd&apos;hui</span>}
                    </h2>
                  </div>
                  {dayEntries.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Rien de programmé.</p>
                  ) : (
                    <ul className="space-y-2">
                      {dayEntries.map(e => (
                        <li key={e.id} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                          <Music className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                          <div className="min-w-0 flex-1">
                            {e.hymns ? (
                              <Link href={`/cantiques/${e.hymns.id}`} className="font-semibold text-sm text-foreground hover:text-primary transition-colors">
                                {e.hymns.number != null && <span className="font-mono text-xs text-muted-foreground mr-1.5">N°{e.hymns.number}</span>}
                                {e.hymns.title}
                              </Link>
                            ) : (
                              <span className="font-semibold text-sm text-muted-foreground italic">{e.notes || 'Sans cantique'}</span>
                            )}
                            {e.hymns && e.notes && <p className="text-xs text-muted-foreground truncate">{e.notes}</p>}
                          </div>
                          <Badge variant="outline" className={cn('text-[10px] shrink-0', OCCASION_COLORS[e.occasion])}>
                            {OCCASION_LABELS[e.occasion]}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          {view === 'mois' && entries.length === 0 && (
            <div className="col-span-full rounded-2xl border border-border bg-card p-12 text-center">
              <p className="text-sm text-muted-foreground">Rien de programmé ce mois-ci.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
