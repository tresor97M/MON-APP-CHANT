'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Overlay "Niveau X !" déclenché globalement via l'événement custom
 * `los-levelup` (même pattern que la confetti de use-celebration.tsx),
 * pour ne pas coupler ce composant d'UI à une page spécifique.
 */
export function LevelUpOverlay() {
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setLevel(detail?.level ?? null);
      const timeout = setTimeout(() => setLevel(null), 2600);
      return () => clearTimeout(timeout);
    };
    window.addEventListener('los-levelup', handler as EventListener);
    return () => window.removeEventListener('los-levelup', handler as EventListener);
  }, []);

  if (level === null) return null;

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center pointer-events-none px-6">
      <div className="animate-scale-in text-center">
        <div
          className="inline-grid place-items-center w-24 h-24 rounded-full mx-auto shadow-2xl animate-pulse-ring"
          style={{ background: 'linear-gradient(135deg, #4ADE80, #22C55E)', boxShadow: '0 0 60px rgba(74,222,128,0.6)' }}
        >
          <Sparkles className="w-11 h-11 text-[#071008]" />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-white/70">Niveau supérieur</p>
        <p className="font-display text-4xl font-extrabold text-white drop-shadow-lg mt-1">Niveau {level} !</p>
      </div>
    </div>
  );
}
