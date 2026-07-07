'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { GraduationCap, CheckCircle2, Circle, BookOpen, Music, Sparkles, ExternalLink, ArrowLeft, Play } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import {
  GAP_LABELS, VOICE_LABELS,
  type ModuleCompletion, type SkillGap, type TrainingAssignment, type TrainingModule, type TrainingPath,
} from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

function getYoutubeThumbnail(url: string) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://img.youtube.com/vi/${match[2]}/0.jpg`;
  }
  return null;
}

export default function FormationPage() {
  const { user } = useAuth();
  const [paths, setPaths] = useState<TrainingPath[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [completions, setCompletions] = useState<ModuleCompletion[]>([]);
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  
  // Tab states: 'todo' | 'open' | 'done'
  const [activeTab, setActiveTab] = useState<'todo' | 'open' | 'done'>('todo');

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

  // Filter paths by tab
  const assignedPaths = useMemo(() => {
    return paths.filter(p => assignedPathIds.has(p.id) && completions.length < modules.filter(m => m.path_id === p.id).length);
  }, [paths, assignedPathIds, completions, modules]);

  const openPaths = useMemo(() => {
    return paths.filter(p => p.is_open && !assignedPathIds.has(p.id));
  }, [paths, assignedPathIds]);

  const completedPaths = useMemo(() => {
    return paths.filter(p => {
      const pMods = modules.filter(m => m.path_id === p.id);
      if (pMods.length === 0) return false;
      return pMods.every(m => completedIds.has(m.id));
    });
  }, [paths, modules, completedIds]);

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
      <div className="space-y-4 p-4 md:p-6 max-w-md mx-auto">
        <Skeleton className="h-8 w-64 rounded-xl" />
        <Skeleton className="h-10 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-3xl" />
        <Skeleton className="h-56 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[82vh] rounded-3xl overflow-hidden flex flex-col p-4 sm:p-6 text-white shadow-2xl max-w-md mx-auto"
      style={{
        background: 'radial-gradient(circle at 50% 20%, rgba(16, 185, 129, 0.15), transparent 45%), #07090e',
      }}>
      
      {/* Header */}
      <header className="w-full flex items-center justify-between z-10 py-2 mb-4">
        <Link href="/" className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-4.5 h-4.5 text-white/80" />
        </Link>
        <span className="font-display font-bold text-sm tracking-wide text-white/95">Formation & Vidéos</span>
        <div className="w-9 h-9 opacity-0 pointer-events-none" />
      </header>

      {/* Diagnostics / Gaps warning */}
      {activeTab === 'todo' && gaps.length > 0 && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 z-10 mb-4 animate-fade-in">
          <h2 className="text-xs font-extrabold text-amber-400 uppercase tracking-wide">Lacunes identifiées</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {gaps.map(g => (
              <Badge key={g.id} variant="outline" className="text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-300">
                {GAP_LABELS[g.category as keyof typeof GAP_LABELS]}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Tabs Filter Bar (style screenshot: capsule sliders) */}
      <div className="w-full flex items-center bg-white/5 border border-white/10 rounded-2xl p-1 z-10 mb-6">
        {[
          { id: 'todo', label: 'À faire', count: assignedPaths.length },
          { id: 'open', label: 'Découvrir', count: openPaths.length },
          { id: 'done', label: 'Terminés', count: completedPaths.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all duration-300 relative',
              activeTab === tab.id
                ? 'bg-emerald-500 text-[#071008] shadow-md shadow-emerald-500/10'
                : 'text-white/60 hover:text-white'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn('ml-1 text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0',
                activeTab === tab.id ? 'bg-[#071008] text-emerald-400' : 'bg-white/10 text-white'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content scroll box */}
      <div className="flex-1 w-full space-y-6 overflow-y-auto no-scrollbar z-10">
        {activeTab === 'todo' && (
          assignedPaths.length === 0 ? (
            <div className="text-center py-12 text-sm text-white/40 bg-white/5 border border-white/10 rounded-3xl">
              <GraduationCap className="w-10 h-10 mx-auto text-white/20 mb-3" />
              Aucun parcours assigné.
            </div>
          ) : (
            assignedPaths.map(path => (
              <div key={path.id} className="space-y-3 animate-fade-in">
                <PathHeader path={path} progress={progressFor(path.id)} />
                <div className="space-y-4">
                  {modulesFor(path.id).map(mod => (
                    <ModuleCard
                      key={mod.id}
                      mod={mod}
                      done={completedIds.has(mod.id)}
                      onComplete={completeModule}
                      completingId={completingId}
                    />
                  ))}
                </div>
              </div>
            ))
          )
        )}

        {activeTab === 'open' && (
          openPaths.length === 0 ? (
            <div className="text-center py-12 text-sm text-white/40 bg-white/5 border border-white/10 rounded-3xl">
              <BookOpen className="w-10 h-10 mx-auto text-white/20 mb-3" />
              Aucun parcours libre disponible.
            </div>
          ) : (
            openPaths.map(path => (
              <div key={path.id} className="space-y-3 animate-fade-in">
                <PathHeader path={path} progress={progressFor(path.id)} />
                <div className="space-y-4">
                  {modulesFor(path.id).map(mod => (
                    <ModuleCard
                      key={mod.id}
                      mod={mod}
                      done={completedIds.has(mod.id)}
                      onComplete={completeModule}
                      completingId={completingId}
                    />
                  ))}
                </div>
              </div>
            ))
          )
        )}

        {activeTab === 'done' && (
          completedPaths.length === 0 ? (
            <div className="text-center py-12 text-sm text-white/40 bg-white/5 border border-white/10 rounded-3xl">
              <CheckCircle2 className="w-10 h-10 mx-auto text-white/20 mb-3" />
              Aucun cours complété pour le moment.
            </div>
          ) : (
            completedPaths.map(path => (
              <div key={path.id} className="space-y-3 animate-fade-in">
                <PathHeader path={path} progress={100} />
                <div className="space-y-4">
                  {modulesFor(path.id).map(mod => (
                    <ModuleCard
                      key={mod.id}
                      mod={mod}
                      done={true}
                      onComplete={completeModule}
                      completingId={completingId}
                    />
                  ))}
                </div>
              </div>
            ))
          )
        )}
      </div>

    </div>
  );
}

function PathHeader({ path, progress }: { path: TrainingPath; progress: number }) {
  return (
    <div className="px-1 space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <h3 className="font-display font-bold text-sm text-white">{path.name}</h3>
        {path.target_gap_category && (
          <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            {GAP_LABELS[path.target_gap_category]}
          </Badge>
        )}
        {path.voice_part && (
          <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-white/10 bg-white/5 text-white/70">
            {VOICE_LABELS[path.voice_part]}
          </Badge>
        )}
      </div>
      {path.description && <p className="text-[10px] text-white/45">{path.description}</p>}
      <div className="flex items-center gap-2 pt-1">
        <Progress value={progress} className="h-1 flex-1 bg-white/5" style={{ color: '#10b981' }} />
        <span className="text-[9px] font-extrabold text-emerald-450 shrink-0">{progress}%</span>
      </div>
    </div>
  );
}

function ModuleCard({
  mod, done, onComplete, completingId
}: {
  mod: TrainingModule;
  done: boolean;
  onComplete: (mod: TrainingModule) => void;
  completingId: string | null;
}) {
  const isVideo = !!mod.resource_url;
  const ytThumb = mod.resource_url ? getYoutubeThumbnail(mod.resource_url) : null;

  return (
    <div className="rounded-3xl border border-white/5 bg-white/5 overflow-hidden p-4 space-y-3.5 hover:bg-white/[0.04] transition-all">
      {/* Thumbnail (Video Play Cover, style screenshot) */}
      {isVideo ? (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-[#0a0d14] border border-white/5 flex items-center justify-center group cursor-pointer"
          onClick={() => mod.resource_url && window.open(mod.resource_url, '_blank')}>
          {ytThumb ? (
            <img src={ytThumb} alt={mod.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 flex flex-col items-center justify-center">
              <span className="text-white/40 text-[10px]">Aperçu vidéo indisponible</span>
            </div>
          )}
          
          {/* Play Icon Circle Overlay */}
          <div className="absolute inset-0 bg-black/35 flex items-center justify-center group-hover:bg-black/45 transition-colors">
            <div className="w-11 h-11 rounded-full bg-emerald-500 text-[#071008] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            </div>
          </div>
          
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-emerald-500 text-[#071008] text-[9px] font-black tracking-wider uppercase">
            COURS VIDÉO
          </div>
        </div>
      ) : (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gradient-to-tr from-emerald-500/10 to-emerald-400/10 border border-white/5 flex flex-col items-center justify-center p-4">
          <GraduationCap className="w-7 h-7 text-emerald-400 mb-2 animate-pulse" />
          <span className="text-white/50 text-[9px] uppercase font-black tracking-wider">Module théorique</span>
        </div>
      )}

      {/* Title & Desc */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-bold text-sm text-white line-clamp-1">{mod.title}</h4>
          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            +{mod.xp_reward} XP
          </span>
        </div>
        {mod.content && (
          <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed">
            {mod.content}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center gap-2">
          {mod.resource_url && (
            <a
              href={mod.resource_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-white hover:bg-white/10 transition-colors"
            >
              Regarder le cours
            </a>
          )}
          {mod.lesson_id && (
            <Link
              href={`/lecon/${mod.lesson_id}`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-[#071008] text-[11px] font-bold hover:bg-emerald-400 transition-colors"
            >
              Faire l'exercice
            </Link>
          )}
        </div>
        
        {!done && (
          <button
            onClick={() => onComplete(mod)}
            disabled={completingId === mod.id}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white text-black text-[11px] font-bold hover:bg-white/90 disabled:opacity-50 transition-colors"
          >
            {completingId === mod.id ? 'Validation...' : 'Marquer comme terminé'}
          </button>
        )}
      </div>
    </div>
  );
}
