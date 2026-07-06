'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Music, Mail, Lock, User, ArrowRight, ArrowLeft, Mic2, HelpCircle, Check } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import type { VoicePart } from '@/lib/types';
import { isStaff } from '@/lib/permissions';

const VOICES: { value: VoicePart; label: string; desc: string; color: string }[] = [
  { value: 'soprano', label: 'Soprano', desc: 'Voix aiguë (femme)', color: 'border-rose-300 bg-rose-50 text-rose-700' },
  { value: 'alto', label: 'Alto', desc: 'Voix grave (femme)', color: 'border-amber-300 bg-amber-50 text-amber-700' },
  { value: 'tenor', label: 'Ténor', desc: 'Voix aiguë (homme)', color: 'border-sky-300 bg-sky-50 text-sky-700' },
  { value: 'basse', label: 'Basse', desc: 'Voix grave (homme)', color: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
];

const INSTRUMENTS: { value: string; label: string; desc: string; color: string }[] = [
  { value: 'piano', label: 'Piano / Clavier', desc: 'Accompagnement', color: 'border-rose-300 bg-rose-50 text-rose-700' },
  { value: 'guitare', label: 'Guitare', desc: 'Acoustique / Élec', color: 'border-amber-300 bg-amber-50 text-amber-700' },
  { value: 'basse', label: 'Basse', desc: 'Soutien grave', color: 'border-sky-300 bg-sky-50 text-sky-700' },
  { value: 'batterie', label: 'Batterie / Percu', desc: 'Rythme & tempo', color: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  { value: 'cuivres', label: 'Vents / Cuivres', desc: 'Flûte, sax, etc.', color: 'border-purple-300 bg-purple-50 text-purple-700' },
  { value: 'autre', label: 'Autre instrument', desc: 'Violon, harpe, etc.', color: 'border-slate-300 bg-slate-50 text-slate-700' },
];

export default function AuthPage() {
  const router = useRouter();
  const { signIn, signUp, session, userProfile, loading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [roleType, setRoleType] = useState<'chantre' | 'instrumentiste' | null>(null);
  const [voice, setVoice] = useState<VoicePart | null>(null);
  const [voiceUnknown, setVoiceUnknown] = useState(false);
  const [instrument, setInstrument] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session && userProfile) {
      router.replace(isStaff(userProfile.role) ? '/admin' : '/');
    }
  }, [session, userProfile, loading, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await signIn(email, password);
    setSubmitting(false);
    if (res.error) setError(res.error);
  };

  const handleSignUpStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep(2);
  };

  const handleSignUpFinal = async () => {
    if (roleType === 'chantre' && !voice && !voiceUnknown) {
      setError('Choisissez votre voix ou indiquez que vous ne savez pas.');
      return;
    }
    if (roleType === 'instrumentiste' && !instrument) {
      setError('Veuillez choisir votre instrument principal.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await signUp(
      email,
      password,
      name,
      roleType === 'chantre' ? (voiceUnknown ? null : voice) : null,
      roleType === 'instrumentiste' ? instrument : null
    );
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
    } else {
      setInfo('Compte créé ! Vérifiez vos e-mails si une confirmation est requise, puis connectez-vous.');
      setMode('signin');
      setStep(1);
    }
  };

  const inputClass =
    'w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-muted/50 text-sm text-foreground focus:bg-background focus:border-primary outline-none transition-all placeholder:text-muted-foreground';

  return (
    <div className="min-h-screen flex bg-background">
      {/* Colonne gauche */}
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
            <span className="font-display font-bold text-lg tracking-tight text-white">Chorale Adventiste</span>
          </div>
          <div className="space-y-6 max-w-md">
            <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-balance">
              Chantez pour l&apos;Éternel un cantique nouveau
            </h1>
            <p className="text-slate-300 text-base leading-relaxed">
              Plateforme de gestion de la chorale : répertoire de cantiques, répétitions,
              apprentissage par pupitre et formation continue.
            </p>
            <p className="text-slate-400 text-sm italic">— Psaume 96:1</p>
          </div>
          <div className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Chorale. Tous droits réservés.
          </div>
        </div>
      </div>

      {/* Colonne droite : formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-20">
        <div className="w-full max-w-[420px] space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <div className="flex items-center gap-2 justify-center lg:justify-start">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary grid place-items-center">
                <Music className="w-5 h-5" />
              </div>
              <span className="font-display font-extrabold text-xl tracking-tight text-foreground">Chorale</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground tracking-tight mt-4">
              {mode === 'signin' ? 'Bienvenue' : step === 1 ? 'Créer votre compte' : 'Votre pupitre'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {mode === 'signin' && 'Connectez-vous pour accéder à votre espace choriste'}
              {mode === 'signup' && step === 1 && 'Étape 1 sur 2 — Vos informations'}
              {mode === 'signup' && step === 2 && 'Étape 2 sur 2 — Dans quelle voix chantez-vous ?'}
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs text-destructive font-medium">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-700 font-medium">
              {info}
            </div>
          )}

          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="email" className="text-xs font-semibold text-foreground">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="email@exemple.com" className={inputClass} />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="password" className="text-xs font-semibold text-foreground">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input id="password" type="password" required minLength={6} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={inputClass} />
                </div>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-3 mt-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? 'Connexion...' : 'Se connecter'}
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {mode === 'signup' && step === 1 && (
            <form onSubmit={handleSignUpStep1} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="su-name" className="text-xs font-semibold text-foreground">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input id="su-name" type="text" required value={name} onChange={e => setName(e.target.value)}
                    placeholder="Votre nom et prénom" className={inputClass} />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="su-email" className="text-xs font-semibold text-foreground">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input id="su-email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="email@exemple.com" className={inputClass} />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="su-password" className="text-xs font-semibold text-foreground">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input id="su-password" type="password" required minLength={6} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="6 caractères minimum" className={inputClass} />
                </div>
              </div>
              <button type="submit"
                className="w-full py-3 mt-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all flex items-center justify-center gap-2">
                Continuer
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {mode === 'signup' && step === 2 && (
            <div className="space-y-4">
              {roleType === null ? (
                <>
                  <p className="text-xs text-muted-foreground text-center">Sélectionnez votre profil dans la louange :</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button"
                      onClick={() => setRoleType('chantre')}
                      className="rounded-2xl border-2 border-border p-5 text-center hover:border-primary/50 transition-all bg-card flex flex-col items-center justify-center min-h-[140px]">
                      <Mic2 className="w-8 h-8 mb-2 text-primary" />
                      <div className="font-semibold text-sm">Chantre (Choriste)</div>
                      <div className="text-[10px] opacity-75 mt-1">Soprano, Alto, Ténor, Basse</div>
                    </button>
                    <button type="button"
                      onClick={() => setRoleType('instrumentiste')}
                      className="rounded-2xl border-2 border-border p-5 text-center hover:border-primary/50 transition-all bg-card flex flex-col items-center justify-center min-h-[140px]">
                      <Music className="w-8 h-8 mb-2 text-indigo-500" />
                      <div className="font-semibold text-sm">Instrumentiste</div>
                      <div className="text-[10px] opacity-75 mt-1">Piano, Guitare, Basse, Batterie...</div>
                    </button>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setStep(1)}
                      className="w-full py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-all flex items-center justify-center gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Retour
                    </button>
                  </div>
                </>
              ) : roleType === 'chantre' ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <button type="button" onClick={() => { setRoleType(null); setVoice(null); }} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                      <ArrowLeft className="w-3.5 h-3.5" /> Changer de rôle (Chantre)
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {VOICES.map(v => (
                      <button key={v.value} type="button"
                        onClick={() => { setVoice(v.value); setVoiceUnknown(false); }}
                        className={cn(
                          'relative rounded-xl border-2 p-4 text-left transition-all',
                          voice === v.value && !voiceUnknown ? v.color : 'border-border bg-card hover:border-muted-foreground/30',
                        )}>
                        {voice === v.value && !voiceUnknown && (
                          <Check className="absolute top-2 right-2 w-4 h-4" />
                        )}
                        <Mic2 className="w-5 h-5 mb-2" />
                        <div className="font-semibold text-sm">{v.label}</div>
                        <div className="text-xs opacity-70 mt-0.5">{v.desc}</div>
                      </button>
                    ))}
                  </div>
                  <button type="button"
                    onClick={() => { setVoiceUnknown(!voiceUnknown); setVoice(null); }}
                    className={cn(
                      'w-full rounded-xl border-2 p-3 flex items-center gap-3 text-left transition-all',
                      voiceUnknown ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card hover:border-muted-foreground/30 text-muted-foreground',
                    )}>
                    <HelpCircle className="w-5 h-5 shrink-0" />
                    <div>
                      <div className="font-semibold text-sm">Je ne sais pas encore</div>
                      <div className="text-xs opacity-70">Le maître de chœur évaluera votre voix</div>
                    </div>
                    {voiceUnknown && <Check className="w-4 h-4 ml-auto shrink-0" />}
                  </button>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setRoleType(null)}
                      className="px-4 py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-all flex items-center gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Retour
                    </button>
                    <button type="button" onClick={handleSignUpFinal} disabled={submitting}
                      className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      {submitting ? 'Création...' : 'Créer mon compte'}
                      {!submitting && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <button type="button" onClick={() => { setRoleType(null); setInstrument(null); }} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                      <ArrowLeft className="w-3.5 h-3.5" /> Changer de rôle (Instrumentiste)
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 animate-fade-in">
                    {INSTRUMENTS.map(ins => (
                      <button key={ins.value} type="button"
                        onClick={() => { setInstrument(ins.value); }}
                        className={cn(
                          'relative rounded-xl border-2 p-4 text-left transition-all',
                          instrument === ins.value ? ins.color : 'border-border bg-card hover:border-muted-foreground/30',
                        )}>
                        {instrument === ins.value && (
                          <Check className="absolute top-2 right-2 w-4 h-4" />
                        )}
                        <Music className="w-5 h-5 mb-2" />
                        <div className="font-semibold text-sm">{ins.label}</div>
                        <div className="text-xs opacity-70 mt-0.5">{ins.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setRoleType(null)}
                      className="px-4 py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-all flex items-center gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Retour
                    </button>
                    <button type="button" onClick={handleSignUpFinal} disabled={submitting}
                      className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      {submitting ? 'Création...' : 'Créer mon compte'}
                      {!submitting && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
            {mode === 'signin' ? (
              <>
                {'Vous n\'avez pas de compte ?'}{' '}
                <button onClick={() => { setMode('signup'); setStep(1); setError(null); setInfo(null); }}
                  className="font-bold text-primary hover:underline">
                  {"S'inscrire"}
                </button>
              </>
            ) : (
              <>
                {'Vous avez déjà un compte ?'}{' '}
                <button onClick={() => { setMode('signin'); setError(null); }}
                  className="font-bold text-primary hover:underline">
                  Se connecter
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
