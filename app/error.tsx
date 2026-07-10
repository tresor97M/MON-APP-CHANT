'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Maestro] Erreur non interceptée :', error);
  }, [error]);

  return (
    <div className="min-h-screen grid place-items-center px-6" style={{ background: '#0A1510' }}>
      <div className="text-center space-y-5 max-w-sm animate-fade-in">
        <div
          className="inline-grid place-items-center w-16 h-16 rounded-3xl shadow-lg mx-auto"
          style={{ background: 'linear-gradient(135deg, #f87171, #ef4444)', boxShadow: '0 0 32px rgba(239,68,68,0.3)' }}
        >
          <AlertTriangle className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Une erreur est survenue</h1>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Quelque chose s'est mal passé pendant le chargement de Maestro. Réessayez, ou revenez à l'accueil.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-[#071008]"
            style={{ background: 'linear-gradient(135deg, #4ADE80, #22C55E)' }}
          >
            <RotateCcw className="w-4 h-4" /> Réessayer
          </button>
          <a
            href="/"
            className="px-4 py-2.5 rounded-xl text-sm font-bold border"
            style={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.15)' }}
          >
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}
