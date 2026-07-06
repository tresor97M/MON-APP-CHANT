'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Send, Mic, Music, Settings2, AlertCircle, Loader2,
  Bot, User, BrainCircuit, KeyRound, Lightbulb, CheckCircle2, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { GAP_LABELS, VOICE_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export default function CoachPage() {
  const { user, userProfile: profile } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [gaps, setGaps] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [customKey, setCustomKey] = useState('');
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load custom key from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('maestro_gemini_key') || '';
      setCustomKey(savedKey);
    }
  }, []);

  // Fetch Supabase data for the user
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [statsRes, gapsRes] = await Promise.all([
          supabase.from('choir_stats').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('skill_gaps').select('*').eq('user_id', user.id).neq('status', 'resolue'),
        ]);
        setStats(statsRes.data || null);
        setGaps(gapsRes.data || []);
      } catch (err) {
        console.error('Error loading coach details:', err);
      } finally {
        setInitLoading(false);
      }
    })();
  }, [user]);

  // Seed initial welcome message once profile and stats are loaded
  useEffect(() => {
    if (initLoading || !profile) return;
    if (messages.length === 0) {
      const isMusician = !!profile.instrument;
      const typeLabel = isMusician
        ? `Musicien (${profile.instrument})`
        : `Chantre (${profile.voice_part ? VOICE_LABELS[profile.voice_part as keyof typeof VOICE_LABELS] : 'Voix à évaluer'})`;

      setMessages([
        {
          role: 'assistant',
          content: `Bonjour **${profile.display_name}** ! 

Je suis ravi de t'accompagner. En tant que ton **Maestro Coach IA**, j'ai analysé ton profil de **${typeLabel}** et tes statistiques.

Je suis ici pour t'aider à progresser, que ce soit pour échauffer ta voix, travailler ta justesse, ton souffle, ou perfectionner ton jeu d'instrument et ton tempo au métronome.

Comment puis-je t'aider aujourd'hui ? Tu peux me poser des questions ou cliquer sur une suggestion ci-dessous !`,
          timestamp: new Date()
        }
      ]);
    }
  }, [initLoading, profile, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const saveApiKey = (key: string) => {
    setCustomKey(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('maestro_gemini_key', key);
    }
    setShowKeyPanel(false);
    setErrorMsg('');
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          profile,
          stats,
          gaps,
          customApiKey: customKey
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la communication avec le serveur.');
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date()
      }]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Une erreur est survenue.');
      // If error is about API key, open the key configuration panel
      if (err.message.includes('Clé API') || err.message.includes('key')) {
        setShowKeyPanel(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick suggestions based on profile type
  const suggestions = profile?.instrument
    ? [
        { label: '🕒 Exercice métronome', text: 'Peux-tu me donner un exercice pratique pour améliorer mon rythme et mon tempo au métronome ?' },
        { label: '🎹 Écoute chorale', text: 'Quelles sont les astuces pour qu’un musicien accompagne mieux les voix d’une chorale sans les couvrir ?' },
        { label: '🎸 Enrichir mes accords', text: 'Comment puis-je apprendre à enrichir des accords simples pour donner plus de relief aux cantiques ?' }
      ]
    : [
        { label: '🎤 Échauffement rapide', text: 'Donne-moi 3 exercices d’échauffement rapide pour la voix avant une répétition.' },
        { label: '🌬️ Respiration ventrale', text: 'Peux-tu m’expliquer comment bien respirer par le diaphragme pour chanter de longues phrases ?' },
        { label: '🎶 Notes aiguës', text: 'Comment puis-je atteindre mes notes aiguës sans forcer sur mes cordes vocales ?' }
      ];

  // Helper to format messages with basic markdown support
  const formatMessage = (text: string) => {
    let formatted = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Bold: **text** -> <strong>text</strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Bullet points: - item -> <li>item</li>
    const lines = formatted.split('\n');
    let inList = false;
    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        const itemContent = trimmed.substring(2);
        const prefix = !inList ? '<ul class="list-disc pl-5 my-2 space-y-1">' : '';
        inList = true;
        return `${prefix}<li class="text-slate-700 dark:text-slate-300 text-sm">${itemContent}</li>`;
      } else {
        const suffix = inList ? '</ul>' : '';
        inList = false;
        return trimmed ? `${suffix}<p class="mb-2 leading-relaxed text-sm text-slate-700 dark:text-slate-300">${line}</p>` : `${suffix}<div class="h-2"></div>`;
      }
    });

    if (inList) {
      formattedLines.push('</ul>');
    }

    return formattedLines.join('');
  };

  if (initLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
        <div className="h-10 w-48 rounded bg-muted animate-pulse" />
        <div className="h-48 w-full rounded-2xl bg-muted animate-pulse" />
        <div className="h-64 w-full rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  const isMusician = !!profile?.instrument;
  const instrumentName = profile?.instrument
    ? {
        piano: 'Piano / Clavier',
        guitare: 'Guitare',
        basse: 'Basse',
        batterie: 'Batterie',
        cuivres: 'Vents / Cuivres',
        autre: 'Instrument'
      }[profile.instrument] || profile.instrument
    : '';

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6 animate-fade-in pb-16">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-md">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              Maestro Coach IA
              <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">Bêta</Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Votre entraîneur personnel de technique {isMusician ? 'musicale' : 'vocale'} basé sur l'IA
            </p>
          </div>
        </div>

        {/* API Key Configure Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowKeyPanel(!showKeyPanel)}
          className="w-fit text-xs font-semibold gap-1.5 self-start sm:self-auto"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Clé API Gemini
        </Button>
      </header>

      {/* Clé API configuration panel */}
      {showKeyPanel && (
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-primary">
            <KeyRound className="w-5 h-5" />
            <h3 className="font-semibold text-sm">Configurer votre clé API Gemini</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Par défaut, l'application utilise la clé configurée sur le serveur. Si celle-ci n'est pas disponible ou si vous voulez utiliser votre propre quota, collez votre clé personnelle Google AI Studio ci-dessous. Elle sera sauvegardée localement dans votre navigateur.
          </p>
          <div className="flex gap-2 max-w-md">
            <Input
              type="password"
              placeholder="AIzaSy..."
              value={customKey}
              onChange={e => setCustomKey(e.target.value)}
              className="bg-background text-xs font-mono"
            />
            <Button size="sm" onClick={() => saveApiKey(customKey)}>Sauvegarder</Button>
            {customKey && (
              <Button size="sm" variant="ghost" onClick={() => saveApiKey('')} className="text-destructive hover:bg-destructive/10">
                Effacer
              </Button>
            )}
          </div>
        </section>
      )}

      {/* Diagnostic Panel based on user stats and gaps */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left Side: Stats and Info */}
        <div className="md:col-span-1 rounded-2xl border border-border bg-card p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2.5">
              <BrainCircuit className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Diagnostic de Louange</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Profil de service</div>
                <div className="font-semibold text-sm text-foreground flex items-center gap-1.5 mt-0.5">
                  {isMusician ? <Music className="w-4 h-4 text-indigo-500" /> : <Mic className="w-4 h-4 text-primary" />}
                  {isMusician ? `Instrumentiste (${instrumentName})` : `Chantre (${profile?.voice_part ? VOICE_LABELS[profile.voice_part as keyof typeof VOICE_LABELS] : 'À évaluer'})`}
                </div>
              </div>

              {stats && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">Entraînement</div>
                  <div className="text-xs font-semibold text-foreground mt-0.5">
                    Niveau {stats.level} · {stats.total_xp} XP accumulés
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] text-muted-foreground uppercase mb-1">Points critiques à travailler</div>
                {gaps.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                    <CheckCircle2 className="w-4 h-4" /> Aucun point bloquant
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {gaps.map(g => (
                      <div key={g.id} className="text-xs px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 flex items-center justify-between">
                        <span>{GAP_LABELS[g.category as keyof typeof GAP_LABELS]}</span>
                        <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-800 shrink-0">Sév. {g.severity}/3</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 p-3 border border-border">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Le Coach IA formule ses conseils en fonction de vos lacunes enregistrées par le chef de chœur. Plus vous validez vos cours, plus il adaptera son niveau !
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Chat Area */}
        <div className="md:col-span-2 rounded-2xl border border-border bg-card flex flex-col h-[500px] overflow-hidden shadow-sm">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {messages.map((msg, index) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={index}
                  className={cn(
                    'flex gap-3 max-w-[85%] animate-fade-in',
                    isAssistant ? 'mr-auto' : 'ml-auto flex-row-reverse'
                  )}
                >
                  <div className={cn(
                    'grid place-items-center w-8 h-8 rounded-xl shrink-0 text-white shadow-sm',
                    isAssistant ? 'bg-primary' : 'bg-slate-700'
                  )}>
                    {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className={cn(
                    'rounded-2xl p-3.5 text-sm border',
                    isAssistant
                      ? 'bg-muted/30 border-border text-foreground'
                      : 'bg-primary text-primary-foreground border-transparent'
                  )}>
                    <div
                      dangerouslySetInnerHTML={{ __html: isAssistant ? formatMessage(msg.content) : msg.content }}
                      className="whitespace-pre-line"
                    />
                    <div className={cn(
                      'text-[9px] mt-1.5 text-right opacity-60 tabular-nums',
                      isAssistant ? 'text-muted-foreground' : 'text-primary-foreground'
                    )}>
                      {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-3 max-w-[80%] animate-pulse">
                <div className="grid place-items-center w-8 h-8 rounded-xl bg-primary text-white shrink-0 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="rounded-2xl p-4 bg-muted/30 border border-border flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Maestro analyse et formule ses conseils...</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium flex items-start gap-2 max-w-[90%]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Erreur de communication</div>
                  <p className="mt-0.5 opacity-90">{errorMsg}</p>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Prompt Suggestions */}
          {messages.length < 5 && (
            <div className="px-4 py-2 border-t border-border bg-muted/10 flex flex-wrap gap-1.5">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s.text)}
                  disabled={loading}
                  className="text-[10px] font-semibold px-2.5 py-1.5 rounded-full border border-border bg-white text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center gap-1"
                >
                  {s.label}
                  <ChevronRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}

          {/* Chat Form */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="p-3 border-t border-border bg-card flex gap-2"
          >
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Posez une question technique, demandez un exercice..."
              disabled={loading}
              className="bg-muted/30 border-border text-sm outline-none focus:bg-background focus:border-primary transition-all"
            />
            <Button type="submit" disabled={!input.trim() || loading} className="shrink-0 rounded-xl px-4 py-2">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
