'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, GraduationCap, Trash2, Loader2, UserPlus, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import {
  GAP_LABELS, VOICE_LABELS,
  type GapCategory, type TrainingAssignment, type TrainingModule, type TrainingPath, type VoicePart,
} from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminFormationPage() {
  const { user } = useAuth();
  const [paths, setPaths] = useState<TrainingPath[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [hymns, setHymns] = useState<{ id: string; title: string; number: number }[]>([]);
  const [lessons, setLessons] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Dialog parcours
  const [pathDialog, setPathDialog] = useState(false);
  const [pathForm, setPathForm] = useState({ name: '', description: '', target: '' as GapCategory | '', voice: '' as VoicePart | '', is_open: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulaire module inline
  const [moduleForm, setModuleForm] = useState({ title: '', content: '', xp: '20', hymnId: '', lessonId: '' });

  // Affectation
  const [assignUserId, setAssignUserId] = useState('');

  // Dialog leçon & exercice vocal custom
  const [exerciseLessonDialog, setExerciseLessonDialog] = useState(false);
  const [newLessonName, setNewLessonName] = useState('');
  const [newExercisePrompt, setNewExercisePrompt] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const load = useCallback(async () => {
    const [pathRes, modRes, assignRes, memRes, hymnRes, lessonRes] = await Promise.all([
      supabase.from('training_paths').select('*').order('created_at', { ascending: false }),
      supabase.from('training_modules').select('*').order('sort_order'),
      supabase.from('training_assignments').select('*'),
      supabase.from('user_profiles').select('*').order('display_name'),
      supabase.from('hymns').select('id, title, number').order('number'),
      supabase.from('lessons').select('id, name').order('name'),
    ]);
    setPaths(pathRes.data || []);
    setModules(modRes.data || []);
    setAssignments(assignRes.data || []);
    setMembers((memRes.data as UserProfile[]) || []);
    setHymns(hymnRes.data || []);
    setLessons(lessonRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createPath = async () => {
    if (!pathForm.name.trim()) {
      setError('Le nom est obligatoire.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: e } = await supabase.from('training_paths').insert({
      name: pathForm.name.trim(),
      description: pathForm.description.trim() || null,
      target_gap_category: pathForm.target || null,
      voice_part: pathForm.voice || null,
      is_open: pathForm.is_open,
      created_by: user?.id || null,
    });
    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    setPathForm({ name: '', description: '', target: '', voice: '', is_open: true });
    setPathDialog(false);
    load();
  };

  const deletePath = async (p: TrainingPath) => {
    if (!confirm(`Supprimer le parcours « ${p.name} » ? Modules et affectations seront supprimés.`)) return;
    await supabase.from('training_paths').delete().eq('id', p.id);
    load();
  };

  const addModule = async (path: TrainingPath) => {
    if (!moduleForm.title.trim()) return;
    const pathModules = modules.filter(m => m.path_id === path.id);
    await supabase.from('training_modules').insert({
      path_id: path.id,
      title: moduleForm.title.trim(),
      content: moduleForm.content.trim() || null,
      xp_reward: Number(moduleForm.xp) || 20,
      sort_order: pathModules.length,
      hymn_id: moduleForm.hymnId || null,
      lesson_id: moduleForm.lessonId || null,
    });
    setModuleForm({ title: '', content: '', xp: '20', hymnId: '', lessonId: '' });
    load();
  };

  const deleteModule = async (m: TrainingModule) => {
    await supabase.from('training_modules').delete().eq('id', m.id);
    load();
  };

  const assign = async (path: TrainingPath) => {
    if (!assignUserId) return;
    await supabase.from('training_assignments').upsert(
      { path_id: path.id, user_id: assignUserId, assigned_by: user?.id || null },
      { onConflict: 'path_id,user_id' },
    );
    setAssignUserId('');
    load();
  };

  const unassign = async (a: TrainingAssignment) => {
    await supabase.from('training_assignments').delete().eq('id', a.id);
    load();
  };

  const createExerciseLesson = async () => {
    if (!newLessonName.trim() || !audioFile || !user) return;
    setUploadingAudio(true);

    try {
      // 1. Upload du fichier audio de référence
      const fileExt = audioFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('exercise-audios')
        .upload(filePath, audioFile, { contentType: audioFile.type });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Erreur lors de l\'upload du fichier audio : ' + uploadError.message);
        setUploadingAudio(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('exercise-audios')
        .getPublicUrl(filePath);

      const audioUrl = urlData.publicUrl;

      // Trouver le premier module d'apprentissage lié à notre parcours (ou un module par défaut)
      // On lie la leçon au premier module ou si l'admin l'affecte plus tard
      // Pour être simple et direct, nous insérons un nouveau module d'apprentissage de type "Chant sur Modèle"
      // ou nous créons simplement la leçon et l'exercice, puis nous permettons à l'admin de le lier !
      // Mais attendons ! Si on crée la leçon, on l'ajoute à la table "lessons".
      // La table "lessons" a besoin d'un "module_id" de type public.modules (qui représente un module interactif du parcours)!
      // Voyons si on a un module_id dans la table "lessons" de public.
      // Oui! lessons references public.modules(id).
      // Dans le seed:
      // Les modules de practice (ex: Respiration & Soutien, Justesse Vocale) ont des ID fixes.
      // Donc, nous pouvons lier la leçon à un des modules interactifs (ex: '33333333-3333-3333-3333-333333333332' pour Justesse Vocale)!
      // Lisons les modules interactifs existants (de la table public.modules, pas training_modules)!
      // Ah! Dans les données chargées, on a déjà "lessons" chargées (const [lessons, setLessons] = useState(...)).
      // Mais on n'a pas chargé les "modules" de practice!
      // En fait, dans `seed_data.sql`, le module "Justesse Vocale" a l'id: `33333333-3333-3333-3333-333333333332`.
      // Nous pouvons simplement charger la liste des modules de practice ou lier par défaut au premier module de practice trouvé!
      // Chargeons les modules de practice dans la fonction `load()`.
      // Ou plus simplement, chargeons-les lors de l'appel pour trouver le premier module de practice.
      
      const { data: practiceModules } = await supabase
        .from('modules')
        .select('id, name')
        .limit(1);
      
      const practiceModuleId = practiceModules && practiceModules.length > 0 
        ? practiceModules[0].id 
        : '33333333-3333-3333-3333-333333333332'; // Justesse Vocale ID par défaut

      // 2. Insérer la leçon interactif
      const { data: newLesson, error: lessonError } = await supabase
        .from('lessons')
        .insert({
          module_id: practiceModuleId,
          name: newLessonName.trim(),
          description: 'Écoutez le modèle audio et chantez pour reproduire la mélodie.',
          xp_reward: 25,
          sort_order: 10,
        })
        .select()
        .single();

      if (lessonError || !newLesson) {
        console.error('Lesson creation error:', lessonError);
        alert('Erreur lors de la création de la leçon : ' + lessonError?.message);
        setUploadingAudio(false);
        return;
      }

      // 3. Insérer l'exercice lié à la leçon
      const { error: exerciseError } = await supabase
        .from('exercises')
        .insert({
          lesson_id: newLesson.id,
          name: `Modèle : ${audioFile.name.split('.')[0]}`,
          type: 'pitch',
          prompt: newExercisePrompt.trim() || 'Écoutez attentivement le modèle vocal puis chantez pour le reproduire avec justesse.',
          target: { audio_url: audioUrl, is_custom_audio: true },
          scoring: { metric: 'pitch_similarity' },
          sort_order: 0,
        });

      if (exerciseError) {
        console.error('Exercise creation error:', exerciseError);
        alert('Erreur lors de la création de l\'exercice : ' + exerciseError?.message);
        setUploadingAudio(false);
        return;
      }

      alert('Leçon et exercice créés avec succès ! Vous pouvez maintenant la lier à vos modules de formation.');
      setNewLessonName('');
      setNewExercisePrompt('');
      setAudioFile(null);
      setExerciseLessonDialog(false);
      load(); // recharger la liste des leçons pour la liaison
    } catch (err) {
      console.error(err);
      alert('Une erreur inattendue est survenue.');
    } finally {
      setUploadingAudio(false);
    }
  };

  const memberName = (id: string) => {
    const m = members.find(x => x.user_id === id);
    return m?.display_name || m?.email || 'Membre';
  };

  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-muted-foreground';
  const labelCls = 'text-xs font-semibold text-muted-foreground';

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Formation et remise à niveau</h1>
          <p className="text-sm text-muted-foreground">Créez des parcours ciblés et affectez-les aux choristes selon leurs lacunes</p>
        </div>
        <button
          type="button"
          onClick={() => setPathDialog(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Nouveau parcours
        </button>
      </header>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : paths.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
          <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-muted text-muted-foreground">
            <GraduationCap className="w-6 h-6" />
          </div>
          <p className="text-sm text-muted-foreground">Aucun parcours. Créez le premier parcours de formation.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paths.map(p => {
            const pathModules = modules.filter(m => m.path_id === p.id);
            const pathAssignments = assignments.filter(a => a.path_id === p.id);
            const expanded = expandedId === p.id;
            return (
              <article key={p.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="p-5 flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display font-bold text-foreground">{p.name}</h2>
                      {p.target_gap_category && (
                        <Badge variant="outline" className="text-[10px]">{GAP_LABELS[p.target_gap_category]}</Badge>
                      )}
                      {p.voice_part && (
                        <Badge variant="outline" className="text-[10px]">{VOICE_LABELS[p.voice_part]}</Badge>
                      )}
                      <Badge variant="outline" className={cn('text-[10px]', p.is_open ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200')}>
                        {p.is_open ? 'Libre accès' : 'Sur affectation'}
                      </Badge>
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                    <p className="text-xs text-muted-foreground">
                      {pathModules.length} module{pathModules.length > 1 ? 's' : ''} · {pathAssignments.length} choriste{pathAssignments.length > 1 ? 's' : ''} affecté{pathAssignments.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : p.id)}
                      className={cn(
                        'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors',
                        expanded ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-primary/50',
                      )}
                    >
                      Gérer <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePath(p)}
                      aria-label={`Supprimer ${p.name}`}
                      className="grid place-items-center w-9 h-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-border bg-muted/20 p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Modules */}
                    <section className="space-y-3">
                      <h3 className="text-sm font-bold text-foreground">Modules</h3>
                      {pathModules.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Aucun module.</p>
                      ) : (
                        <ol className="space-y-1.5">
                          {pathModules.map((m, i) => (
                            <li key={m.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                              <span className="grid place-items-center w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0">{i + 1}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground truncate">{m.title}</p>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  <span className="text-[10px] text-muted-foreground">+{m.xp_reward} XP</span>
                                  {m.hymn_id && (
                                    <Badge variant="outline" className="text-[8px] bg-sky-500/10 text-sky-400 border-sky-500/20 py-0 px-1 font-medium">
                                      Cantique lié
                                    </Badge>
                                  )}
                                  {m.lesson_id && (
                                    <Badge variant="outline" className="text-[8px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 py-0 px-1 font-medium">
                                      Cours lié
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteModule(m)}
                                aria-label={`Supprimer le module ${m.title}`}
                                className="grid place-items-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </li>
                          ))}
                        </ol>
                      )}
                      <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
                        <input
                          type="text"
                          value={moduleForm.title}
                          onChange={e => setModuleForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="Titre du module"
                          aria-label="Titre du module"
                          className={inputCls}
                        />
                        <textarea
                          value={moduleForm.content}
                          onChange={e => setModuleForm(f => ({ ...f, content: e.target.value }))}
                          placeholder="Contenu / consignes (optionnel)"
                          aria-label="Contenu du module"
                          rows={2}
                          className={inputCls}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className={labelCls}>Lier un cantique (optionnel)</label>
                            <select
                              value={moduleForm.hymnId}
                              onChange={e => setModuleForm(f => ({ ...f, hymnId: e.target.value }))}
                              className={inputCls}
                            >
                              <option value="">— Aucun cantique —</option>
                              {hymns.map(h => (
                                <option key={h.id} value={h.id}>
                                  N°{h.number} - {h.title}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <label className={labelCls}>Lier un cours / exercice (optionnel)</label>
                              <button
                                type="button"
                                onClick={() => setExerciseLessonDialog(true)}
                                className="text-[10px] text-primary hover:underline font-bold"
                              >
                                + Créer Exercice Vocal
                              </button>
                            </div>
                            <select
                              value={moduleForm.lessonId}
                              onChange={e => setModuleForm(f => ({ ...f, lessonId: e.target.value }))}
                              className={inputCls}
                            >
                              <option value="">— Aucun cours / exercice —</option>
                              {lessons.map(l => (
                                <option key={l.id} value={l.id}>
                                  {l.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="number"
                            value={moduleForm.xp}
                            onChange={e => setModuleForm(f => ({ ...f, xp: e.target.value }))}
                            aria-label="XP du module"
                            className={cn(inputCls, 'w-24')}
                          />
                          <span className="text-xs text-muted-foreground">XP</span>
                          <button
                            type="button"
                            onClick={() => addModule(p)}
                            disabled={!moduleForm.title.trim()}
                            className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" /> Ajouter
                          </button>
                        </div>
                      </div>
                    </section>

                    {/* Affectations */}
                    <section className="space-y-3">
                      <h3 className="text-sm font-bold text-foreground">Choristes affectés</h3>
                      {pathAssignments.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Aucun choriste affecté.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {pathAssignments.map(a => (
                            <li key={a.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                              <span className="text-sm font-medium text-foreground flex-1 truncate">{memberName(a.user_id)}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {a.status === 'termine' ? 'Terminé' : a.status === 'en_cours' ? 'En cours' : 'Assigné'}
                              </Badge>
                              <button
                                type="button"
                                onClick={() => unassign(a)}
                                aria-label={`Retirer ${memberName(a.user_id)}`}
                                className="grid place-items-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex gap-2">
                        <select
                          value={assignUserId}
                          onChange={e => setAssignUserId(e.target.value)}
                          aria-label="Choisir un choriste à affecter"
                          className={inputCls}
                        >
                          <option value="">— Choisir un choriste —</option>
                          {members
                            .filter(m => !pathAssignments.some(a => a.user_id === m.user_id))
                            .map(m => (
                              <option key={m.user_id} value={m.user_id}>
                                {m.display_name || m.email}{m.voice_part ? ` (${VOICE_LABELS[m.voice_part as VoicePart]})` : ''}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => assign(p)}
                          disabled={!assignUserId}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Affecter
                        </button>
                      </div>
                    </section>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Dialog nouveau parcours */}
      <Dialog open={pathDialog} onOpenChange={setPathDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Nouveau parcours</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="path-name" className={labelCls}>Nom *</label>
              <input id="path-name" type="text" value={pathForm.name} onChange={e => setPathForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Remise à niveau justesse" />
            </div>
            <div className="space-y-1">
              <label htmlFor="path-desc" className={labelCls}>Description</label>
              <textarea id="path-desc" value={pathForm.description} onChange={e => setPathForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="path-target" className={labelCls}>Lacune ciblée</label>
                <select id="path-target" value={pathForm.target} onChange={e => setPathForm(f => ({ ...f, target: e.target.value as GapCategory | '' }))} className={inputCls}>
                  <option value="">— Aucune —</option>
                  {Object.entries(GAP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="path-voice" className={labelCls}>Pupitre cible</label>
                <select id="path-voice" value={pathForm.voice} onChange={e => setPathForm(f => ({ ...f, voice: e.target.value as VoicePart | '' }))} className={inputCls}>
                  <option value="">— Tous —</option>
                  {Object.entries(VOICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={pathForm.is_open}
                onChange={e => setPathForm(f => ({ ...f, is_open: e.target.checked }))}
                className="w-4 h-4 rounded border-border accent-[hsl(var(--primary))]"
              />
              Libre accès (visible par tous les choristes)
            </label>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPathDialog(false)} className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                Annuler
              </button>
              <button type="button" onClick={createPath} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Créer
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Création de Leçon/Exercice Vocal avec Audio */}
      <Dialog open={exerciseLessonDialog} onOpenChange={setExerciseLessonDialog}>
        <DialogContent className="max-w-md bg-[#0a0d14] border border-white/10 text-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-base font-bold">Nouveau cours / exercice de chant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-white/80 text-xs font-semibold">Titre de la leçon *</label>
              <input
                type="text"
                placeholder="Ex. Justesse unisson, Exercice de vocalise..."
                value={newLessonName}
                onChange={(e) => setNewLessonName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-[#B686EC] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-white/80 text-xs font-semibold">Consignes de l'exercice</label>
              <textarea
                placeholder="Ex. Écoutez attentivement le modèle vocal puis reproduisez-le en chantant..."
                value={newExercisePrompt}
                onChange={(e) => setNewExercisePrompt(e.target.value)}
                rows={2}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-[#B686EC] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-white/80 text-xs font-semibold">Fichier audio de référence (Modèle) *</label>
              <div className="flex flex-col gap-2 p-3 rounded-2xl border border-dashed border-white/10 bg-white/5 items-center justify-center">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="exercise-audio-upload"
                />
                <label
                  htmlFor="exercise-audio-upload"
                  className="flex flex-col items-center gap-1 cursor-pointer text-center"
                >
                  <span className="text-xl">🎵</span>
                  <span className="text-xs font-bold text-primary hover:underline">Importer un fichier audio</span>
                  <span className="text-[10px] text-white/40">Formats supportés : MP3, WAV, M4A</span>
                </label>
                {audioFile && (
                  <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                    Fichier sélectionné : {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} Mo)
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExerciseLessonDialog(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/5 transition-colors text-white/70"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={createExerciseLesson}
                disabled={uploadingAudio || !newLessonName.trim() || !audioFile}
                className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-[#071008] rounded-xl text-xs font-bold hover:opacity-95 disabled:opacity-50 transition-opacity shadow-lg shadow-primary/20 flex items-center gap-1.5"
              >
                {uploadingAudio && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {uploadingAudio ? 'Création...' : 'Créer l\'exercice'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
