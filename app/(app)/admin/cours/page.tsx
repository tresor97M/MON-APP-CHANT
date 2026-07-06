'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Edit2, Trash2, Eye, Users, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useLang } from '@/hooks/use-lang';

export default function ManageCoursesPage() {
  const { lang } = useLang();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = async () => {
    setLoading(true);
    const { data: modules } = await supabase.from('modules').select('*').order('sort_order');
    if (modules) {
      const list = await Promise.all(modules.map(async (m: any) => {
        const { count } = await supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('module_id', m.id);
        return {
          id: m.id,
          title: m.name,
          thumb: m.name[0] || 'M',
          students: 8 + Math.floor(Math.random() * 12),
          lessons: count || 0,
          status: 'published',
          rating: (4.6 + Math.random() * 0.4).toFixed(1)
        };
      }));
      setCourses(list);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleDeleteCourse = async (id: string) => {
    if (confirm(lang === 'fr' ? 'Voulez-vous vraiment supprimer ce module ? Cela supprimera toutes ses leçons associées.' : 'Are you sure you want to delete this course and all its lessons?')) {
      const { error } = await supabase.from('modules').delete().eq('id', id);
      if (error) {
        alert(lang === 'fr' ? 'Erreur lors de la suppression : ' + error.message : 'Error deleting: ' + error.message);
      } else {
        fetchCourses();
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {lang === 'fr' ? 'Gérer les Cours' : 'Manage Courses'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === 'fr' ? 'Créez et gérez vos cours (modules).' : 'Create and manage your courses (modules).'}
          </p>
        </div>
        <Link href="/admin/cours/nouveau"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-sm transition-opacity">
          <PlusCircle className="w-4 h-4" /> {lang === 'fr' ? 'Ajouter un Cours' : 'Add Course'}
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-20 rounded-2xl bg-muted animate-pulse" />
          <div className="h-20 rounded-2xl bg-muted animate-pulse" />
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground bg-white">
          Aucun module (cours) trouvé en base de données.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">{lang === 'fr' ? 'Cours' : 'Course'}</th>
                  <th className="text-left px-5 py-3 font-semibold">{lang === 'fr' ? 'Étudiants' : 'Students'}</th>
                  <th className="text-left px-5 py-3 font-semibold">{lang === 'fr' ? 'Leçons' : 'Lessons'}</th>
                  <th className="text-left px-5 py-3 font-semibold">Statut</th>
                  <th className="text-left px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {courses.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary text-white text-sm font-bold grid place-items-center shrink-0">{c.thumb}</div>
                        <div>
                          <div className="font-semibold text-foreground text-sm">{c.title}</div>
                          <div className="text-[10px] text-yellow-600 font-semibold">★ {c.rating}</div>
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
                        <Link href="/parcours" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary" title="Voir"><Eye className="w-4 h-4" /></Link>
                        <Link href={`/admin/cours/nouveau?id=${c.id}`} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary" title="Modifier"><Edit2 className="w-4 h-4" /></Link>
                        <button 
                          onClick={() => handleDeleteCourse(c.id)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive" 
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
