'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, Music, CalendarDays, ClipboardCheck, GraduationCap, AlertTriangle,
  ChevronRight, Mic2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { VOICE_LABELS, type VoicePart } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type Stats = {
  members: number;
  pendingVoices: number;
  hymns: number;
  learning: number;
  upcomingRehearsals: number;
  upcomingEvents: number;
  openGaps: number;
  byVoice: Record<string, number>;
  avgByVoice: Record<string, number>;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const [memRes, hymnRes, rehRes, evtRes, gapRes, attRes] = await Promise.all([
      supabase.from('user_profiles').select('user_id, voice_part, voice_confirmed, status'),
      supabase.from('hymns').select('status'),
      supabase.from('rehearsals').select('id', { count: 'exact', head: true }).gte('rehearsal_date', todayStr).neq('status', 'annulee'),
      supabase.from('repertoire_events').select('id', { count: 'exact', head: true }).gte('event_date', todayStr),
      supabase.from('skill_gaps').select('id', { count: 'exact', head: true }).neq('status', 'resolue'),
      supabase.from('attempts').select('score, user_id')
    ]);
    const members = memRes.data || [];
    const hymns = hymnRes.data || [];
    const attempts = attRes.data || [];
    
    const byVoice: Record<string, number> = {};
    const userVoiceMap: Record<string, string> = {};
    for (const m of members) {
      if (m.voice_part) {
        byVoice[m.voice_part] = (byVoice[m.voice_part] || 0) + 1;
        if (m.user_id) {
          userVoiceMap[m.user_id] = m.voice_part;
        }
      }
    }

    const voiceScores: Record<string, { total: number; count: number }> = {
      soprano: { total: 0, count: 0 },
      alto: { total: 0, count: 0 },
      tenor: { total: 0, count: 0 },
      basse: { total: 0, count: 0 }
    };

    for (const att of attempts) {
      const voice = userVoiceMap[att.user_id];
      if (voice && voiceScores[voice]) {
        voiceScores[voice].total += att.score;
        voiceScores[voice].count += 1;
      }
    }

    const avgByVoice: Record<string, number> = {};
    Object.keys(voiceScores).forEach(voice => {
      const { total, count } = voiceScores[voice];
      avgByVoice[voice] = count > 0 ? Math.round(total / count) : 0;
    });

    setStats({
      members: members.length,
      pendingVoices: members.filter(m => m.voice_part && !m.voice_confirmed).length,
      hymns: hymns.length,
      learning: hymns.filter(h => h.status === 'en_apprentissage').length,
      upcomingRehearsals: rehRes.count || 0,
      upcomingEvents: evtRes.count || 0,
      openGaps: gapRes.count || 0,
      byVoice,
      avgByVoice,
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!stats) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Membres', value: stats.members, icon: Users, href: '/admin/membres', note: stats.pendingVoices > 0 ? `${stats.pendingVoices} voix à valider` : 'Tous validés' },
    { label: 'Cantiques', value: stats.hymns, icon: Music, href: '/admin/cantiques', note: `${stats.learning} en apprentissage` },
    { label: 'Répétitions à venir', value: stats.upcomingRehearsals, icon: ClipboardCheck, href: '/admin/repetitions', note: 'Pointage et RSVP' },
    { label: 'Événements programmés', value: stats.upcomingEvents, icon: CalendarDays, href: '/admin/calendrier', note: 'Calendrier du répertoire' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Tableau de bord de la chorale</h1>
          <p className="text-sm text-muted-foreground mt-1">Vue d&apos;ensemble : membres, répertoire, répétitions et formation.</p>
        </div>
      </div>

      {stats.pendingVoices > 0 && (
        <div className="rounded-2xl border border-border bg-accent/40 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-accent-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">
              {stats.pendingVoices} membre{stats.pendingVoices > 1 ? 's' : ''} en attente de validation de voix.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/membres">Valider maintenant <ChevronRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => (
          <Link key={c.label} href={c.href} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between">
              <c.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-3xl font-bold mt-3">{c.value}</p>
            <p className="text-sm font-medium mt-1">{c.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.note}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Répartition par pupitre */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-4">
            <Mic2 className="h-5 w-5 text-primary" aria-hidden="true" /> Répartition par pupitre
          </h2>
          <ul className="space-y-3">
            {(['soprano', 'alto', 'tenor', 'basse'] as VoicePart[]).map(v => {
              const count = stats.byVoice[v] || 0;
              const pct = stats.members > 0 ? Math.round((count / stats.members) * 100) : 0;
              const avgScore = stats.avgByVoice[v] || 0;
              return (
                <li key={v} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground flex items-center gap-2">
                      {VOICE_LABELS[v]}
                      {avgScore > 0 && (
                        <Badge variant="secondary" className="text-[10px] font-mono py-0 px-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {avgScore}% justesse
                        </Badge>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{count} membre{count > 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Formation & lacunes */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-4">
            <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" /> Formation et remise à niveau
          </h2>
          <div className="flex items-center gap-3 rounded-xl border border-border p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{stats.openGaps} lacune{stats.openGaps > 1 ? 's' : ''} en cours de traitement</p>
              <p className="text-xs text-muted-foreground">Évaluations, points à travailler et parcours assignés.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/evaluations">Évaluations <ChevronRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/formation">Parcours de formation <ChevronRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
