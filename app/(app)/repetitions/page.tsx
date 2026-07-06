'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, MapPin, CheckCircle2, XCircle, HelpCircle, History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import {
  ATTENDANCE_LABELS, VOICE_LABELS,
  type Attendance, type Rehearsal, type RehearsalRsvp, type RsvpResponse,
} from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const TYPE_LABELS: Record<Rehearsal['type'], string> = {
  generale: 'Générale',
  pupitre: 'Pupitre',
  formation: 'Formation',
};

const RSVP_OPTIONS: { value: RsvpResponse; label: string; icon: typeof CheckCircle2 }[] = [
  { value: 'present', label: 'Je serai présent', icon: CheckCircle2 },
  { value: 'peut_etre', label: 'Peut-être', icon: HelpCircle },
  { value: 'absent', label: 'Absent', icon: XCircle },
];

export default function RepetitionsPage() {
  const { user, profile } = useAuth();
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [rsvps, setRsvps] = useState<Map<string, RehearsalRsvp>>(new Map());
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const [rehRes, rsvpRes, attRes] = await Promise.all([
      supabase.from('rehearsals').select('*').neq('status', 'annulee').order('rehearsal_date', { ascending: true }),
      supabase.from('rehearsal_rsvps').select('*').eq('user_id', user.id),
      supabase.from('attendance').select('*').eq('user_id', user.id),
    ]);
    setRehearsals(rehRes.data || []);
    setRsvps(new Map((rsvpRes.data || []).map((r: RehearsalRsvp) => [r.rehearsal_id, r])));
    setAttendance(attRes.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(() => rehearsals.filter(r => r.rehearsal_date >= todayKey), [rehearsals, todayKey]);
  const past = useMemo(() => rehearsals.filter(r => r.rehearsal_date < todayKey).reverse(), [rehearsals, todayKey]);

  const attendanceByRehearsal = useMemo(
    () => new Map(attendance.map(a => [a.rehearsal_id, a])),
    [attendance],
  );

  const stats = useMemo(() => {
    const pastWithRecord = past.filter(r => attendanceByRehearsal.has(r.id));
    const presentCount = pastWithRecord.filter(r => {
      const a = attendanceByRehearsal.get(r.id);
      return a?.status === 'present' || a?.status === 'retard';
    }).length;
    return {
      total: pastWithRecord.length,
      present: presentCount,
      rate: pastWithRecord.length > 0 ? Math.round((presentCount / pastWithRecord.length) * 100) : null,
    };
  }, [past, attendanceByRehearsal]);

  const respond = async (rehearsal: Rehearsal, response: RsvpResponse) => {
    if (!user) return;
    const { data } = await supabase
      .from('rehearsal_rsvps')
      .upsert(
        { rehearsal_id: rehearsal.id, user_id: user.id, response, updated_at: new Date().toISOString() },
        { onConflict: 'rehearsal_id,user_id' },
      )
      .select()
      .single();
    if (data) setRsvps(m => new Map(m).set(rehearsal.id, data));
  };

  const relevantForMe = (r: Rehearsal) =>
    r.type !== 'pupitre' || !r.voice_part || r.voice_part === profile?.voice_part;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64 rounded-lg" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Répétitions</h1>
        <p className="text-sm text-muted-foreground">Confirmez votre présence et suivez votre assiduité</p>
      </header>

      {/* Mon assiduité */}
      {stats.rate !== null && (
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-5">
          <div className="grid place-items-center w-16 h-16 rounded-2xl bg-primary/10 shrink-0">
            <span className="font-display text-xl font-bold text-primary">{stats.rate}%</span>
          </div>
          <div>
            <p className="font-semibold text-foreground">Mon taux de présence</p>
            <p className="text-sm text-muted-foreground">
              Présent à {stats.present} répétition{stats.present > 1 ? 's' : ''} sur {stats.total} pointée{stats.total > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* À venir */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">À venir</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Aucune répétition planifiée pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(r => {
              const myRsvp = rsvps.get(r.id);
              const forMe = relevantForMe(r);
              return (
                <article
                  key={r.id}
                  className={cn('rounded-2xl border bg-card p-5 space-y-4', forMe ? 'border-border' : 'border-border/50 opacity-70')}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display font-bold text-foreground">{r.title}</h3>
                        <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[r.type]}</Badge>
                        {r.voice_part && (
                          <Badge variant="outline" className="text-[10px]">{VOICE_LABELS[r.voice_part]}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock className="w-4 h-4" aria-hidden="true" />
                          {new Date(r.rehearsal_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          {' · '}{r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}
                        </span>
                        {r.location && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" aria-hidden="true" /> {r.location}
                          </span>
                        )}
                      </div>
                      {r.objectives && <p className="text-sm text-foreground/80">{r.objectives}</p>}
                    </div>
                  </div>

                  {forMe && (
                    <div className="flex flex-wrap gap-2">
                      {RSVP_OPTIONS.map(({ value, label, icon: Icon }) => {
                        const active = myRsvp?.response === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => respond(r, value)}
                            className={cn(
                              'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors',
                              active
                                ? value === 'present'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : value === 'absent'
                                    ? 'bg-destructive text-destructive-foreground border-destructive'
                                    : 'bg-amber-500 text-white border-amber-500'
                                : 'bg-card text-foreground border-border hover:border-primary/50',
                            )}
                          >
                            <Icon className="w-4 h-4" /> {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!forMe && (
                    <p className="text-xs text-muted-foreground italic">
                      Répétition de pupitre {r.voice_part ? VOICE_LABELS[r.voice_part] : ''} — ne concerne pas votre voix.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Historique */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <History className="w-5 h-5 text-muted-foreground" aria-hidden="true" /> Historique
        </h2>
        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune répétition passée.</p>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th scope="col" className="px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Répétition</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Ma présence</th>
                </tr>
              </thead>
              <tbody>
                {past.slice(0, 15).map(r => {
                  const a = attendanceByRehearsal.get(r.id);
                  return (
                    <tr key={r.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(r.rehearsal_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{r.title}</td>
                      <td className="px-4 py-3">
                        {a ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-semibold',
                              a.status === 'present' && 'bg-emerald-100 text-emerald-700 border-emerald-200',
                              a.status === 'retard' && 'bg-amber-100 text-amber-700 border-amber-200',
                              (a.status === 'absent' || a.status === 'absent_excuse') && 'bg-rose-100 text-rose-700 border-rose-200',
                            )}
                          >
                            {ATTENDANCE_LABELS[a.status]}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Non pointé</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
