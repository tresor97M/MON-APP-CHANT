'use client';

import Link from 'next/link';
import { Star, BookOpen, Users, MessageSquare, Award } from 'lucide-react';

const INSTRUCTOR = {
  name: 'Adrian Dorian',
  title: 'Expert en Technique Vocale',
  avatar: 'AD',
  rating: 4.7,
  ratingCount: 238,
  students: 312,
  courses: 4,
  bio: 'Chanteur professionnel et pédagogue depuis 15 ans. Spécialisé dans la technique classique et le chant contemporain. Ses méthodes combinent approche scientifique et intuition artistique pour des résultats rapides.',
};

const COURSES = [
  { title: 'Justesse Vocale — Les Bases', students: 87, rating: 4.9, thumb: 'J' },
  { title: 'GitHub Tutorials for Beginners', students: 63, rating: 4.7, thumb: 'G' },
  { title: 'Maîtrise du Vibrato', students: 54, rating: 4.6, thumb: 'V' },
  { title: 'Rails & Gulp Advanced Workflow', students: 41, rating: 4.5, thumb: 'R' },
];

export default function InstructorProfilePage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-800" />
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-gray-700 to-gray-500 text-white text-2xl font-bold grid place-items-center border-4 border-white shadow-lg">
              {INSTRUCTOR.avatar}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl font-bold text-foreground">{INSTRUCTOR.name}</h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{INSTRUCTOR.title}</p>
              {/* Star rating */}
              <div className="flex items-center gap-1.5 mt-1.5">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(INSTRUCTOR.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                ))}
                <span className="text-xs font-bold text-foreground">{INSTRUCTOR.rating}</span>
                <span className="text-[10px] text-muted-foreground">({INSTRUCTOR.ratingCount} avis)</span>
              </div>
            </div>
            <Link href="/messages" className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity shadow-sm">
              <MessageSquare className="w-3.5 h-3.5" /> Message
            </Link>
          </div>

          <p className="text-sm text-foreground/80 mt-4 leading-relaxed">{INSTRUCTOR.bio}</p>

          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <div className="font-display text-xl font-bold text-foreground">{INSTRUCTOR.students}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1"><Users className="w-3 h-3" />Étudiants</div>
            </div>
            <div className="text-center">
              <div className="font-display text-xl font-bold text-foreground">{INSTRUCTOR.courses}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1"><BookOpen className="w-3 h-3" />Cours</div>
            </div>
            <div className="text-center">
              <div className="font-display text-xl font-bold text-foreground">{INSTRUCTOR.rating}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1"><Star className="w-3 h-3" />Note</div>
            </div>
          </div>
        </div>
      </div>

      {/* Courses by Adrian */}
      <div>
        <h2 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" /> Courses by {INSTRUCTOR.name}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COURSES.map((c, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border p-4 shadow-sm hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary text-white text-sm font-bold grid place-items-center shrink-0">{c.thumb}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-foreground truncate">{c.title}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.students} étudiants</span>
                <span className="flex items-center gap-1 font-bold text-yellow-600">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{c.rating}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
