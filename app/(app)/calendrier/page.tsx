'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, ChevronDown, CalendarDays, Music,
  Settings, Mail, ArrowUpRight, ShieldCheck, Lock, Sparkles, Mic,
  Volume2, AlertCircle, RefreshCw
} from 'lucide-react';
import { useSchedule, toDateKey } from '@/hooks/use-schedule';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { OCCASION_LABELS, type HymnScheduleEntry, type Occasion } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type ViewMode = 'jour' | 'semaine' | 'mois';

const OCCASION_COLORS: Record<Occasion, string> = {
  culte: 'bg-indigo-50 text-indigo-700 border-indigo-200/50 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800/30',
  repetition: 'bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30',
  concert: 'bg-rose-50 text-rose-700 border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/30',
  evenement: 'bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30',
};

const DAY_INITIALS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function CalendrierPage() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>('semaine');
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [attendanceRate, setAttendanceRate] = useState<number>(94);
  const [showViewDropdown, setShowViewDropdown] = useState(false);

  // Génération des jours de la semaine (Dimanche à Samedi) contenant le jour d'ancrage (anchor)
  const days = useMemo(() => {
    const current = new Date(anchor);
    const dayOfWeek = current.getDay(); // 0 pour Dimanche, 1 pour Lundi...
    
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - dayOfWeek); // Se positionne sur le Dimanche
    startOfWeek.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }, [anchor]);

  // Synchronisation de la date sélectionnée lors du changement de semaine
  useEffect(() => {
    const dayKeys = days.map(d => toDateKey(d));
    if (!dayKeys.includes(selectedDateKey)) {
      const todayKey = toDateKey(new Date());
      if (dayKeys.includes(todayKey)) {
        setSelectedDateKey(todayKey);
      } else {
        setSelectedDateKey(dayKeys[0]); // Par défaut, le premier jour de la semaine (Dimanche)
      }
    }
  }, [days, selectedDateKey]);

  // Définition de la plage de dates pour la requête
  const { from, to } = useMemo(() => {
    if (view === 'jour') {
      const activeDate = new Date(selectedDateKey + 'T00:00:00');
      return { from: toDateKey(activeDate), to: toDateKey(activeDate) };
    }
    if (view === 'semaine') {
      return { from: toDateKey(days[0]), to: toDateKey(days[6]) };
    }
    // Vue Mois : du 1er au dernier jour du mois de l'ancre
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { from: toDateKey(start), to: toDateKey(end) };
  }, [anchor, view, days, selectedDateKey]);

  // Appel de l'API Supabase via le hook temps réel
  const { entries, loading } = useSchedule(from, to);

  // Récupération dynamique du taux de présence de l'utilisateur
  useEffect(() => {
    async function fetchAttendance() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('attendance')
          .select('status')
          .eq('user_id', user.id);
        
        if (data && data.length > 0) {
          const present = data.filter((a) => a.status === 'present' || a.status === 'retard').length;
          setAttendanceRate(Math.round((present / data.length) * 100));
        }
      } catch (err) {
        console.error('Erreur lors de la récupération de la présence:', err);
      }
    }
    fetchAttendance();
  }, [user]);

  // Organisation des données par date
  const byDate = useMemo(() => {
    const map = new Map<string, HymnScheduleEntry[]>();
    for (const e of entries) {
      const list = map.get(e.scheduled_date) || [];
      list.push(e);
      map.set(e.scheduled_date, list);
    }
    return map;
  }, [entries]);

  // Calcul des statistiques de la période affichée (Semaine ou Mois)
  const stats = useMemo(() => {
    const uniqueHymns = new Set(entries.filter(e => e.hymn_id).map(e => e.hymn_id));
    const rehearsals = entries.filter(e => e.occasion === 'repetition');
    return {
      hymnsCount: uniqueHymns.size,
      rehearsalsCount: rehearsals.length,
    };
  }, [entries]);

  // Navigation dans le temps (Semaine / Mois / Jour)
  const navigate = (dir: -1 | 1) => {
    const d = new Date(anchor);
    if (view === 'jour') {
      const activeDate = new Date(selectedDateKey + 'T00:00:00');
      activeDate.setDate(activeDate.getDate() + dir);
      setSelectedDateKey(toDateKey(activeDate));
      setAnchor(activeDate);
    } else if (view === 'semaine') {
      d.setDate(d.getDate() + dir * 7);
      setAnchor(d);
    } else {
      d.setMonth(d.getMonth() + dir);
      setAnchor(d);
    }
  };

  // Libellé de la période courante
  const periodLabel = useMemo(() => {
    if (view === 'jour') {
      const activeDate = new Date(selectedDateKey + 'T00:00:00');
      return activeDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (view === 'semaine') {
      return `Semaine du ${days[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${days[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return anchor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }, [view, anchor, days, selectedDateKey]);

  // Événements pour le jour sélectionné
  const selectedDayEntries = useMemo(() => {
    return byDate.get(selectedDateKey) || [];
  }, [byDate, selectedDateKey]);

  const todayKey = toDateKey(new Date());

  // Liste des jours du mois si la vue Mois est sélectionnée
  const monthDays = useMemo(() => {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const list: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      list.push(new Date(d));
    }
    return list;
  }, [anchor]);

  return (
    <div className="max-w-md mx-auto space-y-4 select-none pb-20 md:pb-6">
      
      {/* ─── EN-TÊTE SOMBRE ARRONDI ─── */}
      <div className="bg-[#0D0E10] text-white rounded-[2.25rem] p-6 shadow-2xl space-y-6 relative overflow-hidden border border-white/5">
        
        {/* Glow décoratif en arrière-plan */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-violet-600/10 blur-[64px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-[#4ADE80]/5 blur-[64px] pointer-events-none" />

        {/* Barre d'outils supérieure */}
        <div className="flex items-center justify-between relative z-10">
          <Link href="/profil" className="w-10 h-10 rounded-full bg-[#1A1C1E] flex items-center justify-center text-white/80 hover:bg-white/10 hover:text-white transition-all active:scale-95 border border-white/5">
            <Settings className="w-4.5 h-4.5" />
          </Link>
          
          {/* Sélecteur de vue central avec Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowViewDropdown(!showViewDropdown)}
              className="bg-[#1A1C1E] text-white hover:bg-[#25282B] px-4 py-2 rounded-full flex items-center gap-1.5 transition-all active:scale-95 text-xs font-bold border border-white/5 tracking-wide uppercase"
            >
              <span>Vue {view}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 opacity-60 transition-transform duration-200", showViewDropdown && "rotate-180")} />
            </button>

            {showViewDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowViewDropdown(false)} />
                <div className="absolute top-11 left-1/2 -translate-x-1/2 bg-[#1A1C1E] border border-white/10 rounded-2xl py-1.5 shadow-2xl z-50 w-32 animate-fade-in">
                  {(['semaine', 'mois', 'jour'] as ViewMode[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        setView(v);
                        setShowViewDropdown(false);
                      }}
                      className={cn(
                        "w-full text-center px-4 py-2 text-xs font-semibold capitalize hover:bg-white/10 transition-colors block text-left",
                        view === v ? "text-[#4ADE80] font-bold" : "text-white/60"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <Link href="/messages" className="w-10 h-10 rounded-full bg-[#1A1C1E] flex items-center justify-center text-white/80 hover:bg-white/10 hover:text-white transition-all active:scale-95 border border-white/5">
            <Mail className="w-4.5 h-4.5" />
          </Link>
        </div>

        {/* Section Titre / Info de la période */}
        <div className="space-y-1 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#4ADE80] tracking-widest uppercase">
              {view === 'semaine' ? "Cette semaine" : view === 'mois' ? "Ce mois" : "Aujourd'hui"}
            </span>
            
            {/* Flèches de navigation de période */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => navigate(-1)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                title="Période précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setAnchor(new Date());
                  setSelectedDateKey(toDateKey(new Date()));
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-[#4ADE80] hover:text-[#4ADE80]/80 transition-colors"
                title="Aujourd'hui"
              >
                <CalendarDays className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(1)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                title="Période suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <h2 className="text-lg font-extrabold tracking-tight capitalize text-white">
            {periodLabel}
          </h2>
        </div>

        {/* ─── CALENDRIER HEBDOMADAIRE (VUE SEMAINE) ─── */}
        {view === 'semaine' && (
          <div className="flex items-center justify-between gap-1 pt-2">
            {days.map((d, index) => {
              const key = toDateKey(d);
              const isSelected = key === selectedDateKey;
              const hasEvents = (byDate.get(key)?.length ?? 0) > 0;
              const isToday = key === todayKey;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDateKey(key)}
                  className={cn(
                    "flex flex-col items-center py-2 px-1 w-11 rounded-2xl transition-all duration-200 relative",
                    isSelected
                      ? "border border-[#7C3AED] bg-[#16171A] scale-105 shadow-md shadow-[#7C3AED]/10"
                      : "bg-[#161719]/40 hover:bg-[#1A1C1E]/60"
                  )}
                >
                  {/* Point indicateur d'événements */}
                  {hasEvents && (
                    <span className={cn(
                      "absolute top-1.5 w-1 h-1 rounded-full",
                      isSelected ? "bg-white" : "bg-[#7C3AED]"
                    )} />
                  )}

                  {/* Initiale du jour */}
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider mb-1",
                    isSelected ? "text-white/60" : isToday ? "text-[#4ADE80]" : "text-white/40"
                  )}>
                    {DAY_INITIALS[index]}
                  </span>

                  {/* Numéro du jour */}
                  <span className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs",
                    isSelected 
                      ? "bg-white text-black font-extrabold shadow-sm" 
                      : isToday 
                        ? "text-[#4ADE80] border border-[#4ADE80]/30 font-semibold"
                        : "text-white/80"
                  )}>
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ─── VUE JOUR SEUL ─── */}
        {view === 'jour' && (
          <div className="py-2 flex justify-center">
            <div className="bg-[#16171A] rounded-2xl py-3 px-6 text-center border border-white/5">
              <span className="text-[10px] font-bold text-[#4ADE80] uppercase tracking-widest block mb-1">Date Active</span>
              <span className="text-2xl font-extrabold text-white">
                {new Date(selectedDateKey + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </span>
            </div>
          </div>
        )}

      </div>

      {/* ─── SECTION INFÉRIEURE CLAIRE / LAVANDE CONTRASTÉE ─── */}
      <div className="bg-[#F0EDFC] text-[#111118] rounded-[2.25rem] p-5 space-y-5 shadow-lg">

        {/* Titre de l'aperçu */}
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-[#111118]/80 uppercase">
            Aperçu de la période
          </h3>
        </div>

        {/* Grille des statistiques et Score */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Colonne Gauche : Mini Cartes Stats */}
          <div className="flex flex-col gap-4">
            
            {/* Carte 1 : Total Cantiques */}
            <Link 
              href="/cantiques"
              className="bg-white rounded-3xl p-4 flex flex-col justify-between h-28 shadow-sm hover:shadow-md transition-all active:scale-98 relative group"
            >
              <div className="flex items-start justify-between w-full">
                <span className="text-[10px] font-bold text-black/40 uppercase tracking-wide">
                  Cantiques
                </span>
                <span className="w-6 h-6 rounded-full bg-black/[0.04] group-hover:bg-[#7C3AED]/10 flex items-center justify-center text-black/50 group-hover:text-[#7C3AED] transition-colors">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <span className="text-3xl font-black text-black">
                  {loading ? '...' : stats.hymnsCount}
                </span>
                <span className="text-[10px] text-black/40 block font-semibold mt-1">
                  programmés
                </span>
              </div>
            </Link>

            {/* Carte 2 : Répétitions */}
            <Link 
              href="/repetitions"
              className="bg-white rounded-3xl p-4 flex flex-col justify-between h-28 shadow-sm hover:shadow-md transition-all active:scale-98 relative group"
            >
              <div className="flex items-start justify-between w-full">
                <span className="text-[10px] font-bold text-black/40 uppercase tracking-wide">
                  Répétitions
                </span>
                <span className="w-6 h-6 rounded-full bg-black/[0.04] group-hover:bg-[#7C3AED]/10 flex items-center justify-center text-black/50 group-hover:text-[#7C3AED] transition-colors">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <span className="text-3xl font-black text-black">
                  {loading ? '...' : stats.rehearsalsCount}
                </span>
                <span className="text-[10px] text-black/40 block font-semibold mt-1">
                  cette semaine
                </span>
              </div>
            </Link>

          </div>

          {/* Colonne Droite : Carte Score Violet Dégradé (Présence) */}
          <Link 
            href="/profil"
            className="bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] rounded-3xl p-4 flex flex-col justify-between h-60 shadow-lg text-white hover:opacity-95 transition-all active:scale-98 relative group"
          >
            <div className="flex items-start justify-between w-full">
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-wide">
                Présence
              </span>
              <span className="w-6 h-6 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
            
            <div className="my-2">
              <p className="text-[10px] leading-snug text-white/75 font-medium line-clamp-4">
                Maintenez un score d'assiduité élevé en participant aux répétitions et célébrations planifiées par la direction.
              </p>
            </div>

            <div>
              <span className="text-4xl font-black tracking-tight text-white block">
                {attendanceRate}%
              </span>
              <span className="text-[9px] text-white/60 uppercase font-bold tracking-wider mt-1 block">
                Assiduité globale
              </span>
            </div>
          </Link>

        </div>

        {/* ─── BANNIÈRE MODE RÉPÉTITION IA (STYLE MAQUETTE) ─── */}
        <div className="bg-[#0D0E10] text-white rounded-3xl p-5 relative overflow-hidden flex flex-col gap-4 shadow-xl border border-white/5">
          {/* Lueur décorative */}
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-purple-500/20 blur-[32px] pointer-events-none" />

          {/* Illustration 3D SVG Padlock & Shield flottante à droite */}
          <div className="absolute right-4 top-4 w-16 h-16 pointer-events-none opacity-90">
            <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
              <defs>
                <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C084FC" />
                  <stop offset="100%" stopColor="#7C3AED" />
                </linearGradient>
                <linearGradient id="lockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E8D5FF" />
                  <stop offset="100%" stopColor="#A855F7" />
                </linearGradient>
              </defs>
              {/* Shield */}
              <path d="M50 15 L80 25 C80 50, 65 75, 50 85 C35 75, 20 50, 20 25 Z" fill="url(#shieldGrad)" opacity="0.35" />
              <path d="M50 20 L75 29 C75 51, 62 72, 50 80 C38 72, 25 51, 25 29 Z" stroke="url(#shieldGrad)" strokeWidth="4" fill="none" />
              {/* Lock Body */}
              <rect x="36" y="48" width="28" height="22" rx="6" fill="url(#lockGrad)" />
              {/* Lock Shackle */}
              <path d="M42 48 V40 A8 8 0 0 1 58 40 V48" stroke="url(#lockGrad)" strokeWidth="4" strokeLinecap="round" fill="none" />
              {/* Keyhole */}
              <circle cx="50" cy="57" r="2.5" fill="#0D0E10" />
              <path d="M50 58.5 L50 64" stroke="#0D0E10" strokeWidth="2.5" strokeLinecap="round" />
              {/* Checkmark */}
              <path d="M15 45 L25 55 L45 30" stroke="#4ADE80" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
            </svg>
          </div>

          <div className="space-y-1 relative z-10">
            <h4 className="text-xs font-bold text-[#4ADE80] uppercase tracking-widest">
              Lumina Vocal Coach
            </h4>
            <h3 className="text-sm font-black text-white">
              Entraînement IA Assisté
            </h3>
            <p className="text-[11px] leading-normal text-white/50 max-w-[65%]">
              Lancez le Coach IA pour évaluer votre justesse et analyser votre voix sur le répertoire de la semaine.
            </p>
          </div>

          <Link
            href="/coach"
            className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white py-3 rounded-2xl text-xs font-bold text-center w-full shadow-md active:scale-98 transition-all block relative z-10"
          >
            Lancer le Coach IA
          </Link>
        </div>

        {/* ─── PROGRAMME HEBDOMADAIRE / LIGNE DE TEMPS DU JOUR SÉLECTIONNÉ ─── */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-black/60 uppercase tracking-widest">
              Au programme le {new Date(selectedDateKey + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
            </h4>
            <span className="text-[10px] bg-black/[0.04] text-black/50 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {selectedDayEntries.length} {selectedDayEntries.length > 1 ? 'activités' : 'activité'}
            </span>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-2xl bg-white/40" />
            </div>
          ) : selectedDayEntries.length === 0 ? (
            <div className="bg-white/40 border border-dashed border-black/10 rounded-2xl py-6 px-4 text-center">
              <p className="text-xs font-semibold text-black/40">
                Aucun cantique ni répétition programmés pour cette journée.
              </p>
              <p className="text-[10px] text-black/30 mt-1">
                Profitez-en pour réviser votre répertoire libre !
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayEntries.map((e) => (
                <div 
                  key={e.id}
                  className="bg-white rounded-2xl p-4 flex items-center justify-between border border-black/5 hover:border-black/10 transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#F0EDFC] text-[#7C3AED] flex items-center justify-center shrink-0">
                      <Music className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      {e.hymns ? (
                        <Link 
                          href={`/cantiques/${e.hymns.id}`} 
                          className="font-extrabold text-xs text-black hover:text-[#7C3AED] transition-colors block truncate"
                        >
                          {e.hymns.number != null && (
                            <span className="font-mono text-[10px] text-black/40 mr-1">
                              N°{e.hymns.number}
                            </span>
                          )}
                          {e.hymns.title}
                        </Link>
                      ) : (
                        <span className="font-semibold text-xs text-black/50 italic block truncate">
                          {e.notes || 'Note de direction'}
                        </span>
                      )}
                      {e.hymns && e.notes && (
                        <p className="text-[10px] text-black/45 truncate mt-0.5">
                          {e.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={cn('text-[9px] font-bold px-2 py-0.5 tracking-wide rounded-md uppercase border-none', OCCASION_COLORS[e.occasion])}>
                      {OCCASION_LABELS[e.occasion]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── VUE MOIS : LISTE MENSUELLE DES ÉVÉNEMENTS ─── */}
        {view === 'mois' && (
          <div className="space-y-3 pt-3 border-t border-black/5">
            <h4 className="text-xs font-bold text-black/60 uppercase tracking-widest">
              Vue mensuelle ({anchor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })})
            </h4>
            
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-2xl bg-white/40" />
              </div>
            ) : entries.length === 0 ? (
              <div className="bg-white/40 rounded-2xl py-8 px-4 text-center">
                <p className="text-xs text-black/40 font-semibold">Aucun événement ce mois-ci.</p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {entries.map((e) => {
                  const entryDate = new Date(e.scheduled_date + 'T00:00:00');
                  return (
                    <button
                      key={e.id}
                      onClick={() => {
                        setSelectedDateKey(e.scheduled_date);
                        setView('semaine'); // Bascule vers la vue semaine pour focus sur ce jour
                        setAnchor(entryDate);
                      }}
                      className="w-full text-left bg-white/60 hover:bg-white rounded-xl p-3 flex items-center justify-between border border-black/5 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-bold text-black/40 block uppercase">
                          {entryDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        <span className="font-extrabold text-xs text-black truncate block mt-0.5">
                          {e.hymns?.title || e.notes || 'Événement'}
                        </span>
                      </div>
                      <Badge variant="outline" className={cn('text-[8px] font-bold py-0.5 rounded uppercase border-none', OCCASION_COLORS[e.occasion])}>
                        {OCCASION_LABELS[e.occasion]}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
