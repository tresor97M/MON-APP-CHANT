'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Music2, ChevronRight, Mic2, Sparkles } from 'lucide-react';

const FLOATING_NOTES = ['♩', '♪', '♫', '♬', '𝄞'];

export default function WelcomePage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [notes, setNotes] = useState<{ id: number; char: string; left: number; delay: number; duration: number }[]>([]);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
    const generated = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      char: FLOATING_NOTES[i % FLOATING_NOTES.length],
      left: 8 + Math.random() * 84,
      delay: Math.random() * 3,
      duration: 4 + Math.random() * 4,
    }));
    setNotes(generated);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #0D1F14 0%, #0A1510 40%, #071008 100%)',
      }}
    >
      {/* Floating background musical notes */}
      {notes.map((n) => (
        <span
          key={n.id}
          className="absolute text-2xl select-none pointer-events-none"
          style={{
            left: `${n.left}%`,
            bottom: '-2rem',
            color: 'rgba(74, 222, 128, 0.12)',
            animationName: 'slideUp',
            animationDuration: `${n.duration}s`,
            animationDelay: `${n.delay}s`,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear',
          }}
        >
          {n.char}
        </span>
      ))}

      {/* Green ambient glow top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #4ADE80 0%, transparent 70%)' }}
      />

      {/* Main content */}
      <div
        className="flex-1 flex flex-col items-center justify-between px-6 pt-16 pb-10"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 4rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)',
        }}
      >
        {/* Top logo pill */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
          style={{
            background: 'rgba(74,222,128,0.12)',
            border: '1px solid rgba(74,222,128,0.25)',
            color: '#4ADE80',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(-10px)',
            transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <Sparkles size={14} />
          Votre espace musical IA
        </div>

        {/* Illustration */}
        <div
          className="relative flex items-center justify-center my-8"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'scale(1)' : 'scale(0.85)',
            transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s',
          }}
        >
          {/* Pulse rings */}
          <div
            className="absolute w-56 h-56 rounded-full animate-pulse-ring"
            style={{ border: '1px solid rgba(74,222,128,0.15)' }}
          />
          <div
            className="absolute w-44 h-44 rounded-full animate-pulse-ring"
            style={{ border: '1px solid rgba(74,222,128,0.2)', animationDelay: '0.4s' }}
          />

          {/* Center icon */}
          <div
            className="relative w-36 h-36 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #1A3A22 0%, #0F2218 100%)',
              border: '2px solid rgba(74,222,128,0.3)',
              boxShadow: '0 0 60px -10px rgba(74,222,128,0.4), 0 0 120px -30px rgba(74,222,128,0.2)',
            }}
          >
            <Mic2 size={64} color="#4ADE80" strokeWidth={1.5} />

            {/* Floating small icons */}
            <div
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              <Music2 size={16} color="#F59E0B" />
            </div>
          </div>
        </div>

        {/* Text block */}
        <div
          className="text-center max-w-xs"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s ease 0.3s',
          }}
        >
          <h1
            className="text-4xl font-extrabold mb-3 leading-tight"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, #ffffff 30%, #4ADE80 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Bienvenue sur<br />Maestro
          </h1>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Votre espace pour chanter juste, progresser vite et élever la chorale ensemble.
          </p>
        </div>

        {/* CTA Button */}
        <div
          className="w-full max-w-xs mt-8 space-y-3"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s ease 0.45s',
          }}
        >
          <button
            onClick={() => router.push('/auth')}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold transition-all duration-200 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #4ADE80 0%, #22C55E 100%)',
              color: '#071008',
              boxShadow: '0 8px 32px -8px rgba(74,222,128,0.5)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Commencer
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>

          <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Déjà membre ? Connectez-vous sur la page suivante.
          </p>
        </div>
      </div>
    </div>
  );
}
