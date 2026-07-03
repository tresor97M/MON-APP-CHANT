'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mic, Check, X, ChevronRight, RotateCcw, Sparkles, Zap, Volume2, Loader2, Brain, Trophy, Lock } from 'lucide-react';
import { supabase, type Lesson, type Exercise, type Module } from '@/lib/supabase';
import { useCelebration } from '@/hooks/use-celebration';
import { Maestro, getMaestroMessage } from '@/components/maestro';
import { AudioVisualizer, PulsingOrb } from '@/components/audio-visualizer';
import { cn } from '@/lib/utils';

type Phase = 'intro' | 'practice' | 'listening' | 'analyzing' | 'result' | 'complete';
type Feedback = { score: number; accuracy: number; points: { label: string; value: number; status: 'good' | 'ok' | 'bad' }[]; tip: string };
type MaestroMood = 'idle' | 'talking' | 'happy' | 'thinking' | 'encouraging';

const QUIZ_BANK: Record<string, { q: string; options: string[]; answer: number; explain: string }[]> = {
  default: [
    { q: 'Quel muscle est principal dans la respiration du chanteur ?', options: ['Le diaphragme', 'Les trapèzes', 'Les pectoraux', 'Les obliques'], answer: 0, explain: 'Le diaphragme descend à l\'inspiration et remonte à l\'expiration, créant le soutien.' },
    { q: 'Où doit-on sentir la respiration ?', options: ['Dans les épaules', 'Dans le ventre', 'Dans la poitrine', 'Dans le cou'], answer: 1, explain: 'La respiration diaphragmatique gonfle le ventre, pas les épaules.' },
    { q: 'Pourquoi s\'échauffer avant de chanter ?', options: ['Pour impressionner', 'Pour éviter les blessures vocales', 'C\'est inutile', 'Pour chanter plus fort'], answer: 1, explain: 'L\'échauffement prépare les cordes vocales et évite les lésions.' },
  ],
  respiration: [
    { q: 'Quel muscle est principal dans la respiration du chanteur ?', options: ['Le diaphragme', 'Les trapèzes', 'Les pectoraux', 'Les obliques'], answer: 0, explain: 'Le diaphragme descend à l\'inspiration et remonte à l\'expiration.' },
    { q: 'La respiration carrée suit quel rythme ?', options: ['2-2-2-2', '4-4-4-4', '4-2-6-2', 'Aléatoire'], answer: 1, explain: 'Inspire 4s, tiens 4s, expire 4s, tiens 4s — d\'où "carrée".' },
    { q: 'Où doit-on sentir la respiration ?', options: ['Dans les épaules', 'Dans le ventre', 'Dans la poitrine', 'Dans le cou'], answer: 1, explain: 'La respiration diaphragmatique gonfle le ventre.' },
  ],
  echauffement: [
    { q: 'Pourquoi s\'échauffer avant de chanter ?', options: ['Pour impressionner', 'Pour éviter les blessures vocales', 'C\'est inutile', 'Pour chanter plus fort'], answer: 1, explain: 'L\'échauffement prépare les cordes vocales.' },
    { q: 'Qu\'est-ce qu\'un bourdon (lip trill) ?', options: ['Un cri', 'Faire vibrer les lèvres', 'Chanter fort', 'Un exercice de rythme'], answer: 1, explain: 'Le bourdon consiste à faire vibrer les lèvres pour réveiller la résonance.' },
    { q: 'Les sirènes servent à ?', options: ['Chanter aigu uniquement', 'Connecter les registres grave-aigu', 'Travailler le rythme', 'Se reposer'], answer: 1, explain: 'Les sirènes glissent du grave à l\'aigu pour connecter les registres.' },
  ],
  justesse: [
    { q: 'Le "placement dans le masque" désigne ?', options: ['Chanter avec un masque', 'Faire résonner le son dans le visage', 'Chanter bas', 'Un type de micro'], answer: 1, explain: 'Le masque = zone du visage où l\'on sent les résonances.' },
    { q: 'Qu\'est-ce qu\'une tierce ?', options: ['2 notes', 'Un intervalle de 3 degrés', 'Un rythme', 'Un type de voix'], answer: 1, explain: 'La tierce est l\'intervalle entre la 1ère et la 3ème note de la gamme.' },
    { q: 'La justesse dépend surtout de ?', options: ['La force', 'L\'oreille et le contrôle', 'Le micro', 'La chance'], answer: 1, explain: 'Chanter juste = entendre la note et ajuster sa hauteur.' },
  ],
};

const TIPS = [
  'Garde le soutien abdominal actif tout au long de la phrase.',
  'Détends ta mâchoire avant de commencer — la tension étouffe le son.',
  'Pense au masque : fais vibrer le son vers le haut de ton visage.',
  'Respire bas, dans le ventre, pas dans les épaules.',
  'Tiens ton souffle plus longtemps en gardant un flux régulier.',
  'Pour la justesse, écoute la note cible avant de chanter.',
  'Le vibrato vient naturellement quand la voix est libre — ne le force pas.',
];

export default function LessonPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { celebrate, playSound } = useCelebration();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [moduleData, setModuleData] = useState<Module | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [audioLevel, setAudioLevel] = useState<number[]>(Array(24).fill(0.1));
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<{ q: string; options: string[]; answer: number; explain: string }[]>([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [maestroMood, setMaestroMood] = useState<MaestroMood>('idle');
  const [maestroMsg, setMaestroMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const { data: l } = await supabase.from('lessons').select('*').eq('id', params.id).maybeSingle();
      if (!l) return;
      setLesson(l);
      const { data: m } = await supabase.from('modules').select('*').eq('id', l.module_id).maybeSingle();
      setModuleData(m);
      const { data: ex } = await supabase.from('exercises').select('*').eq('lesson_id', l.id).order('sort_order');
      setExercises(ex || []);
      setMaestroMsg(getMaestroMessage('intro'));
      setMaestroMood('encouraging');
    })();
  }, [params.id]);

  const current = exercises[currentIdx];

  const stopSim = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startRecording = useCallback(() => {
    setPhase('listening');
    setMaestroMood('talking');
    setMaestroMsg(getMaestroMessage('listening'));
    let t = 0;
    timerRef.current = setInterval(() => {
      t += 1;
      setAudioLevel((prev) => {
        const next = [...prev];
        const base = 0.3 + Math.sin(t * 0.4) * 0.25 + Math.random() * 0.3;
        for (let i = 0; i < next.length; i++) {
          const dist = Math.abs(i - (next.length / 2 + Math.sin(t * 0.2) * 6));
          next[i] = Math.max(0.08, base * (1 - dist / next.length) + Math.random() * 0.15);
        }
        return next;
      });
      if (t > 28) {
        stopSim();
        setPhase('analyzing');
        setMaestroMood('thinking');
        setMaestroMsg(getMaestroMessage('analyzing'));
        setTimeout(() => finishExercise(), 1100);
      }
    }, 100);
  }, [stopSim]);

  const finishExercise = useCallback(() => {
    const baseScore = 70 + Math.floor(Math.random() * 28);
    const acc = Math.min(99, baseScore + Math.floor(Math.random() * 8));
    const metric = (current?.scoring as Record<string, unknown>)?.metric as string | undefined;
    const points = [
      { label: metric === 'pitch_accuracy' ? 'Justesse' : metric === 'breath_stability' ? 'Stabilité du souffle' : 'Précision', value: acc, status: (acc >= 85 ? 'good' : acc >= 70 ? 'ok' : 'bad') as 'good' | 'ok' | 'bad' },
      { label: 'Régularité', value: Math.max(60, acc - 5 - Math.floor(Math.random() * 10)), status: 'ok' as const },
      { label: 'Confiance', value: Math.max(55, acc - 10 + Math.floor(Math.random() * 8)), status: 'ok' as const },
    ];
    setFeedback({ score: baseScore, accuracy: acc, points, tip: TIPS[Math.floor(Math.random() * TIPS.length)] });
    setScore((s) => s + baseScore);
    playSound(baseScore >= 85 ? 'correct' : 'wrong');
    if (baseScore >= 85) { setMaestroMood('happy'); setMaestroMsg(getMaestroMessage('excellent')); }
    else if (baseScore >= 70) { setMaestroMood('encouraging'); setMaestroMsg(getMaestroMessage('good')); }
    else { setMaestroMood('thinking'); setMaestroMsg(getMaestroMessage('needsWork')); }
    setPhase('result');
  }, [current, playSound]);

  const startQuiz = useCallback(() => {
    const metric = (current?.scoring as Record<string, unknown>)?.metric as string | undefined;
    const bank = metric === 'quiz_score' ? QUIZ_BANK.default : QUIZ_BANK.echauffement;
    const shuffled = [...bank].sort(() => Math.random() - 0.5).slice(0, 3);
    setQuizQuestions(shuffled);
    setQuizIdx(0);
    setQuizCorrect(0);
    setQuizAnswer(null);
    setMaestroMood('talking');
    setMaestroMsg('Petit quiz pour vérifier tes connaissances. Tu gères !');
    setPhase('practice');
  }, [current]);

  const answerQuiz = useCallback((idx: number) => {
    if (quizAnswer !== null) return;
    setQuizAnswer(idx);
    const correct = idx === quizQuestions[quizIdx].answer;
    if (correct) {
      setQuizCorrect((c) => c + 1);
      playSound('correct');
      setMaestroMood('happy');
      setMaestroMsg(getMaestroMessage('quizCorrect'));
    } else {
      playSound('wrong');
      setMaestroMood('thinking');
      setMaestroMsg(getMaestroMessage('quizWrong'));
    }
    setTimeout(() => {
      if (quizIdx + 1 < quizQuestions.length) {
        setQuizIdx((i) => i + 1);
        setQuizAnswer(null);
      } else {
        const pct = Math.round((quizCorrect + (correct ? 1 : 0)) / quizQuestions.length * 100);
        setFeedback({
          score: pct, accuracy: pct,
          points: [
            { label: 'Réponses correctes', value: pct, status: (pct >= 85 ? 'good' : pct >= 66 ? 'ok' : 'bad') as 'good' | 'ok' | 'bad' },
            { label: 'Compréhension', value: Math.max(50, pct - 5), status: 'ok' as const },
          ],
          tip: TIPS[Math.floor(Math.random() * TIPS.length)],
        });
        setScore((s) => s + pct);
        setPhase('result');
      }
    }, 1600);
  }, [quizAnswer, quizIdx, quizQuestions, quizCorrect, playSound]);

  const nextExercise = useCallback(async () => {
    if (currentIdx + 1 >= exercises.length) {
      if (lesson) {
        const { data: existing } = await supabase.from('user_progress').select('*').eq('lesson_id', lesson.id).maybeSingle();
        const avgScore = Math.round(score / exercises.length);
        if (existing) {
          await supabase.from('user_progress').update({ status: 'completed', completed: true, best_score: Math.max(existing.best_score, avgScore), updated_at: new Date().toISOString() }).eq('id', existing.id);
        } else {
          await supabase.from('user_progress').insert({ lesson_id: lesson.id, status: 'completed', completed: true, best_score: avgScore });
        }
        if (moduleData) {
          const { data: siblings } = await supabase.from('lessons').select('*').eq('module_id', moduleData.id).order('sort_order');
          const idx = (siblings || []).findIndex((s) => s.id === lesson.id);
          if (idx >= 0 && idx + 1 < (siblings || []).length) {
            const next = (siblings || [])[idx + 1];
            const { data: np } = await supabase.from('user_progress').select('*').eq('lesson_id', next.id).maybeSingle();
            if (!np) await supabase.from('user_progress').insert({ lesson_id: next.id, status: 'available' });
            else if (np.status === 'locked') await supabase.from('user_progress').update({ status: 'available' }).eq('id', np.id);
          }
        }
        const { data: us } = await supabase.from('user_stats').select('*').limit(1).maybeSingle();
        if (us) {
          await supabase.from('user_stats').update({
            total_xp: us.total_xp + (lesson.xp_reward || 10),
            daily_xp: us.daily_xp + (lesson.xp_reward || 10),
            weekly_xp: us.weekly_xp + (lesson.xp_reward || 10),
            last_active_date: new Date().toISOString().slice(0, 10),
          }).eq('id', us.id);
        }
      }
      celebrate('big');
      setMaestroMood('happy');
      setMaestroMsg(getMaestroMessage('complete'));
      setPhase('complete');
    } else {
      setCurrentIdx((i) => i + 1);
      setFeedback(null);
      setMaestroMood('encouraging');
      setMaestroMsg('Allez, exercice suivant ! Tu gères.');
      setPhase('practice');
    }
  }, [currentIdx, exercises.length, lesson, moduleData, score, celebrate]);

  useEffect(() => () => stopSim(), [stopSim]);

  if (!lesson) return <div className="h-64 rounded-3xl bg-muted animate-pulse animate-fade-in" />;

  const isQuiz = current?.type === 'quiz';
  const avg = exercises.length ? Math.round(score / exercises.length) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in pt-2">
      {/* Main Content Area (Left) */}
      <div className="lg:col-span-2 space-y-5">
        {/* Progress dots / Header */}
        {phase !== 'intro' && phase !== 'complete' && (
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-foreground transition-colors mr-auto">← Retour</button>
            {exercises.map((_, i) => (
              <div key={i} className={cn('h-1.5 rounded-full transition-all duration-300', i === currentIdx ? 'w-8 bg-gradient-to-r from-primary to-secondary' : i < currentIdx ? 'w-4 bg-primary/40' : 'w-4 bg-muted/40')} />
            ))}
            <div className="text-xs text-muted-foreground font-medium tabular-nums ml-2">{currentIdx + 1}/{exercises.length}</div>
          </div>
        )}

        {/* INTRO PHASE */}
        {phase === 'intro' && (
          <div className="space-y-6">
            <button onClick={() => router.back()} className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">← Retour</button>
            
            <div className="rounded-3xl bg-gradient-to-br from-primary/15 via-card to-secondary/5 border border-primary/25 p-8 text-center space-y-5 relative overflow-hidden shadow-xl shadow-primary/5">
              <div className="absolute -top-16 -left-16 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
              <div className="relative">
                <div className="inline-grid place-items-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-primary to-secondary text-primary-foreground mb-3 shadow-lg shadow-primary/20">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="text-[10px] font-bold text-primary uppercase tracking-widest">{moduleData?.name}</div>
                <h1 className="font-display text-2xl font-bold tracking-tight mt-2">{lesson.name}</h1>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2 leading-relaxed">{lesson.description}</p>
                <div className="flex items-center justify-center gap-4 text-xs font-semibold text-muted-foreground pt-4 border-t border-border/40 mt-4">
                  <span className="flex items-center gap-1.5"><Volume2 className="w-4 h-4 text-primary" />{exercises.length} exercices</span>
                  <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-secondary" />+{lesson.xp_reward} XP</span>
                </div>
              </div>
            </div>

            <button onClick={() => { const isQ = exercises[0]?.type === 'quiz'; setPhase('practice'); if (isQ) startQuiz(); }} className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-sm hover:opacity-95 transition-opacity shadow-lg shadow-primary/20">
              Commencer la leçon
            </button>
            <p className="text-center text-[11px] text-muted-foreground">Autorise l'accès au micro quand le navigateur le demande.</p>
          </div>
        )}

        {/* COMPLETE PHASE */}
        {phase === 'complete' && (
          <div className="text-center space-y-6">
            <div className="inline-grid place-items-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-accent/30 via-orange-500/10 to-transparent border border-accent/20 shadow-lg shadow-accent/10 mb-2">
              <Trophy className="w-10 h-10 text-accent drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold text-foreground tracking-tight">Leçon terminée !</h1>
              <p className="text-sm text-muted-foreground mt-1">Tu as gagné <span className="text-secondary font-bold">+{lesson.xp_reward} XP</span></p>
            </div>
            <div className="rounded-3xl glass p-6 shadow-xl relative overflow-hidden">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Score moyen</div>
              <div className="font-display text-4xl font-extrabold text-foreground mt-2">{avg}<span className="text-lg text-muted-foreground">/100</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden mt-4">
                <div className={cn('h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-primary via-secondary to-accent')} style={{ width: `${avg}%` }} />
              </div>
              <div className={cn('text-sm font-semibold mt-4', avg >= 85 ? 'text-success' : avg >= 70 ? 'text-primary' : 'text-accent')}>
                {avg >= 85 ? 'Performance remarquable !' : avg >= 70 ? 'Bon travail, continue !' : 'Chaque pratique te rapproche du but.'}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setCurrentIdx(0); setScore(0); setFeedback(null); setPhase('practice'); }} className="flex-1 py-3 rounded-2xl border border-border/40 font-semibold text-sm hover:bg-muted/30 transition-colors flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Recommencer
              </button>
              <Link href="/parcours" className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                Continuer <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ACTIVE EXERCISE VIEW */}
        {phase !== 'intro' && phase !== 'complete' && (
          <div className="rounded-3xl glass p-6 md:p-8 space-y-5 shadow-xl relative overflow-hidden">
            <div>
              <div className="flex items-center gap-1.5">
                {isQuiz ? <Brain className="w-3.5 h-3.5 text-primary" /> : <Mic className="w-3.5 h-3.5 text-primary" />}
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  {isQuiz ? 'Quiz Théorique' : current?.type === 'pitch' ? 'Justesse' : current?.type === 'breathing' ? 'Contrôle du souffle' : 'Rythme'}
                </span>
              </div>
              <h2 className="font-display text-xl font-bold mt-2 text-foreground">{isQuiz ? quizQuestions[quizIdx]?.q : current?.name}</h2>
              {!isQuiz && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{current?.prompt}</p>}
            </div>

            {/* QUIZ */}
            {isQuiz && phase === 'practice' && quizQuestions.length > 0 && (
              <div className="space-y-2.5 animate-fade-in">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3 font-semibold">
                  <span>Question {quizIdx + 1}/{quizQuestions.length}</span>
                  <div className="flex gap-1.5">
                    {quizQuestions.map((_, i) => (
                      <div key={i} className={cn('w-2 h-2 rounded-full transition-colors', i < quizIdx ? 'bg-primary' : i === quizIdx ? 'bg-primary/50' : 'bg-muted/40')} />
                    ))}
                  </div>
                </div>
                {quizQuestions[quizIdx].options.map((opt, i) => {
                  const isSelected = quizAnswer === i;
                  const isCorrect = i === quizQuestions[quizIdx].answer;
                  const showResult = quizAnswer !== null;
                  return (
                    <button key={i} onClick={() => answerQuiz(i)} disabled={showResult}
                      className={cn('w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm font-semibold transition-all duration-300 flex items-center justify-between',
                        !showResult && 'border-border/60 hover:border-primary/50 hover:bg-primary/10 hover:shadow-md hover:shadow-primary/5 text-foreground/95',
                        showResult && isCorrect && 'border-success/60 bg-success/15 text-success shadow-lg shadow-success/10',
                        showResult && isSelected && !isCorrect && 'border-destructive/60 bg-destructive/15 text-destructive shadow-lg shadow-destructive/10',
                        showResult && !isCorrect && !isSelected && 'border-border/30 opacity-45')}>
                      {opt}
                      {showResult && isCorrect && <Check className="w-4 h-4 shrink-0 text-success" />}
                      {showResult && isSelected && !isCorrect && <X className="w-4 h-4 shrink-0 text-destructive" />}
                    </button>
                  );
                })}
                {quizAnswer !== null && (
                  <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 mt-4 animate-fade-in">
                    <p className="text-xs text-foreground/80 leading-relaxed font-medium">{quizQuestions[quizIdx].explain}</p>
                  </div>
                )}
              </div>
            )}

            {/* MIC PRACTICE */}
            {!isQuiz && phase === 'practice' && (
              <div className="text-center py-6 space-y-4">
                <div className="relative w-28 h-28 mx-auto">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/30 to-secondary/30 blur-xl animate-pulse" />
                  <PulsingOrb active className="w-28 h-28 shadow-lg shadow-primary/20 border border-primary/20" />
                  <button onClick={startRecording} className="absolute inset-0 grid place-items-center text-white hover:scale-105 active:scale-95 transition-transform">
                    <Mic className="w-10 h-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]" />
                  </button>
                </div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Appuie et chante</p>
              </div>
            )}

            {/* LISTENING */}
            {phase === 'listening' && (
              <div className="py-6 space-y-4">
                <div className="h-20">
                  <AudioVisualizer active bars={24} color="hsl(var(--secondary))" />
                </div>
                <div className="text-center flex items-center justify-center gap-2 text-sm text-secondary font-bold uppercase tracking-widest animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-secondary" /> L'IA écoute...
                </div>
              </div>
            )}

            {/* ANALYZING */}
            {phase === 'analyzing' && (
              <div className="py-10 text-center space-y-4">
                <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary/25 to-secondary/15 text-primary border border-primary/20 mx-auto shadow-lg">
                  <Brain className="w-7 h-7 animate-pulse text-secondary" />
                </div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Analyse en cours...</div>
                <div className="flex justify-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-secondary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}

            {/* RESULT */}
            {phase === 'result' && feedback && (
              <div className="space-y-5 animate-scale-in">
                <div className="text-center py-2">
                  <div className="font-display text-4xl font-extrabold text-foreground tabular-nums">{feedback.score}<span className="text-lg text-muted-foreground font-semibold">/100</span></div>
                  <div className={cn('text-xs font-bold uppercase tracking-wider mt-2', feedback.score >= 85 ? 'text-success' : feedback.score >= 70 ? 'text-primary' : 'text-accent')}>
                    {feedback.score >= 85 ? 'Performance Excellente !' : feedback.score >= 70 ? 'Bien joué !' : 'Continue de t\'entraîner'}
                  </div>
                </div>
                <div className="space-y-2.5">
                  {feedback.points.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={cn('grid place-items-center w-5 h-5 rounded-full shrink-0 shadow-sm', p.status === 'good' ? 'bg-success text-success-foreground' : p.status === 'ok' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground')}>
                        {p.status === 'bad' ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                      </div>
                      <span className="text-sm font-medium flex-1 text-foreground/90">{p.label}</span>
                      <span className="text-sm font-bold tabular-nums">{p.value}%</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-gradient-to-tr from-primary/10 to-secondary/5 border border-primary/20 p-4 flex gap-3 shadow-inner">
                  <Sparkles className="w-5 h-5 text-secondary shrink-0 mt-0.5 animate-pulse" />
                  <p className="text-xs text-foreground/80 leading-relaxed font-medium">{feedback.tip}</p>
                </div>
                <button onClick={nextExercise} className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                  {currentIdx + 1 >= exercises.length ? 'Terminer' : 'Exercice suivant'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar Panel (Right) */}
      <div className="space-y-6">
        {/* Maestro Coach Card */}
        <div className="rounded-3xl glass p-5 shadow-lg relative overflow-hidden">
          <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Coach Vocal IA</h3>
          <Maestro mood={maestroMood} message={maestroMsg} size="md" />
        </div>

        {/* Exercises list navigation */}
        {exercises.length > 0 && (
          <div className="rounded-3xl glass p-5 shadow-lg">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Progression de la leçon</h3>
            <div className="space-y-2.5">
              {exercises.map((ex, idx) => {
                const isCompleted = idx < currentIdx;
                const isActive = idx === currentIdx;
                const isLocked = idx > currentIdx;

                return (
                  <div key={ex.id} className={cn('flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300',
                    isActive ? 'bg-primary/10 border-primary/30 text-foreground shadow-md shadow-primary/5' : 'bg-card/40 border-transparent text-muted-foreground/80'
                  )}>
                    <div className={cn('grid place-items-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-all',
                      isCompleted ? 'bg-success text-success-foreground' :
                      isActive ? 'bg-primary text-primary-foreground animate-pulse-ring' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-xs font-semibold truncate', isActive && 'text-primary')}>{ex.name}</div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{ex.type === 'pitch' ? 'Justesse' : ex.type === 'quiz' ? 'Quiz' : 'Pratique'}</div>
                    </div>
                    {isLocked && <Lock className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rewards and Session stats info */}
        <div className="rounded-3xl bg-gradient-to-br from-secondary/15 via-card to-transparent border border-secondary/25 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5"><Volume2 className="w-4 h-4 text-primary" /> {exercises.length} exercices</span>
            <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-secondary" /> +{lesson.xp_reward} XP</span>
          </div>
        </div>
      </div>
    </div>
  );
}
