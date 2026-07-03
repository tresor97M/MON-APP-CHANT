'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Music, Mail, Lock, User, ArrowRight, Sparkles, Zap, Trophy, Brain } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useCelebration } from '@/hooks/use-celebration';

export default function AuthPage() {
  const router = useRouter();
  const { signIn, signUp, session, loading } = useAuth();
  const { playSound } = useCelebration();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) router.replace('/');
  }, [session, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, name);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      playSound('wrong');
    } else {
      playSound('success');
      router.replace('/');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent flex-col justify-between p-12">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute top-20 -right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl animate-float" />
        <div className="absolute bottom-10 -left-10 w-72 h-72 rounded-full bg-accent/30 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3 text-white">
          <div className="grid place-items-center w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm">
            <Music className="w-6 h-6" />
          </div>
          <div>
            <div className="font-display font-bold text-lg">Learning OS</div>
            <div className="text-xs text-white/70">Le Duolingo des compétences</div>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <h1 className="font-display text-4xl font-bold text-white leading-tight text-balance">
            Apprends à chanter.<br />L'IA écoute, corrige, adapte.
          </h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-md">
            Pas de longues vidéos. Tu pratiques, l'IA t'écoute en temps réel, te corrige et t'encourage. Chaque jour te rapproche de ta voix idéale.
          </p>
          <div className="space-y-3">
            {[
              { icon: Brain, text: 'Analyse vocale en temps réel' },
              { icon: Zap, text: 'Exercices adaptés à ton niveau' },
              { icon: Trophy, text: 'Progresse, débloque des badges, monte en ligue' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-white/90">
                <div className="grid place-items-center w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm">
                  <f.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-white/60 text-sm">
          <span>6 modules</span>
          <span>·</span>
          <span>21 leçons</span>
          <span>·</span>
          <span>IA adaptive</span>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-6 animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 justify-center">
            <div className="grid place-items-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
              <Music className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-lg">Learning OS</span>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {mode === 'signup' ? 'Crée ton compte' : 'Bon retour !'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'signup' ? 'Commence à apprendre gratuitement.' : 'Reprends là où tu t\'es arrêté.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nom</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Ton prénom"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card border border-border text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="toi@exemple.com"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card border border-border text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card border border-border text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit" disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              {submitting ? 'Chargement...' : mode === 'signup' ? 'Commencer gratuitement' : 'Se connecter'}
              {!submitting && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
            </button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            {mode === 'signup' ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
            <button
              onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null); }}
              className="font-semibold text-primary hover:underline"
            >
              {mode === 'signup' ? 'Se connecter' : 'Créer un compte'}
            </button>
          </div>

          <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3" />
            <span>Pas de carte bancaire. Commence en 30 secondes.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
