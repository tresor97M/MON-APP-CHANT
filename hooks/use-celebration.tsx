'use client';

import { useCallback, useEffect, useRef } from 'react';

type ConfettiPiece = {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; rotation: number; vr: number; life: number;
};

const COLORS = ['#0d9488', '#f59e0b', '#22c55e', '#6366f1', '#ec4899', '#f97316'];

export function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const piecesRef = useRef<ConfettiPiece[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // expose a trigger via custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = ((e as any).detail) || 80;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      const newPieces: ConfettiPiece[] = [];
      for (let i = 0; i < detail; i++) {
        newPieces.push({
          x: w / 2 + (Math.random() - 0.5) * 100,
          y: h * 0.3,
          vx: (Math.random() - 0.5) * 12,
          vy: -Math.random() * 12 - 6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 4 + Math.random() * 6,
          rotation: Math.random() * 360,
          vr: (Math.random() - 0.5) * 20,
          life: 1,
        });
      }
      piecesRef.current = [...piecesRef.current, ...newPieces];
      if (rafRef.current === null) {
        const animate = () => {
          if (!ctx || !canvas) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const pieces = piecesRef.current;
          for (let i = pieces.length - 1; i >= 0; i--) {
            const p = pieces[i];
            p.vy += 0.4; p.x += p.vx; p.y += p.vy;
            p.rotation += p.vr; p.life -= 0.008;
            if (p.life <= 0 || p.y > canvas.height + 50) { pieces.splice(i, 1); continue; }
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
          }
          if (pieces.length > 0) { rafRef.current = requestAnimationFrame(animate); }
          else { rafRef.current = null; ctx.clearRect(0, 0, canvas.width, canvas.height); }
        };
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    window.addEventListener('los-confetti', handler as EventListener);
    return () => window.removeEventListener('los-confetti', handler as EventListener);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[100]" aria-hidden />;
}

export function useCelebration() {
  const playSound = useCallback((type: 'success' | 'levelup' | 'correct' | 'wrong') => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      if (type === 'success' || type === 'levelup') {
        const notes = type === 'levelup' ? [523.25, 659.25, 783.99, 1046.5] : [523.25, 659.25, 783.99];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine'; osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, now + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.3);
        });
      } else if (type === 'correct') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.15);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.2);
      }
    } catch { /* AudioContext unavailable */ }
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  }, []);

  const celebrate = useCallback((level: 'small' | 'big' = 'small') => {
    playSound(level === 'big' ? 'levelup' : 'success');
    vibrate(level === 'big' ? [50, 30, 50, 30, 100] : [40]);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('los-confetti', { detail: level === 'big' ? 120 : 60 }));
    }
  }, [playSound, vibrate]);

  return { celebrate, playSound, vibrate };
}
