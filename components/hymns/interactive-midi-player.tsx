'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Radio, Music4 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface Note {
  pitch: number; // Numéro MIDI (ex: 60 = Do4)
  duration: number; // Durée en temps (beats)
}

interface HymnTracks {
  soprano: Note[];
  alto: Note[];
  tenor: Note[];
  bass: Note[];
}

// Données MIDI pré-configurées pour les cantiques d'exemple
const HYMN_MIDI_DATA: Record<string, HymnTracks> = {
  // Grâce Infinie (Amazing Grace)
  'grace-infinie': {
    soprano: [
      { pitch: 59, duration: 1 }, { pitch: 62, duration: 2 }, { pitch: 67, duration: 1 },
      { pitch: 71, duration: 2 }, { pitch: 71, duration: 1 }, { pitch: 69, duration: 2 },
      { pitch: 67, duration: 1 }, { pitch: 64, duration: 2 }, { pitch: 62, duration: 1 },
      { pitch: 59, duration: 2 }, { pitch: 62, duration: 1 }, { pitch: 67, duration: 2 },
      { pitch: 71, duration: 1 }, { pitch: 71, duration: 2 }, { pitch: 69, duration: 1 },
      { pitch: 74, duration: 3 }, { pitch: 71, duration: 1 }, { pitch: 74, duration: 2 },
      { pitch: 71, duration: 1 }, { pitch: 67, duration: 2 }, { pitch: 62, duration: 1 },
      { pitch: 64, duration: 2 }, { pitch: 67, duration: 1 }, { pitch: 67, duration: 2 },
      { pitch: 64, duration: 1 }, { pitch: 62, duration: 2 }, { pitch: 59, duration: 1 },
      { pitch: 62, duration: 2 }, { pitch: 67, duration: 1 }, { pitch: 71, duration: 2 },
      { pitch: 71, duration: 1 }, { pitch: 69, duration: 2 }, { pitch: 67, duration: 3 }
    ],
    alto: [
      { pitch: 55, duration: 1 }, { pitch: 59, duration: 2 }, { pitch: 62, duration: 1 },
      { pitch: 67, duration: 2 }, { pitch: 67, duration: 1 }, { pitch: 66, duration: 2 },
      { pitch: 62, duration: 1 }, { pitch: 60, duration: 2 }, { pitch: 59, duration: 1 },
      { pitch: 55, duration: 2 }, { pitch: 59, duration: 1 }, { pitch: 62, duration: 2 },
      { pitch: 67, duration: 1 }, { pitch: 67, duration: 2 }, { pitch: 66, duration: 1 },
      { pitch: 71, duration: 3 }, { pitch: 67, duration: 1 }, { pitch: 71, duration: 2 },
      { pitch: 67, duration: 1 }, { pitch: 62, duration: 2 }, { pitch: 59, duration: 1 },
      { pitch: 60, duration: 2 }, { pitch: 62, duration: 1 }, { pitch: 62, duration: 2 },
      { pitch: 60, duration: 1 }, { pitch: 59, duration: 2 }, { pitch: 55, duration: 1 },
      { pitch: 59, duration: 2 }, { pitch: 62, duration: 1 }, { pitch: 67, duration: 2 },
      { pitch: 67, duration: 1 }, { pitch: 66, duration: 2 }, { pitch: 62, duration: 3 }
    ],
    tenor: [
      { pitch: 50, duration: 1 }, { pitch: 54, duration: 2 }, { pitch: 57, duration: 1 },
      { pitch: 59, duration: 2 }, { pitch: 59, duration: 1 }, { pitch: 57, duration: 2 },
      { pitch: 55, duration: 1 }, { pitch: 52, duration: 2 }, { pitch: 50, duration: 1 },
      { pitch: 50, duration: 2 }, { pitch: 54, duration: 1 }, { pitch: 57, duration: 2 },
      { pitch: 59, duration: 1 }, { pitch: 59, duration: 2 }, { pitch: 57, duration: 1 },
      { pitch: 62, duration: 3 }, { pitch: 59, duration: 1 }, { pitch: 62, duration: 2 },
      { pitch: 59, duration: 1 }, { pitch: 55, duration: 2 }, { pitch: 54, duration: 1 },
      { pitch: 52, duration: 2 }, { pitch: 54, duration: 1 }, { pitch: 54, duration: 2 },
      { pitch: 52, duration: 1 }, { pitch: 50, duration: 2 }, { pitch: 50, duration: 1 },
      { pitch: 54, duration: 2 }, { pitch: 57, duration: 1 }, { pitch: 59, duration: 2 },
      { pitch: 59, duration: 1 }, { pitch: 57, duration: 2 }, { pitch: 55, duration: 3 }
    ],
    bass: [
      { pitch: 43, duration: 1 }, { pitch: 43, duration: 2 }, { pitch: 47, duration: 1 },
      { pitch: 50, duration: 2 }, { pitch: 50, duration: 1 }, { pitch: 50, duration: 2 },
      { pitch: 48, duration: 1 }, { pitch: 45, duration: 2 }, { pitch: 43, duration: 1 },
      { pitch: 43, duration: 2 }, { pitch: 43, duration: 1 }, { pitch: 47, duration: 2 },
      { pitch: 50, duration: 1 }, { pitch: 50, duration: 2 }, { pitch: 50, duration: 1 },
      { pitch: 55, duration: 3 }, { pitch: 50, duration: 1 }, { pitch: 55, duration: 2 },
      { pitch: 50, duration: 1 }, { pitch: 48, duration: 2 }, { pitch: 47, duration: 1 },
      { pitch: 45, duration: 2 }, { pitch: 47, duration: 1 }, { pitch: 47, duration: 2 },
      { pitch: 45, duration: 1 }, { pitch: 43, duration: 2 }, { pitch: 43, duration: 1 },
      { pitch: 43, duration: 2 }, { pitch: 47, duration: 1 }, { pitch: 50, duration: 2 },
      { pitch: 50, duration: 1 }, { pitch: 50, duration: 2 }, { pitch: 43, duration: 3 }
    ]
  },
  // Grand Dieu, nous te bénissons
  'grand-dieu-nous-te-benissons': {
    soprano: [
      { pitch: 67, duration: 1 }, { pitch: 67, duration: 1 }, { pitch: 67, duration: 1 }, { pitch: 69, duration: 1 },
      { pitch: 71, duration: 2 }, { pitch: 71, duration: 2 }, { pitch: 71, duration: 1 }, { pitch: 72, duration: 1 },
      { pitch: 74, duration: 1 }, { pitch: 74, duration: 1 }, { pitch: 72, duration: 2 }, { pitch: 71, duration: 2 },
      { pitch: 69, duration: 1 }, { pitch: 69, duration: 1 }, { pitch: 71, duration: 1 }, { pitch: 71, duration: 1 },
      { pitch: 67, duration: 2 }, { pitch: 67, duration: 2 }, { pitch: 67, duration: 1 }, { pitch: 69, duration: 1 },
      { pitch: 71, duration: 2 }, { pitch: 71, duration: 2 }, { pitch: 71, duration: 1 }, { pitch: 72, duration: 1 },
      { pitch: 74, duration: 1 }, { pitch: 74, duration: 1 }, { pitch: 72, duration: 2 }, { pitch: 71, duration: 2 },
      { pitch: 69, duration: 1 }, { pitch: 69, duration: 1 }, { pitch: 67, duration: 4 }
    ],
    alto: [
      { pitch: 62, duration: 1 }, { pitch: 62, duration: 1 }, { pitch: 62, duration: 1 }, { pitch: 64, duration: 1 },
      { pitch: 67, duration: 2 }, { pitch: 67, duration: 2 }, { pitch: 67, duration: 1 }, { pitch: 67, duration: 1 },
      { pitch: 67, duration: 1 }, { pitch: 67, duration: 1 }, { pitch: 67, duration: 2 }, { pitch: 67, duration: 2 },
      { pitch: 66, duration: 1 }, { pitch: 66, duration: 1 }, { pitch: 67, duration: 1 }, { pitch: 67, duration: 1 },
      { pitch: 62, duration: 2 }, { pitch: 62, duration: 2 }, { pitch: 62, duration: 1 }, { pitch: 64, duration: 1 },
      { pitch: 67, duration: 2 }, { pitch: 67, duration: 2 }, { pitch: 67, duration: 1 }, { pitch: 67, duration: 1 },
      { pitch: 67, duration: 1 }, { pitch: 67, duration: 1 }, { pitch: 67, duration: 2 }, { pitch: 67, duration: 2 },
      { pitch: 66, duration: 1 }, { pitch: 66, duration: 1 }, { pitch: 62, duration: 4 }
    ],
    tenor: [
      { pitch: 59, duration: 1 }, { pitch: 59, duration: 1 }, { pitch: 59, duration: 1 }, { pitch: 59, duration: 1 },
      { pitch: 59, duration: 2 }, { pitch: 59, duration: 2 }, { pitch: 59, duration: 1 }, { pitch: 60, duration: 1 },
      { pitch: 62, duration: 1 }, { pitch: 62, duration: 1 }, { pitch: 60, duration: 2 }, { pitch: 59, duration: 2 },
      { pitch: 57, duration: 1 }, { pitch: 57, duration: 1 }, { pitch: 59, duration: 1 }, { pitch: 59, duration: 1 },
      { pitch: 59, duration: 2 }, { pitch: 59, duration: 2 }, { pitch: 59, duration: 1 }, { pitch: 59, duration: 1 },
      { pitch: 59, duration: 2 }, { pitch: 59, duration: 2 }, { pitch: 59, duration: 1 }, { pitch: 60, duration: 1 },
      { pitch: 62, duration: 1 }, { pitch: 62, duration: 1 }, { pitch: 60, duration: 2 }, { pitch: 59, duration: 2 },
      { pitch: 57, duration: 1 }, { pitch: 57, duration: 1 }, { pitch: 59, duration: 4 }
    ],
    bass: [
      { pitch: 55, duration: 1 }, { pitch: 55, duration: 1 }, { pitch: 55, duration: 1 }, { pitch: 52, duration: 1 },
      { pitch: 47, duration: 2 }, { pitch: 47, duration: 2 }, { pitch: 47, duration: 1 }, { pitch: 48, duration: 1 },
      { pitch: 50, duration: 1 }, { pitch: 50, duration: 1 }, { pitch: 48, duration: 2 }, { pitch: 47, duration: 2 },
      { pitch: 45, duration: 1 }, { pitch: 45, duration: 1 }, { pitch: 47, duration: 1 }, { pitch: 47, duration: 1 },
      { pitch: 55, duration: 2 }, { pitch: 55, duration: 2 }, { pitch: 55, duration: 1 }, { pitch: 52, duration: 1 },
      { pitch: 47, duration: 2 }, { pitch: 47, duration: 2 }, { pitch: 47, duration: 1 }, { pitch: 48, duration: 1 },
      { pitch: 50, duration: 1 }, { pitch: 50, duration: 1 }, { pitch: 48, duration: 2 }, { pitch: 47, duration: 2 },
      { pitch: 45, duration: 1 }, { pitch: 45, duration: 1 }, { pitch: 55, duration: 4 }
    ]
  }
};

// Notes par défaut si le cantique n'est pas renseigné (une simple gamme majeure pour Soprano/Alto/Ténor/Basse)
const DEFAULT_MIDI_DATA: HymnTracks = {
  soprano: [
    { pitch: 60, duration: 1 }, { pitch: 62, duration: 1 }, { pitch: 64, duration: 1 }, { pitch: 65, duration: 1 },
    { pitch: 67, duration: 1 }, { pitch: 69, duration: 1 }, { pitch: 71, duration: 1 }, { pitch: 72, duration: 2 },
    { pitch: 71, duration: 1 }, { pitch: 69, duration: 1 }, { pitch: 67, duration: 1 }, { pitch: 65, duration: 1 },
    { pitch: 64, duration: 1 }, { pitch: 62, duration: 1 }, { pitch: 60, duration: 3 }
  ],
  alto: [
    { pitch: 55, duration: 1 }, { pitch: 57, duration: 1 }, { pitch: 59, duration: 1 }, { pitch: 60, duration: 1 },
    { pitch: 62, duration: 1 }, { pitch: 64, duration: 1 }, { pitch: 66, duration: 1 }, { pitch: 67, duration: 2 },
    { pitch: 66, duration: 1 }, { pitch: 64, duration: 1 }, { pitch: 62, duration: 1 }, { pitch: 60, duration: 1 },
    { pitch: 59, duration: 1 }, { pitch: 57, duration: 1 }, { pitch: 55, duration: 3 }
  ],
  tenor: [
    { pitch: 48, duration: 1 }, { pitch: 50, duration: 1 }, { pitch: 52, duration: 1 }, { pitch: 53, duration: 1 },
    { pitch: 55, duration: 1 }, { pitch: 57, duration: 1 }, { pitch: 59, duration: 1 }, { pitch: 60, duration: 2 },
    { pitch: 59, duration: 1 }, { pitch: 57, duration: 1 }, { pitch: 55, duration: 1 }, { pitch: 53, duration: 1 },
    { pitch: 52, duration: 1 }, { pitch: 50, duration: 1 }, { pitch: 48, duration: 3 }
  ],
  bass: [
    { pitch: 43, duration: 1 }, { pitch: 43, duration: 1 }, { pitch: 47, duration: 1 }, { pitch: 48, duration: 1 },
    { pitch: 50, duration: 1 }, { pitch: 50, duration: 1 }, { pitch: 47, duration: 1 }, { pitch: 43, duration: 2 },
    { pitch: 47, duration: 1 }, { pitch: 50, duration: 1 }, { pitch: 50, duration: 1 }, { pitch: 48, duration: 1 },
    { pitch: 47, duration: 1 }, { pitch: 43, duration: 1 }, { pitch: 43, duration: 3 }
  ]
};

function midiToFrequency(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export function InteractiveMidiPlayer({ hymnId, hymnTitle }: { hymnId: string; hymnTitle: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(90);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [totalBeats, setTotalBeats] = useState(0);

  // Volumes (de 0 à 100)
  const [volumes, setVolumes] = useState<Record<string, number>>({
    soprano: 80,
    alto: 60,
    tenor: 60,
    bass: 60,
  });

  // Muté / Solo états
  const [muted, setMuted] = useState<Record<string, boolean>>({
    soprano: false,
    alto: false,
    tenor: false,
    bass: false,
  });

  const [solos, setSolos] = useState<Record<string, boolean>>({
    soprano: false,
    alto: false,
    tenor: false,
    bass: false,
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const playStateRef = useRef<{ nextNoteIndex: Record<string, number>; activeOscillators: Record<string, any[]> }>({
    nextNoteIndex: { soprano: 0, alto: 0, tenor: 0, bass: 0 },
    activeOscillators: { soprano: [], alto: [], tenor: [], bass: [] },
  });
  
  const timerRef = useRef<any>(null);

  // Identifier le track correspondant au cantique
  const slug = hymnTitle.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Enlever les accents
    .replace(/[^a-z0-9]+/g, '-') // Remplacer par des traits d'union
    .replace(/(^-|-$)/g, ''); // Nettoyer extrémités

  const tracks = HYMN_MIDI_DATA[slug] || DEFAULT_MIDI_DATA;

  // Calcul du nombre total de temps (beats)
  useEffect(() => {
    const lengths = Object.values(tracks).map(track => 
      track.reduce((sum: number, note: Note) => sum + note.duration, 0)
    );
    setTotalBeats(Math.max(...lengths, 0));
  }, [tracks]);

  // Arrêt lors du démontage du composant
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  const initAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSynthesizedTone = (voice: string, pitch: number, startTime: number, duration: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // Vérifier si un solo est actif sur un autre canal
    const anySoloActive = Object.values(solos).some(v => v);
    const isMuted = muted[voice];
    const isSilencedBySolo = anySoloActive && !solos[voice];
    if (isMuted || isSilencedBySolo) return;

    const freq = midiToFrequency(pitch);
    const volumeFactor = volumes[voice] / 100;

    // Création de l'oscillateur principal (onde en dents de scie pour le timbre de voix/orgue)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, startTime);

    // Ajout d'un oscillateur secondaire d'accompagnement (onde triangle detunée pour effet chorus de choeur)
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.005, startTime);

    // Filtre passe-bas pour lisser le son de la dent de scie et le rendre chaleureux (effet chorale)
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(voice === 'soprano' || voice === 'alto' ? 1200 : 800, startTime);

    // Enveloppe de volume ADSR
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, startTime);
    
    // Attack : montée en 0.08s
    gainNode.gain.linearRampToValueAtTime(0.25 * volumeFactor, startTime + 0.08);
    // Decay : descente vers le sustain (0.18 de gain) en 0.1s
    gainNode.gain.exponentialRampToValueAtTime(0.18 * volumeFactor, startTime + 0.18);
    // Sustain + Release : début du release à la fin de la durée
    const noteEndTime = startTime + duration;
    gainNode.gain.setValueAtTime(0.18 * volumeFactor, noteEndTime - 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, noteEndTime);

    // Connexion
    osc1.connect(lowpass);
    osc2.connect(lowpass);
    lowpass.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Lancement
    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(noteEndTime);
    osc2.stop(noteEndTime);

    // Stockage pour nettoyage si nécessaire
    playStateRef.current.activeOscillators[voice].push(osc1, osc2, gainNode);
  };

  const scheduleNextNotes = (beatTime: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // Durée d'un temps (beat) en secondes
    const beatDuration = 60 / bpm;

    const voices = ['soprano', 'alto', 'tenor', 'bass'] as const;
    voices.forEach(voice => {
      const track = tracks[voice];
      
      // Trouver la note active au "currentBeat"
      let accumulatedBeats = 0;
      let noteFound = false;

      for (let i = 0; i < track.length; i++) {
        const note = track[i];
        if (currentBeat >= accumulatedBeats && currentBeat < accumulatedBeats + note.duration) {
          // Si on commence exactement ce beat de note
          if (currentBeat === accumulatedBeats) {
            playSynthesizedTone(voice, note.pitch, beatTime, note.duration * beatDuration);
          }
          noteFound = true;
          break;
        }
        accumulatedBeats += note.duration;
      }
    });
  };

  const startPlayback = () => {
    initAudioContext();
    setIsPlaying(true);

    const intervalMs = (60 / bpm) * 1000;
    
    // Jouer le premier temps immédiatement
    const ctx = audioCtxRef.current;
    if (ctx) {
      scheduleNextNotes(ctx.currentTime);
    }

    timerRef.current = setInterval(() => {
      setCurrentBeat(prev => {
        const next = prev + 1;
        if (next >= totalBeats) {
          stopPlayback();
          return 0;
        }
        
        const ctx = audioCtxRef.current;
        if (ctx) {
          // Prévoir la note 50ms dans le futur pour éviter le jitter
          scheduleNextNotes(ctx.currentTime + 0.05);
        }
        return next;
      });
    }, intervalMs);
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Nettoyer tous les oscillateurs actifs
    const voices = ['soprano', 'alto', 'tenor', 'bass'] as const;
    voices.forEach(voice => {
      playStateRef.current.activeOscillators[voice].forEach(node => {
        try {
          node.disconnect();
          node.stop();
        } catch(e) {}
      });
      playStateRef.current.activeOscillators[voice] = [];
    });
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const handleReset = () => {
    stopPlayback();
    setCurrentBeat(0);
  };

  const handleVolumeChange = (voice: string, val: number) => {
    setVolumes(prev => ({ ...prev, [voice]: val }));
  };

  const toggleMute = (voice: string) => {
    setMuted(prev => ({ ...prev, [voice]: !prev[voice] }));
  };

  const toggleSolo = (voice: string) => {
    setSolos(prev => {
      const next = { ...prev, [voice]: !prev[voice] };
      // Si on active le solo, on éteint les autres solos
      if (next[voice]) {
        Object.keys(next).forEach(k => {
          if (k !== voice) next[k] = false;
        });
      }
      return next;
    });
  };

  // Convertir le temps en MM:SS basé sur le tempo
  const formatTime = (beat: number) => {
    const seconds = Math.round(beat * (60 / bpm));
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 backdrop-blur-xl p-5 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/20 grid place-items-center shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-white">Synthétiseur MIDI de partition</h3>
            <p className="text-xs text-white/50">Isolez les voix pour travailler votre justesse.</p>
          </div>
        </div>

        {/* Contrôles de lecture généraux */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={handleReset}
            className="w-9 h-9 rounded-xl border-white/5 bg-white/5 text-white/70 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          <Button
            onClick={handlePlayPause}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl px-4 py-2 flex items-center gap-2 transition-transform active:scale-95"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-slate-950" /> Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" /> Écouter
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-white/40 font-mono">
          <span>{formatTime(currentBeat)}</span>
          <span className="font-semibold text-emerald-400">Temps {currentBeat} / {totalBeats}</span>
          <span>{formatTime(totalBeats)}</span>
        </div>
        <div className="relative w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div 
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-150" 
            style={{ width: `${totalBeats ? (currentBeat / totalBeats) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Contrôle de Tempo (BPM) */}
      <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-3.5 border border-white/5">
        <span className="text-xs font-semibold text-white/70 shrink-0">Tempo (BPM)</span>
        <Slider 
          value={[bpm]} 
          onValueChange={([v]) => { setBpm(v); if (isPlaying) { stopPlayback(); setTimeout(startPlayback, 100); } }}
          min={60} 
          max={150} 
          step={2}
          className="flex-1"
        />
        <span className="text-xs font-mono font-bold text-emerald-400 shrink-0 w-12 text-right">{bpm} BPM</span>
      </div>

      {/* Table de Mixage 4 Voix */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['soprano', 'alto', 'tenor', 'bass'] as const).map(voice => {
          const isVoiceMuted = muted[voice];
          const isVoiceSolo = solos[voice];
          const label = voice.charAt(0).toUpperCase() + voice.slice(1);
          
          return (
            <div 
              key={voice}
              className={`rounded-2xl border p-4 space-y-4 flex flex-col items-center transition-all ${
                isVoiceSolo 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : isVoiceMuted 
                    ? 'bg-red-500/5 border-white/5 opacity-50' 
                    : 'bg-white/5 border-white/5'
              }`}
            >
              <div className="w-full flex items-center justify-between">
                <span className="text-xs font-bold text-white/90">{label}</span>
                <span className="text-[10px] font-mono text-emerald-400/80">{volumes[voice]}%</span>
              </div>

              {/* Curseur vertical de Volume */}
              <div className="h-28 flex items-center justify-center py-2">
                <Slider
                  value={[volumes[voice]]}
                  onValueChange={([val]) => handleVolumeChange(voice, val)}
                  min={0}
                  max={100}
                  step={5}
                  orientation="vertical"
                  className="h-full"
                />
              </div>

              {/* Boutons Mute (M) & Solo (S) */}
              <div className="flex gap-2 w-full justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleMute(voice)}
                  className={`px-2 py-1 h-7 rounded-lg text-[10px] font-bold border transition-colors ${
                    isVoiceMuted 
                      ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30' 
                      : 'bg-white/5 text-white/70 border-white/5 hover:text-white'
                  }`}
                >
                  MUTE
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleSolo(voice)}
                  className={`px-2 py-1 h-7 rounded-lg text-[10px] font-bold border transition-colors ${
                    isVoiceSolo 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500 hover:bg-emerald-600' 
                      : 'bg-white/5 text-white/70 border-white/5 hover:text-white'
                  }`}
                >
                  SOLO
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
