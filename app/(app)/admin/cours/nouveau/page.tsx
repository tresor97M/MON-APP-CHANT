'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Upload, Bold, Italic, List, Link2 } from 'lucide-react';
import { useLang } from '@/hooks/use-lang';

export default function AddEditCoursePage() {
  const { lang } = useLang();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <Link href="/admin/cours" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> {lang === 'fr' ? 'Retour aux cours' : 'Back to courses'}
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {lang === 'fr' ? 'Créer / Modifier un Cours' : 'Add / Edit Course'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === 'fr' ? 'Configurez les informations de votre cours.' : 'Configure your course details.'}
          </p>
        </div>
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'}`}>
          <Save className="w-4 h-4" /> {saved ? (lang === 'fr' ? 'Sauvegardé !' : 'Saved!') : (lang === 'fr' ? 'Enregistrer le cours' : 'Save Course')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-sm text-foreground border-b border-border pb-3">
              {lang === 'fr' ? 'Informations de base' : 'Basic Information'}
            </h2>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">{lang === 'fr' ? 'Titre du cours' : 'Course Title'}</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Justesse Vocale — Les Bases"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">{lang === 'fr' ? 'Nombre de leçons' : 'Number of Lectures'}</label>
              <input type="number" defaultValue="8" min="1"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">{lang === 'fr' ? 'Catégorie' : 'Category'}</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all">
                <option value="">{lang === 'fr' ? 'Choisir une catégorie' : 'Choose a category'}</option>
                <option>Justesse</option>
                <option>Vibrato</option>
                <option>Respiration</option>
                <option>Technique</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder={lang === 'fr' ? 'Décrivez en détail ce que les étudiants vont apprendre...' : 'Describe in detail what students will learn...'}
                className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none transition-all placeholder:text-muted-foreground" />
            </div>
          </div>

          {/* Notes editor */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-sm text-foreground border-b border-border pb-3">Notes</h2>
            <div className="flex items-center gap-1 border border-border rounded-xl px-2 py-1 w-fit">
              {[Bold, Italic, List, Link2].map((Icon, i) => (
                <button key={i} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5}
              placeholder={lang === 'fr' ? 'Ajoutez des notes supplémentaires pour vos étudiants...' : 'Add extra notes for your students...'}
              className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none transition-all placeholder:text-muted-foreground" />
          </div>
        </div>

        {/* Sidebar: thumbnail + lessons */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-sm text-foreground border-b border-border pb-3">
              {lang === 'fr' ? 'Miniature du cours' : 'Course Thumbnail'}
            </h2>
            <div className="aspect-video rounded-xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">
                {lang === 'fr' ? 'Déposer une image ici' : 'Drop an image here'}
              </span>
              <span className="text-[10px] text-muted-foreground">PNG, JPG, max 2Mo</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <h2 className="font-bold text-sm text-foreground border-b border-border pb-3 mb-3">
              {lang === 'fr' ? 'Ajouter des Leçons' : 'Add Lessons'}
            </h2>
            <Link href="/admin/lecon/nouvelle"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-primary/40 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors">
              + {lang === 'fr' ? 'Ajouter une leçon' : 'Add Lesson'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
