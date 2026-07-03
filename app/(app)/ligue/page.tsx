'use client';

import { useEffect, useState } from 'react';
import { Trophy, Crown, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { supabase, type LeagueMember } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function LiguePage() {
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('league_members').select('*').order('sort_order').then(({ data }) => {
      setMembers(data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="h-96 rounded-3xl bg-muted animate-pulse" />;

  const sorted = [...members].sort((a, b) => b.weekly_xp - a.weekly_xp);
  const myRank = sorted.findIndex((m) => m.is_current_user) + 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-3xl bg-gradient-to-br from-accent/15 via-card to-primary/10 border border-border p-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="grid place-items-center w-14 h-14 rounded-2xl bg-accent/20 text-accent">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-semibold text-accent uppercase tracking-wide">Ligue hebdomadaire</div>
            <h1 className="font-display text-2xl font-semibold">Ligue Ambre</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Top 3 promus · Bottom 3 relégués</p>
          </div>
        </div>
      </section>

      {/* My rank highlight */}
      <section className="rounded-2xl bg-primary/5 border border-primary/15 p-4 flex items-center gap-3">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-primary text-primary-foreground font-bold text-sm">{myRank}</div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Ta position</div>
          <div className="text-xs text-muted-foreground">{myRank <= 3 ? 'Zone de promotion !' : myRank > sorted.length - 3 ? 'Zone de relégation' : 'Maintiens le rythme'}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-bold tabular-nums">{sorted[myRank - 1]?.weekly_xp} XP</div>
          <div className="text-[11px] text-muted-foreground">cette semaine</div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="rounded-3xl bg-card border border-border overflow-hidden">
        <div className="divide-y divide-border">
          {sorted.map((m, i) => {
            const trend = i === 0 ? 'up' : i < 3 ? 'up' : i > sorted.length - 3 ? 'down' : 'same';
            return (
              <div key={m.id} className={cn('flex items-center gap-3 px-4 py-3.5 transition-colors', m.is_current_user && 'bg-primary/5')}>
                <div className={cn(
                  'grid place-items-center w-8 h-8 rounded-full text-xs font-bold shrink-0',
                  i === 0 ? 'bg-accent/20 text-accent' : i === 1 ? 'bg-muted-foreground/20 text-muted-foreground' : i === 2 ? 'bg-orange-500/15 text-orange-600' : 'bg-muted text-muted-foreground'
                )}>
                  {i < 3 ? <Crown className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <div className="text-xl">{m.avatar_emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className={cn('text-sm font-medium truncate', m.is_current_user && 'text-primary')}>{m.display_name}{m.is_current_user && ' (toi)'}</div>
                </div>
                {trend === 'up' ? <ArrowUp className="w-3.5 h-3.5 text-success" /> : trend === 'down' ? <ArrowDown className="w-3.5 h-3.5 text-destructive" /> : <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
                <div className="text-sm font-semibold tabular-nums w-16 text-right">{m.weekly_xp}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
