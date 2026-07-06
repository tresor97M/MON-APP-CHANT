'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Users, BadgeCheck, CircleAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { ROLE_LABELS, VOICE_COLORS, VOICE_LABELS, type Role, type VoicePart } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_LABELS: Record<string, string> = {
  actif: 'Actif',
  inactif: 'Inactif',
  en_pause: 'En pause',
};

export default function AdminMembresPage() {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [voiceFilter, setVoiceFilter] = useState<VoicePart | 'all' | 'sans_voix'>('all');

  const load = useCallback(async () => {
    const { data } = await supabase.from('user_profiles').select('*').order('full_name');
    setMembers((data as UserProfile[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { soprano: 0, alto: 0, tenor: 0, basse: 0, sans_voix: 0 };
    for (const m of members) {
      if (m.voice_part) c[m.voice_part]++;
      else c.sans_voix++;
    }
    return c;
  }, [members]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter(m => {
      if (voiceFilter === 'sans_voix' && m.voice_part) return false;
      if (voiceFilter !== 'all' && voiceFilter !== 'sans_voix' && m.voice_part !== voiceFilter) return false;
      if (!q) return true;
      return (m.full_name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q);
    });
  }, [members, search, voiceFilter]);

  const setVoice = async (m: UserProfile, voice: VoicePart | '') => {
    await supabase
      .from('user_profiles')
      .update({ voice_part: voice || null, voice_confirmed: !!voice, updated_at: new Date().toISOString() })
      .eq('user_id', m.user_id);
    load();
  };

  const confirmVoice = async (m: UserProfile) => {
    await supabase
      .from('user_profiles')
      .update({ voice_confirmed: true, updated_at: new Date().toISOString() })
      .eq('user_id', m.user_id);
    load();
  };

  const setStatus = async (m: UserProfile, status: string) => {
    await supabase
      .from('user_profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', m.user_id);
    load();
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Membres</h1>
        <p className="text-sm text-muted-foreground">{members.length} membre{members.length > 1 ? 's' : ''} — annuaire par pupitre</p>
      </header>

      {/* Effectifs par pupitre */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(Object.keys(VOICE_LABELS) as VoicePart[]).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setVoiceFilter(voiceFilter === v ? 'all' : v)}
            className={cn(
              'rounded-2xl border p-4 text-left transition-colors',
              voiceFilter === v ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : 'border-border bg-card hover:border-primary/40',
            )}
          >
            <p className="font-display text-2xl font-bold text-foreground">{counts[v]}</p>
            <p className="text-xs font-semibold text-muted-foreground">{VOICE_LABELS[v]}</p>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setVoiceFilter(voiceFilter === 'sans_voix' ? 'all' : 'sans_voix')}
          className={cn(
            'rounded-2xl border p-4 text-left transition-colors',
            voiceFilter === 'sans_voix' ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : 'border-border bg-card hover:border-primary/40',
          )}
        >
          <p className="font-display text-2xl font-bold text-foreground">{counts.sans_voix}</p>
          <p className="text-xs font-semibold text-muted-foreground">À évaluer</p>
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un membre..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-muted-foreground"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-muted text-muted-foreground">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm text-muted-foreground">Aucun membre trouvé.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th scope="col" className="px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Membre</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Rôle</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Voix</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.user_id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{m.full_name || '—'}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant="outline" className="text-[10px]">
                        {ROLE_LABELS[(m.role as Role)] || 'Choriste'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={m.voice_part || ''}
                          onChange={e => setVoice(m, e.target.value as VoicePart | '')}
                          aria-label={`Voix de ${m.full_name || m.email}`}
                          className={cn(
                            'text-xs font-semibold rounded-lg border px-2 py-1 outline-none cursor-pointer bg-transparent',
                            m.voice_part ? VOICE_COLORS[m.voice_part as VoicePart] : 'border-border text-muted-foreground',
                          )}
                        >
                          <option value="">Non définie</option>
                          {Object.entries(VOICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        {m.voice_part && (m.voice_confirmed ? (
                          <span title="Voix validée">
                            <BadgeCheck className="w-4 h-4 text-emerald-600" aria-label="Voix validée" />
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => confirmVoice(m)}
                            title="Valider cette voix"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:text-amber-700"
                          >
                            <CircleAlert className="w-4 h-4" /> Valider
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <select
                        value={m.status || 'actif'}
                        onChange={e => setStatus(m, e.target.value)}
                        aria-label={`Statut de ${m.full_name || m.email}`}
                        className="text-xs font-semibold rounded-lg border border-border px-2 py-1 outline-none cursor-pointer bg-transparent text-foreground"
                      >
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
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
