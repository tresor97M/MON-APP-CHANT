'use client';

import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Pin, Plus, Trash2, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { canManageAnnouncements } from '@/lib/permissions';
import { VOICE_LABELS, type Announcement, type VoicePart } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export default function AdminAnnoncesPage() {
  const { user, userProfile: profile } = useAuth();
  const manager = canManageAnnouncements(profile?.role);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);
  const [audienceVoice, setAudienceVoice] = useState<string>('all');
  const [publishAt, setPublishAt] = useState('');

  const load = useCallback(async () => {
    // Admin gets all announcements, ordered by publish date
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('publish_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('admin-announcements-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const create = async () => {
    if (!title.trim() || !content.trim() || !user) return;
    setSaving(true);
    
    // Default to now if not set
    const publishDate = publishAt ? new Date(publishAt).toISOString() : new Date().toISOString();

    await supabase.from('announcements').insert({
      title: title.trim(),
      content: content.trim(),
      pinned,
      audience_voice: audienceVoice === 'all' ? null : audienceVoice,
      created_by: user.id,
      publish_at: publishDate
    });

    setSaving(false);
    setOpen(false);
    setTitle(''); setContent(''); setPinned(false); setAudienceVoice('all'); setPublishAt('');
    load();
  };

  const remove = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cette annonce ?')) {
      await supabase.from('announcements').delete().eq('id', id);
      load();
    }
  };

  if (!manager) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <Megaphone className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <h2 className="text-lg font-bold text-foreground">Accès restreint</h2>
        <p className="text-sm text-muted-foreground mt-1">Vous n'avez pas les droits nécessaires pour accéder à cette page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pt-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2 text-foreground">
            <Megaphone className="h-6 w-6 text-primary" aria-hidden="true" /> Gestion des Annonces
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Publiez et programmez des messages ciblés pour les choristes.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-[#071008] font-semibold">
              <Plus className="h-4 w-4 mr-1.5" /> Créer une annonce
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-[#0a0d14] border border-white/10 text-white rounded-3xl p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-white text-base font-bold">Nouvelle annonce</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="ann-title" className="text-white/80 text-xs font-semibold">Titre</Label>
                <Input
                  id="ann-title"
                  placeholder="Titre de l'annonce..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ann-content" className="text-white/80 text-xs font-semibold">Contenu</Label>
                <Textarea
                  id="ann-content"
                  placeholder="Écrivez le message de l'annonce..."
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="bg-white/5 border-white/10 text-white rounded-xl focus:border-primary/50 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ann-audience" className="text-white/80 text-xs font-semibold">Pupitre cible</Label>
                  <Select value={audienceVoice} onValueChange={setAudienceVoice}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl text-xs">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0d14] border-white/10 text-white">
                      <SelectItem value="all">Tous les pupitres</SelectItem>
                      <SelectItem value="soprano">Soprano</SelectItem>
                      <SelectItem value="alto">Alto</SelectItem>
                      <SelectItem value="tenor">Ténor</SelectItem>
                      <SelectItem value="basse">Basse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ann-publish" className="text-white/80 text-xs font-semibold">Date de publication</Label>
                  <Input
                    id="ann-publish"
                    type="datetime-local"
                    value={publishAt}
                    onChange={(e) => setPublishAt(e.target.value)}
                    className="bg-white/5 border-white/10 text-white rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-white">Épingler l'annonce</span>
                  <span className="text-[10px] text-white/50">S'affichera en tête de liste</span>
                </div>
                <Switch checked={pinned} onCheckedChange={setPinned} />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)} className="text-white/70 hover:bg-white/5 hover:text-white rounded-xl text-xs">
                Annuler
              </Button>
              <Button
                onClick={create}
                disabled={saving || !title.trim() || !content.trim()}
                className="bg-gradient-to-r from-primary to-secondary text-[#071008] font-bold rounded-xl text-xs"
              >
                {saving ? 'Publication...' : publishAt ? 'Planifier' : 'Publier'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-3xl" />
          ))
        ) : items.length === 0 ? (
          <div className="text-center py-12 rounded-3xl border border-white/5 bg-white/5">
            <Megaphone className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Aucune annonce programmée ou publiée.</p>
          </div>
        ) : (
          items.map((item) => {
            const isPublished = new Date(item.publish_at) <= new Date();
            const publishLabel = new Date(item.publish_at).toLocaleString('fr-FR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={item.id}
                className="relative rounded-3xl border border-white/5 bg-white/5 p-5 shadow-lg space-y-3 hover:bg-white/[0.04] transition-all"
              >
                {item.pinned && (
                  <div className="absolute top-4 right-4 text-primary shrink-0" title="Épinglé">
                    <Pin className="h-4.5 w-4.5 fill-current rotate-45" />
                  </div>
                )}
                
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-base text-white pr-6">{item.title}</h3>
                  
                  {isPublished ? (
                    <Badge variant="outline" className="text-[9px] border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-extrabold uppercase">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Publiée
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] border-amber-500/20 bg-amber-500/10 text-amber-400 font-extrabold uppercase">
                      <Clock className="w-3 h-3 mr-1" /> Planifiée ({publishLabel})
                    </Badge>
                  )}

                  {item.audience_voice && (
                    <Badge variant="outline" className="text-[9px] border-white/10 bg-white/5 text-white/70">
                      Pupitre : {VOICE_LABELS[item.audience_voice as VoicePart] || item.audience_voice}
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                  {item.content}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-white/40">
                  <span>Créée le : {new Date(item.created_at).toLocaleDateString('fr-FR')}</span>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(item.id)}
                    className="h-8 w-8 text-white/40 hover:text-destructive hover:bg-destructive/10 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
