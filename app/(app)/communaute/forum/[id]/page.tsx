'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ThumbsUp, MessageSquare, Share2, Flag, Send } from 'lucide-react';
import { supabase, type ForumPost, type ForumReply } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useLang } from '@/hooks/use-lang';

function timeAgo(dateStr: string, lang: 'fr' | 'en') {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  if (lang === 'fr') {
    if (mins < 60) return `il y a ${mins} min`;
    if (hours < 24) return `il y a ${hours}h`;
    return `il y a ${Math.floor(hours / 24)} jours`;
  } else {
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
}

export default function DiscussionPage({ params }: { params: { id: string } }) {
  const { lang, t } = useLang();
  const { user } = useAuth();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [reply, setReply] = useState('');
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const [postRes, repliesRes] = await Promise.all([
        supabase.from('forum_posts').select('*').eq('id', params.id).maybeSingle(),
        supabase.from('forum_replies').select('*').eq('post_id', params.id).order('created_at'),
      ]);
      setPost(postRes.data);
      setReplies(repliesRes.data || []);
      // Increment views
      if (postRes.data) {
        await supabase.from('forum_posts').update({ views: (postRes.data.views || 0) + 1 }).eq('id', params.id);
      }
      setLoading(false);
    })();
  }, [params.id]);

  const handleLike = async () => {
    if (!post) return;
    const newLikes = post.likes + (liked ? -1 : 1);
    await supabase.from('forum_posts').update({ likes: newLikes }).eq('id', post.id);
    setPost({ ...post, likes: newLikes });
    setLiked(!liked);
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !user || !post) return;
    setSending(true);
    const authorName = user.user_metadata?.name || user.email?.split('@')[0] || 'Anonyme';
    const { data } = await supabase.from('forum_replies').insert({
      post_id: post.id, user_id: user.id, author_name: authorName, content: reply.trim(),
    }).select().maybeSingle();
    if (data) setReplies(prev => [...prev, data]);
    setReply('');
    setSending(false);
  };

  if (loading) return <div className="p-10 text-center text-muted-foreground text-sm">{t('loading')}</div>;
  if (!post) return (
    <div className="p-10 text-center text-muted-foreground text-sm">
      {lang === 'fr' ? 'Post introuvable.' : 'Post not found.'}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <Link href="/communaute/forum" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> {lang === 'fr' ? 'Retour au Forum' : 'Back to Forum'}
      </Link>

      {/* Topic */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-primary to-secondary text-white text-sm font-bold grid place-items-center shrink-0">
            {post.author_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm text-foreground">{post.author_name}</span>
              <span className="text-[10px] text-muted-foreground">{timeAgo(post.created_at, lang)}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{post.category}</span>
            </div>
            <h1 className="font-display text-xl font-bold text-foreground mb-4">{post.title}</h1>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{post.content}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <button onClick={handleLike} className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${liked ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>
            <ThumbsUp className="w-4 h-4" /> {post.likes}
          </button>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">
            <Share2 className="w-4 h-4" /> {lang === 'fr' ? 'Partager' : 'Share'}
          </button>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors ml-auto">
            <Flag className="w-4 h-4" /> {lang === 'fr' ? 'Signaler' : 'Report'}
          </button>
        </div>
      </div>

      {/* Replies */}
      <div className="space-y-4">
        <h2 className="font-bold text-sm text-foreground">
          {replies.length} {lang === 'fr' ? 'Réponses' : 'Replies'}
        </h2>
        {replies.map(r => (
          <div key={r.id} className={`bg-white rounded-2xl border p-5 shadow-sm ${r.is_accepted ? 'border-green-300 bg-green-50/30' : 'border-border'}`}>
            {r.is_accepted && (
              <div className="flex items-center gap-2 text-green-600 text-xs font-bold mb-3">
                <span className="w-4 h-4 rounded-full bg-green-500 text-white grid place-items-center text-[10px]">✓</span>
                {t('forum_best_answer')}
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary/70 to-secondary/70 text-white text-xs font-bold grid place-items-center shrink-0">
                {r.author_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-sm text-foreground">{r.author_name}</span>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(r.created_at, lang)}</span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{r.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reply box */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-bold text-sm text-foreground mb-4">{t('forum_your_reply')}</h3>
        {!user ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            <Link href="/auth" className="text-primary font-semibold hover:underline">
              {lang === 'fr' ? 'Connectez-vous pour répondre' : 'Sign in to reply'}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReply}>
            <textarea value={reply} onChange={e => setReply(e.target.value)} rows={4}
              placeholder={lang === 'fr' ? 'Partagez votre expérience ou votre conseil...' : 'Share your experience or advice...'}
              className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none transition-all placeholder:text-muted-foreground"
            />
            <div className="flex justify-end mt-3">
              <button type="submit" disabled={sending || !reply.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50">
                <Send className="w-4 h-4" /> {t('forum_reply_btn')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
