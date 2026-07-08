'use client';

import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Pin, Plus, Trash2 } from 'lucide-react';
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

export default function AnnoncesPage() {
  const { user, userProfile: profile } = useAuth();
  const manager = canManageAnnouncements(profile?.role);
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);
  const [audienceVoice, setAudienceVoice] = useState<string>('all');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('announcements-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const create = async () => {
    if (!title.trim() || !content.trim() || !user) return;
    setSaving(true);
    await supabase.from('announcements').insert({
      title: title.trim(),
      content: content.trim(),
      pinned,
      audience_voice: audienceVoice === 'all' ? null : audienceVoice,
      created_by: user.id,
    });
    setSaving(false);
    setOpen(false);
    setTitle(''); setContent(''); setPinned(false); setAudienceVoice('all');
    load();
  };

  const remove = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id);
    load();
  };

  // Filtrer selon le pupitre du choriste et la date de publication active
  const visible = items.filter(a => {
    const isVoiceMatch = !a.audience_voice || a.audience_voice === profile?.voice_part;
    const isPublished = !a.publish_at || new Date(a.publish_at) <= new Date();
    return manager || (isVoiceMatch && isPublished);
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" aria-hidden="true" /> Annonces
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Communications officielles de la chorale.</p>
        </div>
        {manager && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> Nouvelle annonce</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Publier une annonce</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ann-title">Titre</Label>
                  <Input id="ann-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex. : Répétition générale samedi" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ann-content">Contenu</Label>
                  <Textarea id="ann-content" value={content} onChange={e => setContent(e.target.value)} rows={5} placeholder="Détails de l'annonce..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Destinataires</Label>
                  <Select value={audienceVoice} onValueChange={setAudienceVoice}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toute la chorale</SelectItem>
                      {(Object.keys(VOICE_LABELS) as VoicePart[]).map(v => (
                        <SelectItem key={v} value={v}>Pupitre {VOICE_LABELS[v]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border p-3">
                  <Label htmlFor="ann-pin" className="cursor-pointer">Épingler en haut de la liste</Label>
                  <Switch id="ann-pin" checked={pinned} onCheckedChange={setPinned} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={create} disabled={saving || !title.trim() || !content.trim()}>
                  {saving ? 'Publication...' : 'Publier'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Megaphone className="h-8 w-8 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Aucune annonce pour le moment.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map(a => (
            <li key={a.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.pinned && (
                      <Badge className="gap-1"><Pin className="h-3 w-3" aria-hidden="true" /> Épinglée</Badge>
                    )}
                    {a.audience_voice && (
                      <Badge variant="secondary">Pupitre {VOICE_LABELS[a.audience_voice]}</Badge>
                    )}
                  </div>
                  <h2 className="font-display font-semibold text-lg mt-1.5 text-balance">{a.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-3">
                    {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                {manager && (
                  <Button variant="ghost" size="icon" onClick={() => remove(a.id)} aria-label={`Supprimer l'annonce ${a.title}`}>
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
