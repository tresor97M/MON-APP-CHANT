'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Star, BookOpen, MessageSquare, Award, ArrowLeft, Heart, MessageCircle, Share2 } from 'lucide-react';

const PROFILE = {
  name: 'Léa Bogdan',
  title: 'Chanteuse soprano passionnée',
  avatar: 'LB',
  location: 'Paris, France',
  rank: 'Gold',
  bio: 'Pratique le chant depuis 2 ans. Passionnée par la musique classique et la pop moderne. J\'aime particulièrement travailler ma justesse et mon vibrato.',
  stats: [
    { label: 'Leçons terminées', value: '47' },
    { label: 'XP totaux', value: '2 840' },
    { label: 'Série actuelle', value: '14j' },
    { label: 'Position Ligue', value: '#3' },
  ],
  courses: [
    { title: 'Justesse Vocale — Les Bases', progress: 80 },
    { title: 'Maîtrise du Vibrato', progress: 55 },
    { title: 'Respiration et Soutien', progress: 100 },
  ],
};

const POSTS = [
  { id: 1, time: 'il y a 2h', text: 'Je viens de terminer le module Vibrato ! Après 3 semaines de pratique, je commence vraiment à sentir la différence 🎵', likes: 14, comments: 5 },
  { id: 2, time: 'hier', text: 'Exercice de lip trill fait ce matin — 15 minutes. Mon larynx reste bien plus relâché maintenant sur les aigus !', likes: 8, comments: 2 },
  { id: 3, time: 'il y a 3 jours', text: 'Merci à la communauté Maestro Studio pour vos conseils sur la respiration diaphragmatique. En 2 semaines j\'ai vu un vrai changement dans mon endurance.', likes: 22, comments: 9 },
];

export default function StudentProfilePage() {
  const [tab, setTab] = useState<'about' | 'posts'>('about');
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <Link href="/ligue" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour à la Ligue
      </Link>

      {/* Banner + Avatar */}
      <div className="relative bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="h-32 bg-gradient-to-r from-primary/70 via-secondary/50 to-accent/40" />
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary to-secondary text-white text-2xl font-bold grid place-items-center border-4 border-white shadow-lg">
              {PROFILE.avatar}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl font-bold text-foreground">{PROFILE.name}</h1>
                <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-bold flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" /> {PROFILE.rank}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{PROFILE.title}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{PROFILE.location}</p>
            </div>
            <Link href="/messages" className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity shadow-sm">
              <MessageSquare className="w-3.5 h-3.5" /> Message
            </Link>
          </div>
          <p className="text-sm text-foreground/80 mt-4 leading-relaxed">{PROFILE.bio}</p>
          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4 p-1 bg-muted rounded-xl w-fit">
            {(['about', 'posts'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${tab === t ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {t === 'about' ? 'About' : 'Posts'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'about' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PROFILE.stats.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border border-border p-4 text-center shadow-sm">
                <div className="font-display text-2xl font-extrabold text-primary">{s.value}</div>
                <div className="text-[10px] text-muted-foreground mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Courses */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <h2 className="font-bold text-sm text-foreground flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-primary" /> Cours en cours
            </h2>
            <div className="space-y-4">
              {PROFILE.courses.map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-foreground">{c.title}</span>
                    <span className={`font-bold ${c.progress === 100 ? 'text-green-600' : 'text-primary'}`}>{c.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${c.progress === 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${c.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Badges */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
            <h2 className="font-bold text-sm text-foreground flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-yellow-500" /> Badges obtenus
            </h2>
            <div className="flex flex-wrap gap-3">
              {['Première Leçon', 'Série 7 Jours', 'Score 90+', 'Vibrato Maître', 'Top 3 Ligue'].map((badge, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 text-xs font-semibold text-yellow-800">
                  <Award className="w-3.5 h-3.5 text-yellow-500" />{badge}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'posts' && (
        <div className="space-y-4">
          {POSTS.map(post => (
            <div key={post.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-secondary text-white text-xs font-bold grid place-items-center">{PROFILE.avatar}</div>
                <div>
                  <div className="font-bold text-sm text-foreground">{PROFILE.name}</div>
                  <div className="text-[10px] text-muted-foreground">{post.time}</div>
                </div>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{post.text}</p>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors">
                  <Heart className="w-4 h-4" /> {post.likes}
                </button>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <MessageCircle className="w-4 h-4" /> {post.comments}
                </button>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <Share2 className="w-4 h-4" /> Partager
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
