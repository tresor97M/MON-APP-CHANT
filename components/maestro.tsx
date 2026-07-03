'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type Mood = 'idle' | 'talking' | 'happy' | 'thinking' | 'encouraging';

type Props = {
  mood?: Mood;
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const moodColors: Record<Mood, string> = {
  idle: 'from-primary/20 to-primary/5',
  talking: 'from-primary/30 to-accent/10',
  happy: 'from-success/25 to-accent/10',
  thinking: 'from-accent/20 to-primary/5',
  encouraging: 'from-accent/25 to-primary/10',
};

export function Maestro({ mood = 'idle', message, className, size = 'md' }: Props) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  const sizes = { sm: 'w-12 h-12', md: 'w-20 h-20', lg: 'w-28 h-28' };
  const eyeSizes = { sm: 'w-1.5 h-1.5', md: 'w-2.5 h-2.5', lg: 'w-3.5 h-3.5' };

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <div className="relative shrink-0">
        <div className={cn('rounded-3xl bg-gradient-to-br grid place-items-center relative overflow-hidden transition-all duration-500', moodColors[mood], sizes[size])}>
          {/* Face */}
          <div className="relative z-10 flex flex-col items-center gap-1.5">
            {/* Eyes */}
            <div className="flex gap-2">
              <div className={cn('rounded-full bg-foreground transition-all', eyeSizes[size], blink && 'h-0.5')} />
              <div className={cn('rounded-full bg-foreground transition-all', eyeSizes[size], blink && 'h-0.5')} />
            </div>
            {/* Mouth */}
            <div className={cn(
              'rounded-full border-2 border-foreground transition-all',
              size === 'sm' ? 'w-3 h-1.5' : 'w-5 h-2.5',
              mood === 'happy' && 'border-success bg-success/20',
              mood === 'talking' && 'animate-pulse',
              mood === 'thinking' && 'w-2 h-2 rounded-full',
            )} />
          </div>
          {/* Floating dots when talking */}
          {mood === 'talking' && (
            <>
              <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary animate-float" />
              <div className="absolute bottom-3 left-2 w-1 h-1 rounded-full bg-accent animate-float" style={{ animationDelay: '0.5s' }} />
            </>
          )}
        </div>
        {/* Pulse ring when encouraging */}
        {mood === 'encouraging' && (
          <div className="absolute inset-0 rounded-3xl bg-accent/30 animate-pulse-ring" />
        )}
      </div>

      {message && (
        <div className="flex-1 rounded-2xl bg-card border border-border p-3.5 relative animate-fade-in mt-1">
          {/* Speech bubble tail */}
          <div className="absolute -left-1.5 top-4 w-3 h-3 rotate-45 bg-card border-l border-b border-border" />
          <p className="text-sm leading-relaxed text-foreground/90">{message}</p>
        </div>
      )}
    </div>
  );
}

export const MAESTRO_MESSAGES = {
  intro: [
    'Salut ! Je suis Maestro, ton coach vocal IA. Prêt à commencer ?',
    'Aujourd\'hui on travaille en douceur. Suis mes conseils !',
  ],
  listening: [
    'Je t\'écoute... chante naturellement !',
    'Concentre-toi sur ta respiration, je m\'occupe du reste.',
  ],
  analyzing: [
    'J\'analyse ta voix... une seconde !',
    'Je compare ta hauteur à la note cible...',
  ],
  excellent: [
    'Excellent ! Ta justesse est remarquable aujourd\'hui !',
    'Bravo ! C\'est exactement ça. Continue !',
    'Tu progresses vite, je suis impressionné !',
  ],
  good: [
    'Bon travail ! Tu y es presque, affine encore un peu.',
    'Bien joué ! Garde ce soutien abdominal, ça paie.',
  ],
  needsWork: [
    'Pas mal, mais on peut faire mieux. Réessaie en respirant plus bas.',
    'Je sens de la tension. Détends ta mâchoire et réessaie.',
  ],
  quizCorrect: [
    'Parfait ! Tu maîtrises la théorie aussi bien que la pratique.',
    'Exact ! C\'est la bonne réponse.',
  ],
  quizWrong: [
    'Pas tout à fait... mais c\'est comme ça qu\'on apprend !',
    'Presque ! Relis bien la question la prochaine fois.',
  ],
  complete: [
    'Leçon terminée ! Tu as fait d\'énormes progrès aujourd\'hui.',
    'Bravo ! Reviens demain pour garder ta série en vie.',
  ],
  streak: [
    '7 jours de suite ! Tu deviens accro... et c\'est une bonne chose !',
  ],
};

export function getMaestroMessage(category: keyof typeof MAESTRO_MESSAGES): string {
  const msgs = MAESTRO_MESSAGES[category];
  return msgs[Math.floor(Math.random() * msgs.length)];
}
