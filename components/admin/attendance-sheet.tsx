'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, XCircle, ShieldX } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  VOICE_LABELS, VOICE_COLORS,
  type Attendance, type AttendanceStatus, type Rehearsal, type RehearsalRsvp, type VoicePart,
} from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_BUTTONS: { value: AttendanceStatus; label: string; icon: typeof CheckCircle2; activeCls: string }[] = [
  { value: 'present', label: 'Présent', icon: CheckCircle2, activeCls: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'retard', label: 'Retard', icon: Clock, activeCls: 'bg-amber-500 text-white border-amber-500' },
  { value: 'absent_excuse', label: 'Excusé', icon: ShieldX, activeCls: 'bg-sky-600 text-white border-sky-600' },
  { value: 'absent', label: 'Absent', icon: XCircle, activeCls: 'bg-destructive text-destructive-foreground border-destructive' },
];

const RSVP_LABELS: Record<string, string> = {
  present: 'A confirmé',
  absent: 'Sera absent',
  peut_etre: 'Peut-être',
};

type Props = {
  rehearsal: Rehearsal;
  markerId: string | null;
};

/** Feuille de pointage : liste des membres avec RSVP affiché et boutons de statut. */
export function AttendanceSheet({ rehearsal, markerId }: Props) {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [rsvps, setRsvps] = useState<Map<string, RehearsalRsvp>>(new Map());
  const [attendance, setAttendance] = useState<Map<string, Attendance>>(new Map());
  const [loading, setLoading] = useState(true);
  const [voiceFilter, setVoiceFilter] = useState<VoicePart | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const [memRes, rsvpRes, attRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('status', 'actif').order('display_name'),
      supabase.from('rehearsal_rsvps').select('*').eq('rehearsal_id', rehearsal.id),
      supabase.from('attendance').select('*').eq('rehearsal_id', rehearsal.id),
    ]);
    let list = (memRes.data as UserProfile[]) || [];
    // Répétition de pupitre : ne montre que la voix concernée
    if (rehearsal.type === 'pupitre' && rehearsal.voice_part) {
      list = list.filter(m => m.voice_part === rehearsal.voice_part);
    }
    setMembers(list);
    setRsvps(new Map((rsvpRes.data || []).map((r: RehearsalRsvp) => [r.user_id, r])));
    setAttendance(new Map((attRes.data || []).map((a: Attendance) => [a.user_id, a])));
    setLoading(false);
  }, [rehearsal]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => (voiceFilter === 'all' ? members : members.filter(m => m.voice_part === voiceFilter)),
    [members, voiceFilter],
  );

  const mark = async (userId: string, status: AttendanceStatus) => {
    const { data } = await supabase
      .from('attendance')
      .upsert(
        {
          rehearsal_id: rehearsal.id,
          user_id: userId,
          status,
          marked_by: markerId,
          marked_at: new Date().toISOString(),
        },
        { onConflict: 'rehearsal_id,user_id' },
      )
      .select()
      .single();
    if (data) setAttendance(m => new Map(m).set(userId, data));
  };

  const counts = useMemo(() => {
    let present = 0, retard = 0, absent = 0;
    for (const a of attendance.values()) {
      if (a.status === 'present') present++;
      else if (a.status === 'retard') retard++;
      else absent++;
    }
    return { present, retard, absent, marked: attendance.size, total: members.length };
  }, [attendance, members.length]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Résumé */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-semibold text-foreground">
          {counts.marked}/{counts.total} pointé{counts.marked > 1 ? 's' : ''}
        </span>
        <span className="text-emerald-600 font-medium">{counts.present} présents</span>
        <span className="text-amber-600 font-medium">{counts.retard} retards</span>
        <span className="text-destructive font-medium">{counts.absent} absents</span>
      </div>

      {/* Filtre voix (répétition générale uniquement) */}
      {rehearsal.type !== 'pupitre' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setVoiceFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
              voiceFilter === 'all' ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border',
            )}
          >
            Tous ({members.length})
          </button>
          {(Object.keys(VOICE_LABELS) as VoicePart[]).map(v => {
            const count = members.filter(m => m.voice_part === v).length;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setVoiceFilter(v)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                  voiceFilter === v ? VOICE_COLORS[v] : 'bg-card text-muted-foreground border-border',
                )}
              >
                {VOICE_LABELS[v]} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Liste */}
      <ul className="space-y-2">
        {filtered.map(m => {
          const rsvp = rsvps.get(m.user_id);
          const att = attendance.get(m.user_id);
          return (
            <li key={m.user_id} className="rounded-xl border border-border bg-card p-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">{m.display_name || m.email}</span>
                  {m.voice_part && (
                    <Badge variant="outline" className={cn('text-[10px]', VOICE_COLORS[m.voice_part as VoicePart])}>
                      {VOICE_LABELS[m.voice_part as VoicePart]}
                    </Badge>
                  )}
                </div>
                <p className={cn(
                  'text-xs mt-0.5',
                  rsvp?.response === 'present' && 'text-emerald-600',
                  rsvp?.response === 'absent' && 'text-destructive',
                  rsvp?.response === 'peut_etre' && 'text-amber-600',
                  !rsvp && 'text-muted-foreground',
                )}>
                  {rsvp ? RSVP_LABELS[rsvp.response] : 'Pas de réponse'}
                  {rsvp?.absence_reason && ` — ${rsvp.absence_reason}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_BUTTONS.map(({ value, label, icon: Icon, activeCls }) => {
                  const active = att?.status === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => mark(m.user_id, value)}
                      aria-label={`${label} — ${m.display_name || m.email}`}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                        active ? activeCls : 'bg-card text-muted-foreground border-border hover:border-foreground/40',
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="text-sm text-muted-foreground text-center py-6">Aucun membre pour ce filtre.</li>
        )}
      </ul>
    </div>
  );
}
