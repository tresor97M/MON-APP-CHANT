'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookMarked } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

type DueHymn = { hymn_id: string; title: string };

/**
 * Composant autonome (charge ses propres données) plutôt qu'intégré au
 * gros agrégateur de la page d'accueil, pour ne pas risquer de casser son
 * flux de chargement existant en le modifiant.
 */
export function ReviewsDueWidget() {
  const { user } = useAuth();
  const [due, setDue] = useState<DueHymn[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('hymn_progress')
      .select('hymn_id, hymns(title)')
      .eq('user_id', user.id)
      .lte('next_review_at', new Date().toISOString())
      .limit(5)
      .then(({ data }) => {
        setDue((data || []).map((d: any) => ({ hymn_id: d.hymn_id, title: d.hymns?.title || 'Cantique' })));
      });
  }, [user]);

  if (!due || due.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2.5">
      <div className="flex items-center gap-2">
        <BookMarked className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold text-foreground">
          {due.length} cantique{due.length > 1 ? 's' : ''} à réviser aujourd'hui
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {due.map((d) => (
          <Link
            key={d.hymn_id}
            href={`/cantiques/${d.hymn_id}`}
            className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-semibold text-foreground hover:border-amber-500/40 transition-colors"
          >
            {d.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
