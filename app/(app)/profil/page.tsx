'use client';

import { useEffect, useState } from 'react';
import { Award, Flame, Zap, TrendingUp, Calendar, Lock, Target, LogOut } from 'lucide-react';
import { supabase, type UserStats, type Badge, type UserBadge, type Attempt } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

const tierStyles: Record<string, string> = {
  bronze: 'from-orange-700/20 to-orange-600/5 text-orange-700 dark:text-orange-400 border-orange-600/20',
  silver: 'from-slate-400/20 to-slate-300/5 text-slate-500 border-slate-400/20',
  gold: 'from-amber-400/25 to-amber-300/5 text-amber-600 dark:text-amber-400 border-amber-400/30',
};

export default function ProfilPage() {
  const { signOut } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from('user_stats').select('*').limit(1).maybeSingle();
      setStats(s);
      const { data: b } = await supabase.from('badges').select('*');
      setBadges(b || []);
      const { data: ub } = await supabase.from('user_badges').select('*');
      setEarned(new Set((ub || []).map((x: UserBadge) => x.badge_id)));
      const { data: att } = await supabase.from('attempts').select('*').order('created_at', { ascending: false }).limit(30);
      setAttempts(att || []);
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) return <div className="space-y-4"><div className="h-40 rounded-3xl bg-muted animate-pulse" /><div className="h-64 rounded-3xl bg-muted animate-pulse" /></div>;

  const xpForNext = stats.level * 200;
  const levelPct = Math.min(100, Math.round((stats.total_xp / xpForNext) * 100));
  const avgAccuracy = attempts.length ? Math.round(attempts.reduce((a, b) => a + b.score, 0) / attempts.length) : 0;
  const bestScore = attempts.length ? Math.max(...attempts.map((a) => a.score)) : 0;

  const weekData = [40, 65, 30, 80, 55, 90, 210];
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const maxWeek = Math.max(...weekData, 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile header */}
      <section className="rounded-3xl bg-card border border-border p-6">
        <div className="flex items-center gap-4">
          <div className="grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent text-2xl text-white shadow-lg">🎤</div>
          <div className="flex-1">
            <h1 className="font-display text-xl font-semibold">Chanteur·euse</h1>
            <div className="text-sm text-muted-foreground">Niveau {stats.level} · {stats.total_xp} XP</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-medium">Niveau {stats.level}</span>
            <span className="text-muted-foreground tabular-nums">{stats.total_xp}/{xpForNext}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700" style={{ width: `${levelPct}%` }} />
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox icon={Flame} value={`${stats.streak_days} j`} label="Série actuelle" />
        <StatBox icon={Zap} value={`${stats.total_xp}`} label="XP total" />
        <StatBox icon={TrendingUp} value={`${stats.weekly_xp}`} label="XP / semaine" />
        <StatBox icon={Target} value={avgAccuracy ? `${avgAccuracy}%` : '—'} label="Précision moy." />
      </section>

      {/* Weekly activity chart */}
      <section className="rounded-3xl bg-card border border-border p-5">
        <h2 className="font-display text-base font-semibold mb-4">Activité cette semaine</h2>
        <div className="flex items-end justify-between gap-2 h-32">
          {weekData.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full rounded-t-lg bg-gradient-to-t from-primary/40 to-primary transition-all duration-500 hover:from-primary hover:to-accent" style={{ height: `${(v / maxWeek) * 100}%` }} />
              <span className="text-[10px] text-muted-foreground">{days[i]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Best score highlight */}
      {bestScore > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-success/10 to-card border border-success/20 p-5 flex items-center gap-4">
          <div className="grid place-items-center w-12 h-12 rounded-2xl bg-success/15 text-success">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Meilleur score</div>
            <div className="font-display text-2xl font-bold tabular-nums">{bestScore}<span className="text-sm text-muted-foreground">/100</span></div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-muted-foreground">Précision moyenne</div>
            <div className="font-display text-xl font-semibold tabular-nums">{avgAccuracy}%</div>
          </div>
        </section>
      )}

      {/* Badges */}
      <section>
        <h2 className="font-display text-lg font-semibold mb-3">Succès</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {badges.map((b) => {
            const isEarned = earned.has(b.id);
            return (
              <div key={b.id} className={cn('rounded-2xl border p-4 text-center transition-all', isEarned ? cn('bg-gradient-to-br border', tierStyles[b.tier]) : 'bg-card border-border opacity-50')}>
                <div className={cn('grid place-items-center w-12 h-12 rounded-full mx-auto mb-2', isEarned ? 'bg-foreground/5' : 'bg-muted')}>
                  {isEarned ? <Award className="w-6 h-6" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="text-xs font-semibold leading-tight">{b.name}</div>
                <div className="text-[10px] text-muted-foreground mt-1 leading-snug line-clamp-2">{b.description}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Zone de déconnexion pour mobile */}
      <section className="md:hidden pt-4">
        <button
          onClick={() => signOut()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive font-semibold text-sm hover:bg-destructive/10 active:scale-95 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </section>
    </div>
  );
}

function StatBox({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <Icon className="w-4 h-4 text-muted-foreground mb-2" />
      <div className="font-display text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
