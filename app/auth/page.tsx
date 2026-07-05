'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Music, Mail, Lock, User, ArrowRight, Sparkles, Shield, Compass, Mic } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLang } from '@/hooks/use-lang';
import { useCelebration } from '@/hooks/use-celebration';
import { cn } from '@/lib/utils';

export default function AuthPage() {
  const router = useRouter();
  const { lang, t } = useLang();
  const { signIn, signUp, session, userProfile, loading } = useAuth();
  const { playSound } = useCelebration();
  const [mode, setMode] = useState<'signin' | 'signup' | 'recover'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Learning profiles & voice options
  const [learningProfile, setLearningProfile] = useState('loisir');
  const [instrument, setInstrument] = useState('vocal_soprano');
  
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session && userProfile) {
      if (userProfile.role === 'admin' || userProfile.role === 'super_admin') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }
    }
  }, [session, userProfile, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, name, 'student', learningProfile, instrument);

    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      playSound('wrong');
    } else {
      playSound('success');
      if (mode === 'signup') {
        // Show check email verification
        alert(lang === 'fr' ? 'Compte créé ! Veuillez vérifier vos e-mails.' : 'Account created! Please check your email.');
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Column: Image Background & Overlay Text */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url('/images/auth-bg.png')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/60 to-transparent" />
        
        <div className="relative z-10 flex flex-col justify-between p-16 h-full text-white">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md">
              <Music className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-white">Maestro Studio</span>
          </div>

          <div className="space-y-6 max-w-md">
            <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight">
              {lang === 'fr' ? 'Apprendre et Pratiquer' : 'Learn and Practice'}
            </h1>
            <p className="text-slate-300 text-base leading-relaxed">
              {lang === 'fr' 
                ? 'Peu importe votre niveau ou votre expérience. Nous vous aiderons à commencer à chanter en quelques minutes.' 
                : 'No matter what experience you have. We will help you start singing in minutes.'
              }
            </p>
          </div>

          <div className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Maestro Studio. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Column: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-20 bg-white">
        <div className="w-full max-w-[400px] space-y-8 animate-fade-in">
          {/* Logo & Header */}
          <div className="text-center lg:text-left space-y-2">
            <div className="flex items-center gap-2 justify-center lg:justify-start">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary grid place-items-center">
                <Music className="w-5 h-5" />
              </div>
              <span className="font-display font-extrabold text-xl tracking-tight text-slate-900">HEYAUTH</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-800 tracking-tight mt-4">
              {mode === 'signin' && (lang === 'fr' ? 'Bienvenue à HEYAUTH' : 'Welcome to HEYAUTH')}
              {mode === 'signup' && (lang === 'fr' ? 'Créer un Compte HEYAUTH' : 'Register Account to HEYAUTH')}
              {mode === 'recover' && (lang === 'fr' ? 'Récupérer le mot de passe' : 'Recover password')}
            </h2>
            <p className="text-xs text-slate-500">
              {mode === 'signin' && (lang === 'fr' ? 'Connectez-vous pour continuer sur Maestro Studio' : 'Sign in to continue to HEYAUTH')}
              {mode === 'signup' && (lang === 'fr' ? 'Remplissez vos préférences pour vous inscrire' : 'Fill in your details to create an account')}
              {mode === 'recover' && (lang === 'fr' ? 'Entrez votre e-mail pour recevoir les instructions' : 'Enter your email to receive instructions')}
            </p>
          </div>

          {/* Form */}
          {mode !== 'recover' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">{t('auth_name')}</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" required value={name} onChange={e => setName(e.target.value)}
                      placeholder={lang === 'fr' ? 'Votre prénom' : 'Your name'}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:bg-white focus:border-primary outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">{t('auth_email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:bg-white focus:border-primary outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">{t('auth_password')}</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:bg-white focus:border-primary outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Extra details for sign up */}
              {mode === 'signup' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-primary" />
                      {lang === 'fr' ? 'Profil d\'apprentissage' : 'Learning profile'}
                    </label>
                    <select value={learningProfile} onChange={e => setLearningProfile(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:bg-white focus:border-primary outline-none transition-all">
                      <option value="loisir">{lang === 'fr' ? 'Loisir & Détente' : 'Leisure & Hobby'}</option>
                      <option value="academique">{lang === 'fr' ? 'Académique & Théorie' : 'Academic & Theory'}</option>
                      <option value="professionnel">{lang === 'fr' ? 'Professionnel & Performance' : 'Professional Performance'}</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-primary" />
                      {lang === 'fr' ? 'Type de voix / Instrument' : 'Voice Type / Instrument'}
                    </label>
                    <select value={instrument} onChange={e => setInstrument(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:bg-white focus:border-primary outline-none transition-all">
                      <option value="vocal_soprano">{lang === 'fr' ? 'Soprano (Voix aiguë femme)' : 'Soprano'}</option>
                      <option value="vocal_alto">{lang === 'fr' ? 'Alto (Voix grave femme / aiguë homme)' : 'Alto'}</option>
                      <option value="vocal_tenor">{lang === 'fr' ? 'Ténor (Voix aiguë homme)' : 'Tenor'}</option>
                      <option value="vocal_basse">{lang === 'fr' ? 'Basse (Voix grave homme)' : 'Bass'}</option>
                      <option value="autre">{lang === 'fr' ? 'Autre instrument / Pas défini' : 'Other / Undefined'}</option>
                    </select>
                  </div>
                </>
              )}

              {/* Extras for sign in */}
              {mode === 'signin' && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
                    <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary" />
                    <span>{lang === 'fr' ? 'Se souvenir de moi' : 'Remember me'}</span>
                  </label>
                  <button type="button" onClick={() => setMode('recover')} className="font-semibold text-primary hover:underline">
                    {t('auth_forgot')}
                  </button>
                </div>
              )}

              <button type="submit" disabled={submitting}
                className="w-full py-3 mt-2 rounded-xl bg-[#00b894] hover:bg-[#00a884] text-white font-semibold text-sm transition-all shadow-md shadow-[#00b894]/10 disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? t('loading') : mode === 'signin' ? t('auth_login') : t('auth_signup')}
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          ) : (
            // Recover Password Form
            <form onSubmit={async (e) => { e.preventDefault(); alert(lang === 'fr' ? 'E-mail de récupération envoyé !' : 'Recovery email sent!'); setMode('signin'); }} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">{t('auth_email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" required placeholder="email@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:bg-white focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-[#00b894] hover:bg-[#00a884] text-white font-semibold text-sm transition-all">
                {lang === 'fr' ? 'Envoyer la demande' : 'Send Request'}
              </button>
            </form>
          )}

          {/* Toggle mode */}
          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            {mode === 'signin' && (
              <>
                {lang === 'fr' ? "Vous n'avez pas de compte ?" : "Don't have an account ?"}{' '}
                <button onClick={() => setMode('signup')} className="font-bold text-[#00b894] hover:underline">
                  {lang === 'fr' ? "S'inscrire" : 'Sign up'}
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>
                {lang === 'fr' ? 'Vous avez déjà un compte ?' : 'Already have an account ?'}{' '}
                <button onClick={() => setMode('signin')} className="font-bold text-[#00b894] hover:underline">
                  {lang === 'fr' ? 'Se connecter' : 'Sign in'}
                </button>
              </>
            )}
            {mode === 'recover' && (
              <button onClick={() => setMode('signin')} className="font-bold text-[#00b894] hover:underline">
                {lang === 'fr' ? 'Retour à la connexion' : 'Back to sign in'}
              </button>
            )}
          </div>

          {/* Social logos */}
          <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-slate-300 pt-4 uppercase tracking-widest">
            <span>Dribbble</span>
            <span>Bootstrap</span>
            <span>Instagram</span>
          </div>
        </div>
      </div>
    </div>
  );
}
