'use client';

import Link from 'next/link';
import { PlusCircle, Edit2, Trash2, Eye, Users, BookOpen, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

const COURSES = [
  { id: 1, title: 'Justesse Vocale — Les Bases', thumb: 'V', students: 23, lessons: 8, status: 'published', rating: 4.8 },
  { id: 2, title: 'Maîtrise du Vibrato', thumb: 'M', students: 11, lessons: 6, status: 'published', rating: 4.6 },
  { id: 3, title: 'Respiration et Soutien', thumb: 'R', students: 8, lessons: 5, status: 'draft', rating: null },
  { id: 4, title: 'Technique Alexander pour Chanteurs', thumb: 'T', students: 5, lessons: 4, status: 'published', rating: 4.9 },
];

export default function ManageCoursesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Manage Courses</h1>
          <p className="text-sm text-muted-foreground mt-1">Créez et gérez vos cours.</p>
        </div>
        <Link href="/instructor/cours/nouveau"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-sm transition-opacity">
          <PlusCircle className="w-4 h-4" /> Add Course
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {['Tous', 'Publiés', 'Brouillons'].map((t, i) => (
          <button key={t} className={cn('px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
            i === 0 ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-white border border-border text-muted-foreground hover:text-foreground'
          )}>{t}</button>
        ))}
      </div>

      {/* Course list */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Cours</th>
                <th className="text-left px-5 py-3 font-semibold">Étudiants</th>
                <th className="text-left px-5 py-3 font-semibold">Leçons</th>
                <th className="text-left px-5 py-3 font-semibold">Statut</th>
                <th className="text-left px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COURSES.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary text-white text-sm font-bold grid place-items-center shrink-0">{c.thumb}</div>
                      <div>
                        <div className="font-semibold text-foreground text-sm">{c.title}</div>
                        {c.rating && <div className="text-[10px] text-yellow-600 font-semibold">★ {c.rating}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />{c.students}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <BookOpen className="w-3.5 h-3.5" />{c.lessons}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold',
                      c.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    )}>
                      {c.status === 'published' ? 'Publié' : 'Brouillon'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/lecon/${c.id}`} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary"><Eye className="w-4 h-4" /></Link>
                      <Link href="/instructor/cours/nouveau" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary"><Edit2 className="w-4 h-4" /></Link>
                      <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
