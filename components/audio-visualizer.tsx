'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  active?: boolean;
  bars?: number;
  className?: string;
  color?: string;
};

export function AudioVisualizer({ active = false, bars = 32, className, color = 'hsl(var(--primary))' }: Props) {
  const [levels, setLevels] = useState<number[]>(Array(bars).fill(0.1));
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setLevels(Array(bars).fill(0.08));
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const animate = () => {
      tRef.current += 0.08;
      const t = tRef.current;
      setLevels(Array.from({ length: bars }, (_, i) => {
        const center = bars / 2;
        const dist = Math.abs(i - center);
        const wave = Math.sin(t + i * 0.3) * 0.3 + 0.5;
        const noise = Math.random() * 0.25;
        return Math.max(0.08, Math.min(1, wave * (1 - dist / bars * 0.6) + noise));
      }));
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active, bars]);

  return (
    <div className={cn('flex items-end justify-center gap-0.5', className)}>
      {levels.map((lvl, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-75"
          style={{
            width: '100%',
            height: `${Math.max(6, lvl * 100)}%`,
            background: color,
            opacity: 0.4 + lvl * 0.6,
          }}
        />
      ))}
    </div>
  );
}

export function PulsingOrb({ active = false, className }: { active?: boolean; className?: string }) {
  const [scale, setScale] = useState(1);
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setScale(1);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const animate = () => {
      tRef.current += 0.05;
      const s = 1 + Math.sin(tRef.current) * 0.08 + Math.random() * 0.04;
      setScale(s);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active]);

  return (
    <div className={cn('relative', className)}>
      {active && (
        <>
          <div className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring" />
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" style={{ animationDelay: '0.6s' }} />
        </>
      )}
      <div
        className="relative rounded-full bg-gradient-to-br from-primary to-accent transition-transform"
        style={{ transform: `scale(${scale})`, width: '100%', height: '100%' }}
      />
    </div>
  );
}
