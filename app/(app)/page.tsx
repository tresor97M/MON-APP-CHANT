'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Flame, Music, CalendarDays, GraduationCap, ChevronRight, Award,
  Mic2, CheckCircle2, Clock, Sparkles, Trophy, Bell,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import {
  VOICE_LABELS, LEARNING_STATUS_LABELS, OCCASION_LABELS,
  type Hymn, type Rehearsal, type HymnScheduleEntry, type RehearsalRsvp,
  type TrainingAssignment, type SkillGap,
} from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getGreeting(name: string) {
  const h = new Date().getHours();
  const emoji = h < 12 ? '☀️' : h < 18 ? '🌤️' : '🌙';
  const word = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  return { word, emoji, name };
}

/* Circular progress ring */
function CircleProgress({ pct, size = 100 }: { pct: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(74,222,128,0.12)" strokeWidth={10} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#grad)" strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
      />
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="100%" stopColor="#22C55E" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const INSTRUMENT_LABELS: Record<string, string> = {
  piano: 'Piano / Clavier', guitare: 'Guitare',
  basse: 'Basse', batterie: 'Batterie',
  cuivres: 'Vents / Cuivres', autre: 'Autre instrument',
};

const QUICK_ACTIONS = [
  { href: '/hymns',      label: 'Cantiques',    icon: Music,        color: '#4ADE80', bg: 'rgba(74,222,128,0.12)'   },
  { href: '/rehearsals', label: 'Répétitions',  icon: CalendarDays, color: '#60A5FA', bg: 'rgba(96,165,250,0.12)'  },
  { href: '/coach',      label: 'Coach IA',     icon: Sparkles,     color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  { href: '/training',   label: 'Formation',    icon: GraduationCap,color: '#C084FC', bg: 'rgba(192,132,252,0.12)' },
];

export default function HomePage() {
  const { user, userProfile: profile } = useAuth();
  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [events, setEvents] = useState<HymnScheduleEntry[]>([]);
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
      supabase.from('hymn_schedule').select('*, hymns(*)').gte('scheduled_date', todayStr).order('scheduled_date').limit(5),
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
      const present = att.filter((a: { status: string }) => a.status === 'present' || a.status === 'retard').length;
      setAttendanceRate(Math.round((present / att.length) * 100));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const rsvpFor = useMemo(() => new Map(rsvps.map(r => [r.rehearsal_id, r.response])), [rsvps]);
  const learningCount = hymns.filter(h => h.learning_status === 'en_apprentissage').length;

  const firstName = profile?.display_name?.split(' ')[0] || user?.email?.split('@')[0] || 'choriste';
  const voice = profile?.voice_part ? VOICE_LABELS[profile.voice_part] : null;
  const instrument = profile?.instrument ? (INSTRUMENT_LABELS[profile.instrument] || profile.instrument) : null;
  const greeting = getGreeting(firstName);
  const nextRehearsal = rehearsals[0];

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <Skeleton className="h-7 w-40 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <Skeleton className="h-10 w-10 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
        <Skeleton className="h-36 rounded-3xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }} />)}
        </div>
        <Skeleton className="h-28 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto md:max-w-none animate-fade-in">

      {/* ── Header (mobile-style with notification bell) ── */}
      <header className="flex items-center justify-between pt-2 pb-1">
        <div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {greeting.word} {greeting.emoji}
          </p>
          <h1
            className="text-2xl font-bold mt-0.5"
            style={{ fontFamily: 'var(--font-display)', color: '#fff' }}
          >
            {greeting.name}
          </h1>
          {(voice || instrument) && (
            <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <Mic2 size={11} />
              {voice ? `Pupitre ${voice}` : `Instrument : ${instrument}`}
            </p>
          )}
        </div>
        {/* XP badge */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-sm font-bold"
          style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <Trophy size={14} />
          Niveau {profile?.learning_profile ?? '1'}
        </div>
      </header>

      {/* ── Attendance / Progress card (Lumina-style) ── */}
      <section
        className="rounded-3xl p-5 relative overflow-hidden animate-slide-up"
        style={{
          background: 'linear-gradient(135deg, #112018 0%, #0D1F14 100%)',
          border: '1px solid rgba(74,222,128,0.15)',
        }}
      >
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, #4ADE80 0%, transparent 70%)', transform: 'translate(40%,-40%)' }} />

        <div className="flex items-center gap-5">
          {/* Circle ring */}
          <div className="relative shrink-0">
            <CircleProgress pct={attendanceRate ?? 0} size={88} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold" style={{ color: '#4ADE80', fontFamily: 'var(--font-display)' }}>
                {attendanceRate !== null ? `${attendanceRate}%` : '—'}
              </span>
            </div>
          </div>

          <div className="flex-1">
            <p className="text-lg font-bold leading-tight" style={{ fontFamily: 'var(--font-display)', color: '#fff' }}>
              {attendanceRate !== null
                ? attendanceRate >= 80 ? 'Excellent ! 🔥' : attendanceRate >= 60 ? 'Bonne progression' : 'À améliorer'
                : 'Pas encore de données'
              }
            </p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Assiduité aux répétitions
            </p>
            {gaps.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl w-fit"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Award size={11} />
                {gaps.length} point{gaps.length > 1 ? 's' : ''} à améliorer
              </div>
            )}
          </div>
        </div>

        {gaps.length > 0 && (
          <Link href="/coach" className="flex items-center gap-2 mt-4 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: 'rgba(255,255,255,0.6)' }}>
            <Sparkles size={14} style={{ color: '#F59E0B' }} />
            Demander conseil au Coach IA
            <ChevronRight size={14} className="ml-auto" />
          </Link>
        )}
      </section>

      {/* ── Quick Actions grid (Lumina 2×2) ── */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Actions rapides
        </h2>
        <div className="grid grid-cols-2 gap-3 stagger">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex flex-col items-start gap-3 rounded-2xl p-4 transition-all duration-200 active:scale-95 animate-slide-up"
              style={{
                background: a.bg.replace('0.12', '0.08'),
                border: `1px solid ${a.color}22`,
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110"
                style={{ background: a.bg, boxShadow: `0 0 16px -4px ${a.color}55` }}>
                <a.icon size={20} style={{ color: a.color }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: '#fff', fontFamily: 'var(--font-display)' }}>
                  {a.label}
                </p>
                {a.href === '/hymns' && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {learningCount} en cours
                  </p>
                )}
                {a.href === '/rehearsals' && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {rehearsals.length} à venir
                  </p>
                )}
                {a.href === '/coach' && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    IA personnalisée
                  </p>
                )}
                {a.href === '/training' && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {assignments.length} formation{assignments.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Prochaine répétition ── */}
      {nextRehearsal && (
        <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Prochaine répétition
          </h2>
          <Link
            href="/rehearsals"
            className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 active:scale-98"
            style={{
              background: 'rgba(96,165,250,0.07)',
              border: '1px solid rgba(96,165,250,0.15)',
            }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(96,165,250,0.15)' }}>
              <CalendarDays size={22} style={{ color: '#60A5FA' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: '#fff' }}>
                {nextRehearsal.title || 'Répétition'}
              </p>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
                <Clock size={10} className="inline mr-1" />
                {fmtDate(nextRehearsal.rehearsal_date)}
                {nextRehearsal.location && ` · ${nextRehearsal.location}`}
              </p>
              {rsvpFor.get(nextRehearsal.id) && (
                <div className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: '#4ADE80' }}>
                  <CheckCircle2 size={11} />
                  {rsvpFor.get(nextRehearsal.id) === 'present' ? 'Confirmé présent' : 'Réponse enregistrée'}
                </div>
              )}
            </div>
            <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
          </Link>
        </section>
      )}

      {/* ── Cantiques à l'étude ── */}
      {hymns.filter(h => h.learning_status === 'en_apprentissage').length > 0 && (
        <section className="animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
              En apprentissage
            </h2>
            <Link href="/hymns" className="text-xs font-medium flex items-center gap-0.5" style={{ color: '#4ADE80' }}>
              Voir tout <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {hymns.filter(h => h.learning_status === 'en_apprentissage').slice(0, 3).map((hymn) => (
              <Link
                key={hymn.id}
                href={`/hymns/${hymn.id}`}
                className="flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 active:scale-98"
                style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.1)' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(74,222,128,0.12)' }}>
                  <Music size={16} style={{ color: '#4ADE80' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: '#fff' }}>{hymn.title}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {hymn.musical_key && `Ton ${hymn.musical_key} · `}{hymn.tempo ? `${hymn.tempo} BPM` : ''}
                  </p>
                </div>
                <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.25)' }} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
