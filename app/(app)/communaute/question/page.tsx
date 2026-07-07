'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useLang } from '@/hooks/use-lang';
import { cn } from '@/lib/utils';

const TAGS_FR = ['justesse', 'aigus', 'débutant', 'respiration', 'vibrato', 'technique', 'motivation', 'exercice'];
const TAGS_EN = ['pitch', 'high-notes', 'beginner', 'breathing', 'vibrato', 'technique', 'motivation', 'exercise'];

const CATEGORIES_FR = ['Justesse', 'Respiration', 'Vibrato', 'Technique', 'Motivation'];
const CATEGORIES_EN = ['Pitch', 'Breathing', 'Vibrato', 'Technique', 'Motivation'];

export default function AskQuestionPage() {
  const { lang } = useLang();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const TAGS = lang === 'fr' ? TAGS_FR : TAGS_EN;
  const CATEGORIES = lang === 'fr' ? CATEGORIES_FR : CATEGORIES_EN;

  const addTag = (t: string) => {
    const clean = t.trim().toLowerCase();
    if (clean && !tags.includes(clean) && tags.length < 5) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const removeTag = (t: string) => setTags(tags.filter(x => x !== t));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setLoading(true);
    setError('');

    const authorName = user
      ? (user.user_metadata?.name || user.email?.split('@')[0] || 'Anonyme')
      : 'Anonyme';

    const userId = user?.id || '00000000-0000-0000-0000-000000000000';

    const { error: err } = await supabase.from('forum_posts').insert({
      user_id: userId,
      author_name: authorName,
      title: title.trim(),
      content: body.trim(),
      category: category || (lang === 'fr' ? 'Général' : 'General'),
    });

    if (err) {
      setError(lang === 'fr' ? 'Erreur lors de la publication. Réessayez.' : 'Error publishing. Please try again.');
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-scale-in text-center">
        <div className="w-16 h-16 rounded-full bg-green-500 text-white grid place-items-center shadow-lg"><Send className="w-7 h-7" /></div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          {lang === 'fr' ? 'Question publiée !' : 'Question published!'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {lang === 'fr' ? 'La communauté va vous répondre bientôt.' : 'The community will answer soon.'}
        </p>
        <Link href="/communaute/forum" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
          {lang === 'fr' ? 'Voir le Forum' : 'View Forum'}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <Link href="/communaute/forum" className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> {lang === 'fr' ? 'Retour au Forum' : 'Back to Forum'}
      </Link>
      <div>
        <h1 className="font-display text-2xl font-bold text-white">
          {lang === 'fr' ? 'Poser une Question' : 'Ask a Question'}
        </h1>
        <p className="text-sm text-white/50 mt-1">
          {lang === 'fr' ? 'Posez votre question à la communauté Maestro Studio.' : 'Ask your question to the Maestro Studio community.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border p-6 shadow-sm bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {error && <div className="rounded-xl bg-red-500/10 border border-red-550/20 px-4 py-3 text-xs text-red-400 font-medium">{error}</div>}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-white/80">
            {lang === 'fr' ? 'Titre de la question' : 'Question title'} <span className="text-destructive">*</span>
          </label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
            placeholder={lang === 'fr' ? 'Ex: Comment améliorer ma justesse sur les notes aiguës ?' : 'Ex: How to improve my pitch on high notes?'}
            className="w-full px-4 py-3 rounded-xl border bg-white/5 text-sm text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/30"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-white/80">
            {lang === 'fr' ? 'Catégorie' : 'Category'}
          </label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border bg-white/5 text-sm text-white outline-none focus:border-emerald-500/50 transition-all"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <option value="" className="bg-[#0f1912] text-white">{lang === 'fr' ? 'Choisir une catégorie' : 'Choose a category'}</option>
            {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0f1912] text-white">{c}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-white/80">
            {lang === 'fr' ? 'Description' : 'Description'} <span className="text-destructive">*</span>
          </label>
          <textarea value={body} onChange={e => setBody(e.target.value)} required rows={6}
            placeholder={lang === 'fr'
              ? 'Décrivez votre problème en détail : depuis combien de temps, ce que vous avez déjà essayé, votre niveau...'
              : 'Describe your issue in detail: how long, what you\'ve tried, your level...'}
            className="w-full px-4 py-3 rounded-xl border bg-white/5 text-sm text-white outline-none focus:border-emerald-500/50 resize-none transition-all placeholder:text-white/30"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-white/80">
            Tags <span className="text-white/40 font-normal">({lang === 'fr' ? 'max 5' : 'max 5'})</span>
          </label>
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border bg-white/5 min-h-[44px]" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {tags.map(t => (
              <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 text-xs font-semibold">
                {t}
                <button type="button" onClick={() => removeTag(t)} className="hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {tags.length < 5 && (
              <input type="text" value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } if (e.key === ',') { e.preventDefault(); addTag(tagInput); } }}
                placeholder={tags.length === 0 ? (lang === 'fr' ? 'Ajouter un tag...' : 'Add a tag...') : ''}
                className="flex-1 min-w-[80px] bg-transparent text-xs outline-none text-white placeholder:text-white/30"
              />
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TAGS.filter(t => !tags.includes(t)).map(t => (
              <button key={t} type="button" onClick={() => addTag(t)}
                className="px-2.5 py-1 rounded-full border text-[10px] font-semibold text-white/50 hover:border-emerald-500 hover:text-emerald-400 transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                + {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-[#071008] text-sm font-bold hover:bg-emerald-400 transition-colors shadow-sm disabled:opacity-60">
            <Send className="w-4 h-4" />
            {loading
              ? (lang === 'fr' ? 'Publication...' : 'Publishing...')
              : (lang === 'fr' ? 'Publier la question' : 'Publish question')}
          </button>
        </div>
      </form>
    </div>
  );
}
