'use client';

import { useState } from 'react';
import { Search, ChevronDown, ChevronRight, BookOpen, Mic, Music, Users, HelpCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  {
    icon: BookOpen, title: 'Introduction', color: 'bg-primary/10 text-primary',
    articles: ['Démarrer avec Maestro Studio', 'Comment fonctionne l\'IA vocale ?', 'Naviguer dans l\'application'],
  },
  {
    icon: Mic, title: 'Entraînement Vocal', color: 'bg-secondary/10 text-secondary',
    articles: ['Comprendre vos résultats d\'analyse', 'Exercices de justesse — guide complet', 'Comment enregistrer une bonne prise', 'Interpréter les métriques de performance'],
  },
  {
    icon: Music, title: 'Parcours & Leçons', color: 'bg-accent/10 text-accent',
    articles: ['Comment choisir son parcours', 'Débloquer des niveaux avancés', 'Système d\'XP et de progression'],
  },
  {
    icon: Users, title: 'Communauté', color: 'bg-green-100 text-green-700',
    articles: ['Rejoindre une ligue', 'Utiliser le forum', 'Profil public et badges'],
  },
  {
    icon: Zap, title: 'Compte & Abonnement', color: 'bg-orange-100 text-orange-700',
    articles: ['Gérer son abonnement Premium', 'Supprimer son compte', 'Contacter le support'],
  },
];

export default function AidePage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<number | null>(0);

  const filtered = CATEGORIES.map(cat => ({
    ...cat,
    articles: cat.articles.filter(a => search === '' || a.toLowerCase().includes(search.toLowerCase()))
  })).filter(cat => cat.articles.length > 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto shadow-sm">
          <HelpCircle className="w-7 h-7" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">Help Center</h1>
        <p className="text-sm text-muted-foreground">Trouvez des réponses à toutes vos questions sur Maestro Studio.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un article..."
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-border bg-white text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 shadow-sm transition-all placeholder:text-muted-foreground"
        />
      </div>

      {/* Categories accordion */}
      <div className="space-y-3">
        {filtered.map((cat, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            <button onClick={() => setOpen(open === idx ? null : idx)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
              <div className={cn('w-9 h-9 rounded-xl grid place-items-center shrink-0', cat.color)}>
                <cat.icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold text-sm text-foreground">{cat.title}</div>
                <div className="text-[10px] text-muted-foreground">{cat.articles.length} article{cat.articles.length > 1 ? 's' : ''}</div>
              </div>
              {open === idx ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
            {open === idx && (
              <div className="border-t border-border">
                {cat.articles.map((article, aIdx) => (
                  <button key={aIdx} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors text-left group border-b border-border/40 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                    <span className="text-sm text-foreground/80 group-hover:text-primary transition-colors flex-1">{article}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 p-5 text-center">
        <p className="text-sm font-semibold text-foreground mb-1">Vous n&apos;avez pas trouvé votre réponse ?</p>
        <p className="text-xs text-muted-foreground mb-3">Posez votre question directement à la communauté ou contactez-nous.</p>
        <div className="flex justify-center gap-3">
          <a href="/communaute/question" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity">
            Poser une question
          </a>
          <a href="mailto:support@maestrostudio.app" className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors">
            Contacter le support
          </a>
        </div>
      </div>
    </div>
  );
}
