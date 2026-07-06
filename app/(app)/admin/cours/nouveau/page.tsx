'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Upload, Bold, Italic, List, Link2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/hooks/use-lang';

export default function AddEditCoursePage() {
  const { lang } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL parameters
  const editId = searchParams.get('id') || '';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Music');
  const [sortOrder, setSortOrder] = useState(0);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. Charger les données si modification
  useEffect(() => {
    if (editId) {
      setLoading(true);
      supabase
        .from('modules')
        .select('*')
        .eq('id', editId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setTitle(data.name);
            setDescription(data.description || '');
            setIcon(data.icon || 'Music');
            setSortOrder(data.sort_order || 0);
          }
          setLoading(false);
        });
    }
  }, [editId]);

  // 2. Enregistrer
  const handleSaveCourse = async () => {
    if (!title) {
      alert(lang === 'fr' ? 'Le titre est obligatoire' : 'Title is required');
      return;
    }
    setSaved(true);

    // Par défaut, lier à un parcours existant (le premier parcours du seed)
    const { data: paths } = await supabase.from('paths').select('id').limit(1);
    const pathId = paths && paths.length > 0 ? paths[0].id : '22222222-2222-2222-2222-222222222222';

    const payload = {
      path_id: pathId,
      name: title,
      description: description,
      icon: icon,
      sort_order: sortOrder
    };

    let result;
    if (editId) {
      // Modification
      result = await supabase.from('modules').update(payload).eq('id', editId);
    } else {
      // Nouvelle création
      result = await supabase.from('modules').insert(payload);
    }

    if (result.error) {
      alert(lang === 'fr' ? 'Erreur lors de la sauvegarde : ' + result.error.message : 'Error saving: ' + result.error.message);
      setSaved(false);
    } else {
      setTimeout(() => {
        setSaved(false);
        router.push('/admin/cours');
      }, 1000);
    }
  };

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
            {lang === 'fr' ? 'Configurez les informations de votre cours (module).' : 'Configure your course details.'}
          </p>
        </div>
        <button onClick={handleSaveCourse}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'}`}>
          <Save className="w-4 h-4" /> {saved ? (lang === 'fr' ? 'Sauvegardé !' : 'Saved!') : (lang === 'fr' ? 'Enregistrer le cours' : 'Save Course')}
        </button>
      </div>

      {loading ? (
        <div className="h-40 rounded-2xl bg-muted animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
              <h2 className="font-bold text-sm text-foreground border-b border-border pb-3">
                {lang === 'fr' ? 'Informations de base' : 'Basic Information'}
              </h2>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">{lang === 'fr' ? 'Titre du cours (Module)' : 'Course Title'}</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Justesse Vocale — Les Bases"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Icône Lucide</label>
                  <select value={icon} onChange={e => setIcon(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all">
                    <option value="Music">Music (Musique)</option>
                    <option value="Wind">Wind (Souffle)</option>
                    <option value="Activity">Activity (Justesse)</option>
                    <option value="TrendingUp">TrendingUp (Vibrato)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">{lang === 'fr' ? 'Ordre de tri' : 'Sort Order'}</label>
                  <input type="number" value={sortOrder} onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
                  placeholder={lang === 'fr' ? 'Décrivez en détail ce que les étudiants vont apprendre...' : 'Describe in detail what students will learn...'}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none transition-all placeholder:text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-3">
              <h2 className="font-bold text-sm text-foreground border-b border-border pb-3">
                {lang === 'fr' ? 'Miniature du cours' : 'Course Thumbnail'}
              </h2>
              <div className="aspect-video rounded-xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">
                  {lang === 'fr' ? 'Aperçu Automatique' : 'Auto Thumbnail'}
                </span>
                <span className="text-[10px] text-muted-foreground">Utilise l'icône choisie</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
