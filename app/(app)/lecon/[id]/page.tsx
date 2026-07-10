'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mic, Check, X, ChevronRight, RotateCcw, Sparkles, Zap, Volume2, Loader2, Brain, Trophy, Lock } from 'lucide-react';
import { supabase, type Lesson, type Exercise, type Module } from '@/lib/supabase';
import { useCelebration } from '@/hooks/use-celebration';
import { useAuth } from '@/hooks/use-auth';
import { Maestro, getMaestroMessage } from '@/components/maestro';
import { AudioVisualizer, PulsingOrb } from '@/components/audio-visualizer';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { cn, levelForXp } from '@/lib/utils';
import {
  autoCorrelate, hzToMidi, hzToNoteName, computePitchAccuracy, playPianoTone,
  playVoiceTone, playVibratoExample, playMelodySequence, playHarmonyChord,
  playBreathingGuide, buildCurveFromNotes, type BreathingPhase,
} from '@/lib/pitch';

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
  const { user } = useAuth();
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
  const [tolerance, setTolerance] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isPlayingExample, setIsPlayingExample] = useState(false);
  const [hasListenedToExample, setHasListenedToExample] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<BreathingPhase | null>(null);

  const current = exercises[currentIdx];
  const toleranceCents = tolerance === 'easy' ? 45 : tolerance === 'medium' ? 25 : 12;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pitchHistoryRef = useRef<{ cents: number; just: boolean }[]>([]); // fenêtre glissante (50 pts) pour le rendu canvas
  const fullPitchHistoryRef = useRef<{ cents: number; just: boolean }[]>([]); // historique complet (non tronqué) pour le scoring
  const userPitchCurveRef = useRef<number[]>([]);
  const refAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingRefAudio, setIsPlayingRefAudio] = useState(false);
  const [refPitchCurve, setRefPitchCurve] = useState<number[]>([]);
  const [decodingRef, setDecodingRef] = useState(false);

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

  const getExerciseTargetHz = () => {
    // target_pitch_hz est le nom historique (voir seed_data.sql) ; target_hz
    // est accepté aussi pour la nouvelle configuration plus générique.
    const configuredHz = (current?.target as any)?.target_pitch_hz ?? (current?.target as any)?.target_hz;
    if (typeof configuredHz === 'number' && configuredHz > 0) return configuredHz;

    const name = current?.name?.toLowerCase() || '';
    if (name.includes('do3') || name.includes('c3')) return 130.81;
    if (name.includes('do4') || name.includes('c4')) return 261.63;
    if (name.includes('sol3') || name.includes('g3')) return 196.00;
    if (name.includes('la3') || name.includes('a3')) return 220.00;
    if (name.includes('mi3') || name.includes('e3')) return 164.81;
    return 220.00;
  };

  // Durée d'enregistrement (secondes) : configurée par exercice (15s-60s
  // selon la tâche), avec des valeurs par défaut sensées par type plutôt
  // qu'un unique 4 secondes fixe pour tous les exercices.
  const getExerciseDurationSec = () => {
    const configured = (current?.target as any)?.duration_sec;
    if (typeof configured === 'number' && configured > 0) return configured;
    switch (current?.type) {
      case 'breathing': return 20;
      case 'melody': case 'vocalise': return 30;
      case 'harmony': return 25;
      case 'vibrato': return 20;
      case 'pitch': default: return 15;
    }
  };

  const getExerciseNotesHz = (): number[] => {
    // `sequence` est le nom historique (voir seed_data.sql, exercice "Saut
    // d'Octave"), `notes_hz` le nom générique pour les nouveaux exercices.
    const configured = (current?.target as any)?.sequence ?? (current?.target as any)?.notes_hz;
    if (Array.isArray(configured) && configured.length > 0) return configured;
    const root = getExerciseTargetHz();
    // Motif de secours : gamme 1-2-3-4-5-4-3-2-1 (vocalise classique) sur la note cible.
    const steps = [0, 2, 4, 5, 7, 5, 4, 2, 0];
    return steps.map((s) => root * Math.pow(2, s / 12));
  };

  const getExerciseNoteDurationSec = () => {
    const configured = (current?.target as any)?.duration_per_note ?? (current?.target as any)?.note_duration_sec;
    if (typeof configured === 'number' && configured > 0) return configured;
    return 0.55;
  };

  const getExerciseChordHz = (): number[] => {
    const configured = (current?.target as any)?.chord_hz;
    if (Array.isArray(configured) && configured.length > 0) return configured;
    const root = getExerciseTargetHz();
    // Accord parfait majeur de secours (fondamentale, tierce, quinte).
    return [root, root * Math.pow(2, 4 / 12), root * Math.pow(2, 7 / 12)];
  };

  const getBreathingPattern = () => {
    const configured = (current?.target as any)?.pattern;
    if (configured && typeof configured.inhale === 'number') return configured;
    return { inhale: 4, hold: 4, exhale: 6 };
  };

  /** Joue l'exemple adapté au type de l'exercice courant, sur la même interface, avant l'enregistrement. */
  const playCurrentExample = async () => {
    if (!current || isPlayingExample) return;
    setIsPlayingExample(true);
    try {
      switch (current.type) {
        case 'vibrato':
          await playVibratoExample(getExerciseTargetHz());
          break;
        case 'breathing': {
          const legacyPattern = (current.target as any)?.pattern;
          if (typeof legacyPattern === 'string') {
            // Format historique (voir seed_data.sql) : un exercice = une seule
            // phase ('inhale' | 'hold' | 'exhale_s'), pas un cycle complet.
            const isHold = legacyPattern === 'hold';
            const isExhale = legacyPattern.startsWith('exhale');
            setBreathingPhase(isHold ? 'hold' : isExhale ? 'exhale' : 'inhale');
            await playVoiceTone(isHold ? 523.25 : isExhale ? 261.63 : 392, 0.6);
            await new Promise((r) => setTimeout(r, getExerciseDurationSec() * 1000));
          } else {
            await playBreathingGuide(getBreathingPattern(), (ph) => setBreathingPhase(ph));
          }
          setBreathingPhase(null);
          break;
        }
        case 'melody':
        case 'vocalise':
          await playMelodySequence(getExerciseNotesHz(), getExerciseNoteDurationSec());
          break;
        case 'harmony':
          await playHarmonyChord(getExerciseChordHz(), 2.5);
          break;
        case 'pitch':
        default: {
          // Un exercice "pitch" peut être une note tenue OU une courte
          // séquence (ex: saut d'octave) — on joue les deux au piano.
          const seq = getExerciseNotesHz();
          const rawSequence = (current.target as any)?.sequence ?? (current.target as any)?.notes_hz;
          if (Array.isArray(rawSequence) && rawSequence.length > 1) {
            for (const hz of seq) await playPianoTone(hz, getExerciseNoteDurationSec());
          } else {
            await playPianoTone(getExerciseTargetHz());
          }
          break;
        }
      }
    } finally {
      setIsPlayingExample(false);
      setHasListenedToExample(true);
    }
  };

  const EXAMPLE_LABELS: Record<string, { icon: string; listen: string; hint: string }> = {
    pitch: { icon: '🎹', listen: 'Écouter la note au piano', hint: 'Écoute la note de référence avant de chanter, pour viser juste.' },
    vibrato: { icon: '🎤', listen: 'Écouter l\'exemple avec vibrato', hint: 'Repère l\'oscillation régulière de la hauteur, puis reproduis-la.' },
    breathing: { icon: '🫁', listen: 'Écouter le guide de respiration', hint: 'Suis le rythme inspire / tiens / expire indiqué par les repères sonores.' },
    melody: { icon: '🎵', listen: 'Écouter la mélodie modèle', hint: 'Mémorise la phrase mélodique avant de la chanter.' },
    vocalise: { icon: '🎼', listen: 'Écouter le motif de vocalise', hint: 'Reproduis exactement l\'enchaînement de notes joué.' },
    harmony: { icon: '🎶', listen: 'Écouter l\'accord d\'harmonisation', hint: 'Chante ta note pour compléter l\'accord que tu entends.' },
  };
  const exampleInfo = EXAMPLE_LABELS[current?.type || 'pitch'] || EXAMPLE_LABELS.pitch;

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

  useEffect(() => {
    // Nettoyer le lecteur audio précédent
    if (refAudioPlayerRef.current) {
      refAudioPlayerRef.current.pause();
      refAudioPlayerRef.current = null;
      setIsPlayingRefAudio(false);
    }

    // Toute cible à plusieurs notes sans fichier audio uploadé (mélodie,
    // vocalise, ou un exercice "pitch" historique avec une séquence comme
    // le saut d'octave) : on synthétise une courbe de référence à partir de
    // la suite de notes cible (même format que la courbe décodée d'un vrai
    // fichier), pour réutiliser le même rendu et le même scoring.
    const rawSequence = (current?.target as any)?.sequence ?? (current?.target as any)?.notes_hz;
    const hasMultiNoteTarget = Array.isArray(rawSequence) && rawSequence.length > 1;
    if (current && hasMultiNoteTarget && !(current.target as any)?.audio_url) {
      setRefPitchCurve(buildCurveFromNotes(getExerciseNotesHz(), getExerciseNoteDurationSec()));
      return;
    }

    if (!current || current.type !== 'pitch' || !current.target || !(current.target as any).audio_url) {
      setRefPitchCurve([]);
      return;
    }

    const loadRefAudio = async () => {
      setDecodingRef(true);
      try {
        const audioUrl = (current.target as any).audio_url;
        const res = await fetch(audioUrl);
        const arrayBuffer = await res.arrayBuffer();
        
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const tempCtx = new AudioCtx();
        const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
        
        const sampleRate = audioBuffer.sampleRate;
        const rawData = audioBuffer.getChannelData(0);
        
        const numSlices = 80;
        const sliceLength = Math.floor(sampleRate * 0.1);
        const step = Math.floor((rawData.length - sliceLength) / numSlices);
        
        const curve: number[] = [];
        for (let i = 0; i < numSlices; i++) {
          const startIdx = i * step;
          const endIdx = startIdx + sliceLength;
          if (endIdx > rawData.length) break;
          
          const bufferSlice = rawData.subarray(startIdx, endIdx);
          const pitch = autoCorrelate(bufferSlice, sampleRate);
          curve.push(pitch > 0 ? pitch : -1);
        }
        
        setRefPitchCurve(curve);
        tempCtx.close();
      } catch (err) {
        console.error('Error decoding reference pitch:', err);
      } finally {
        setDecodingRef(false);
      }
    };

    loadRefAudio();
  }, [current]);

  const toggleRefAudio = () => {
    if (!current?.target || !(current.target as any).audio_url) return;
    
    if (!refAudioPlayerRef.current) {
      refAudioPlayerRef.current = new Audio((current.target as any).audio_url);
      refAudioPlayerRef.current.onended = () => {
        setIsPlayingRefAudio(false);
      };
    }
    
    if (isPlayingRefAudio) {
      refAudioPlayerRef.current.pause();
      setIsPlayingRefAudio(false);
    } else {
      refAudioPlayerRef.current.currentTime = 0;
      refAudioPlayerRef.current.play().catch(e => console.error(e));
      setIsPlayingRefAudio(true);
    }
  };

  const comparePitchCurves = (userCurve: number[], refCurve: number[]) => {
    if (!refCurve.length || !userCurve.length) return 0;
    
    let matchedNotes = 0;
    let totalNotes = 0;
    
    for (let i = 0; i < refCurve.length; i++) {
      const refHz = refCurve[i];
      if (refHz <= 0) continue;
      
      totalNotes++;
      
      const userIdx = Math.floor((i / refCurve.length) * userCurve.length);
      const userHz = userCurve[userIdx];
      
      if (userHz > 0) {
        const cents = Math.abs(1200 * Math.log2(userHz / refHz));
        if (cents <= toleranceCents) {
          matchedNotes++;
        }
      }
    }
    
    if (totalNotes === 0) return 80;
    return Math.round((matchedNotes / totalNotes) * 100);
  };

  const drawPitchCurve = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Fond sombre et grille
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#090d16'; 
    ctx.fillRect(0, 0, width, height);

    // Calcul de l'échelle des notes MIDI à afficher
    const activeRefMidis = refPitchCurve.filter(hz => hz > 0).map(hzToMidi);
    let minMidi = 60; // Do4 (C4)
    let maxMidi = 72; // Do5 (C5)
    
    if (activeRefMidis.length > 0) {
      minMidi = Math.min(...activeRefMidis) - 3;
      maxMidi = Math.max(...activeRefMidis) + 3;
    } else {
      const targetHz = getExerciseTargetHz();
      const targetMidi = hzToMidi(targetHz);
      minMidi = targetMidi - 5;
      maxMidi = targetMidi + 5;
    }
    
    if (maxMidi - minMidi < 8) {
      const mid = (maxMidi + minMidi) / 2;
      minMidi = Math.floor(mid - 4);
      maxMidi = Math.ceil(mid + 4);
    }
    
    const getMidiY = (midi: number) => {
      const range = maxMidi - minMidi;
      return height - ((midi - minMidi) / range) * height;
    };

    // Dessiner les lignes horizontales de la grille MIDI (demi-tons)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let m = minMidi; m <= maxMidi; m++) {
      const y = getMidiY(m);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // Libellé de note musicale à gauche
      const noteNames = ["Do", "Do#", "Ré", "Ré#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
      const noteLabel = noteNames[m % 12];
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.font = '8px monospace';
      ctx.fillText(noteLabel, 6, y - 2);
    }

    // 2. Dessiner le Tunnel de Note Cible (Mélodie)
    // Une courbe de référence existe soit pour un audio uploadé (pitch),
    // soit pour une mélodie/vocalise synthétisée à partir de notes.
    const hasReferenceCurve = refPitchCurve.length > 0;
    if (hasReferenceCurve) {
      // Dessin des rectangles cibles pour l'audio personnalisé
      const sliceWidth = width / refPitchCurve.length;
      for (let i = 0; i < refPitchCurve.length; i++) {
        const refHz = refPitchCurve[i];
        if (refHz > 0) {
          const refMidi = hzToMidi(refHz);
          const y = getMidiY(refMidi);
          
          ctx.fillStyle = 'rgba(182, 134, 236, 0.15)'; // Mauve/Violet translucide
          ctx.strokeStyle = 'rgba(182, 134, 236, 0.4)';
          ctx.lineWidth = 1;
          
          // Dessiner le bloc de note
          ctx.beginPath();
          ctx.roundRect(i * sliceWidth + 1, y - 8, sliceWidth - 2, 16, 4);
          ctx.fill();
          ctx.stroke();
        }
      }
    } else {
      // Dessin d'un tunnel continu vert pour la fréquence fixe cible
      const targetHz = getExerciseTargetHz();
      const targetMidi = hzToMidi(targetHz);
      const y = getMidiY(targetMidi);
      
      const toleranceHeight = (toleranceCents / 100) * (height / (maxMidi - minMidi));

      ctx.fillStyle = 'rgba(34, 197, 94, 0.08)'; // Vert translucide
      ctx.fillRect(0, y - toleranceHeight, width, toleranceHeight * 2);
      
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y - toleranceHeight);
      ctx.lineTo(width, y - toleranceHeight);
      ctx.moveTo(0, y + toleranceHeight);
      ctx.lineTo(width, y + toleranceHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ligne centrale de la note cible
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Dessiner la trajectoire de l'utilisateur (Particules / Laser)
    const history = pitchHistoryRef.current;
    if (history.length > 0) {
      const targetHz = getExerciseTargetHz();
      const targetMidi = hzToMidi(targetHz);

      const lastIdx = Math.max(1, history.length - 1);
      for (let i = 0; i < history.length; i++) {
        const pt = history[i];

        // Calcul du MIDI réel de l'utilisateur basé sur les cents de déviation
        const refHzAtStep = hasReferenceCurve
          ? refPitchCurve[Math.floor((i / lastIdx) * (refPitchCurve.length - 1))]
          : targetHz;

        if (!refHzAtStep || refHzAtStep <= 0) continue;
        const refMidiAtStep = hzToMidi(refHzAtStep);
        const userMidi = refMidiAtStep + (pt.cents / 100);

        const y = getMidiY(userMidi);
        const x = (i / lastIdx) * width;
        const opacity = (i / lastIdx); // fade in de la trace historique

        // Dessiner chaque point comme une particule lumineuse
        ctx.shadowBlur = pt.just ? 8 : 4;
        ctx.shadowColor = pt.just ? '#22c55e' : '#f97316';
        ctx.fillStyle = pt.just 
          ? `rgba(34, 197, 94, ${opacity})` 
          : `rgba(249, 115, 22, ${opacity})`;
          
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      // Réinitialiser les ombres
      ctx.shadowBlur = 0;

      // Dessiner le curseur actif à l'extrémité
      const lastPoint = history[history.length - 1];
      const refHzLast = hasReferenceCurve
        ? refPitchCurve[refPitchCurve.length - 1]
        : targetHz;

      if (refHzLast > 0) {
        const refMidiLast = hzToMidi(refHzLast);
        const userMidiLast = refMidiLast + (lastPoint.cents / 100);
        const lastY = getMidiY(userMidiLast);
        const lastX = ((history.length - 1) / lastIdx) * width;

        ctx.shadowBlur = 15;
        ctx.shadowColor = lastPoint.just ? '#22c55e' : '#f97316';
        ctx.fillStyle = lastPoint.just ? '#22c55e' : '#f97316';
        
        ctx.beginPath();
        ctx.arc(lastX, lastY, 7, 0, 2 * Math.PI);
        ctx.fill();
        
        // Anneau externe pulsant
        ctx.strokeStyle = lastPoint.just ? 'rgba(34, 197, 94, 0.4)' : 'rgba(249, 115, 22, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 11 + Math.sin(Date.now() / 100) * 2, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
  }, [toleranceCents, refPitchCurve, current]);

  const stopSim = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const detectVibrato = (centsHistory: number[]) => {
    if (centsHistory.length < 20) return { rateHz: 0, depthCents: 0, hasVibrato: false };
    
    const smoothed: number[] = [];
    for (let i = 2; i < centsHistory.length - 2; i++) {
      smoothed.push((centsHistory[i-2] + centsHistory[i-1] + centsHistory[i] + centsHistory[i+1] + centsHistory[i+2]) / 5);
    }
    
    const extrema: { idx: number; type: 'peak' | 'trough'; val: number }[] = [];
    for (let i = 1; i < smoothed.length - 1; i++) {
      if (smoothed[i] > smoothed[i-1] && smoothed[i] > smoothed[i+1]) {
        extrema.push({ idx: i, type: 'peak', val: smoothed[i] });
      } else if (smoothed[i] < smoothed[i-1] && smoothed[i] < smoothed[i+1]) {
        extrema.push({ idx: i, type: 'trough', val: smoothed[i] });
      }
    }
    
    if (extrema.length < 4) return { rateHz: 0, depthCents: 0, hasVibrato: false };
    
    let totalInterval = 0;
    let totalDepth = 0;
    let count = 0;
    
    for (let i = 1; i < extrema.length; i++) {
      const diff = extrema[i].idx - extrema[i-1].idx;
      const depth = Math.abs(extrema[i].val - extrema[i-1].val);
      
      const seconds = diff * 0.1; // 100ms per sample
      const rate = 1 / (seconds * 2);
      
      if (rate >= 4.0 && rate <= 8.0 && depth >= 15 && depth <= 60) {
        totalInterval += rate;
        totalDepth += depth;
        count++;
      }
    }
    
    if (count >= 3) {
      return {
        rateHz: Math.round((totalInterval / count) * 10) / 10,
        depthCents: Math.round(totalDepth / count),
        hasVibrato: true
      };
    }
    
    return { rateHz: 0, depthCents: 0, hasVibrato: false };
  };

  const detectCleanAttack = (centsHistory: number[]) => {
    const activeIdx = centsHistory.findIndex(c => c !== 0);
    if (activeIdx === -1 || activeIdx + 3 >= centsHistory.length) return false;
    
    const firstSamples = centsHistory.slice(activeIdx, activeIdx + 3);
    const maxDeviation = Math.max(...firstSamples.map(Math.abs));
    
    return maxDeviation <= toleranceCents + 10;
  };

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

    // Une courbe de référence existe pour un audio uploadé (pitch) ou une
    // mélodie/vocalise synthétisée à partir de notes cibles.
    const hasReferenceCurve = refPitchCurve.length > 0;
    const isPitchLike = current?.type === 'pitch' || current?.type === 'harmony' || current?.type === 'vibrato';
    const similarityScore = hasReferenceCurve ? comparePitchCurves(userPitchCurveRef.current, refPitchCurve) : -1;
    // Score réel de justesse : comparaison en cents de la courbe de pitch
    // captée en direct contre la note (ou l'accord) de référence.
    const pitchAccuracyScore = isPitchLike ? computePitchAccuracy(fullPitchHistoryRef.current, toleranceCents) : -1;

    const variance = data.reduce((acc, val) => acc + Math.pow(val - averageVolume, 2), 0) / data.length;
    const stability = Math.max(10, Math.min(100, Math.round(100 - (variance * 0.45))));
    const volumeMatch = Math.max(10, Math.min(100, Math.round(100 - Math.abs(30 - averageVolume) * 1.6)));

    // Analyse avancée (Vibrato & Attaque) — sur l'historique complet, pas la fenêtre glissante d'affichage.
    const centsHistory = fullPitchHistoryRef.current.map(h => h.cents);
    const vibrato = detectVibrato(centsHistory);
    const cleanAttack = detectCleanAttack(centsHistory);

    let finalPitchScore: number;
    let primaryLabel: string;
    if (hasReferenceCurve) {
      finalPitchScore = similarityScore;
      primaryLabel = current?.type === 'vocalise' ? 'Précision du motif de vocalise' : 'Similitude de mélodie';
    } else if (current?.type === 'vibrato') {
      // Pour un exercice de vibrato, la qualité du vibrato (régularité du
      // taux ~4-8Hz et de la profondeur ~15-60 cents) prime sur la simple
      // justesse — c'est l'objet même de l'exercice.
      const vibratoQuality = vibrato.hasVibrato
        ? Math.max(40, Math.round(100 - Math.abs(vibrato.rateHz - 6) * 8 - Math.abs(vibrato.depthCents - 35) * 0.5))
        : 20;
      finalPitchScore = Math.round(pitchAccuracyScore * 0.4 + vibratoQuality * 0.6);
      primaryLabel = 'Qualité du vibrato';
    } else if (current?.type === 'harmony') {
      finalPitchScore = pitchAccuracyScore;
      primaryLabel = 'Justesse de la voix d\'harmonie';
    } else if (current?.type === 'pitch') {
      finalPitchScore = pitchAccuracyScore;
      primaryLabel = 'Précision de la hauteur (vs piano)';
    } else {
      finalPitchScore = stability;
      primaryLabel = 'Régularité diaphragmatique';
    }

    const baseScore = Math.round((finalPitchScore * 0.6) + (volumeMatch * 0.4));

    let bonusScore = 0;
    const points: any[] = [
      { label: primaryLabel, value: finalPitchScore, status: (finalPitchScore >= 75 ? 'good' : 'ok') as 'good' | 'ok' },
      { label: 'Contrôle du débit d\'air', value: volumeMatch, status: (volumeMatch >= 75 ? 'good' : 'ok') as 'good' | 'ok' },
    ];

    if (current?.type === 'breathing') {
      const activeFrames = data.filter((v) => v > 8).length;
      const sustainRatio = Math.round((activeFrames / data.length) * 100);
      points.push({ label: 'Tenue du souffle', value: sustainRatio, status: (sustainRatio >= 75 ? 'good' : 'ok') as 'good' | 'ok' });
    }

    // Le vibrato reste une note principale pour l'exercice dédié — on ne
    // le remonte en bonus que pour les autres types (pitch/mélodie...).
    if (current?.type !== 'vibrato' && vibrato.hasVibrato) {
      points.push({ label: `Bonus Vibrato (${vibrato.rateHz} Hz)`, value: 15, status: 'good' });
      bonusScore += 15;
    }
    if (cleanAttack) {
      points.push({ label: 'Bonus Attaque Nette', value: 10, status: 'good' });
      bonusScore += 10;
    }

    const finalScore = Math.min(100, baseScore + bonusScore);
    const acc = finalScore;

    setFeedback({ score: finalScore, accuracy: acc, points, tip: TIPS[Math.floor(Math.random() * TIPS.length)] });

    // Enregistrement de la tentative physique dans Supabase
    if (current?.id) {
      supabase.from('attempts').insert({
        exercise_id: current.id,
        user_id: user?.id,
        score: finalScore,
        accuracy: acc,
        duration_ms: getExerciseDurationSec() * 1000,
        feedback: { stability, pitchAccuracyScore, volumeMatch, hasVibrato: vibrato.hasVibrato, cleanAttack }
      }).then(({ error }) => {
        if (error) console.error('Erreur lors de l\'enregistrement de la tentative :', error.message);
      });
    }

    playSound(finalScore >= 75 ? 'correct' : 'wrong');
    if (finalScore >= 80) { setMaestroMood('happy'); setMaestroMsg(getMaestroMessage('excellent')); }
    else if (finalScore >= 65) { setMaestroMood('encouraging'); setMaestroMsg(getMaestroMessage('good')); }
    else { setMaestroMood('thinking'); setMaestroMsg(getMaestroMessage('needsWork')); }
    setPhase('result');
  }, [current, playSound, refPitchCurve]);

  const startRecording = useCallback(async () => {
    // Nettoyer le lecteur de référence
    if (refAudioPlayerRef.current) {
      refAudioPlayerRef.current.pause();
      setIsPlayingRefAudio(false);
    }

    setPhase('listening');
    setMaestroMood('talking');
    setMaestroMsg(getMaestroMessage('listening'));
    
    audioDataRef.current = [];
    pitchHistoryRef.current = [];
    fullPitchHistoryRef.current = [];
    userPitchCurveRef.current = [];
    setDetectedPitch(null);
    setDetectedNoteName('');
    setCentsOff(0);

    const durationTicks = getExerciseDurationSec() * 10; // 1 tick = 100ms

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024; 
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
            userPitchCurveRef.current.push(pitch);
            setDetectedNoteName(hzToNoteName(pitch));

            // Calcul de la déviation en cents par rapport à la note cible
            const targetHz = getExerciseTargetHz();
            const cents = Math.round(1200 * Math.log2(pitch / targetHz));
            setCentsOff(Math.max(-50, Math.min(50, cents)));

            // Enregistrer dans l'historique (fenêtre glissante pour le dessin + historique complet pour le score)
            const entry = { cents, just: Math.abs(cents) <= toleranceCents };
            pitchHistoryRef.current.push(entry);
            fullPitchHistoryRef.current.push(entry);
          } else {
            setDetectedPitch(null);
            userPitchCurveRef.current.push(-1);
            setDetectedNoteName('');
            setCentsOff(0);
            const entry = { cents: 0, just: false };
            pitchHistoryRef.current.push(entry);
            fullPitchHistoryRef.current.push(entry);
          }

          if (pitchHistoryRef.current.length > 50) {
            pitchHistoryRef.current.shift();
          }

          // Dessiner le Canvas
          drawPitchCurve();

          setAudioLevel((prev) => {
            const next = [...prev];
            for (let i = 0; i < next.length; i++) {
              next[i] = Math.max(0.08, (rms * 2.5) + Math.random() * 0.12);
            }
            return next;
          });
        }

        if (t > durationTicks) {
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
        if (t > durationTicks) {
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
    const finalScore = score + (feedback?.score || 0);
    if (currentIdx + 1 >= exercises.length) {
      if (lesson) {
        const { data: existing } = await supabase.from('user_progress').select('*').eq('lesson_id', lesson.id).maybeSingle();
        const avgScore = Math.round(finalScore / exercises.length);
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
          const newTotalXp = us.total_xp + (lesson.xp_reward || 10);
          const newDailyXp = us.daily_xp + (lesson.xp_reward || 10);
          const newWeeklyXp = us.weekly_xp + (lesson.xp_reward || 10);
          // `level` n'était jusqu'ici jamais recalculé nulle part dans le code
          // (colonne figée à sa valeur de seed) — on le fait vivre ici.
          const newLevel = levelForXp(newTotalXp);
          const leveledUp = newLevel > (us.level || 1);

          await supabase.from('user_stats').update({
            total_xp: newTotalXp,
            daily_xp: newDailyXp,
            weekly_xp: newWeeklyXp,
            level: newLevel,
            last_active_date: new Date().toISOString().slice(0, 10),
          }).eq('id', us.id);

          if (leveledUp && typeof window !== 'undefined') {
            // Se déclenche après la célébration de fin de leçon (voir plus bas).
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('los-levelup', { detail: { level: newLevel } }));
            }, 900);
          }

          // --- Système de Badges Dynamiques (Sprint 4) ---
          try {
            const { data: unlocked } = await supabase.from('user_badges').select('badge_id');
            const unlockedIds = (unlocked || []).map((u) => u.badge_id);

            const newBadges: string[] = [];

            // Badge A : Premiers pas (Compléter une première leçon)
            const firstBadgeId = '11111111-1111-1111-1111-111111111111';
            if (!unlockedIds.includes(firstBadgeId)) {
              newBadges.push(firstBadgeId);
            }

            // Badge B : Justesse d'Or (Score moyen de la leçon >= 90)
            const goldBadgeId = '11111111-1111-1111-1111-222222222222';
            if (!unlockedIds.includes(goldBadgeId) && avgScore >= 90) {
              newBadges.push(goldBadgeId);
            }

            // Badge C : Régularité (Série >= 3 jours d'activité)
            const streakBadgeId = '11111111-1111-1111-1111-333333333333';
            if (!unlockedIds.includes(streakBadgeId) && us.streak_days >= 3) {
              newBadges.push(streakBadgeId);
            }

            if (newBadges.length > 0) {
              const inserts = newBadges.map((badgeId) => ({
                badge_id: badgeId,
              }));
              await supabase.from('user_badges').insert(inserts);
            }
          } catch (badgeErr) {
            console.error('Erreur lors du déblocage des badges :', badgeErr);
          }
        }
      }
      celebrate('big');
      setMaestroMood('happy');
      setMaestroMsg(getMaestroMessage('complete'));
      setPhase('complete');
    } else {
      setScore(finalScore);
      setCurrentIdx((i) => i + 1);
      setFeedback(null);
      setHasListenedToExample(false);
      setBreathingPhase(null);
      setMaestroMood('encouraging');
      setMaestroMsg('Allez, exercice suivant ! Tu gères.');
      setPhase('practice');
    }
  }, [currentIdx, exercises.length, lesson, moduleData, score, feedback, celebrate]);

  const retryExercise = useCallback(() => {
    setFeedback(null);
    setQuizAnswer(null);
    setQuizIdx(0);
    setQuizCorrect(0);
    setDetectedPitch(null);
    setDetectedNoteName('');
    setCentsOff(0);
    setHasListenedToExample(false);
    setBreathingPhase(null);
    pitchHistoryRef.current = [];
    fullPitchHistoryRef.current = [];
    audioDataRef.current = [];
    if (current?.type === 'quiz') {
      startQuiz();
    } else {
      setPhase('practice');
    }
  }, [current, startQuiz]);

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
              <div className="font-display text-4xl font-extrabold text-foreground mt-2"><AnimatedNumber value={avg} /><span className="text-lg text-muted-foreground">/100</span></div>
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
                {current?.type && current.type !== 'quiz' && (
                  <div className="pb-1 animate-fade-in">
                    <button
                      onClick={playCurrentExample}
                      disabled={isPlayingExample}
                      className={cn(
                        'inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all border shadow-lg',
                        isPlayingExample
                          ? 'bg-primary/20 border-primary/40 text-primary animate-pulse'
                          : 'bg-gradient-to-r from-primary/15 to-secondary/10 border-primary/30 hover:border-primary/50 text-foreground'
                      )}
                    >
                      {exampleInfo.icon} {isPlayingExample ? 'Lecture de l\'exemple...' : hasListenedToExample ? 'Réécouter l\'exemple' : exampleInfo.listen}
                    </button>
                    <p className="text-[10px] text-muted-foreground/70 mt-2 max-w-xs mx-auto">
                      {exampleInfo.hint}
                    </p>

                    {/* Guide visuel de respiration, piloté par la phase en cours pendant l'exemple */}
                    {current.type === 'breathing' && breathingPhase && (
                      <div className="mt-4 flex flex-col items-center gap-2 animate-fade-in">
                        <div
                          className="rounded-full border-2 border-primary/50 bg-primary/10 transition-all ease-in-out"
                          style={{
                            width: breathingPhase === 'inhale' ? 88 : breathingPhase === 'hold' ? 88 : 44,
                            height: breathingPhase === 'inhale' ? 88 : breathingPhase === 'hold' ? 88 : 44,
                            transitionDuration: `${getBreathingPattern()[breathingPhase] || 2}s`,
                          }}
                        />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                          {breathingPhase === 'inhale' ? 'Inspire...' : breathingPhase === 'hold' ? 'Tiens...' : 'Expire...'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="relative w-28 h-28 mx-auto">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/30 to-secondary/30 blur-xl animate-pulse" />
                  <PulsingOrb active className="w-28 h-28 shadow-lg shadow-primary/20 border border-primary/20" />
                  <button
                    onClick={startRecording}
                    disabled={isPlayingExample}
                    className="absolute inset-0 grid place-items-center text-white hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
                    title={isPlayingExample ? 'Attends la fin de l\'exemple avant d\'enregistrer' : undefined}
                  >
                    <Mic className="w-10 h-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]" />
                  </button>
                </div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
                  {isPlayingExample ? 'Écoute d\'abord...' : `Appuie et chante (${getExerciseDurationSec()}s)`}
                </p>

                {current?.target && (current.target as any).audio_url && (
                  <div className="pt-2 animate-fade-in">
                    <button
                      onClick={toggleRefAudio}
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-lg",
                        isPlayingRefAudio
                          ? "bg-accent/20 border-accent/40 text-accent animate-pulse"
                          : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                      )}
                    >
                      {isPlayingRefAudio ? "⏸️ Arrêter le modèle" : "▶️ Écouter le modèle vocal"}
                    </button>
                    {decodingRef && (
                      <span className="block text-[10px] text-muted-foreground/60 mt-1.5 animate-pulse">
                        Analyse du modèle par l'IA...
                      </span>
                    )}
                  </div>
                )}

                {/* Sélecteur de tolérance / difficulté */}
                <div className="pt-4 max-w-xs mx-auto space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Difficulté de Justesse</span>
                  <div className="flex bg-muted/65 p-1 rounded-xl gap-1 border border-border/30">
                    <button 
                      onClick={() => setTolerance('easy')}
                      className={cn('flex-1 py-1 text-xs font-bold rounded-lg transition-all', 
                        tolerance === 'easy' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Facile
                    </button>
                    <button 
                      onClick={() => setTolerance('medium')}
                      className={cn('flex-1 py-1 text-xs font-bold rounded-lg transition-all', 
                        tolerance === 'medium' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Moyen
                    </button>
                    <button 
                      onClick={() => setTolerance('hard')}
                      className={cn('flex-1 py-1 text-xs font-bold rounded-lg transition-all', 
                        tolerance === 'hard' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Difficile
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* LISTENING & PITCH HIGHWAY (Yousician style) */}
            {phase === 'listening' && (
              <div className="py-4 space-y-6 animate-fade-in">
                {/* Note target & recording indicator — pas de lecture de l'exemple ici : le
                    micro capte déjà, rejouer le son maintenant le ferait s'enregistrer lui-même. */}
                <div className="flex items-center justify-between border-b border-border/40 pb-3 gap-2">
                  <div className="text-left">
                    <span className="text-[10px] text-muted-foreground font-semibold block uppercase tracking-wider">
                      {current?.type === 'breathing' ? 'Exercice' : current?.type === 'melody' || current?.type === 'vocalise' ? 'Motif à reproduire' : current?.type === 'harmony' ? 'Ta voix dans l\'accord' : 'Note Cible'}
                    </span>
                    <span className="font-display text-base font-bold text-foreground">
                      {current?.type === 'breathing'
                        ? `Souffle guidé (${getExerciseDurationSec()}s)`
                        : `${hzToNoteName(getExerciseTargetHz())} (${getExerciseTargetHz().toFixed(1)} Hz)`}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border',
                      'bg-destructive/10 border-destructive/20 text-destructive animate-pulse'
                    )}
                  >
                    <Mic className="w-3.5 h-3.5" /> Enregistrement...
                  </div>
                </div>

                {/* Pitch Display Center */}
                <div className="text-center py-2 space-y-2">
                  <div className="relative inline-grid place-items-center w-24 h-24 rounded-full bg-slate-900 border-4 border-slate-800 shadow-xl mx-auto overflow-hidden">
                    {/* Ring glowing color depending on pitch closeness */}
                    <div className={cn('absolute inset-0 opacity-20 blur-md transition-all duration-300', 
                      detectedPitch ? (Math.abs(centsOff) <= toleranceCents ? 'bg-success' : centsOff < 0 ? 'bg-cyan-500' : 'bg-orange-500') : 'bg-transparent'
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
                      Math.abs(centsOff) <= toleranceCents ? (
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
                          Math.abs(centsOff) <= toleranceCents ? 'bg-success shadow-success/40' : centsOff < 0 ? 'bg-cyan-500 shadow-cyan-500/40' : 'bg-orange-500 shadow-orange-500/40'
                        )}
                        style={{ left: `${((centsOff + 50) / 100) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground font-bold uppercase tracking-widest px-1">
                    <span>Trop bas</span>
                    <span className={cn(detectedPitch && Math.abs(centsOff) <= toleranceCents ? 'text-success' : 'text-slate-400')}>{detectedPitch && Math.abs(centsOff) <= toleranceCents ? 'Juste' : 'Zône cible'}</span>
                    <span>Trop haut</span>
                  </div>
                </div>

                {/* Visualiseur de courbe de Pitch Canvas Premium */}
                <div className="space-y-1.5 animate-fade-in">
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground font-bold uppercase tracking-widest px-0.5">
                    <span>Justesse en direct</span>
                    <span className="text-primary font-semibold">Courbe de hauteur</span>
                  </div>
                  <canvas 
                    ref={canvasRef} 
                    width={400} 
                    height={100} 
                    className="w-full h-[100px] bg-slate-950 rounded-2xl border border-slate-800 shadow-inner overflow-hidden"
                  />
                </div>

                {/* Volume Level Spectrogram */}
                <div className="space-y-1.5">
                  <div className="h-10">
                    <AudioVisualizer active bars={24} color={detectedPitch && Math.abs(centsOff) <= toleranceCents ? 'hsl(var(--success))' : 'hsl(var(--secondary))'} />
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
                  <div className="font-display text-4xl font-extrabold text-foreground tabular-nums"><AnimatedNumber value={feedback.score} /><span className="text-lg text-muted-foreground font-semibold">/100</span></div>
                  <div className={cn('text-xs font-bold uppercase tracking-wider mt-2', feedback.score >= 90 ? 'text-success' : 'text-orange-500')}>
                    {feedback.score >= 90 ? 'Performance Validée ! ✨' : 'Score insuffisant (requis: 90%) ⚠️'}
                  </div>
                </div>
                <div className="space-y-2.5">
                  {feedback.points.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={cn('grid place-items-center w-5 h-5 rounded-full shrink-0 shadow-sm', p.status === 'good' ? 'bg-success text-success-foreground' : p.status === 'ok' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground')}>
                        {p.status === 'bad' || p.value < 90 ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
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
                {feedback.score >= 90 ? (
                  <button onClick={nextExercise} className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                    {currentIdx + 1 >= exercises.length ? 'Terminer' : 'Exercice suivant'} <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={retryExercise} className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20">
                    <RotateCcw className="w-4 h-4" /> Réessayer l'exercice
                  </button>
                )}
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
