'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Target, Loader2, Wand2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { GAP_LABELS, VOICE_COLORS, VOICE_LABELS, type GapCategory, type SkillGap, type VoicePart } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type GapWithUser = SkillGap & { user_profiles?: Pick<UserProfile, 'display_name' | 'email' | 'voice_part'> | null };

const GAP_STATUS_LABELS: Record<SkillGap['status'], string> = {
  identifiee: 'Identifiée',
  en_travail: 'En travail',
  resolue: 'Résolue',
};

const GAP_STATUS_COLORS: Record<SkillGap['status'], string> = {
  identifiee: 'bg-rose-100 text-rose-700 border-rose-200',
  en_travail: 'bg-amber-100 text-amber-700 border-amber-200',
  resolue: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const SEVERITY_LABELS: Record<number, string> = { 1: 'Légère', 2: 'Moyenne', 3: 'Importante' };

export default function AdminEvaluationsPage() {
  const { user } = useAuth();
  const [gaps, setGaps] = useState<GapWithUser[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SkillGap['status'] | 'all'>('all');
  const [form, setForm] = useState({ user_id: '', category: 'justesse' as GapCategory, severity: 2, note: '' });
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [gapRes, memRes] = await Promise.all([
      supabase.from('skill_gaps').select('*').order('created_at', { ascending: false }),
      supabase.from('user_profiles').select('*').order('display_name'),
    ]);
    const allMembers = (memRes.data as UserProfile[]) || [];
    const byId = new Map(allMembers.map(m => [m.user_id, m]));
    const enriched = ((gapRes.data as SkillGap[]) || []).map(g => ({
      ...g,
      user_profiles: byId.get(g.user_id)
        ? {
            display_name: byId.get(g.user_id)!.display_name,
            email: byId.get(g.user_id)!.email,
            voice_part: byId.get(g.user_id)!.voice_part,
          }
        : null,
    }));
    setGaps(enriched);
    setMembers(allMembers.filter(m => (m.status || 'actif') === 'actif'));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => (statusFilter === 'all' ? gaps : gaps.filter(g => g.status === statusFilter)),
    [gaps, statusFilter],
  );

  const create = async () => {
    if (!form.user_id) {
      setError('Choisissez un choriste.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: e } = await supabase.from('skill_gaps').insert({
      user_id: form.user_id,
      category: form.category,
      severity: form.severity,
      note: form.note.trim() || null,
      identified_by: user?.id || null,
    });
    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    setForm({ user_id: '', category: 'justesse', severity: 2, note: '' });
    setDialogOpen(false);
    load();
  };

  const updateStatus = async (gap: SkillGap, status: SkillGap['status']) => {
    await supabase.from('skill_gaps').update({ status, updated_at: new Date().toISOString() }).eq('id', gap.id);
    load();
  };

  /**
   * Ferme la boucle lacune -> parcours : jusqu'ici, `training_paths` avait
   * bien une colonne `target_gap_category` prévue pour ça, mais rien dans
   * l'admin ne la consultait jamais pour proposer/assigner un parcours en
   * réponse à une lacune identifiée. Matching automatique par catégorie
   * (+ pupitre si renseigné), sans doublon.
   */
  const assignPlan = async (gap: GapWithUser) => {
    setAssigningId(gap.id);
    const { data: paths } = await supabase
      .from('training_paths')
      .select('*')
      .eq('target_gap_category', gap.category)
      .eq('is_open', true);

    const voice = gap.user_profiles?.voice_part;
    const match = (paths || []).find(p => !p.voice_part || p.voice_part === voice) || paths?.[0];

    if (!match) {
      setAssigningId(null);
      alert(`Aucun parcours de formation ouvert ne correspond à la catégorie "${GAP_LABELS[gap.category]}" pour le moment. Crée-en un dans Formation.`);
      return;
    }

    const { data: existing } = await supabase
      .from('training_assignments')
      .select('id')
      .eq('path_id', match.id)
      .eq('user_id', gap.user_id)
      .maybeSingle();

    if (existing) {
      setAssigningId(null);
      alert(`Le parcours "${match.name}" est déjà assigné à ce membre.`);
      return;
    }

    const { error: e } = await supabase.from('training_assignments').insert({
      path_id: match.id,
      user_id: gap.user_id,
      gap_id: gap.id,
      assigned_by: user?.id || null,
      status: 'assigne',
    });
    setAssigningId(null);
    if (e) {
      alert('Erreur lors de l\'assignation : ' + e.message);
      return;
    }
    if (gap.status === 'identifiee') await updateStatus(gap, 'en_travail');
    else load();
    alert(`Parcours "${match.name}" assigné à ${gap.user_profiles?.display_name || 'ce membre'}.`);
  };

  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-muted-foreground';
  const labelCls = 'text-xs font-semibold text-muted-foreground';

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Évaluations et lacunes</h1>
          <p className="text-sm text-muted-foreground">Identifiez les lacunes des choristes et suivez leur résolution</p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Nouvelle lacune
        </button>
      </header>

      {/* Filtre statut */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'identifiee', 'en_travail', 'resolue'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
              statusFilter === s ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border hover:border-foreground/40',
            )}
          >
            {s === 'all' ? `Toutes (${gaps.length})` : `${GAP_STATUS_LABELS[s]} (${gaps.filter(g => g.status === s).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-3">
          <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-muted text-muted-foreground">
            <Target className="w-6 h-6" />
          </div>
          <p className="text-sm text-muted-foreground">Aucune lacune enregistrée pour ce filtre.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(g => (
            <li key={g.id} className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">
                    {g.user_profiles?.display_name || g.user_profiles?.email || 'Membre inconnu'}
                  </span>
                  {g.user_profiles?.voice_part && (
                    <Badge variant="outline" className={cn('text-[10px]', VOICE_COLORS[g.user_profiles.voice_part as VoicePart])}>
                      {VOICE_LABELS[g.user_profiles.voice_part as VoicePart]}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px]">{GAP_LABELS[g.category]}</Badge>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sévérité : {SEVERITY_LABELS[g.severity] || g.severity}
                  </span>
                </div>
                {g.note && <p className="text-sm text-muted-foreground">{g.note}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {g.status !== 'resolue' && (
                  <button
                    onClick={() => assignPlan(g)}
                    disabled={assigningId === g.id}
                    title="Assigner automatiquement un parcours de formation correspondant à cette lacune"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    {assigningId === g.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                    Assigner un parcours
                  </button>
                )}
                <select
                  value={g.status}
                  onChange={e => updateStatus(g, e.target.value as SkillGap['status'])}
                  aria-label="Statut de la lacune"
                  className={cn(
                    'text-xs font-semibold rounded-lg border px-2.5 py-1.5 outline-none cursor-pointer bg-transparent shrink-0',
                    GAP_STATUS_COLORS[g.status],
                  )}
                >
                  {Object.entries(GAP_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Dialog création */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Nouvelle lacune</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="gap-user" className={labelCls}>Choriste *</label>
              <select id="gap-user" value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))} className={inputCls}>
                <option value="">— Choisir —</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.display_name || m.email}{m.voice_part ? ` (${VOICE_LABELS[m.voice_part as VoicePart]})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="gap-category" className={labelCls}>Catégorie</label>
                <select id="gap-category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as GapCategory }))} className={inputCls}>
                  {Object.entries(GAP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="gap-severity" className={labelCls}>Sévérité</label>
                <select id="gap-severity" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: Number(e.target.value) }))} className={inputCls}>
                  {Object.entries(SEVERITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="gap-note" className={labelCls}>Note du maître</label>
              <textarea id="gap-note" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={3} className={inputCls} placeholder="Observations, contexte..." />
            </div>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDialogOpen(false)} className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                Annuler
              </button>
              <button type="button" onClick={create} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Enregistrer
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
