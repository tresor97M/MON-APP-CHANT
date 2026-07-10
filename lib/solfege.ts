// Reconnaissance d'intervalles — la base de l'oreille musicale, absente du
// reste du parcours (qui travaille la justesse mais pas l'identification
// des intervalles en soi).

export interface IntervalDef {
  semitones: number;
  name: string;
}

export const ALL_INTERVALS: IntervalDef[] = [
  { semitones: 1, name: 'Seconde mineure' },
  { semitones: 2, name: 'Seconde majeure' },
  { semitones: 3, name: 'Tierce mineure' },
  { semitones: 4, name: 'Tierce majeure' },
  { semitones: 5, name: 'Quarte juste' },
  { semitones: 6, name: 'Triton' },
  { semitones: 7, name: 'Quinte juste' },
  { semitones: 8, name: 'Sixte mineure' },
  { semitones: 9, name: 'Sixte majeure' },
  { semitones: 10, name: 'Septième mineure' },
  { semitones: 11, name: 'Septième majeure' },
  { semitones: 12, name: 'Octave' },
];

export const EASY_INTERVALS: IntervalDef[] = ALL_INTERVALS.filter((i) =>
  [4, 5, 7, 12].includes(i.semitones)
);

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Génère une question : note racine aléatoire (dans une tessiture confortable) + intervalle cible. */
export function generateQuestion(pool: IntervalDef[], directionUp = true) {
  const root = 55 + Math.floor(Math.random() * 12); // entre Sol3 et Fa#4
  const interval = pickRandom(pool);
  const target = directionUp ? root + interval.semitones : root - interval.semitones;
  // 4 options dont la bonne réponse, sans doublon
  const options = new Set<IntervalDef>([interval]);
  while (options.size < Math.min(4, pool.length)) {
    options.add(pickRandom(pool));
  }
  const shuffled = Array.from(options).sort(() => Math.random() - 0.5);
  return { root, target, interval, options: shuffled };
}
