'use client';

import { useEffect } from 'react';

// Filet de secours si le root layout lui-même plante (cas très rare) —
// contrairement à error.tsx, ce fichier doit fournir son propre <html>/<body>
// puisqu'il remplace le layout racine plutôt que de s'afficher dedans.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Maestro] Erreur critique (root layout) :', error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ background: '#0A1510', margin: 0 }}>
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'center', maxWidth: 360 }}>
            <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Maestro n'a pas pu démarrer</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 }}>
              Une erreur critique est survenue. Réessayez dans quelques instants.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 16, padding: '10px 20px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #4ADE80, #22C55E)', color: '#071008',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
