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

function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  let sum = 0;
  for (let i = 0; i < SIZE; i++) {
    sum += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sum / SIZE);
  if (rms < 0.005) return -1; // Volume trop faible

  let r1 = 0, r2 = SIZE - 1;
  const thres = 0.15;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
  }
  for (let i = SIZE - 1; i >= SIZE / 2; i--) {
    if (Math.abs(buffer[i]) < thres) { r2 = i; break; }
  }

  const buf = buffer.subarray(r1, r2);
  const len = buf.length;
  if (len < 64) return -1;

  const correlations = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < len - i; j++) {
      correlations[i] += buf[j] * buf[j + i];
    }
  }

  let d = 0;
  while (correlations[d] > correlations[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < len; i++) {
    if (correlations[i] > maxval) {
      maxval = correlations[i];
      maxpos = i;
    }
  }

  let T0 = maxpos;
  return sampleRate / T0;
}

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
  
  // Real-time pitch states
  const [detectedPitch, setDetectedPitch] = useState<number | null>(null);
  const [detectedNoteName, setDetectedNoteName] = useState<string>('');
  const [centsOff, setCentsOff] = useState<number>(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioDataRef = useRef<number[]>([]);

  // Speech synthesis for Coach Maestro
  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      const voices = window.speechSynthesis.getVoices();
      const frVoice = voices.find(v => v.lang.startsWith('fr') || v.lang.startsWith('FR'));
      if (frVoice) utterance.voice = frVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  const playReferenceTone = (hz: number) => {
    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = hz;
      
      gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.3);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 1.3);
    }
  };

  const getExerciseTargetHz = () => {
    const name = current?.name?.toLowerCase() || '';
    if (name.includes('do3') || name.includes('c3')) return 130.81;
    if (name.includes('do4') || name.includes('c4')) return 261.63;
    if (name.includes('sol3') || name.includes('g3')) return 196.00;
    if (name.includes('la3') || name.includes('a3')) return 220.00;
    if (name.includes('mi3') || name.includes('e3')) return 164.81;
    return 220.00;
  };

  useEffect(() => {
    if (maestroMsg && phase !== 'complete') {
      speakText(maestroMsg);
    }
  }, [maestroMsg, phase]);

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

      // Chargement dynamique des questions de quiz
      const { data: quiz } = await supabase.from('quiz_questions').select('*').eq('lesson_id', l.id);
      if (quiz && quiz.length > 0) {
        const formatted = quiz.map((q: any) => ({
          q: q.question,
          options: q.options,
          answer: q.correct_answer_index,
          explain: q.explanation
        }));
        setQuizQuestions(formatted);
      } else {
        const modName = m?.name?.toLowerCase() || '';
        const bankKey = modName.includes('respiration') ? 'respiration' :
                        modName.includes('justesse') ? 'justesse' :
                        modName.includes('vibrato') ? 'justesse' : 'default';
        const bank = QUIZ_BANK[bankKey] || QUIZ_BANK.default;
        setQuizQuestions(bank);
      }
    })();
  }, [params.id]);

  const current = exercises[currentIdx];

  const stopSim = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const finishExercise = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    const data = audioDataRef.current;
    audioDataRef.current = [];

    const averageVolume = data.length ? data.reduce((a, b) => a + b, 0) / data.length : 0;
    
    if (averageVolume < 3) {
      setFeedback({
        score: 15,
        accuracy: 10,
        points: [
          { label: 'Détection vocale', value: 0, status: 'bad' },
          { label: 'Régularité du flux', value: 0, status: 'bad' },
          { label: 'Intensité sonore', value: 0, status: 'bad' }
        ],
        tip: 'Le micro n\'a détecté aucun son. Assurez-vous d\'autoriser le micro et de chanter/souffler bien fort !'
      });
      setScore((s) => s + 15);
      playSound('wrong');
      setMaestroMood('thinking');
      setMaestroMsg('Aïe, je n\'ai rien entendu ! Veux-tu réessayer ?');
      setPhase('result');
      return;
    }

    const variance = data.reduce((acc, val) => acc + Math.pow(val - averageVolume, 2), 0) / data.length;
    const stability = Math.max(10, Math.min(100, Math.round(100 - (variance * 0.45))));
    const volumeMatch = Math.max(10, Math.min(100, Math.round(100 - Math.abs(30 - averageVolume) * 1.6)));

    const baseScore = Math.round((stability * 0.6) + (volumeMatch * 0.4));
    const acc = Math.min(99, baseScore + Math.floor(Math.random() * 4));

    const metric = (current?.scoring as Record<string, unknown>)?.metric as string | undefined;
    const points = [
      { label: metric === 'pitch_accuracy' ? 'Précision de la hauteur' : 'Régularité diaphragmatique', value: stability, status: (stability >= 75 ? 'good' : 'ok') as 'good' | 'ok' },
      { label: 'Contrôle du débit d\'air', value: volumeMatch, status: (volumeMatch >= 75 ? 'good' : 'ok') as 'good' | 'ok' },
      { label: 'Intensité de l\'effort', value: acc, status: (acc >= 75 ? 'good' : 'ok') as 'good' | 'ok' }
    ];

    setFeedback({ score: baseScore, accuracy: acc, points, tip: TIPS[Math.floor(Math.random() * TIPS.length)] });
    setScore((s) => s + baseScore);
    
    // Enregistrement de la tentative physique dans Supabase
    if (current?.id) {
      supabase.from('attempts').insert({
        exercise_id: current.id,
        score: baseScore,
        accuracy: acc,
        duration_ms: 4000,
        feedback: { stability, volumeMatch }
      }).then(({ error }) => {
        if (error) console.error('Erreur lors de l\'enregistrement de la tentative :', error.message);
      });
    }

    playSound(baseScore >= 75 ? 'correct' : 'wrong');
    if (baseScore >= 80) { setMaestroMood('happy'); setMaestroMsg(getMaestroMessage('excellent')); }
    else if (baseScore >= 65) { setMaestroMood('encouraging'); setMaestroMsg(getMaestroMessage('good')); }
    else { setMaestroMood('thinking'); setMaestroMsg(getMaestroMessage('needsWork')); }
    setPhase('result');
  }, [current, playSound]);

  const startRecording = useCallback(async () => {
    setPhase('listening');
    setMaestroMood('talking');
    setMaestroMsg(getMaestroMessage('listening'));
    
    audioDataRef.current = [];
    setDetectedPitch(null);
    setDetectedNoteName('');
    setCentsOff(0);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024; // Augmenter fftSize pour une meilleure précision du pitch
      source.connect(analyser);
      analyserRef.current = analyser;

      let t = 0;
      timerRef.current = setInterval(() => {
        t += 1;
        
        if (analyserRef.current) {
          // 1. Calcul du volume (RMS)
          const timeData = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteTimeDomainData(timeData);
          
          let sum = 0;
          for (let i = 0; i < timeData.length; i++) {
            const val = (timeData[i] - 128) / 128;
            sum += val * val;
          }
          const rms = Math.sqrt(sum / timeData.length);
          const volume = Math.min(100, Math.round(rms * 300));
          audioDataRef.current.push(volume);

          // 2. Calcul du Pitch en autocorrélation
          const buffer = new Float32Array(analyserRef.current.fftSize);
          analyserRef.current.getFloatTimeDomainData(buffer);
          const pitch = autoCorrelate(buffer, audioCtx.sampleRate);
          
          if (pitch !== -1 && rms > 0.015) {
            setDetectedPitch(Math.round(pitch));
            
            // Conversion fréquence en note musicale midi
            const noteNum = 12 * (Math.log(pitch / 440) / Math.log(2));
            const noteIndex = Math.round(noteNum) + 69;
            const notes = ["Do", "Do#", "Ré", "Ré#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
            const noteName = notes[noteIndex % 12] + (Math.floor(noteIndex / 12) - 1);
            setDetectedNoteName(noteName);
            
            // Calcul de la déviation en Cents
            const targetNotePitch = 440 * Math.pow(2, (noteIndex - 69) / 12);
            const cents = Math.floor(1200 * Math.log(pitch / targetNotePitch) / Math.log(2));
            setCentsOff(Math.max(-50, Math.min(50, cents)));
          } else {
            setDetectedPitch(null);
            setDetectedNoteName('');
            setCentsOff(0);
          }

          setAudioLevel((prev) => {
            const next = [...prev];
            for (let i = 0; i < next.length; i++) {
              next[i] = Math.max(0.08, (rms * 2.5) + Math.random() * 0.12);
            }
            return next;
          });
        }

        if (t > 40) { // 4 secondes de capture réelle
          stopSim();
          setPhase('analyzing');
          setMaestroMood('thinking');
          setMaestroMsg(getMaestroMessage('analyzing'));
          setTimeout(() => finishExercise(), 1200);
        }
      }, 100);

    } catch (err) {
      console.error('Accès micro refusé ou impossible :', err);
      // Fallback simulation propre
      let t = 0;
      timerRef.current = setInterval(() => {
        t += 1;
        setAudioLevel((prev) => {
          const next = [...prev];
          const base = 0.3 + Math.sin(t * 0.4) * 0.2 + Math.random() * 0.25;
          for (let i = 0; i < next.length; i++) {
            next[i] = Math.max(0.08, base * (1 - Math.abs(i - 12) / 24) + Math.random() * 0.1);
          }
          return next;
        });
        if (t > 30) {
          stopSim();
          setPhase('analyzing');
          setMaestroMood('thinking');
          setMaestroMsg(getMaestroMessage('analyzing'));
          setTimeout(() => finishExercise(), 1100);
        }
      }, 100);
    }
  }, [stopSim, finishExercise]);

  const startQuiz = useCallback(() => {
    if (quizQuestions.length === 0) {
      const metric = (current?.scoring as Record<string, unknown>)?.metric as string | undefined;
      const bank = metric === 'quiz_score' ? QUIZ_BANK.default : QUIZ_BANK.echauffement;
      setQuizQuestions(bank);
    }
    setQuizIdx(0);
    setQuizCorrect(0);
    setQuizAnswer(null);
    setMaestroMood('talking');
    setMaestroMsg('Petit quiz pour vérifier tes connaissances. Tu gères !');
    setPhase('practice');
  }, [current, quizQuestions.length]);

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

        // Enregistrement de la tentative de quiz dans Supabase
        if (current?.id) {
          supabase.from('attempts').insert({
            exercise_id: current.id,
            score: pct,
            accuracy: pct,
            duration_ms: 8000,
            feedback: { quizCorrect: quizCorrect + (correct ? 1 : 0), totalQuestions: quizQuestions.length }
          }).then(({ error }) => {
            if (error) console.error('Erreur lors de l\'enregistrement de la tentative de quiz :', error.message);
          });
        }

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

            {/* LISTENING & PITCH HIGHWAY (Yousician style) */}
            {phase === 'listening' && (
              <div className="py-4 space-y-6 animate-fade-in">
                {/* Note target & audio cue */}
                <div className="flex items-center justify-between border-b border-border/40 pb-3 gap-2">
                  <div className="text-left">
                    <span className="text-[10px] text-muted-foreground font-semibold block uppercase tracking-wider">Note Cible</span>
                    <span className="font-display text-base font-bold text-foreground">
                      {current?.name?.includes('Do3') || current?.name?.includes('C3') ? 'Do3 (130.8 Hz)' :
                       current?.name?.includes('Do4') || current?.name?.includes('C4') ? 'Do4 (261.6 Hz)' :
                       current?.name?.includes('Sol3') || current?.name?.includes('G3') ? 'Sol3 (196.0 Hz)' :
                       current?.name?.includes('La3') || current?.name?.includes('A3') ? 'La3 (220.0 Hz)' :
                       'Note de référence (220 Hz)'}
                    </span>
                  </div>
                  <button 
                    onClick={() => playReferenceTone(getExerciseTargetHz())}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold hover:bg-primary/20 transition-all"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Entendre le ton
                  </button>
                </div>

                {/* Pitch Display Center */}
                <div className="text-center py-2 space-y-2">
                  <div className="relative inline-grid place-items-center w-24 h-24 rounded-full bg-slate-900 border-4 border-slate-800 shadow-xl mx-auto overflow-hidden">
                    {/* Ring glowing color depending on pitch closeness */}
                    <div className={cn('absolute inset-0 opacity-20 blur-md transition-all duration-300', 
                      detectedPitch ? (Math.abs(centsOff) <= 12 ? 'bg-success' : centsOff < 0 ? 'bg-cyan-500' : 'bg-orange-500') : 'bg-transparent'
                    )} />
                    <div className="relative z-10 text-center">
                      <div className="font-display text-3xl font-extrabold text-white tracking-tight tabular-nums">
                        {detectedNoteName || '---'}
                      </div>
                      <div className="text-[9px] text-white/50 font-semibold tracking-wider uppercase mt-0.5">
                        {detectedPitch ? `${detectedPitch} Hz` : 'Chantez...'}
                      </div>
                    </div>
                  </div>

                  {/* Pitch Guidance Text */}
                  <div className="text-xs font-bold uppercase tracking-wider h-4">
                    {detectedPitch ? (
                      Math.abs(centsOff) <= 12 ? (
                        <span className="text-success animate-pulse">Parfaitement Juste ! ✨</span>
                      ) : centsOff < 0 ? (
                        <span className="text-cyan-500">Trop bas ↑ (montez le ton)</span>
                      ) : (
                        <span className="text-orange-500">Trop haut ↓ (baissez le ton)</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">Émission d'un son stable attendue</span>
                    )}
                  </div>
                </div>

                {/* Cents Offset Tuning Meter */}
                <div className="space-y-2">
                  <div className="relative h-4 rounded-full bg-slate-100 border border-border overflow-hidden">
                    {/* Graduations & Center mark */}
                    <div className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-400 z-10" />
                    
                    {/* Glowing sweet spot zone */}
                    <div className="absolute inset-y-0 left-[38%] right-[38%] bg-success/15 border-x border-success/10" />
                    
                    {/* Moving needle cursor */}
                    {detectedPitch && (
                      <div 
                        className={cn('absolute top-0.5 bottom-0.5 w-3 rounded-full shadow-md z-20 -ml-1.5 transition-all duration-150',
                          Math.abs(centsOff) <= 12 ? 'bg-success shadow-success/40' : centsOff < 0 ? 'bg-cyan-500 shadow-cyan-500/40' : 'bg-orange-500 shadow-orange-500/40'
                        )}
                        style={{ left: `${((centsOff + 50) / 100) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground font-bold uppercase tracking-widest px-1">
                    <span>Trop bas</span>
                    <span className={cn(detectedPitch && Math.abs(centsOff) <= 12 ? 'text-success' : 'text-slate-400')}>{detectedPitch && Math.abs(centsOff) <= 12 ? 'Juste' : 'Zône cible'}</span>
                    <span>Trop haut</span>
                  </div>
                </div>

                {/* Volume Level Spectrogram */}
                <div className="space-y-1.5">
                  <div className="h-10">
                    <AudioVisualizer active bars={24} color={detectedPitch && Math.abs(centsOff) <= 12 ? 'hsl(var(--success))' : 'hsl(var(--secondary))'} />
                  </div>
                  <div className="text-center flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" /> Analyse en cours...
                  </div>
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
