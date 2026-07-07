'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Send, Mic, Music, Settings2, AlertCircle, Loader2,
  Bot, User, BrainCircuit, KeyRound, Lightbulb, CheckCircle2, ChevronRight,
  ArrowLeft, Bell, CheckCheck
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { GAP_LABELS, VOICE_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { playNotificationSound } from '@/lib/audio';

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
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [viewMode, setViewMode] = useState<'wheel' | 'chat'>('wheel');

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
    setShowKeyModal(false);
    setErrorMsg('');
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    setViewMode('chat'); // Automatically switch to chat view when a message is sent

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
      if (err.message.includes('Clé API') || err.message.includes('key')) {
        setShowKeyModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

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
        return `${prefix}<li class="text-white/80 text-sm">${itemContent}</li>`;
      } else {
        const suffix = inList ? '</ul>' : '';
        inList = false;
        return trimmed ? `${suffix}<p class="mb-2 leading-relaxed text-sm text-white/80">${line}</p>` : `${suffix}<div class="h-2"></div>`;
      }
    });

    if (inList) {
      formattedLines.push('</ul>');
    }

    return formattedLines.join('');
  };

  if (initLoading) {
    return (
      <div className="mx-auto max-w-md h-[80vh] flex flex-col justify-center space-y-4 p-6">
        <div className="h-10 w-48 rounded bg-white/5 animate-pulse" />
        <div className="h-48 w-full rounded-3xl bg-white/5 animate-pulse" />
        <div className="h-20 w-full rounded-3xl bg-white/5 animate-pulse" />
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

  // Options satellites arranged in polar translations: radius = 105px
  const satellites = [
    { icon: '🎤', label: 'Chant', angle: 270, onClick: () => handleSend("Donne-moi 3 exercices d'échauffement rapide pour la voix avant une répétition.") },
    { icon: '🌬️', label: 'Respiration', angle: 315, onClick: () => handleSend("Peux-tu m'expliquer comment bien respirer par le diaphragme pour chanter ?") },
    { icon: '🎶', label: 'Justesse', angle: 0, onClick: () => handleSend("Quels exercices me conseilles-tu pour corriger un problème de justesse vocale ?") },
    { icon: '🕒', label: 'Tempo', angle: 45, onClick: () => handleSend("Donne-moi un exercice pratique pour améliorer mon rythme et mon tempo au métronome.") },
    { icon: '🎸', label: 'Accords', angle: 90, onClick: () => handleSend("Comment puis-je apprendre à enrichir des accords simples pour donner plus de relief aux cantiques ?") },
    { icon: '🎙️', label: 'IA Tips', angle: 135, onClick: () => handleSend("Quels sont les meilleurs conseils de technique vocale ou de jeu pour le service du chœur aujourd'hui ?") },
    { icon: '📊', label: 'Diagnostic', angle: 180, onClick: () => setShowDiagnosticsModal(true) },
    { icon: '⚙️', label: 'Clé API', angle: 225, onClick: () => setShowKeyModal(true) }
  ];

  const categoryPills = [
    { label: 'Échauffement', prompt: "Donne-moi un échauffement vocal complet en 5 minutes" },
    { label: 'Tempo & Rythme', prompt: "Donne-moi un exercice de rythme pour travailler mon tempo" },
    { label: 'Respiration', prompt: "Comment chanter les notes aiguës en utilisant la respiration abdominale ?" },
    { label: 'Justesse', prompt: "Quels sont les meilleurs exercices pour travailler la justesse vocale ?" }
  ];

  return (
    <div className="relative min-h-[82vh] rounded-3xl overflow-hidden flex flex-col items-center justify-between p-4 sm:p-6 text-white shadow-2xl max-w-md mx-auto"
      style={{
        background: 'radial-gradient(circle at 50% 25%, rgba(99, 102, 241, 0.16), transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.12), transparent 45%), #07090e',
      }}>
      
      {/* ── Header ── */}
      <header className="w-full flex items-center justify-between z-10 py-2">
        <div className="flex items-center gap-2">
          {viewMode === 'chat' ? (
            <button onClick={() => setViewMode('wheel')}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-4.5 h-4.5 text-white/80" />
            </button>
          ) : (
            <Link href="/"
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-4.5 h-4.5 text-white/80" />
            </Link>
          )}
        </div>
        <span className="font-display font-bold text-sm tracking-wide text-white/95">Coach IA</span>
        <button onClick={() => playNotificationSound()}
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <Bell className="w-4.5 h-4.5 text-white/80 animate-pulse" />
        </button>
      </header>

      {viewMode === 'wheel' ? (
        /* ─── WHEEL VIEW ─── */
        <div className="flex-1 w-full flex flex-col items-center justify-evenly py-4 z-10">
          
          {/* Welcome Text */}
          <div className="text-center max-w-[280px]">
            <h2 className="font-display text-xl font-bold text-white tracking-tight">
              Bienvenue {profile?.display_name || 'Natasha'}
            </h2>
            <p className="text-[11px] text-white/50 mt-1.5 leading-relaxed">
              Choisissez un sujet sur la roue ou posez directement votre question pour lancer le diagnostic.
            </p>
          </div>

          {/* Glowing Circular Interactive Wheel */}
          <div className="relative w-64 h-64 flex items-center justify-center my-6">
            <div className="absolute w-44 h-44 rounded-full bg-emerald-500/10 blur-2xl animate-pulse" />
            <div className="absolute w-56 h-56 rounded-full border border-white/5 pointer-events-none" />
            
            {/* Satellites */}
            {satellites.map((s) => {
              const rad = (s.angle * Math.PI) / 180;
              const x = Math.round(Math.cos(rad) * 105);
              const y = Math.round(Math.sin(rad) * 105);
              return (
                <button
                  key={s.label}
                  onClick={s.onClick}
                  className="absolute w-11 h-11 rounded-full flex flex-col items-center justify-center bg-white/5 border border-white/10 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:scale-110 active:scale-95 transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.3)] group"
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                >
                  <span className="text-base">{s.icon}</span>
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-extrabold text-white/40 group-hover:text-emerald-400 whitespace-nowrap tracking-wide uppercase transition-colors">
                    {s.label}
                  </span>
                </button>
              );
            })}

            {/* Central Glowing Star */}
            <button 
              onClick={() => handleSend("Bonjour ! Donne-moi un conseil général pour progresser aujourd'hui.")}
              className="z-10 w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-400 text-[#071008] flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 transition-all"
            >
              <Sparkles className="w-6 h-6 fill-current animate-pulse" />
            </button>
          </div>

          {/* Category Capsules */}
          <div className="w-full">
            <div className="flex items-center gap-1.5 flex-wrap justify-center px-2">
              {categoryPills.map((pill) => (
                <button
                  key={pill.label}
                  onClick={() => handleSend(pill.prompt)}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-emerald-500/30 transition-all text-white/70"
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      ) : (
        /* ─── CHAT VIEW ─── */
        <div className="flex-1 w-full flex flex-col justify-between overflow-hidden my-4 z-10">
          
          {/* Scrollable messages container */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2 no-scrollbar max-h-[50vh]">
            {messages.map((msg, index) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div key={index}
                  className={cn(
                    'flex gap-2.5 max-w-[88%] animate-fade-in',
                    isAssistant ? 'mr-auto' : 'ml-auto flex-row-reverse'
                  )}>
                  <div className={cn(
                    'grid place-items-center w-7 h-7 rounded-lg shrink-0 text-[#071008] shadow-sm font-bold',
                    isAssistant ? 'bg-emerald-500' : 'bg-white/10 text-white border border-white/10'
                  )}>
                    {isAssistant ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>
                  <div className={cn(
                    'rounded-2xl p-3 text-xs leading-relaxed border',
                    isAssistant
                      ? 'bg-white/5 border-white/5 text-white/95 rounded-tl-sm'
                      : 'bg-emerald-500 text-[#071008] border-transparent font-medium rounded-tr-sm'
                  )}>
                    <div
                      dangerouslySetInnerHTML={{ __html: isAssistant ? formatMessage(msg.content) : msg.content }}
                      className="whitespace-pre-line"
                    />
                    <div className={cn(
                      'text-[8px] mt-1.5 text-right opacity-60 tabular-nums',
                      isAssistant ? 'text-white/40' : 'text-[#071008]/60'
                    )}>
                      {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2.5 max-w-[85%] animate-pulse">
                <div className="grid place-items-center w-7 h-7 rounded-lg bg-emerald-500 text-[#071008] shrink-0 shadow-sm">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="rounded-2xl p-3 bg-white/5 border border-white/5 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-450" />
                  <span className="text-[10px] text-white/50">Maestro formule ses conseils...</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-[10px] text-destructive font-medium flex items-start gap-1.5 max-w-[90%]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Erreur de communication</div>
                  <p className="mt-0.5 opacity-90">{errorMsg}</p>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

        </div>
      )}

      {/* ── Bottom Input Capsule ── */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
        className="w-full z-10 px-1 py-2 mt-auto">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5">
          <button type="button" onClick={() => setShowDiagnosticsModal(true)}
            className="text-white/40 hover:text-emerald-400 transition-colors shrink-0">
            <Mic className="w-4 h-4" />
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Posez-moi une question..."
            disabled={loading}
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-white/30 text-white"
          />
          <button type="submit" disabled={!input.trim() || loading}
            className="w-7 h-7 rounded-xl bg-emerald-500 text-[#071008] grid place-items-center hover:bg-emerald-400 disabled:opacity-50 transition-colors shrink-0">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* ─── DIALOG MODALS (Glassmorphic) ─── */}

      {/* Modal API Key */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-[#07090e]/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-xs rounded-3xl border border-white/10 bg-[#0c0f16]/90 p-5 space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2 text-emerald-400">
              <KeyRound className="w-4.5 h-4.5" />
              <h3 className="font-bold text-xs uppercase tracking-wider">Clé API Gemini</h3>
            </div>
            <p className="text-[10px] text-white/50 leading-relaxed">
              Saisissez votre clé Google AI Studio personnelle. Elle sera stockée localement dans votre navigateur.
            </p>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={customKey}
              onChange={e => setCustomKey(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-white outline-none focus:border-emerald-500/50 font-mono"
            />
            <div className="flex justify-end gap-1.5 text-[10px] font-bold">
              <button type="button" onClick={() => { setShowKeyModal(false); }} 
                className="px-3.5 py-1.5 rounded-lg border border-white/10 text-white/70 hover:bg-white/5">
                Annuler
              </button>
              <button type="button" onClick={() => { saveApiKey(customKey); setShowKeyModal(false); }} 
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-[#071008] hover:bg-emerald-400">
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Diagnostics */}
      {showDiagnosticsModal && (
        <div className="fixed inset-0 z-50 bg-[#07090e]/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-xs rounded-3xl border border-white/10 bg-[#0c0f16]/90 p-5 space-y-4 shadow-2xl max-h-[75vh] overflow-y-auto relative no-scrollbar">
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2 text-emerald-400">
              <BrainCircuit className="w-4.5 h-4.5" />
              <h3 className="font-bold text-xs uppercase tracking-wider">Votre Diagnostic</h3>
            </div>
            
            <div className="space-y-3.5 py-1 text-xs">
              <div>
                <span className="text-[9px] text-white/40 uppercase block">Profil de service</span>
                <span className="font-semibold text-white mt-0.5 flex items-center gap-1.5">
                  {isMusician ? <Music className="w-3.5 h-3.5 text-emerald-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                  {isMusician ? `Instrumentiste (${instrumentName})` : `Chantre (${profile?.voice_part ? VOICE_LABELS[profile.voice_part as keyof typeof VOICE_LABELS] : 'À évaluer'})`}
                </span>
              </div>

              {stats && (
                <div>
                  <span className="text-[9px] text-white/40 uppercase block">Entraînement</span>
                  <span className="font-semibold text-white mt-0.5">
                    Niveau {stats.level} · {stats.total_xp} XP accumulés
                  </span>
                </div>
              )}

              <div>
                <span className="text-[9px] text-white/40 uppercase block mb-1">Points critiques à travailler</span>
                {gaps.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-[10px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Aucun point bloquant
                  </div>
                ) : (
                  <div className="space-y-1">
                    {gaps.map(g => (
                      <div key={g.id} className="p-2 rounded-lg border border-white/5 bg-white/5 text-white flex items-center justify-between text-[11px]">
                        <span>{GAP_LABELS[g.category as keyof typeof GAP_LABELS]}</span>
                        <span className="text-[9px] text-emerald-400 font-bold px-1.5 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20 shrink-0">Sév. {g.severity}/3</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button type="button" onClick={() => setShowDiagnosticsModal(false)} 
                className="px-4 py-2 rounded-xl bg-emerald-500 text-[#071008] text-[11px] font-bold hover:bg-emerald-400">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
