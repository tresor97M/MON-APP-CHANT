'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import Link from 'next/link';

export default function AppSectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Maestro] Erreur dans l\'espace applicatif :', error);
  }, [error]);

  return (
    <div className="rounded-3xl glass p-8 md:p-10 text-center space-y-4 shadow-xl animate-fade-in">
      <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-destructive/15 text-destructive border border-destructive/20 mx-auto">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Oups, cette page a rencontré un problème</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          Ce n'est pas grave — réessaie, ou reviens à ton tableau de bord.
        </p>
      </div>
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20"
        >
          <RotateCcw className="w-4 h-4" /> Réessayer
        </button>
        <Link href="/" className="px-4 py-2.5 rounded-xl border border-border/40 text-sm font-bold text-foreground/80 hover:bg-muted/30 transition-colors">
          Tableau de bord
        </Link>
      </div>
    </div>
  );
}
