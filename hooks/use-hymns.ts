'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Hymn } from '@/lib/types';

/** Liste des cantiques, synchronisée en temps réel via Supabase Realtime. */
export function useHymns() {
  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHymns = useCallback(async () => {
    const { data } = await supabase
      .from('hymns')
      .select('*')
      .order('number', { ascending: true, nullsFirst: false })
      .order('title', { ascending: true });
    setHymns(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHymns();

    const channel = supabase
      .channel('hymns-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hymns' }, () => {
        fetchHymns();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHymns]);

  return { hymns, loading, refresh: fetchHymns };
}
