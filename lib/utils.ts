import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Niveau atteint pour un total d'XP donné. Progression triangulaire : le
 * niveau L nécessite L*200 XP supplémentaires pour passer au niveau L+1
 * (cohérent avec `xpForNext = stats.level * 200` déjà affiché dans
 * profil/coach). Coût cumulé pour atteindre le niveau L : 100*L*(L-1).
 */
export function levelForXp(totalXp: number): number {
  let level = 1;
  while (100 * (level + 1) * level <= totalXp) level++;
  return level;
}
