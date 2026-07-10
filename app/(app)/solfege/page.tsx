'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ear, Volume2, Check, X, Trophy, RotateCcw } from 'lucide-react';
import { cn, levelForXp } from '@/lib/utils';
import { playVoiceTone, midiToHz } from '@/lib/pitch';
import { ALL_INTERVALS, EASY_INTERVALS, generateQuestion, type IntervalDef } from '@/lib/solfege';
import { useCelebration } from '@/hooks/use-celebration';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';

const SESSION_LENGTH = 10;
const XP_PER_SESSION = 25;

export default function SolfegePage() {
  const { user } = useAuth();
  const { playSound, vibrate, celebrate } = useCelebration();

  const [difficulty, setDifficulty] = useState<'easy' | 'all'>('easy');
  const pool = difficulty === 'easy' ? EASY_INTERVALS : ALL_INTERVALS;

  const [question, setQuestion] = useState(() => generateQuestion(EASY_INTERVALS));
  const [selected, setSelected] = useState<IntervalDef | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [sessionDone, setSessionDone] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);

  const newQuestion = useCallback((p: IntervalDef[]) => {
    setQuestion(generateQuestion(p));
    setSelected(null);
  }, []);

  useEffect(() => {
    newQuestion(pool);
    setScore({ correct: 0, total: 0 });
    setSessionDone(false);
    setXpAwarded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  const playQuestion = async () => {
    setIsPlaying(true);
    await playVoiceTone(midiToHz(question.root), 0.7);
    await new Promise((r) => setTimeout(r, 150));
    await playVoiceTone(midiToHz(question.target), 0.7);
    setIsPlaying(false);
  };

  const answer = (opt: IntervalDef) => {
    if (selected) return;
    setSelected(opt);
    const correct = opt.semitones === question.interval.semitones;
    const nextScore = { correct: score.correct + (correct ? 1 : 0), total: score.total + 1 };
    setScore(nextScore);
    playSound(correct ? 'correct' : 'wrong');
    vibrate(correct ? 40 : [30, 30, 30]);
    if (nextScore.total >= SESSION_LENGTH) {
      setTimeout(() => setSessionDone(true), 900);
    }
  };

  const nextQuestion = () => newQuestion(pool);

  const awardSessionXp = async () => {
    if (!user || xpAwarded) return;
    setXpAwarded(true);
    const earned = Math.round(XP_PER_SESSION * (score.correct / Math.max(1, score.total)));
    const { data: us } = await supabase.from('user_stats').select('*').limit(1).maybeSingle();
    if (us) {
      const newTotalXp = us.total_xp + earned;
      await supabase.from('user_stats').update({
        total_xp: newTotalXp,
        daily_xp: us.daily_xp + earned,
        weekly_xp: us.weekly_xp + earned,
        level: levelForXp(newTotalXp),
        last_active_date: new Date().toISOString().slice(0, 10),
      }).eq('id', us.id);
    }
    celebrate(score.correct === score.total ? 'big' : 'small');
  };

  useEffect(() => {
    if (sessionDone) awardSessionXp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionDone]);

  const restartSession = () => {
    setScore({ correct: 0, total: 0 });
    setSessionDone(false);
    setXpAwarded(false);
    newQuestion(pool);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pt-2">
      <div className="text-center space-y-2">
        <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-secondary text-primary-foreground shadow-lg mx-auto">
          <Ear className="w-7 h-7" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">Oreille musicale</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Écoute deux notes et identifie l'intervalle qui les sépare — la base du solfège, indépendante de ta voix.
        </p>
      </div>

      <div className="flex justify-center gap-2">
        {(['easy', 'all'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold border transition-colors',
              difficulty === d ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-primary/40'
            )}
          >
            {d === 'easy' ? 'Intervalles courants' : 'Tous les intervalles'}
          </button>
        ))}
      </div>

      {!sessionDone ? (
        <div className="rounded-3xl glass p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Question {score.total + 1}/{SESSION_LENGTH}</span>
            <span>{score.correct} bonnes réponses</span>
          </div>

          <div className="text-center py-4">
            <button
              onClick={playQuestion}
              disabled={isPlaying}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-4 rounded-2xl text-sm font-bold border shadow-lg transition-all',
                isPlaying ? 'bg-primary/20 border-primary/40 text-primary animate-pulse' : 'bg-gradient-to-r from-primary/15 to-secondary/10 border-primary/30 hover:border-primary/50 text-foreground'
              )}
            >
              <Volume2 className="w-5 h-5" /> {isPlaying ? 'Lecture...' : 'Écouter l\'intervalle'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {question.options.map((opt) => {
              const isSelected = selected?.semitones === opt.semitones;
              const isCorrectOpt = opt.semitones === question.interval.semitones;
              const showResult = selected !== null;
              return (
                <button
                  key={opt.semitones}
                  onClick={() => answer(opt)}
                  disabled={showResult}
                  className={cn(
                    'px-3 py-3 rounded-2xl border-2 text-sm font-semibold transition-all flex items-center justify-between gap-2',
                    !showResult && 'border-border/60 hover:border-primary/50 hover:bg-primary/10 text-foreground/95',
                    showResult && isCorrectOpt && 'border-success/60 bg-success/15 text-success',
                    showResult && isSelected && !isCorrectOpt && 'border-destructive/60 bg-destructive/15 text-destructive',
                    showResult && !isCorrectOpt && !isSelected && 'border-border/30 opacity-45'
                  )}
                >
                  {opt.name}
                  {showResult && isCorrectOpt && <Check className="w-4 h-4 shrink-0" />}
                  {showResult && isSelected && !isCorrectOpt && <X className="w-4 h-4 shrink-0" />}
                </button>
              );
            })}
          </div>

          {selected && (
            <button
              onClick={nextQuestion}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-sm hover:opacity-95 transition-opacity shadow-lg shadow-primary/20"
            >
              Question suivante
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-3xl glass p-8 text-center space-y-5 shadow-xl animate-scale-in">
          <div className="inline-grid place-items-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-accent/30 via-orange-500/10 to-transparent border border-accent/20 mx-auto">
            <Trophy className="w-8 h-8 text-accent" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Session terminée !</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {score.correct}/{score.total} bonnes réponses
              {user && ` · +${Math.round(XP_PER_SESSION * (score.correct / Math.max(1, score.total)))} XP`}
            </p>
          </div>
          <button
            onClick={restartSession}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20"
          >
            <RotateCcw className="w-4 h-4" /> Nouvelle session
          </button>
        </div>
      )}
    </div>
  );
}
