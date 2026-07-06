'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, CalendarClock, MapPin, ClipboardCheck, Trash2, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { VOICE_LABELS, type Rehearsal, type RehearsalType, type VoicePart } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AttendanceSheet } from '@/components/admin/attendance-sheet';

const TYPE_LABELS: Record<RehearsalType, string> = {
  generale: 'Générale',
  pupitre: 'Pupitre',
  formation: 'Formation',
};

const EMPTY_FORM = {
  title: '', date: '', start: '18:00', end: '20:00',
  location: '', type: 'generale' as RehearsalType, voice_part: '' as VoicePart | '', objectives: '',
};

export default function AdminRepetitionsPage() {
  const { user } = useAuth();
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('rehearsals')
      .select('*')
      .order('rehearsal_date', { ascending: false });
    setRehearsals(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(
    () => [...rehearsals].filter(r => r.rehearsal_date >= todayKey).sort((a, b) => a.rehearsal_date.localeCompare(b.rehearsal_date)),
    [rehearsals, todayKey],
  );
  const past = useMemo(() => rehearsals.filter(r => r.rehearsal_date < todayKey), [rehearsals, todayKey]);

  const create = async () => {
    if (!form.title.trim() || !form.date) {
      setError('Titre et date sont obligatoires.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: e } = await supabase.from('rehearsals').insert({
      title: form.title.trim(),
      rehearsal_date: form.date,
      start_time: form.start,
      end_time: form.end,
      location: form.location.trim() || null,
      type: form.type,
      voice_part: form.type === 'pupitre' && form.voice_part ? form.voice_part : null,
      objectives: form.objectives.trim() || null,
      created_by: user?.id || null,
    });
    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    setForm(EMPTY_FORM);
    setDialogOpen(false);
    load();
  };

  const remove = async (r: Rehearsal) => {
    if (!confirm(`Supprimer « ${r.title} » ? RSVP et pointages liés seront supprimés.`)) return;
    await supabase.from('rehearsals').delete().eq('id', r.id);
    if (expandedId === r.id) setExpandedId(null);
    load();
  };

  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-muted-foreground';
  const labelCls = 'text-xs font-semibold text-muted-foreground';

  const renderCard = (r: Rehearsal, isPast: boolean) => {
    const expanded = expandedId === r.id;
    return (
      <article key={r.id} className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-5 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display font-bold text-foreground">{r.title}</h3>
                <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[r.type]}</Badge>
                {r.voice_part && <Badge variant="outline" className="text-[10px]">{VOICE_LABELS[r.voice_part]}</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4" aria-hidden="true" />
                  {new Date(r.rehearsal_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  {' · '}{r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}
                </span>
                {r.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" aria-hidden="true" /> {r.location}
                  </span>
                )}
              </div>
              {r.objectives && <p className="text-sm text-foreground/80">{r.objectives}</p>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : r.id)}
                className={cn(
                  'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors',
                  expanded ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-primary/50',
                )}
              >
                <ClipboardCheck className="w-4 h-4" />
                Pointage
                <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
              </button>
              <button
                type="button"
                onClick={() => remove(r)}
                aria-label={`Supprimer ${r.title}`}
                className="grid place-items-center w-9 h-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        {expanded && (
          <div className="border-t border-border bg-muted/20 p-5">
            <AttendanceSheet rehearsal={r} markerId={user?.id || null} />
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Répétitions</h1>
          <p className="text-sm text-muted-foreground">Planification, RSVP et pointage des présences</p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Nouvelle répétition
        </button>
      </header>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-foreground">À venir</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune répétition planifiée.</p>
            ) : (
              <div className="space-y-3">{upcoming.map(r => renderCard(r, false))}</div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-foreground">Passées</h2>
            {past.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune répétition passée.</p>
            ) : (
              <div className="space-y-3">{past.slice(0, 10).map(r => renderCard(r, true))}</div>
            )}
          </section>
        </>
      )}

      {/* Dialog création */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Nouvelle répétition</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="reh-title" className={labelCls}>Titre *</label>
              <input id="reh-title" type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Répétition générale" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label htmlFor="reh-date" className={labelCls}>Date *</label>
                <input id="reh-date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label htmlFor="reh-start" className={labelCls}>Début</label>
                <input id="reh-start" type="time" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label htmlFor="reh-end" className={labelCls}>Fin</label>
                <input id="reh-end" type="time" value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="reh-type" className={labelCls}>Type</label>
                <select id="reh-type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as RehearsalType }))} className={inputCls}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {form.type === 'pupitre' && (
                <div className="space-y-1">
                  <label htmlFor="reh-voice" className={labelCls}>Pupitre</label>
                  <select id="reh-voice" value={form.voice_part} onChange={e => setForm(f => ({ ...f, voice_part: e.target.value as VoicePart | '' }))} className={inputCls}>
                    <option value="">— Choisir —</option>
                    {Object.entries(VOICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              )}
              <div className={cn('space-y-1', form.type !== 'pupitre' && 'col-span-1')}>
                <label htmlFor="reh-location" className={labelCls}>Lieu</label>
                <input id="reh-location" type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className={inputCls} placeholder="Salle principale" />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="reh-objectives" className={labelCls}>Objectifs</label>
              <textarea id="reh-objectives" value={form.objectives} onChange={e => setForm(f => ({ ...f, objectives: e.target.value }))} rows={3} className={inputCls} placeholder="Cantiques à travailler, points techniques..." />
            </div>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDialogOpen(false)} className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                Annuler
              </button>
              <button type="button" onClick={create} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Créer
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
