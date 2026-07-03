'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, Zap, Target, TrendingUp, ChevronRight, Sparkles, Clock, Award, Brain, Calendar } from 'lucide-react';
import { supabase, type UserStats, type Lesson, type UserProgress, type Module, type Path, type Skill } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Maestro, getMaestroMessage } from '@/components/maestro';
import { AudioVisualizer } from '@/components/audio-visualizer';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as ChartTooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

type ContinueItem = { lesson: Lesson; module: Module; path: Path; skill: Skill; progress: UserProgress };

export default function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [continueItems, setContinueItems] = useState<ContinueItem[]>([]);
  const [badgeCount, setBadgeCount] = useState(0);
  const [totalBadges, setTotalBadges] = useState(0);
  const [attempts, setAttempts] = useState<{ score: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [maestroMsg, setMaestroMsg] = useState('Salut ! Prêt à chanter aujourd\'hui ?');

  useEffect(() => {
    (async () => {
      const [statsResult, progressResult, userBadgesResult, badgesResult, attemptsResult] = await Promise.all([
        supabase.from('user_stats').select('*').limit(1).maybeSingle(),
        supabase.from('user_progress').select('*, lesson:lessons(*, module:modules(*, path:paths(*, skill:skills(*))))').eq('status', 'available').order('updated_at', { ascending: true }).limit(4),
        supabase.from('user_badges').select('*', { count: 'exact', head: true }),
        supabase.from('badges').select('*', { count: 'exact', head: true }),
        supabase.from('attempts').select('score').order('created_at', { ascending: false }).limit(20)
      ]);

      const s = statsResult.data;
      if (s) setStats(s);

      if (progressResult.data) {
        const items: ContinueItem[] = progressResult.data
          .filter((p: any) => p.lesson)
          .map((p: any) => ({
            lesson: p.lesson,
            module: p.lesson.module,
            path: p.lesson.module.path,
            skill: p.lesson.module.path.skill,
            progress: {
              id: p.id,
              lesson_id: p.lesson_id,
              status: p.status,
              best_score: p.best_score,
              completed: p.completed,
              updated_at: p.updated_at
            }
          }));
        setContinueItems(items);
      }

      setBadgeCount(userBadgesResult.count || 0);
      setTotalBadges(badgesResult.count || 0);
      setAttempts(attemptsResult.data || []);
      setLoading(false);

      // Contextual Maestro message
      if (s) {
        if (s.streak_days >= 7) setMaestroMsg(getMaestroMessage('streak'));
        else if (s.daily_xp === 0) setMaestroMsg('Salut ! On commence la journée par un peu de chant ?');
        else setMaestroMsg('Bon retour ! Continue là où tu t\'es arrêté.');
      }
    })();
  }, []);

  if (loading || !stats) {
    return <div className="space-y-4"><div className="h-40 rounded-3xl bg-muted animate-pulse" /><div className="h-40 rounded-3xl bg-muted animate-pulse" /></div>;
  }

  const dailyPct = Math.min(100, Math.round((stats.daily_xp / stats.daily_goal_xp) * 100));
  const xpForNextLevel = stats.level * 200;
  const levelPct = Math.min(100, Math.round((stats.total_xp / xpForNextLevel) * 100));
  const avgAccuracy = attempts.length ? Math.round(attempts.reduce((a, b) => a + b.score, 0) / attempts.length) : 0;
  const weeklyGoal = 350;
  const weeklyPct = Math.min(100, Math.round((stats.weekly_xp / weeklyGoal) * 100));
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'chanteur';

  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const isToday = d.toDateString() === today.toDateString();
    const isFuture = d > today && !isToday;
    const daysAgo = Math.floor((today.getTime() - d.getTime()) / 86400000);
    const isActive = !isFuture && daysAgo < stats.streak_days;
    return { label: days[(d.getDay() + 6) % 7], date: d.getDate(), isToday, isActive, isFuture };
  });

  const recommended = continueItems[0];

  const radarData = [
    { subject: 'Justesse', A: avgAccuracy || 75 },
    { subject: 'Souffle', A: Math.max(60, (avgAccuracy || 70) - 5) },
    { subject: 'Rythme', A: Math.max(65, (avgAccuracy || 75) + 2) },
    { subject: 'Vibrato', A: Math.max(50, (avgAccuracy || 75) - 15) },
    { subject: 'Puissance', A: Math.max(55, (avgAccuracy || 75) - 8) }
  ];

  const activityData = [
    { name: 'L', XP: Math.round(stats.weekly_xp * 0.08) },
    { name: 'M', XP: Math.round(stats.weekly_xp * 0.22) },
    { name: 'M', XP: Math.round(stats.weekly_xp * 0.38) },
    { name: 'J', XP: Math.round(stats.weekly_xp * 0.55) },
    { name: 'V', XP: Math.round(stats.weekly_xp * 0.75) },
    { name: 'S', XP: Math.round(stats.weekly_xp * 0.9) },
    { name: 'D', XP: stats.weekly_xp }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Left Column (Main Content) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Hero with Maestro */}
        <section className="rounded-3xl bg-gradient-to-br from-primary/15 via-secondary/5 to-accent/5 border border-primary/20 p-6 md:p-8 relative overflow-hidden shadow-xl shadow-primary/5">
          <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-primary/30 to-secondary/15 blur-3xl" />
          <div className="relative">
            <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-balance">
              Bon retour, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent font-bold capitalize">{userName}</span>.
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Ta voix t'attend. Chaque pratique compte.</p>
            <div className="mt-4">
              <Maestro mood="encouraging" message={maestroMsg} size="md" />
            </div>
          </div>
        </section>

        {/* Charts block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Radar Chart: Vocal Performance */}
          <div className="rounded-3xl glass p-5 shadow-lg flex flex-col justify-between h-[300px] relative overflow-hidden">
            <div>
              <h2 className="text-[10px] font-bold text-primary uppercase tracking-widest">Analyse Vocale</h2>
              <p className="text-sm font-semibold text-foreground mt-0.5">Profil & attributs vocaux</p>
            </div>
            <div className="flex-1 w-full h-full min-h-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Maestro" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Area Chart: XP Progress */}
          <div className="rounded-3xl glass p-5 shadow-lg flex flex-col justify-between h-[300px] relative overflow-hidden">
            <div>
              <h2 className="text-[10px] font-bold text-secondary uppercase tracking-widest">Activité XP</h2>
              <p className="text-sm font-semibold text-foreground mt-0.5">Progression de la semaine</p>
            </div>
            <div className="flex-1 w-full h-full min-h-0 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} />
                  <ChartTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', fontSize: '11px', color: 'hsl(var(--foreground))' }} />
                  <Area type="monotone" dataKey="XP" stroke="hsl(var(--secondary))" strokeWidth={2} fillOpacity={1} fill="url(#colorXp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* AI recommendation with visualizer */}
        {recommended && (
          <section className="rounded-3xl bg-gradient-to-br from-primary/25 via-card to-secondary/5 border border-primary/30 p-6 relative overflow-hidden shadow-xl shadow-primary/5">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative flex items-start gap-4">
              <div className="grid place-items-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary/30 to-secondary/20 text-primary border border-primary/25 shrink-0 shadow-lg">
                <Brain className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold text-primary uppercase tracking-widest">L'IA te recommande</div>
                <div className="font-bold text-base mt-1 text-foreground">{recommended.lesson.name}</div>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {avgAccuracy < 80 ? 'Ta précision peut progresser. Cet exercice cible la justesse.' : 'Tu es régulier. Cet exercice te fait monter en niveau.'}
                </p>
                <div className="mt-4 h-8 max-w-xs">
                  <AudioVisualizer active bars={20} color="hsl(var(--secondary))" />
                </div>
                <Link href={`/lecon/${recommended.lesson.id}`} className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-primary hover:gap-2.5 transition-all">
                  Commencer la leçon <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Continue learning */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-secondary">Continue ton parcours</h2>
            <Link href="/parcours" className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">Tout voir</Link>
          </div>
          {continueItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">Aucune leçon disponible pour l'instant.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {continueItems.map((item) => (
                <Link key={item.lesson.id} href={`/lecon/${item.lesson.id}`} className="group rounded-2xl bg-card/40 border border-border/40 p-4 hover:border-primary/50 hover:bg-card/85 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start gap-3">
                    <div className="grid place-items-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/10 text-primary shrink-0 transition-transform group-hover:scale-105"><Sparkles className="w-5 h-5" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider truncate">{item.module.name}</div>
                      <div className="font-semibold text-sm leading-snug mt-1 text-foreground truncate group-hover:text-primary transition-colors">{item.lesson.name}</div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/80">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.lesson.duration_min} min</span>
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-secondary" />+{item.lesson.xp_reward} XP</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Sidebar Column (Right) */}
      <div className="space-y-6">
        {/* Daily goal card */}
        <div className="rounded-3xl glass shadow-lg p-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex flex-col items-center text-center space-y-4">
            <GoalRing pct={dailyPct} value={stats.daily_xp} goal={stats.daily_goal_xp} />
            <div>
              <div className="text-[10px] font-bold text-primary uppercase tracking-widest">Objectif du jour</div>
              <div className="font-display text-lg font-bold mt-1 text-foreground">
                {dailyPct >= 100 ? 'Objectif atteint ! 🎉' : `${stats.daily_goal_xp - stats.daily_xp} XP restants`}
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-relaxed mx-auto">
                {dailyPct >= 100 ? 'Tu as validé ta pratique aujourd\'hui.' : 'Plus qu\'une session pour valider l\'objectif.'}
              </p>
            </div>
          </div>
        </div>

        {/* Streak card & calendar combo */}
        <div className="rounded-3xl glass p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-6 h-6 text-accent drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" />
              <div>
                <div className="font-bold text-sm text-foreground">Série Active</div>
                <div className="text-[10px] text-muted-foreground">Pratique quotidienne</div>
              </div>
            </div>
            <span className="text-2xl font-display font-extrabold text-accent tabular-nums">{stats.streak_days} j</span>
          </div>

          <div className="border-t border-border/40 pt-4 flex items-center justify-between gap-1">
            {weekDays.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                <span className="text-[9px] text-muted-foreground/80 font-bold">{d.label}</span>
                <div className={cn('grid place-items-center w-8 h-8 rounded-lg text-xs font-bold transition-all', 
                  d.isActive 
                    ? 'bg-gradient-to-br from-accent to-orange-500 text-accent-foreground shadow-lg shadow-accent/20 ring-1 ring-accent/30' 
                    : 'bg-muted/40 text-muted-foreground/60', 
                  d.isToday && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                )}>
                  {d.isActive ? <Flame className="w-3.5 h-3.5" /> : d.isFuture ? '' : d.date}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Level stats */}
        <div className="rounded-3xl glass p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-secondary text-primary-foreground text-sm font-extrabold shadow-md shadow-primary/20">{stats.level}</div>
              <div>
                <div className="text-sm font-bold">Niveau {stats.level}</div>
                <div className="text-[10px] text-muted-foreground">{stats.total_xp} XP cumulés</div>
              </div>
            </div>
            <div className="text-xs font-semibold text-muted-foreground tabular-nums">{stats.total_xp}/{xpForNextLevel}</div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-accent transition-all duration-1000" style={{ width: `${levelPct}%` }} />
          </div>

          <div className="border-t border-border/40 pt-3 flex items-center justify-between text-xs text-muted-foreground/80">
            <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-primary" /> Objectif hebdo :</span>
            <span className="font-bold text-foreground tabular-nums">{stats.weekly_xp} / {weeklyGoal} XP</span>
          </div>
        </div>

        {/* Quick stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Target} label="Précision moy." value={avgAccuracy ? `${avgAccuracy}%` : '—'} />
          <StatCard icon={Award} label="Badges" value={`${badgeCount}/${totalBadges}`} />
        </div>
      </div>
    </div>
  );
}

function GoalRing({ pct, value, goal }: { pct: number; value: number; goal: number }) {
  const r = 38; const c = 2 * Math.PI * r; const offset = c - (pct / 100) * c;
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <circle cx="48" cy="48" r={r} fill="none" stroke="url(#primaryGrad)" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-700" />
        <defs>
          <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><div className="text-lg font-extrabold tabular-nums text-foreground">{pct}%</div><div className="text-[9px] text-muted-foreground/80 font-medium">{value}/{goal} XP</div></div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card/30 border border-border/40 p-4 hover:border-primary/40 hover:bg-card/50 transition-all duration-300">
      <Icon className="w-4 h-4 text-muted-foreground mb-2" />
      <div className="font-display text-lg font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground font-medium mt-0.5">{label}</div>
    </div>
  );
}
