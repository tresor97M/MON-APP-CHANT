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
