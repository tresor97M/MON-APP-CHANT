'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Edit2, Trash2, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useLang } from '@/hooks/use-lang';

export default function ManageQuizzesPage() {
  const { lang } = useLang();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuizzes = async () => {
    setLoading(true);
    const { data: lessons } = await supabase.from('lessons').select('*, module:modules(*)').order('sort_order');
    if (lessons) {
      const list = await Promise.all(lessons.map(async (l: any) => {
        const { count } = await supabase.from('quiz_questions').select('*', { count: 'exact', head: true }).eq('lesson_id', l.id);
        return {
          id: l.id,
          title: `Quiz - ${l.name}`,
          course: l.module?.name || 'Fondamentaux',
          thumb: l.name[0] || 'Q',
          questions: count || 0,
          status: count && count > 0 ? 'active' : 'empty'
        };
      }));
      setQuizzes(list);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleDeleteQuiz = async (lessonId: string) => {
    if (confirm(lang === 'fr' ? 'Voulez-vous vraiment supprimer toutes les questions de ce quiz ?' : 'Are you sure you want to delete all questions for this quiz?')) {
      const { error } = await supabase.from('quiz_questions').delete().eq('lesson_id', lessonId);
      if (error) {
        alert(lang === 'fr' ? 'Erreur lors de la suppression' : 'Error deleting');
      } else {
        fetchQuizzes();
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {lang === 'fr' ? 'Gérer les Quiz' : 'Manage Quizzes'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === 'fr' ? 'Gérez les quiz de vos cours.' : 'Manage your course quizzes.'}
          </p>
        </div>
        <Link href="/admin/quiz/nouveau"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-sm transition-opacity">
          <PlusCircle className="w-4 h-4" /> {lang === 'fr' ? 'Ajouter un Quiz' : 'Add Quiz'}
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-20 rounded-2xl bg-muted animate-pulse" />
          <div className="h-20 rounded-2xl bg-muted animate-pulse" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">
          Aucun quiz trouvé.
        </div>
      ) : (
        <div className="space-y-4">
          {quizzes.map((q) => (
            <div key={q.id} className="bg-white rounded-2xl border border-border p-4 shadow-sm hover:border-primary/30 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-secondary text-white text-lg font-bold grid place-items-center shrink-0">{q.thumb}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-foreground">{q.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{q.course}</div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-muted-foreground">{q.questions} questions</span>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                      q.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    )}>
                      {q.status === 'active' 
                        ? (lang === 'fr' ? 'Actif' : 'Active') 
                        : (lang === 'fr' ? 'Vide' : 'Empty')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/admin/quiz/${q.id}/review`} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary" title="Visualiser"><Eye className="w-4 h-4" /></Link>
                  <Link href={`/admin/quiz/nouveau?lesson_id=${q.id}`} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary" title="Modifier/Ajouter"><Edit2 className="w-4 h-4" /></Link>
                  {q.questions > 0 && (
                    <button 
                      onClick={() => handleDeleteQuiz(q.id)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive" 
                      title="Vider"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
