'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Music, CalendarDays, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { canManageHymns } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { computeNextReview, type ReviewRating, type ReviewState } from '@/lib/spaced-repetition';
import {
  HYMN_CATEGORIES, LEARNING_STATUS_LABELS, LEARNING_STATUS_COLORS,
  OCCASION_LABELS, PROGRESS_LABELS,
  type Hymn, type HymnFile, type HymnProgress, type HymnProgressStatus,
  type HymnScheduleEntry, type VoicePart,
} from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { VoiceAudioPlayer } from '@/components/hymns/voice-audio-player';
import { PartitionViewer } from '@/components/hymns/partition-viewer';
import { InteractiveMidiPlayer } from '@/components/hymns/interactive-midi-player';

const PROGRESS_ORDER: HymnProgressStatus[] = ['a_apprendre', 'en_cours', 'appris', 'valide'];

export default function CantiqueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, userProfile: profile } = useAuth();
  const [hymn, setHymn] = useState<Hymn | null>(null);
  const [files, setFiles] = useState<HymnFile[]>([]);
  const [schedule, setSchedule] = useState<HymnScheduleEntry[]>([]);
  const [progress, setProgress] = useState<HymnProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [hymnRes, filesRes, scheduleRes] = await Promise.all([
      supabase.from('hymns').select('*').eq('id', id).single(),
      supabase.from('hymn_files').select('*').eq('hymn_id', id).order('created_at'),
      supabase.from('hymn_schedule').select('*').eq('hymn_id', id).order('scheduled_date', { ascending: false }).limit(10),
    ]);
    if (!hymnRes.data) {
      router.replace('/cantiques');
      return;
    }
    setHymn(hymnRes.data);
    setFiles(filesRes.data || []);
    setSchedule(scheduleRes.data || []);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from('hymn_progress')
      .select('*')
      .eq('hymn_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setProgress(data));
  }, [user, id]);

  const updateProgress = async (status: HymnProgressStatus) => {
    if (!user || !id || saving) return;
    setSaving(true);
    const { data } = await supabase
      .from('hymn_progress')
      .upsert(
        { user_id: user.id, hymn_id: id, status, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,hymn_id' },
      )
      .select()
      .single();
    if (data) setProgress(data);
    setSaving(false);
  };

  const rateReview = async (rating: ReviewRating) => {
    if (!user || !id || saving) return;
    setSaving(true);
    const prev: ReviewState = {
      intervalDays: progress?.review_interval_days || 1,
      easeFactor: progress?.ease_factor || 2.5,
    };
    const { intervalDays, easeFactor, nextReviewAt } = computeNextReview(rating, prev);
    const selfRating = rating === 'difficile' ? 2 : rating === 'bien' ? 3 : 5;

    const { data } = await supabase
      .from('hymn_progress')
      .upsert(
        {
          user_id: user.id,
          hymn_id: id,
          status: progress?.status || 'en_cours',
          self_rating: selfRating,
          review_interval_days: intervalDays,
          ease_factor: easeFactor,
          next_review_at: nextReviewAt,
          last_listened_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,hymn_id' },
      )
      .select()
      .single();
    if (data) setProgress(data);
    setSaving(false);
  };

  if (loading || !hymn) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const audioFiles = files.filter(f => f.type === 'audio');
  const partitionFiles = files.filter(f => f.type !== 'audio');
  const userVoice = (profile?.voice_part as VoicePart | null) ?? null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/cantiques"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Répertoire
        </Link>
        {canManageHymns(profile?.role) && (
          <Link
            href={`/admin/cantiques?edit=${hymn.id}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <Pencil className="w-4 h-4" /> Modifier
          </Link>
        )}
      </div>

      {/* En-tête */}
      <header className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="grid place-items-center w-14 h-14 rounded-2xl bg-primary/10 text-primary shrink-0">
            <Music className="w-7 h-7" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {hymn.number != null && (
                <span className="font-mono text-xs text-muted-foreground bg-muted rounded-md px-2 py-0.5">
                  N° {hymn.number}
                </span>
              )}
              <Badge variant="outline" className={cn('text-[10px] font-semibold', LEARNING_STATUS_COLORS[hymn.learning_status])}>
                {LEARNING_STATUS_LABELS[hymn.learning_status]}
              </Badge>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground text-balance">{hymn.title}</h1>
            <p className="text-sm text-muted-foreground">
              {[hymn.author && `Paroles : ${hymn.author}`, hymn.composer && `Musique : ${hymn.composer}`]
                .filter(Boolean)
                .join(' — ') || 'Auteur inconnu'}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="rounded-xl bg-muted/60 p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Catégorie</dt>
            <dd className="font-semibold text-foreground mt-0.5">{HYMN_CATEGORIES[hymn.category]}</dd>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tonalité</dt>
            <dd className="font-semibold text-foreground mt-0.5">{hymn.musical_key || '—'}</dd>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tempo</dt>
            <dd className="font-semibold text-foreground mt-0.5">{hymn.tempo || '—'}</dd>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Langue</dt>
            <dd className="font-semibold text-foreground mt-0.5">{hymn.language || 'Français'}</dd>
          </div>
        </dl>
      </header>

      {/* Ma progression */}
      <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">Mon apprentissage</h2>
        <p className="text-sm text-muted-foreground">Où en êtes-vous sur ce cantique ?</p>
        <div className="flex flex-wrap gap-2">
          {PROGRESS_ORDER.map(s => {
            const active = progress?.status === s;
            const isValide = s === 'valide';
            return (
              <button
                key={s}
                type="button"
                disabled={saving || (isValide && progress?.status !== 'valide')}
                onClick={() => !isValide && updateProgress(s)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-semibold border transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:border-primary/50',
                  isValide && !active && 'opacity-50 cursor-not-allowed',
                )}
                title={isValide ? 'Statut attribué par le maître de chœur' : undefined}
              >
                {PROGRESS_LABELS[s]}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Le statut « Validé » est attribué par le maître de chœur après évaluation.
        </p>
      </section>

      {/* Révision espacée */}
      {progress && progress.status !== 'a_apprendre' && (
        <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-lg font-bold text-foreground">Révision espacée</h2>
            {progress.next_review_at && (
              <span className="text-xs text-muted-foreground">
                {new Date(progress.next_review_at) <= new Date()
                  ? 'À réviser aujourd\'hui'
                  : `Prochaine révision : ${new Date(progress.next_review_at).toLocaleDateString('fr-FR')}`}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Après avoir répété ce cantique, dis-nous à quel point tu le connais — l'intervalle avant la prochaine révision s'ajuste automatiquement (plus court si c'est encore difficile, plus long si c'est acquis).
          </p>
          <div className="flex flex-wrap gap-2">
            {(['difficile', 'bien', 'facile'] as const).map((rating) => (
              <button
                key={rating}
                type="button"
                disabled={saving}
                onClick={() => rateReview(rating)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-semibold border transition-colors',
                  rating === 'difficile' && 'bg-card text-orange-600 border-orange-200 hover:bg-orange-50',
                  rating === 'bien' && 'bg-card text-primary border-primary/30 hover:bg-primary/10',
                  rating === 'facile' && 'bg-card text-emerald-600 border-emerald-200 hover:bg-emerald-50',
                )}
              >
                {rating === 'difficile' ? 'Difficile, à revoir vite' : rating === 'bien' ? 'Bien, je le connais' : 'Facile, acquis'}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Audios par voix */}
      <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">Écouter par voix</h2>
        <VoiceAudioPlayer audioFiles={audioFiles} userVoice={userVoice} />
      </section>

      {/* Synthétiseur MIDI */}
      <section className="space-y-3">
        <InteractiveMidiPlayer hymnId={hymn.id} hymnTitle={hymn.title} />
      </section>

      {/* Partitions */}
      <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">Partitions et documents</h2>
        <PartitionViewer files={partitionFiles} />
      </section>

      {/* Paroles */}
      {hymn.lyrics && (
        <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <h2 className="font-display text-lg font-bold text-foreground">Paroles</h2>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">{hymn.lyrics}</pre>
        </section>
      )}

      {/* Historique de programmation */}
      <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <h2 className="font-display text-lg font-bold text-foreground">Programmation</h2>
        {schedule.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ce cantique n&apos;a pas encore été programmé.</p>
        ) : (
          <ul className="space-y-2">
            {schedule.map(s => (
              <li key={s.id} className="flex items-center gap-3 text-sm">
                <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="font-semibold text-foreground">
                  {new Date(s.scheduled_date + 'T00:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
                <Badge variant="outline" className="text-[10px]">{OCCASION_LABELS[s.occasion]}</Badge>
                {s.notes && <span className="text-muted-foreground truncate">{s.notes}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
