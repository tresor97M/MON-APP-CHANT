'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Music, Filter, ChevronRight } from 'lucide-react';
import { useHymns } from '@/hooks/use-hymns';
import { cn } from '@/lib/utils';
import {
  HYMN_CATEGORIES, LEARNING_STATUS_LABELS, LEARNING_STATUS_COLORS,
  type HymnCategory, type LearningStatus,
} from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function CantiquesPage() {
  const { hymns, loading } = useHymns();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<HymnCategory | 'all'>('all');
  const [status, setStatus] = useState<LearningStatus | 'all'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return hymns.filter(h => {
      if (category !== 'all' && h.category !== category) return false;
      if (status !== 'all' && h.learning_status !== status) return false;
      if (!q) return true;
      return (
        h.title.toLowerCase().includes(q) ||
        (h.author || '').toLowerCase().includes(q) ||
        (h.composer || '').toLowerCase().includes(q) ||
        String(h.number || '').includes(q)
      );
    });
  }, [hymns, search, category, status]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Répertoire des cantiques</h1>
        <p className="text-sm text-muted-foreground">
          {hymns.length} cantique{hymns.length > 1 ? 's' : ''} — mis à jour en temps réel
        </p>
      </header>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un titre, un numéro, un auteur..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={category}
            onChange={e => setCategory(e.target.value as HymnCategory | 'all')}
            className="px-3 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground outline-none focus:border-primary"
            aria-label="Filtrer par catégorie"
          >
            <option value="all">Toutes catégories</option>
            {Object.entries(HYMN_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as LearningStatus | 'all')}
            className="px-3 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground outline-none focus:border-primary"
            aria-label="Filtrer par statut"
          >
            <option value="all">Tous statuts</option>
            {Object.entries(LEARNING_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-muted text-muted-foreground">
              <Music className="w-6 h-6" />
            </div>
            <p className="text-sm text-muted-foreground">
              {hymns.length === 0
                ? 'Aucun cantique dans le répertoire pour le moment.'
                : 'Aucun cantique ne correspond à vos filtres.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th scope="col" className="px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider w-16">N°</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Titre</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Auteur</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Tonalité</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Catégorie</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Statut</th>
                  <th scope="col" className="px-4 py-3 w-10"><span className="sr-only">Ouvrir</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => (
                  <tr key={h.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{h.number ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/cantiques/${h.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                        {h.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{h.author || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{h.musical_key || '—'}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">{HYMN_CATEGORIES[h.category]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn('text-[10px] font-semibold', LEARNING_STATUS_COLORS[h.learning_status])}>
                        {LEARNING_STATUS_LABELS[h.learning_status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/cantiques/${h.id}`} aria-label={`Ouvrir ${h.title}`}>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
