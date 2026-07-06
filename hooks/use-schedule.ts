'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { HymnScheduleEntry } from '@/lib/types';

/** Calendrier du répertoire, synchronisé en temps réel. */
export function useSchedule(fromDate?: string, toDate?: string) {
  const [entries, setEntries] = useState<HymnScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    let query = supabase
      .from('hymn_schedule')
      .select('*, hymns(*)')
      .order('scheduled_date', { ascending: true })
      .order('sort_order', { ascending: true });
    if (fromDate) query = query.gte('scheduled_date', fromDate);
    if (toDate) query = query.lte('scheduled_date', toDate);
    const { data } = await query;
    setEntries((data as HymnScheduleEntry[]) || []);
    setLoading(false);
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchEntries();

    const channel = supabase
      .channel('schedule-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hymn_schedule' }, () => {
        fetchEntries();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEntries]);

  return { entries, loading, refresh: fetchEntries };
}

/** Formatage AAAA-MM-JJ en local. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
