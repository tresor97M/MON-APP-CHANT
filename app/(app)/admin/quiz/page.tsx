'use client';

import Link from 'next/link';
import { PlusCircle, Edit2, Trash2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLang } from '@/hooks/use-lang';

const QUIZZES = [
  { id: 1, title: 'Quiz de Justesse Vocale', course: 'Justesse Vocale — Les Bases', thumb: 'V', questions: 10, status: 'active' },
  { id: 2, title: 'Quiz Fond Self-Motivation', course: 'Maîtrise du Vibrato', thumb: 'M', questions: 7, status: 'active' },
  { id: 3, title: 'Respiration & Soutien Basics', course: 'Respiration & Soutien', thumb: 'R', questions: 5, status: 'draft' },
];

export default function ManageQuizzesPage() {
  const { lang } = useLang();

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

      <div className="space-y-4">
        {QUIZZES.map((q) => (
          <div key={q.id} className="bg-white rounded-2xl border border-border p-4 shadow-sm hover:border-primary/30 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-secondary text-white text-lg font-bold grid place-items-center shrink-0">{q.thumb}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-foreground">{q.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{q.course}</div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-muted-foreground">{q.questions} questions</span>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                    q.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  )}>{q.status === 'active' ? (lang === 'fr' ? 'Actif' : 'Active') : (lang === 'fr' ? 'Brouillon' : 'Draft')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/admin/quiz/${q.id}/review`} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary"><Eye className="w-4 h-4" /></Link>
                <Link href="/admin/quiz/nouveau" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary"><Edit2 className="w-4 h-4" /></Link>
                <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
