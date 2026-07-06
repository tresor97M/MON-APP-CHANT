'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Flame, Music, CalendarDays, GraduationCap, ChevronRight, Award,
  Mic2, CheckCircle2, Clock, Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import {
  VOICE_LABELS, HYMN_STATUS_LABELS, EVENT_TYPE_LABELS,
  type Hymn, type Rehearsal, type RepertoireEvent, type RehearsalRsvp,
  type TrainingAssignment, type SkillGap,
} from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function HomePage() {
  const { user, userProfile: profile } = useAuth();
  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [events, setEvents] = useState<RepertoireEvent[]>([]);
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [rsvps, setRsvps] = useState<RehearsalRsvp[]>([]);
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const [hymnRes, evtRes, rehRes, rsvpRes, assignRes, gapRes, attRes] = await Promise.all([
      supabase.from('hymns').select('*').order('updated_at', { ascending: false }).limit(6),
      supabase.from('repertoire_events').select('*').gte('event_date', todayStr).order('event_date').limit(5),
      supabase.from('rehearsals').select('*').gte('rehearsal_date', todayStr).neq('status', 'annulee').order('rehearsal_date').limit(3),
      supabase.from('rehearsal_rsvps').select('*').eq('user_id', user.id),
      supabase.from('training_assignments').select('*').eq('user_id', user.id).neq('status', 'termine'),
      supabase.from('skill_gaps').select('*').eq('user_id', user.id).neq('status', 'resolue'),
      supabase.from('attendance').select('status').eq('user_id', user.id),
    ]);
    setHymns(hymnRes.data || []);
    setEvents(evtRes.data || []);
    setRehearsals(rehRes.data || []);
    setRsvps(rsvpRes.data || []);
    setAssignments(assignRes.data || []);
    setGaps(gapRes.data || []);
    const att = attRes.data || [];
    if (att.length > 0) {
      const present = att.filter(a => a.status === 'present' || a.status === 'retard').length;
      setAttendanceRate(Math.round((present / att.length) * 100));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const rsvpFor = useMemo(() => new Map(rsvps.map(r => [r.rehearsal_id, r.response])), [rsvps]);

  const learningCount = hymns.filter(h => h.status === 'en_apprentissage').length;

  const firstName = profile?.display_name?.split(' ')[0] || user?.email?.split('@')[0] || 'choriste';
  const voice = profile?.voice_part ? VOICE_LABELS[profile.voice_part] : null;

  if (loading) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto">
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Bandeau d'accueil */}
      <section className="rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm opacity-80">Bienvenue,</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-balance">{firstName}</h1>
            {voice && (
              <div className="mt-2 flex items-center gap-2">
                <Mic2 className="h-4 w-4 opacity-80" aria-hidden="true" />
                <span className="text-sm font-medium">Pupitre {voice}</span>
                {!profile?.voice_confirmed && (
                  <Badge variant="secondary" className="text-xs">En attente de validation</Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            {attendanceRate !== null && (
              <div className="text-center">
                <div className="flex items-center gap-1.5 justify-center">
                  <Flame className="h-5 w-5" aria-hidden="true" />
                  <span className="text-2xl font-bold">{attendanceRate}%</span>
                </div>
                <p className="text-xs opacity-80 mt-0.5">Assiduité</p>
              </div>
            )}
            <div className="text-center">
              <div className="flex items-center gap-1.5 justify-center">
                <Music className="h-5 w-5" aria-hidden="true" />
                <span className="text-2xl font-bold">{learningCount}</span>
              </div>
              <p className="text-xs opacity-80 mt-0.5">En apprentissage</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Prochaines répétitions */}
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" aria-hidden="true" /> Prochaines répétitions
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/repetitions">Tout voir <ChevronRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          {rehearsals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucune répétition planifiée pour le moment.</p>
          ) : (
            <ul className="space-y-3">
              {rehearsals.map(r => {
                const resp = rsvpFor.get(r.id);
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {fmtDate(r.rehearsal_date)} · {r.start_time?.slice(0, 5)}{r.location ? ` · ${r.location}` : ''}
                      </p>
                    </div>
                    {resp === 'present' ? (
                      <Badge className="shrink-0 gap-1"><CheckCircle2 className="h-3 w-3" /> Confirmé</Badge>
                    ) : resp === 'absent' ? (
                      <Badge variant="secondary" className="shrink-0">Absent</Badge>
                    ) : (
                      <Button asChild size="sm" variant="outline" className="shrink-0">
                        <Link href="/repetitions">Confirmer</Link>
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Ma formation */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" /> Ma formation
            </h2>
          </div>
          {gaps.length > 0 && (
            <div className="mb-3 rounded-xl bg-accent/50 p-3">
              <p className="text-xs font-medium text-accent-foreground">
                {gaps.length} point{gaps.length > 1 ? 's' : ''} à travailler identifié{gaps.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun parcours en cours.</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {assignments.length} parcours actif{assignments.length > 1 ? 's' : ''}
            </p>
          )}
          <Button asChild className="w-full mt-4" variant="outline">
            <Link href="/formation">Ouvrir la formation <ChevronRight className="h-4 w-4" /></Link>
          </Button>
        </section>
      </div>

      {/* Programme à venir */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" /> Programme à venir
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/calendrier">Calendrier complet <ChevronRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Aucun événement programmé.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {events.map(e => (
              <li key={e.id} className="rounded-xl border border-border p-3">
                <Badge variant="secondary" className="text-xs mb-1.5">{EVENT_TYPE_LABELS[e.event_type] || e.event_type}</Badge>
                <p className="font-medium text-sm truncate">{e.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{fmtDate(e.event_date)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Cantiques récents */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" aria-hidden="true" /> Répertoire récent
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/cantiques">Tout le répertoire <ChevronRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        {hymns.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Le répertoire est vide pour le moment.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hymns.map(h => (
              <li key={h.id}>
                <Link
                  href={`/cantiques/${h.id}`}
                  className="block rounded-xl border border-border p-3 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">
                      {h.number ? `${h.number}. ` : ''}{h.title}
                    </p>
                    <Sparkles className={cn('h-3.5 w-3.5 shrink-0', h.status === 'maitrise' || h.status === 'repertoire_actif' ? 'text-primary' : 'text-muted-foreground/40')} aria-hidden="true" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{HYMN_STATUS_LABELS[h.status] || h.status}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
