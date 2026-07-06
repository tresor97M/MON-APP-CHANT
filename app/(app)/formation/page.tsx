'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { GraduationCap, CheckCircle2, Circle, BookOpen, Music, Sparkles, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import {
  GAP_LABELS, VOICE_LABELS,
  type ModuleCompletion, type SkillGap, type TrainingAssignment, type TrainingModule, type TrainingPath,
} from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

export default function FormationPage() {
  const { user } = useAuth();
  const [paths, setPaths] = useState<TrainingPath[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [completions, setCompletions] = useState<ModuleCompletion[]>([]);
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [pathRes, modRes, assignRes, compRes, gapRes] = await Promise.all([
      supabase.from('training_paths').select('*').order('created_at', { ascending: false }),
      supabase.from('training_modules').select('*').order('sort_order'),
      supabase.from('training_assignments').select('*').eq('user_id', user.id),
      supabase.from('module_completions').select('*').eq('user_id', user.id),
      supabase.from('skill_gaps').select('*').eq('user_id', user.id).neq('status', 'resolue'),
    ]);
    setPaths(pathRes.data || []);
    setModules(modRes.data || []);
    setAssignments(assignRes.data || []);
    setCompletions(compRes.data || []);
    setGaps(gapRes.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const completedIds = useMemo(() => new Set(completions.map(c => c.module_id)), [completions]);
  const assignedPathIds = useMemo(() => new Set(assignments.map(a => a.path_id)), [assignments]);

  const assignedPaths = paths.filter(p => assignedPathIds.has(p.id));
  const openPaths = paths.filter(p => p.is_open && !assignedPathIds.has(p.id));

  const modulesFor = (pathId: string) => modules.filter(m => m.path_id === pathId);

  const progressFor = (pathId: string) => {
    const mods = modulesFor(pathId);
    if (mods.length === 0) return 0;
    const done = mods.filter(m => completedIds.has(m.id)).length;
    return Math.round((done / mods.length) * 100);
  };

  const completeModule = async (mod: TrainingModule) => {
    if (!user || completedIds.has(mod.id)) return;
    setCompletingId(mod.id);
    const { error } = await supabase.from('module_completions').insert({ module_id: mod.id, user_id: user.id });
    if (!error) {
      // XP : incrément via RPC ou mise à jour directe des stats
      const { data: stats } = await supabase.from('choir_stats').select('*').eq('user_id', user.id).maybeSingle();
      if (stats) {
        await supabase
          .from('choir_stats')
          .update({
            total_xp: (stats.total_xp || 0) + mod.xp_reward,
            weekly_xp: (stats.weekly_xp || 0) + mod.xp_reward,
          })
          .eq('user_id', user.id);
      } else {
        await supabase.from('choir_stats').insert({ user_id: user.id, total_xp: mod.xp_reward, weekly_xp: mod.xp_reward });
      }
      // Si tous les modules du parcours sont finis, marquer l'affectation comme terminée
      const mods = modulesFor(mod.path_id);
      const doneCount = mods.filter(m => completedIds.has(m.id) || m.id === mod.id).length;
      if (doneCount === mods.length) {
        await supabase
          .from('training_assignments')
          .update({ status: 'termine' })
          .eq('user_id', user.id)
          .eq('path_id', mod.path_id);
      } else {
        await supabase
          .from('training_assignments')
          .update({ status: 'en_cours' })
          .eq('user_id', user.id)
          .eq('path_id', mod.path_id)
          .eq('status', 'assigne');
      }
      await load();
    }
    setCompletingId(null);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <GraduationCap className="h-6 w-6 text-primary" />
          Formation & remise à niveau
        </h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Parcours assignés par le maître de chœur selon vos besoins, et parcours libres pour progresser.
        </p>
      </header>

      {gaps.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Points à travailler identifiés</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {gaps.map(g => (
              <Badge key={g.id} variant="outline" className="border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                {GAP_LABELS[g.category]}
                {g.severity >= 3 ? ' (prioritaire)' : ''}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Parcours assignés */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Sparkles className="h-5 w-5 text-primary" />
          Mes parcours assignés
        </h2>
        {assignedPaths.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Aucun parcours assigné pour le moment. Le maître de chœur peut vous en attribuer selon vos besoins.
          </p>
        ) : (
          assignedPaths.map(path => (
            <PathCard
              key={path.id}
              path={path}
              modules={modulesFor(path.id)}
              completedIds={completedIds}
              progress={progressFor(path.id)}
              onComplete={completeModule}
              completingId={completingId}
              assigned
            />
          ))
        )}
      </section>

      {/* Parcours libres */}
      {openPaths.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            Parcours libres
          </h2>
          {openPaths.map(path => (
            <PathCard
              key={path.id}
              path={path}
              modules={modulesFor(path.id)}
              completedIds={completedIds}
              progress={progressFor(path.id)}
              onComplete={completeModule}
              completingId={completingId}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function PathCard({
  path, modules, completedIds, progress, onComplete, completingId, assigned = false,
}: {
  path: TrainingPath;
  modules: TrainingModule[];
  completedIds: Set<string>;
  progress: number;
  onComplete: (mod: TrainingModule) => void;
  completingId: string | null;
  assigned?: boolean;
}) {
  const [open, setOpen] = useState(assigned);

  return (
    <article className={cn('rounded-xl border bg-card', assigned ? 'border-primary/30' : 'border-border')}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{path.name}</h3>
            {path.target_gap_category && (
              <Badge variant="secondary" className="text-xs">{GAP_LABELS[path.target_gap_category]}</Badge>
            )}
            {path.voice_part && (
              <Badge variant="outline" className="text-xs">{VOICE_LABELS[path.voice_part]}</Badge>
            )}
          </div>
          {path.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{path.description}</p>}
          <div className="mt-3 flex items-center gap-3">
            <Progress value={progress} className="h-2 flex-1" />
            <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-border">
          {modules.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucun module dans ce parcours pour le moment.</p>
          ) : (
            <ul className="divide-y divide-border">
              {modules.map(mod => {
                const done = completedIds.has(mod.id);
                return (
                  <li key={mod.id} className="flex items-start gap-3 p-4">
                    {done ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('font-medium', done ? 'text-muted-foreground line-through' : 'text-foreground')}>
                          {mod.title}
                        </span>
                        <Badge variant="outline" className="text-xs">+{mod.xp_reward} XP</Badge>
                      </div>
                      {mod.content && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{mod.content}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {mod.resource_url && (
                          <a
                            href={mod.resource_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" aria-hidden /> Ressource
                          </a>
                        )}
                        {mod.hymn_id && (
                          <Link
                            href={`/cantiques/${mod.hymn_id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <Music className="h-3 w-3" aria-hidden /> Cantique lié
                          </Link>
                        )}
                      </div>
                    </div>
                    {!done && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={completingId === mod.id}
                        onClick={() => onComplete(mod)}
                      >
                        {completingId === mod.id ? 'Validation...' : 'Terminer'}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}
