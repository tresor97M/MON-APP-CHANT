'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, ThumbsUp, Eye, Clock, PlusCircle, Search, ChevronRight, Tag } from 'lucide-react';
import { supabase, type ForumPost } from '@/lib/supabase';
import { useLang } from '@/hooks/use-lang';
import { cn } from '@/lib/utils';

const CATEGORIES_FR = ['Tous', 'Justesse', 'Respiration', 'Vibrato', 'Technique', 'Motivation'];
const CATEGORIES_EN = ['All', 'Pitch', 'Breathing', 'Vibrato', 'Technique', 'Motivation'];

function timeAgo(dateStr: string, lang: 'fr' | 'en') {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (lang === 'fr') {
    if (mins < 60) return `il y a ${mins} min`;
    if (hours < 24) return `il y a ${hours}h`;
    if (days === 1) return 'hier';
    return `il y a ${days} jours`;
  } else {
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'yesterday';
    return `${days} days ago`;
  }
}

export default function ForumPage() {
  const { lang, t } = useLang();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('Tous');
  const [search, setSearch] = useState('');

  const CATEGORIES = lang === 'fr' ? CATEGORIES_FR : CATEGORIES_EN;

  useEffect(() => {
    setCategory(CATEGORIES[0]);
  }, [lang]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase
        .from('forum_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (category !== 'Tous' && category !== 'All') {
        query = query.eq('category', category);
      }
      if (search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`);
      }

      const { data } = await query.limit(30);
      setPosts(data || []);
      setLoading(false);
    })();
  }, [category, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{t('forum_title')}</h1>
          <p className="text-sm text-white/50 mt-1">{t('forum_desc')}</p>
        </div>
        <Link href="/communaute/question"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-[#071008] text-sm font-semibold hover:bg-emerald-400 transition-colors shadow-sm">
          <PlusCircle className="w-4 h-4" /> {t('forum_new_post')}
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('forum_search')}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white/5 text-sm outline-none transition-all text-white placeholder:text-white/30"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        />
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
              category === c 
                ? 'bg-emerald-500 text-[#071008] border-emerald-500 shadow-[0_4px_16px_rgba(16,185,129,0.2)]' 
                : 'bg-white/5 text-white/70 hover:text-white hover:border-white/20'
            )}
            style={{ borderColor: category === c ? 'transparent' : 'rgba(255,255,255,0.08)' }}>
            {c}
          </button>
        ))}
      </div>

      {/* Topics list */}
      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border p-4 animate-pulse h-20 bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
          ))
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border p-10 text-center text-sm text-white/40 bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {t('no_results')}
          </div>
        ) : posts.map(post => (
          <Link key={post.id} href={`/communaute/forum/${post.id}`}
            className="block rounded-2xl border p-4 hover:bg-white/[0.04] transition-all group bg-white/5"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500/20 to-emerald-400/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold grid place-items-center shrink-0 mt-0.5">
                  {post.author_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                      post.solved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35' : 'bg-white/10 text-white/70'
                    )}>
                      {post.solved ? t('forum_solved') : post.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-white group-hover:text-emerald-400 transition-colors truncate">{post.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/40">
                    <span>{lang === 'fr' ? 'par' : 'by'} <strong className="text-white/70">{post.author_name}</strong></span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(post.created_at, lang)}</span>
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-[11px] text-white/40 shrink-0">
                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{post.views}</span>
                <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" />{post.likes}</span>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
