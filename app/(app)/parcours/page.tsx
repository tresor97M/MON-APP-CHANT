'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Lock, Check, Clock, Zap, CircleDot, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase, type Skill, type Path, type Module, type Lesson, type UserProgress } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type ModuleWithLessons = Module & { lessons: (Lesson & { progress: UserProgress | null })[] };

export default function ParcoursPage() {
  const [skill, setSkill] = useState<Skill | null>(null);
  const [path, setPath] = useState<Path | null>(null);
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: skillData } = await supabase.from('skills').select('*').eq('is_active', true).order('sort_order').limit(1).maybeSingle();
      if (!skillData) { setLoading(false); return; }
      setSkill(skillData);

      const { data: pathData } = await supabase.from('paths').select('*').eq('skill_id', skillData.id).order('sort_order').limit(1).maybeSingle();
      if (!pathData) { setLoading(false); return; }
      setPath(pathData);

      const { data: modulesData } = await supabase.from('modules').select('*').eq('path_id', pathData.id).order('sort_order');
      if (!modulesData) { setLoading(false); return; }

      const moduleIds = modulesData.map((m) => m.id);
      const { data: lessonsData } = await supabase.from('lessons').select('*').in('module_id', moduleIds).order('sort_order');
      const lessonIds = (lessonsData || []).map((l) => l.id);
      const { data: progressData } = await supabase.from('user_progress').select('*').in('lesson_id', lessonIds);
      const progressMap = new Map((progressData || []).map((p) => [p.lesson_id, p]));

      const result: ModuleWithLessons[] = modulesData.map((m) => ({
        ...m,
        lessons: (lessonsData || []).filter((l) => l.module_id === m.id).map((l) => ({ ...l, progress: progressMap.get(l.id) || null })),
      }));
      setModules(result);
      if (result.length > 0) {
        // Expand the first unlocked, uncompleted module by default
        const activeMod = result.find((m, idx) => {
          const isUnlocked = idx === 0 || result[idx - 1].lessons.some((l) => l.progress?.completed);
          const completed = m.lessons.every((l) => l.progress?.completed);
          return isUnlocked && !completed;
        });
        setExpandedModuleId(activeMod?.id || result[0]?.id || null);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="space-y-4"><div className="h-32 rounded-3xl bg-muted animate-pulse" />{[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-3xl bg-muted animate-pulse" />)}</div>;
  }

  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedLessons = modules.reduce((acc, m) => acc + m.lessons.filter((l) => l.progress?.completed).length, 0);
  const pct = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/5 border border-border p-6 relative overflow-hidden">
        <div className="absolute -bottom-16 -right-10 w-56 h-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="text-xs font-semibold text-primary uppercase tracking-wide">{skill?.name}</div>
            <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mt-1">{path?.name}</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">{path?.description}</p>
          </div>
          <div className="w-full md:w-64">
            <div className="flex justify-between text-xs mb-1.5 font-bold">
              <span>{completedLessons}/{totalLessons} leçons</span>
              <span className="text-muted-foreground tabular-nums">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {modules.map((mod, idx) => {
          const modCompleted = mod.lessons.filter((l) => l.progress?.completed).length;
          const modTotal = mod.lessons.length;
          const modPct = modTotal ? Math.round((modCompleted / modTotal) * 100) : 0;
          const isUnlocked = idx === 0 || modules[idx - 1].lessons.some((l) => l.progress?.completed);
          const isExpanded = expandedModuleId === mod.id;

          const starsCount = modPct === 100 ? 5 : isUnlocked && modPct > 0 ? 4 : isUnlocked ? 3 : 0;

          return (
            <div
              key={mod.id}
              className={cn(
                'group flex flex-col justify-between rounded-3xl bg-card border border-border/40 overflow-hidden shadow-lg hover:border-primary/45 hover:shadow-primary/5 transition-all duration-300 relative',
                !isUnlocked && 'opacity-60'
              )}
            >
              {/* Header card with gradient background */}
              <div 
                className="h-32 bg-gradient-to-br from-primary-soft to-card relative overflow-hidden p-5 flex items-center justify-between border-b border-border/20 shrink-0 cursor-pointer select-none"
                onClick={() => {
                  if (isUnlocked) {
                    setExpandedModuleId(isExpanded ? null : mod.id);
                  }
                }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
                <div className="flex-1 min-w-0 pr-2">
                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Module {idx + 1}</span>
                  <h2 className="font-display text-lg font-bold text-foreground leading-tight mt-1 line-clamp-2">{mod.name}</h2>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="grid place-items-center w-11 h-11 rounded-2xl bg-card/60 backdrop-blur-md text-primary border border-primary/20">
                    <CircleDot className="w-5 h-5" />
                  </div>
                  {isUnlocked && (
                    <div className="text-muted-foreground/60 group-hover:text-primary transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  )}
                </div>
              </div>

              {/* Body: description, ratings, progress */}
              {!isExpanded ? (
                <div className="p-5 flex-1 flex flex-col justify-between h-[210px]">
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{mod.description || "Aucune description fournie pour ce module."}</p>

                  <div className="space-y-4 mt-4">
                    {/* Rating Stars */}
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={cn('text-sm', i < starsCount ? 'text-accent' : 'text-muted-foreground/30')}>★</span>
                      ))}
                      <span className="text-[10px] text-muted-foreground font-semibold ml-2">({modTotal} leçons)</span>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Progression</span>
                        <span className="font-bold tabular-nums">{modPct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-secondary transition-all" style={{ width: `${modPct}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Footer action button */}
                  <div className="pt-4 shrink-0">
                    {isUnlocked ? (
                      <button
                        onClick={() => setExpandedModuleId(mod.id)}
                        className="w-full py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold text-center block transition-all"
                      >
                        {modPct === 100 ? 'Revoir les leçons' : modPct > 0 ? 'Continuer le parcours' : 'Commencer le module'}
                      </button>
                    ) : (
                      <div className="w-full py-2.5 rounded-xl bg-muted text-muted-foreground/60 text-xs font-bold text-center flex items-center justify-center gap-1.5 cursor-not-allowed">
                        <Lock className="w-3.5 h-3.5" /> Module Verrouillé
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Expanded Content: list of lessons */
                <div className="p-2 divide-y divide-border/40 max-h-[300px] overflow-y-auto no-scrollbar animate-slide-down">
                  {mod.lessons.map((lesson, lIdx) => {
                    const status = lesson.progress?.status || 'locked';
                    const completed = lesson.progress?.completed;
                    const accessible = status === 'available' || completed;

                    return (
                      <Link
                        key={lesson.id}
                        href={accessible ? `/lecon/${lesson.id}` : '#'}
                        className={cn(
                          'group flex items-center gap-3 px-4 py-3 transition-colors rounded-xl',
                          accessible ? 'hover:bg-muted/50' : 'cursor-not-allowed'
                        )}
                        onClick={(e) => { if (!accessible) e.preventDefault(); }}
                      >
                        <div className={cn(
                          'grid place-items-center w-8 h-8 rounded-full shrink-0 text-xs font-bold transition-all',
                          completed ? 'bg-success text-success-foreground' :
                          accessible ? 'bg-primary text-primary-foreground animate-pulse-ring' :
                          'bg-muted text-muted-foreground'
                        )}>
                          {completed ? <Check className="w-3.5 h-3.5" /> : accessible ? lIdx + 1 : <Lock className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn('text-xs font-semibold leading-snug truncate', !accessible && 'text-muted-foreground')}>{lesson.name}</div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{lesson.duration_min} min</span>
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3" />+{lesson.xp_reward} XP</span>
                          </div>
                        </div>
                        {accessible && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
