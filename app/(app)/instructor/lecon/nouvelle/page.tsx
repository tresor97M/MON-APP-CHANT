'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Upload, Play } from 'lucide-react';

export default function AddLessonPage() {
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [saved, setSaved] = useState(false);

  const isValidYoutube = videoUrl.includes('youtube') || videoUrl.includes('youtu.be') || videoUrl.includes('vimeo');

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <Link href="/instructor/cours" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour aux cours
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Add Lesson</h1>
          <p className="text-sm text-muted-foreground mt-1">Ajoutez une nouvelle leçon à votre cours.</p>
        </div>
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'}`}>
          <Save className="w-4 h-4" /> {saved ? 'Sauvegardé !' : 'Save Lesson'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Lesson Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Introduction à la justesse vocale"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Video URL</label>
          <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground" />
        </div>

        {/* Video preview */}
        <div className="aspect-video rounded-xl bg-gray-900 relative overflow-hidden">
          {isValidYoutube ? (
            <div className="absolute inset-0 flex items-center justify-center text-white/50">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-primary/80 grid place-items-center mx-auto">
                  <Play className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs">Aperçu de la vidéo</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-white/10 grid place-items-center mx-auto">
                  <Play className="w-5 h-5 text-white/50" />
                </div>
                <p className="text-xs text-white/40">Entrez une URL YouTube ou Vimeo</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Files <span className="font-normal text-muted-foreground">(ressources, PDF...)</span></label>
          <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
            <Upload className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Glissez vos fichiers ici ou cliquez pour parcourir</span>
            <span className="text-[10px] text-muted-foreground">PDF, MP3, ZIP — max 50 Mo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
