'use client';

import { useEffect, useState } from 'react';
import { X, Download, Share, PlusSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PWAInstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Vérifier si l'application fonctionne déjà en mode PWA/standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    if (isStandalone) {
      return; // Ne pas afficher si déjà installé
    }

    // 2. Détecter si l'appareil est sous iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // 3. Écouter l'événement standard de Chrome/Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Pour iOS Safari, puisqu'il n'y a pas d'événement standard, on l'affiche directement si non standalone
    if (ios) {
      setShow(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-5 left-4 right-4 z-50 animate-bounce-in max-w-sm mx-auto pointer-events-auto">
      <div className="relative rounded-3xl bg-slate-950/90 backdrop-blur-xl border border-white/10 p-5 shadow-2xl text-white space-y-3.5">
        {/* Bouton de fermeture */}
        <button 
          onClick={() => setShow(false)}
          className="absolute top-3.5 right-3.5 text-white/40 hover:text-white/80 transition-colors p-1"
          aria-label="Fermer"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#22C55E] to-[#4ADE80] grid place-items-center shrink-0 shadow-lg shadow-green-500/25 text-white text-lg">
            🎵
          </div>
          <div>
            <h3 className="text-xs font-bold">Installer l'App Maestro</h3>
            <p className="text-[10px] text-white/60">Accédez plus rapidement à votre chorale et au coach IA.</p>
          </div>
        </div>

        {isIOS ? (
          <div className="text-[11px] text-white/80 bg-white/5 rounded-2xl p-3 border border-white/5 space-y-2">
            <p className="font-semibold text-emerald-400">Pour l'installer sur votre iPhone :</p>
            <ol className="list-decimal list-inside space-y-1.5 text-white/70">
              <li className="inline-flex items-center gap-1.5 flex-wrap">
                Appuyez sur l'icône de partage <Share className="w-3.5 h-3.5 text-sky-400 inline" /> dans Safari.
              </li>
              <li className="inline-flex items-center gap-1.5 flex-wrap">
                Sélectionnez l'option <PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline" /> **Sur l'écran d'accueil**.
              </li>
            </ol>
          </div>
        ) : (
          <Button 
            onClick={handleInstallClick}
            className="w-full bg-gradient-to-r from-primary to-secondary text-[#071008] font-bold rounded-2xl text-xs py-2 shadow-lg shadow-primary/20 flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Installer l'Application
          </Button>
        )}
      </div>
    </div>
  );
}
