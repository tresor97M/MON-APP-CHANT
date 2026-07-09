// Détection et comparaison de hauteur vocale, et synthèse d'un ton de
// référence façon piano. Centralise ce qui était dupliqué dans
// app/(app)/lecon/[id]/page.tsx (autocorrélation, conversion Hz/MIDI/note).

export const NOTE_NAMES = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

/** Détection de hauteur par autocorrélation temporelle (algorithme ACF classique). */
export function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  let sum = 0;
  for (let i = 0; i < SIZE; i++) sum += buffer[i] * buffer[i];
  const rms = Math.sqrt(sum / SIZE);
  if (rms < 0.005) return -1;

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
  let maxval = -1, maxpos = -1;
  for (let i = d; i < len; i++) {
    if (correlations[i] > maxval) { maxval = correlations[i]; maxpos = i; }
  }

  const hz = sampleRate / maxpos;
  return hz >= 60 && hz <= 1200 ? hz : -1;
}

export function hzToMidi(hz: number): number {
  if (hz <= 0) return 0;
  return 12 * (Math.log(hz / 440) / Math.log(2)) + 69;
}

export function midiToNoteName(midi: number): string {
  const idx = Math.round(midi);
  return NOTE_NAMES[((idx % 12) + 12) % 12] + (Math.floor(idx / 12) - 1);
}

export function hzToNoteName(hz: number): string {
  if (hz <= 0) return '';
  return midiToNoteName(hzToMidi(hz));
}

/**
 * Score de justesse (0-100) basé sur la courbe de cents captée en direct
 * pendant l'écoute micro. Crédit dégressif (pas un simple oui/non) : un
 * écart proche de la tolérance garde un peu de valeur, un écart de 3x la
 * tolérance ne rapporte plus rien. Les échantillons "silence" (sentinelle
 * cents=0 && just=false, poussée quand aucune hauteur n'a été détectée)
 * sont exclus du calcul — ils ne renseignent rien sur la justesse.
 */
export function computePitchAccuracy(
  history: { cents: number; just: boolean }[],
  toleranceCents: number
): number {
  const voiced = history.filter((h) => !(h.cents === 0 && !h.just));
  if (voiced.length === 0) return 0;

  const spread = Math.max(1, toleranceCents * 3);
  let total = 0;
  for (const h of voiced) {
    const deviation = Math.abs(h.cents);
    const credit = Math.max(0, 100 - (deviation / spread) * 100);
    total += credit;
  }
  return Math.round(total / voiced.length);
}

/**
 * Joue un ton de référence façon piano (synthèse additive : fondamentale +
 * harmoniques d'amplitude décroissante, attaque rapide, decay exponentiel)
 * plutôt qu'un simple sinus. Retourne une Promise résolue quand le son est
 * terminé, pour pouvoir enchaîner "écoute puis chante".
 */
export function playPianoTone(hz: number, durationSec = 1.4): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.32, now + 0.015);
    master.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    master.connect(ctx.destination);

    const harmonics = [
      { mult: 1, gain: 1.0 },
      { mult: 2, gain: 0.5 },
      { mult: 3, gain: 0.25 },
      { mult: 4, gain: 0.12 },
      { mult: 5, gain: 0.06 },
    ];
    const oscillators = harmonics.map(({ mult, gain }) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = hz * mult;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + durationSec);
      return osc;
    });

    oscillators[0].onended = () => {
      ctx.close();
      resolve();
    };
  });
}

/** Fréquence exacte (tempérament égal, La4 = 440Hz) pour une note MIDI donnée. */
export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ============================================================
// Exemples audio par type d'exercice — chaque type d'exercice a une
// démonstration adaptée à sa nature (instrument, voix, harmonie,
// respiration) plutôt qu'un unique ton de piano générique.
// ============================================================

function getAudioCtx(): AudioContext {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  return new AudioCtx();
}

/**
 * Timbre "voix" (sawtooth + filtre passe-bas) plutôt que le timbre
 * "piano" (harmoniques sinusoïdales) — utilisé pour les exemples chant/
 * vocalise/harmonisation, qui sont des exercices vocaux et non
 * instrumentaux.
 */
export function playVoiceTone(hz: number, durationSec = 0.8, ctx?: AudioContext): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();
    const audioCtx = ctx ?? getAudioCtx();
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = hz;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = hz * 2.5 + 600;
    filter.Q.value = 0.7;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + durationSec);
    osc.onended = () => {
      if (!ctx) audioCtx.close();
      resolve();
    };
  });
}

/** Joue une note tenue avec un vibrato (LFO modulant la fréquence), pour démontrer le mouvement attendu. */
export function playVibratoExample(hz: number, durationSec = 2.2): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = hz;

    // LFO ~5.5Hz modulant la fréquence de ±25 cents, typique d'un vibrato vocal.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = hz * (Math.pow(2, 25 / 1200) - 1);
    lfo.connect(lfoDepth);
    lfoDepth.connect(osc.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = hz * 2.5 + 600;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.15);
    gain.gain.setValueAtTime(0.22, now + durationSec - 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + durationSec);
    osc.stop(now + durationSec);
    osc.onended = () => {
      ctx.close();
      resolve();
    };
  });
}

/** Joue une séquence de notes (mélodie ou vocalise) l'une après l'autre, timbre voix. */
export async function playMelodySequence(notesHz: number[], noteDurationSec = 0.55): Promise<void> {
  for (const hz of notesHz) {
    if (hz > 0) await playVoiceTone(hz, noteDurationSec);
    else await new Promise((r) => setTimeout(r, noteDurationSec * 1000));
  }
}

/** Joue plusieurs notes simultanément (accord d'harmonisation) pendant durationSec. */
export function playHarmonyChord(chordHz: number[], durationSec = 2.5): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || chordHz.length === 0) return resolve();
    const ctx = getAudioCtx();
    let remaining = chordHz.length;
    chordHz.forEach((hz) => {
      playVoiceTone(hz, durationSec, ctx).then(() => {
        remaining -= 1;
        if (remaining === 0) {
          ctx.close();
          resolve();
        }
      });
    });
  });
}

export type BreathingPhase = 'inhale' | 'hold' | 'exhale';

/**
 * Guide de respiration rythmé : joue un repère sonore doux à chaque
 * changement de phase (inspire/tiens/expire) et notifie l'UI via
 * onPhase pour piloter une animation (cercle qui grandit/rétrécit).
 */
export async function playBreathingGuide(
  pattern: { inhale: number; hold: number; exhale: number },
  onPhase?: (phase: BreathingPhase, seconds: number) => void
): Promise<void> {
  const cue = (hz: number, durationSec: number) => {
    if (typeof window === 'undefined') return;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(hz, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec);
    osc.onended = () => ctx.close();
  };

  const wait = (sec: number) => new Promise((r) => setTimeout(r, sec * 1000));

  onPhase?.('inhale', pattern.inhale);
  cue(392, 0.5); // Sol4, repère "inspire"
  await wait(pattern.inhale);

  onPhase?.('hold', pattern.hold);
  cue(523.25, 0.25); // Do5, repère "tiens"
  await wait(pattern.hold);

  onPhase?.('exhale', pattern.exhale);
  cue(261.63, 0.6); // Do4, repère "expire" (grave, long)
  await wait(pattern.exhale);
}

/**
 * Construit une courbe de pitch synthétique (même format que celle
 * décodée depuis un fichier audio de référence) à partir d'une suite
 * de notes — permet de réutiliser comparePitchCurves/le rendu du
 * piano-roll pour les exercices de mélodie/vocalise sans fichier audio.
 */
export function buildCurveFromNotes(notesHz: number[], noteDurationSec: number, totalSlices = 80): number[] {
  if (notesHz.length === 0) return [];
  const totalDuration = notesHz.length * noteDurationSec;
  const curve: number[] = [];
  for (let i = 0; i < totalSlices; i++) {
    const t = (i / totalSlices) * totalDuration;
    const noteIdx = Math.min(notesHz.length - 1, Math.floor(t / noteDurationSec));
    curve.push(notesHz[noteIdx] > 0 ? notesHz[noteIdx] : -1);
  }
  return curve;
}
