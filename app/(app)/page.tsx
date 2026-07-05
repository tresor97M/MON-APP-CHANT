'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, Zap, Target, TrendingUp, ChevronRight, Sparkles, Clock, Award, Brain, Calendar, Lock, Check } from 'lucide-react';
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

  // Breathing warmup states
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'inspire' | 'retention' | 'expire'>('inspire');
  const [breathingSeconds, setBreathingSeconds] = useState(4);

  useEffect(() => {
    let interval: any = null;
    if (breathingActive) {
      interval = setInterval(() => {
        setBreathingSeconds((prev) => {
          if (prev <= 1) {
            setBreathingPhase((phase) => {
              if (phase === 'inspire') return 'retention';
              if (phase === 'retention') return 'expire';
              return 'inspire';
            });
            return 4;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setBreathingPhase('inspire');
      setBreathingSeconds(4);
    }
    return () => clearInterval(interval);
  }, [breathingActive]);

  useEffect(() => {
    (async () => {
      const [statsResult, lessonsResult, userProgressResult, userBadgesResult, badgesResult, attemptsResult] = await Promise.all([
        supabase.from('user_stats').select('*').limit(1).maybeSingle(),
        supabase.from('lessons').select('*, module:modules(*)').order('sort_order', { ascending: true }),
        supabase.from('user_progress').select('*'),
        supabase.from('user_badges').select('*', { count: 'exact', head: true }),
        supabase.from('badges').select('*', { count: 'exact', head: true }),
        supabase.from('attempts').select('score').order('created_at', { ascending: false }).limit(20)
      ]);

      let s = statsResult.data;
      if (!s) {
        const defaultStats = {
          total_xp: 0,
          level: 1,
          streak_days: 0,
          daily_goal_xp: 50,
          daily_xp: 0,
          weekly_xp: 0,
        };
        const { data: newStats } = await supabase.from('user_stats').insert(defaultStats).select().maybeSingle();
        s = newStats || { id: 'default-stats', ...defaultStats, last_active_date: null };
      }
      setStats(s);

      if (lessonsResult.data) {
        const progressList = userProgressResult.data || [];
        const items: ContinueItem[] = lessonsResult.data.map((l: any, idx: number) => {
          const progress = progressList.find((p: any) => p.lesson_id === l.id);
          
          let status = 'locked';
          if (progress) {
            status = progress.status;
          } else if (idx === 0) {
            status = 'available';
          } else {
            const prevLesson = lessonsResult.data[idx - 1];
            const prevProgress = progressList.find((p: any) => p.lesson_id === prevLesson.id);
            if (prevProgress && prevProgress.completed) {
              status = 'available';
            }
          }

          return {
            lesson: l,
            module: l.module || { name: 'Fondamentaux' },
            path: {} as any,
            skill: {} as any,
            progress: {
              id: progress?.id || `temp-${l.id}`,
              lesson_id: l.id,
              status: status as any,
              best_score: progress?.best_score || 0,
              completed: progress?.completed || false,
              updated_at: progress?.updated_at || new Date().toISOString()
            }
          };
        });
        setContinueItems(items);
      }

      setBadgeCount(userBadgesResult.count || 0);
      setTotalBadges(badgesResult.count || 0);
      setAttempts(attemptsResult.data || []);
      setLoading(false);

      if (s) {
        if (s.streak_days >= 7) setMaestroMsg(getMaestroMessage('streak'));
        else if (s.daily_xp === 0) setMaestroMsg('Salut ! On commence la journée par un peu de chant ?');
        else setMaestroMsg('Bon retour ! Continue ton parcours d\'apprentissage.');
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

  const recommended = continueItems.find(item => item.progress?.status === 'available' && !item.progress?.completed) || continueItems.find(item => item.progress?.status === 'available') || continueItems[0];

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

        {/* Sentier Aventure Élève (Duolingo style) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div>
              <h2 className="font-display text-base font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-secondary">Mon Sentier d'Apprentissage</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Complète chaque étape pour débloquer la suite</p>
            </div>
            <Link href="/parcours" className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">Vue en grille</Link>
          </div>

          {continueItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">Aucun exercice disponible pour l'instant.</div>
          ) : (
            <div className="relative py-8 bg-slate-900/5 rounded-3xl border border-border/40 p-6 overflow-hidden flex flex-col items-center gap-8 min-h-[450px]">
              {/* Ligne pointillée sinueuse verticale reliant les bulles */}
              <div className="absolute inset-y-0 w-1 bg-gradient-to-b from-primary/30 via-secondary/30 to-muted/10 left-1/2 -translate-x-1/2 border-dashed border-l-2 border-slate-700/60" />
              
              <div className="w-full space-y-12 relative z-10">
                {continueItems.map((item, idx) => {
                  const isCompleted = item.progress?.completed;
                  const isAvailable = item.progress?.status === 'available';
                  const isLocked = item.progress?.status === 'locked';

                  // Alignement zigzag (gauche, centre, droite)
                  const alignmentClass = idx % 3 === 0 ? 'justify-start md:pl-24' : idx % 3 === 1 ? 'justify-center' : 'justify-end md:pr-24';

                  return (
                    <div key={item.lesson.id} className={cn('flex w-full px-4 relative', alignmentClass)}>
                      <div className="flex flex-col items-center group relative">
                        {/* Bulle interactive */}
                        {isLocked ? (
                          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#2d3436] border-4 border-[#1e272e] text-[#57606f] cursor-not-allowed shadow-md relative">
                            <Lock className="w-5 h-5" />
                          </div>
                        ) : (
                          <Link 
                            href={`/lecon/${item.lesson.id}`} 
                            className={cn(
                              'w-16 h-16 rounded-full flex items-center justify-center border-4 shadow-xl transition-all duration-300 relative hover:scale-110 active:scale-95',
                              isCompleted 
                                ? 'bg-green-500 border-green-600 text-white shadow-green-500/20' 
                                : 'bg-gradient-to-r from-primary to-secondary border-white text-white animate-pulse shadow-primary/30 ring-4 ring-primary/20'
                            )}
                          >
                            {isCompleted ? <Check className="w-6 h-6 stroke-[3]" /> : <Sparkles className="w-6 h-6 text-white" />}
                            
                            {/* Bulle de statut XP */}
                            <span className={cn('absolute -top-1.5 -right-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest',
                              isCompleted ? 'bg-green-700 text-white' : 'bg-secondary text-secondary-foreground animate-bounce'
                            )}>
                              {isCompleted ? 'OK' : `+${item.lesson.xp_reward}XP`}
                            </span>
                          </Link>
                        )}

                        {/* Nom de la leçon sous le jalon */}
                        <div className="text-center mt-2 max-w-[120px]">
                          <span className="block text-[9px] text-muted-foreground/80 font-bold uppercase tracking-wider truncate">{item.module.name}</span>
                          <span className={cn('block text-xs font-bold truncate transition-colors',
                            isLocked ? 'text-muted-foreground/50' : 'text-foreground group-hover:text-primary'
                          )}>
                            {item.lesson.name}
                          </span>
                        </div>

                        {/* Tooltip descriptif au survol */}
                        <div className="absolute bottom-full mb-3 bg-[#2d3436]/95 backdrop-blur-md text-white text-xs px-3.5 py-2.5 rounded-2xl border border-gray-700 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 w-52 text-center leading-normal shadow-2xl z-30 translate-y-1 group-hover:translate-y-0">
                          <span className="block text-[8px] text-primary font-bold uppercase tracking-widest">{item.module.name}</span>
                          <span className="block font-bold text-white mt-1 leading-snug">{item.lesson.name}</span>
                          <span className="block text-[10px] text-white/50 mt-1 italic leading-normal">« {item.lesson.description} »</span>
                          <div className="flex items-center justify-center gap-2.5 mt-2.5 pt-2 border-t border-gray-700/60 text-[9px] font-bold text-white/80">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-primary" />{item.lesson.duration_min} min</span>
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-secondary" />+{item.lesson.xp_reward} XP</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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

        {/* Widget d'Échauffement Respiratoire Guidé */}
        <div className="rounded-3xl glass shadow-lg p-5 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
            <h3 className="font-bold text-sm text-foreground">Échauffement Respiratoire 🧘</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">Routine</span>
          </div>

          {!breathingActive ? (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Préparez vos poumons et votre diaphragme avec un guide visuel de respiration rythmé (4s-4s-4s) avant de chanter.
              </p>
              <button 
                onClick={() => setBreathingActive(true)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
              >
                Démarrer l'échauffement
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 space-y-5">
              {/* Animated breathing circle */}
              <div 
                className={cn('w-28 h-28 rounded-full flex items-center justify-center text-white transition-all duration-1000 shadow-xl border-4',
                  breathingPhase === 'inspire' ? 'scale-110 bg-gradient-to-tr from-cyan-400 to-blue-500 border-cyan-300 shadow-cyan-500/20' :
                  breathingPhase === 'retention' ? 'scale-115 bg-gradient-to-tr from-amber-400 to-orange-500 border-amber-300 shadow-orange-500/20' :
                  'scale-95 bg-gradient-to-tr from-purple-400 to-pink-500 border-purple-300 shadow-purple-500/20'
                )}
              >
                <div className="text-center">
                  <div className="font-display text-4xl font-extrabold tracking-tight tabular-nums">{breathingSeconds}</div>
                  <div className="text-[8px] font-bold uppercase tracking-wider mt-0.5">secondes</div>
                </div>
              </div>

              {/* Instructions */}
              <div className="text-center space-y-1">
                <div className="text-sm font-extrabold text-foreground capitalize">
                  {breathingPhase === 'inspire' ? 'Inspirez par le nez... 👃' :
                   breathingPhase === 'retention' ? 'Bloquez le souffle... 🛑' :
                   'Expirez par la bouche... 👄'}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {breathingPhase === 'inspire' ? 'Gonflez bien le ventre et le diaphragme' :
                   breathingPhase === 'retention' ? 'Gardez une posture droite et détendue' :
                   'Relâchez lentement tout l\'air accumulé'}
                </p>
              </div>

              <button 
                onClick={() => setBreathingActive(false)}
                className="px-4 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 text-[10px] font-bold hover:bg-red-500/20 transition-all"
              >
                Arrêter
              </button>
            </div>
          )}
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
