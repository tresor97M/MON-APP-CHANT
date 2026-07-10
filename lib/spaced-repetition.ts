// Répétition espacée pour la mémorisation des cantiques — variante
// simplifiée de l'algorithme SM-2 (SuperMemo), le même principe que Anki.

export type ReviewRating = 'difficile' | 'bien' | 'facile';

const QUALITY_BY_RATING: Record<ReviewRating, number> = {
  difficile: 2,
  bien: 3.5,
  facile: 5,
};

export interface ReviewState {
  intervalDays: number;
  easeFactor: number;
}

export interface ReviewResult extends ReviewState {
  nextReviewAt: string; // ISO
}

/**
 * Calcule le prochain intervalle de révision. Une réponse "difficile"
 * ramène l'intervalle à 1 jour (comme dans Anki) plutôt que de continuer à
 * l'allonger — c'est le principe même de la répétition espacée : on ne
 * revoit plus souvent que ce qui est mal su.
 */
export function computeNextReview(rating: ReviewRating, prev: ReviewState): ReviewResult {
  const quality = QUALITY_BY_RATING[rating];
  let easeFactor = prev.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, Math.min(2.8, easeFactor));

  let intervalDays: number;
  if (quality < 3) {
    intervalDays = 1;
  } else if (prev.intervalDays <= 1) {
    intervalDays = 3;
  } else {
    intervalDays = Math.round(prev.intervalDays * easeFactor);
  }
  intervalDays = Math.min(intervalDays, 365);

  const nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
  return { intervalDays, easeFactor, nextReviewAt };
}
