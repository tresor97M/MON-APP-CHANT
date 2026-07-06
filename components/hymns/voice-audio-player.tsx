'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VOICE_LABELS, type HymnFile, type VoicePart } from '@/lib/types';
import { bucketForType, getSignedUrl } from '@/lib/storage';

type Props = {
  audioFiles: HymnFile[];
  userVoice: VoicePart | null;
};

/** Lecteur audio groupé par voix — la voix du choriste est mise en avant. */
export function VoiceAudioPlayer({ audioFiles, userVoice }: Props) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries: Record<string, string> = {};
      for (const f of audioFiles) {
        const url = await getSignedUrl(bucketForType(f.type), f.storage_path);
        if (url) entries[f.id] = url;
      }
      if (!cancelled) setUrls(entries);
    })();
    return () => {
      cancelled = true;
    };
  }, [audioFiles]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const toggle = (file: HymnFile) => {
    const url = urls[file.id];
    if (!url) return;
    if (playingId === file.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(file.id);
  };

  if (audioFiles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Aucun enregistrement audio pour ce cantique.
      </p>
    );
  }

  // Trie : la voix de l'utilisateur d'abord, puis les autres, puis "toutes voix"
  const sorted = [...audioFiles].sort((a, b) => {
    const score = (f: HymnFile) => (f.voice_part === userVoice ? 0 : f.voice_part ? 1 : 2);
    return score(a) - score(b);
  });

  return (
    <ul className="space-y-2">
      {sorted.map(f => {
        const isMine = f.voice_part != null && f.voice_part === userVoice;
        const label = f.voice_part ? VOICE_LABELS[f.voice_part] : 'Toutes voix';
        return (
          <li
            key={f.id}
            className={cn(
              'flex items-center gap-3 rounded-xl border p-3 transition-colors',
              isMine ? 'border-primary/40 bg-primary/5' : 'border-border bg-card',
            )}
          >
            <button
              type="button"
              onClick={() => toggle(f)}
              disabled={!urls[f.id]}
              aria-label={playingId === f.id ? `Mettre en pause ${label}` : `Écouter ${label}`}
              className={cn(
                'grid place-items-center w-10 h-10 rounded-full transition-colors shrink-0',
                playingId === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-primary hover:text-primary-foreground',
                !urls[f.id] && 'opacity-50 cursor-not-allowed',
              )}
            >
              {playingId === f.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">{label}</span>
                {isMine && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-2 py-0.5">
                    Ma voix
                  </span>
                )}
              </div>
              {f.title && <p className="text-xs text-muted-foreground truncate">{f.title}</p>}
            </div>
            <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
          </li>
        );
      })}
    </ul>
  );
}
