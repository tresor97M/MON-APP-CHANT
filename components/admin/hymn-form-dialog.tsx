'use client';

import { useEffect, useState } from 'react';
import { Trash2, Upload, FileText, Music, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { bucketForType, uploadFile } from '@/lib/storage';
import {
  HYMN_CATEGORIES, VOICE_LABELS,
  type Hymn, type HymnCategory, type HymnFile, type VoicePart,
} from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hymn: Hymn | null;
  userId: string | null;
  onSaved: () => void;
};

const EMPTY = {
  number: '', title: '', author: '', composer: '', musical_key: '', tempo: '',
  category: 'louange' as HymnCategory, language: 'Français', lyrics: '', director_notes: '',
};

export function HymnFormDialog({ open, onOpenChange, hymn, userId, onSaved }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState<HymnFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (hymn) {
      setForm({
        number: hymn.number != null ? String(hymn.number) : '',
        title: hymn.title,
        author: hymn.author || '',
        composer: hymn.composer || '',
        musical_key: hymn.musical_key || '',
        tempo: hymn.tempo || '',
        category: hymn.category,
        language: hymn.language || 'Français',
        lyrics: hymn.lyrics || '',
        director_notes: hymn.director_notes || '',
      });
      supabase.from('hymn_files').select('*').eq('hymn_id', hymn.id).order('created_at')
        .then(({ data }) => setFiles(data || []));
    } else {
      setForm(EMPTY);
      setFiles([]);
    }
  }, [open, hymn]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      number: form.number ? Number(form.number) : null,
      title: form.title.trim(),
      author: form.author.trim() || null,
      composer: form.composer.trim() || null,
      musical_key: form.musical_key.trim() || null,
      tempo: form.tempo.trim() || null,
      category: form.category,
      language: form.language.trim() || 'Français',
      lyrics: form.lyrics.trim() || null,
      director_notes: form.director_notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    let err: string | null = null;
    if (hymn) {
      const { error: e } = await supabase.from('hymns').update(payload).eq('id', hymn.id);
      err = e?.message || null;
    } else {
      const { error: e } = await supabase.from('hymns').insert({ ...payload, created_by: userId });
      err = e?.message || null;
    }
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    onSaved();
    onOpenChange(false);
  };

  const handleUpload = async (
    type: 'partition_pdf' | 'image' | 'audio',
    voicePart: VoicePart | null,
    file: File,
  ) => {
    if (!hymn) return;
    const key = `${type}-${voicePart || 'all'}`;
    setUploading(key);
    setError(null);
    const bucket = bucketForType(type);
    const { path, error: upErr } = await uploadFile(bucket, file, hymn.id);
    if (upErr || !path) {
      setError(upErr || "Échec de l'upload.");
      setUploading(null);
      return;
    }
    const { data, error: insErr } = await supabase
      .from('hymn_files')
      .insert({ hymn_id: hymn.id, type, voice_part: voicePart, storage_path: path, title: file.name })
      .select()
      .single();
    if (insErr) setError(insErr.message);
    else if (data) setFiles(f => [...f, data]);
    setUploading(null);
  };

  const removeFile = async (f: HymnFile) => {
    await supabase.storage.from(bucketForType(f.type)).remove([f.storage_path]);
    await supabase.from('hymn_files').delete().eq('id', f.id);
    setFiles(list => list.filter(x => x.id !== f.id));
  };

  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-muted-foreground';
  const labelCls = 'text-xs font-semibold text-muted-foreground';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {hymn ? `Modifier « ${hymn.title} »` : 'Nouveau cantique'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="infos">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="infos">Informations</TabsTrigger>
            <TabsTrigger value="fichiers" disabled={!hymn}>
              Fichiers {!hymn && '(après création)'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="infos" className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label htmlFor="hymn-number" className={labelCls}>Numéro</label>
                <input id="hymn-number" type="number" value={form.number} onChange={set('number')} className={inputCls} placeholder="12" />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label htmlFor="hymn-title" className={labelCls}>Titre *</label>
                <input id="hymn-title" type="text" value={form.title} onChange={set('title')} className={inputCls} placeholder="À Toi la gloire" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="hymn-author" className={labelCls}>Auteur (paroles)</label>
                <input id="hymn-author" type="text" value={form.author} onChange={set('author')} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label htmlFor="hymn-composer" className={labelCls}>Compositeur</label>
                <input id="hymn-composer" type="text" value={form.composer} onChange={set('composer')} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label htmlFor="hymn-key" className={labelCls}>Tonalité</label>
                <input id="hymn-key" type="text" value={form.musical_key} onChange={set('musical_key')} className={inputCls} placeholder="Ré majeur" />
              </div>
              <div className="space-y-1">
                <label htmlFor="hymn-tempo" className={labelCls}>Tempo</label>
                <input id="hymn-tempo" type="text" value={form.tempo} onChange={set('tempo')} className={inputCls} placeholder="Modéré" />
              </div>
              <div className="space-y-1">
                <label htmlFor="hymn-category" className={labelCls}>Catégorie</label>
                <select id="hymn-category" value={form.category} onChange={set('category')} className={inputCls}>
                  {Object.entries(HYMN_CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="hymn-language" className={labelCls}>Langue</label>
                <input id="hymn-language" type="text" value={form.language} onChange={set('language')} className={inputCls} />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="hymn-lyrics" className={labelCls}>Paroles</label>
              <textarea id="hymn-lyrics" value={form.lyrics} onChange={set('lyrics')} rows={8} className={inputCls} placeholder={'Couplet 1...\n\nRefrain...'} />
            </div>
            <div className="space-y-1">
              <label htmlFor="hymn-notes" className={labelCls}>Notes du maître de chœur</label>
              <textarea id="hymn-notes" value={form.director_notes} onChange={set('director_notes')} rows={2} className={inputCls} placeholder="Points d'attention, nuances..." />
            </div>

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {hymn ? 'Enregistrer' : 'Créer le cantique'}
              </button>
            </div>
          </TabsContent>

          <TabsContent value="fichiers" className="space-y-5 pt-2">
            {/* Partitions */}
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Partitions (PDF / images)
              </h3>
              <UploadButton
                label="Ajouter une partition"
                accept=".pdf,image/*"
                busy={uploading === 'partition_pdf-all' || uploading === 'image-all'}
                onFile={file => {
                  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                  handleUpload(isPdf ? 'partition_pdf' : 'image', null, file);
                }}
              />
              <FileList files={files.filter(f => f.type !== 'audio')} onRemove={removeFile} />
            </section>

            {/* Audios par voix */}
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Music className="w-4 h-4 text-primary" /> Audios par voix
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(Object.keys(VOICE_LABELS) as VoicePart[]).map(v => (
                  <UploadButton
                    key={v}
                    label={VOICE_LABELS[v]}
                    accept="audio/*"
                    busy={uploading === `audio-${v}`}
                    onFile={file => handleUpload('audio', v, file)}
                  />
                ))}
                <UploadButton
                  label="Toutes voix"
                  accept="audio/*"
                  busy={uploading === 'audio-all'}
                  onFile={file => handleUpload('audio', null, file)}
                />
              </div>
              <FileList files={files.filter(f => f.type === 'audio')} onRemove={removeFile} showVoice />
            </section>

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function UploadButton({
  label, accept, busy, onFile,
}: { label: string; accept: string; busy: boolean; onFile: (file: File) => void }) {
  return (
    <label className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors">
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
      {label}
      <input
        type="file"
        accept={accept}
        className="sr-only"
        disabled={busy}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
    </label>
  );
}

function FileList({
  files, onRemove, showVoice = false,
}: { files: HymnFile[]; onRemove: (f: HymnFile) => void; showVoice?: boolean }) {
  if (files.length === 0) {
    return <p className="text-xs text-muted-foreground">Aucun fichier.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {files.map(f => (
        <li key={f.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <span className="text-xs font-medium text-foreground truncate flex-1">
            {showVoice && (
              <span className="text-primary font-bold mr-1.5">
                [{f.voice_part ? VOICE_LABELS[f.voice_part] : 'Toutes voix'}]
              </span>
            )}
            {f.title || f.storage_path.split('/').pop()}
          </span>
          <button
            type="button"
            onClick={() => onRemove(f)}
            aria-label={`Supprimer ${f.title || 'ce fichier'}`}
            className="grid place-items-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
