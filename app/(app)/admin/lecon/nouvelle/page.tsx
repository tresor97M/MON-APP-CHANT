'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Play } from 'lucide-react';
import { useLang } from '@/hooks/use-lang';

export default function AddLessonPage() {
  const { lang } = useLang();
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [saved, setSaved] = useState(false);

  const isValidYoutube = videoUrl.includes('youtube') || videoUrl.includes('youtu.be') || videoUrl.includes('vimeo');

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <Link href="/admin/cours" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> {lang === 'fr' ? 'Retour aux cours' : 'Back to courses'}
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {lang === 'fr' ? 'Ajouter une Leçon' : 'Add Lesson'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === 'fr' ? 'Ajoutez une nouvelle leçon à votre cours.' : 'Add a new lesson to your course.'}
          </p>
        </div>
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'}`}>
          <Save className="w-4 h-4" /> {saved ? (lang === 'fr' ? 'Sauvegardée !' : 'Saved!') : (lang === 'fr' ? 'Enregistrer la leçon' : 'Save Lesson')}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">
            {lang === 'fr' ? 'Titre de la leçon' : 'Lesson Title'}
          </label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Introduction à la justesse vocale"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">
            {lang === 'fr' ? 'URL de la vidéo' : 'Video URL'}
          </label>
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
                <p className="text-xs">{lang === 'fr' ? 'Aperçu de la vidéo' : 'Video preview'}</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-white/10 grid place-items-center mx-auto">
                  <Play className="w-5 h-5 text-white/50" />
                </div>
                <p className="text-xs text-white/40">
                  {lang === 'fr' ? 'Entrez une URL YouTube ou Vimeo' : 'Enter a YouTube or Vimeo URL'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
