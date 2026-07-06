'use client';

import { useEffect, useState } from 'react';
import { FileText, ImageIcon, ExternalLink } from 'lucide-react';
import type { HymnFile } from '@/lib/types';
import { bucketForType, getSignedUrl } from '@/lib/storage';

type Props = { files: HymnFile[] };

/** Liste des partitions (PDF + images) avec aperçu des images et lien d'ouverture. */
export function PartitionViewer({ files }: Props) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries: Record<string, string> = {};
      for (const f of files) {
        const url = await getSignedUrl(bucketForType(f.type), f.storage_path);
        if (url) entries[f.id] = url;
      }
      if (!cancelled) setUrls(entries);
    })();
    return () => {
      cancelled = true;
    };
  }, [files]);

  if (files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Aucune partition disponible pour ce cantique.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {files.map(f => {
        const url = urls[f.id];
        if (f.type === 'image' && url) {
          return (
            <figure key={f.id} className="rounded-xl border border-border overflow-hidden bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={f.title || 'Partition du cantique'} className="w-full h-auto" />
              {f.title && (
                <figcaption className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
                  {f.title}
                </figcaption>
              )}
            </figure>
          );
        }
        return (
          <a
            key={f.id}
            href={url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/50 transition-colors"
          >
            <div className="grid place-items-center w-10 h-10 rounded-lg bg-muted text-foreground shrink-0">
              {f.type === 'partition_pdf' ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground truncate">
                {f.title || (f.type === 'partition_pdf' ? 'Partition PDF' : 'Image')}
              </p>
              <p className="text-xs text-muted-foreground">Ouvrir dans un nouvel onglet</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}
