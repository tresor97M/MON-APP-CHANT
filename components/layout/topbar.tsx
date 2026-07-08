'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun, LogOut, Bell, Music, Flame } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { playNotificationSound } from '@/lib/audio';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isStaff } from '@/lib/permissions';
import type { ChoirStats, Announcement } from '@/lib/types';
import { VOICE_LABELS, ROLE_LABELS, type Role, type VoicePart } from '@/lib/types';

export function TopBar() {
  const [stats, setStats] = useState<ChoirStats | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const { theme, toggle } = useTheme();
  const { user, userProfile, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [lastReadNotif, setLastReadNotif] = useState<string>('');
  
  const pathname = usePathname();
  const role = (userProfile?.role || 'choriste') as Role;
  const isAdminView = pathname.startsWith('/admin');
  const staff = isStaff(role);

  useEffect(() => {
    const saved = localStorage.getItem('last_read_announcements');
    if (saved) setLastReadNotif(saved);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from('choir_stats').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setStats(data));

    const loadAnnouncements = () => {
      supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(20)
        .then(({ data }) => {
          const voice = userProfile?.voice_part;
          const userRole = userProfile?.role || 'choriste';
          const isAdmin = userRole === 'admin' || userRole === 'super_admin';

          const filtered = (data || []).filter(a => {
            const isVoiceMatch = !a.audience_voice || a.audience_voice === voice;
            const isPublished = !a.publish_at || new Date(a.publish_at) <= new Date();
            return isAdmin || (isVoiceMatch && isPublished);
          });
          setAnnouncements(filtered.slice(0, 5));
        });
    };

    loadAnnouncements();

    const channel = supabase
      .channel('announcements-topbar')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload: any) => {
        const newAnn = payload.new as Announcement;
        const voice = userProfile?.voice_part;
        const userRole = userProfile?.role || 'choriste';
        const isAdmin = userRole === 'admin' || userRole === 'super_admin';
        
        const isVoiceMatch = !newAnn.audience_voice || newAnn.audience_voice === voice;
        const isPublished = !newAnn.publish_at || new Date(newAnn.publish_at) <= new Date();
        
        if (isAdmin || (isVoiceMatch && isPublished)) {
          loadAnnouncements();
          playNotificationSound();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userProfile]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#topbar-dropdown')) setDropdownOpen(false);
      if (!target.closest('#topbar-notif')) setNotifOpen(false);
    };
    if (dropdownOpen || notifOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen, notifOpen]);

  const userName = userProfile?.display_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Membre';
  const userInitial = userName.charAt(0).toUpperCase();
  const voice = userProfile?.voice_part as VoicePart | null;

  const handleNotifClick = () => {
    setNotifOpen(!notifOpen);
    if (!notifOpen) {
      const nowStr = new Date().toISOString();
      localStorage.setItem('last_read_announcements', nowStr);
      setLastReadNotif(nowStr);
    }
  };

  const unreadCount = announcements.filter(a => {
    const dateToCompare = a.publish_at || a.created_at;
    return !lastReadNotif || new Date(dateToCompare) > new Date(lastReadNotif);
  }).length;

  return (
    <header className="sticky top-0 z-40 h-16 bg-sidebar border-b border-sidebar-border text-sidebar-foreground w-full">
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Marque */}
        <Link href="/" className="flex items-center gap-3">
          <div className="grid place-items-center w-9 h-9 rounded-xl bg-primary text-primary-foreground shadow-lg">
            <Music className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <span className="font-display font-bold text-base tracking-tight">Chorale</span>
            <span className="block text-[9px] text-sidebar-foreground/50 uppercase tracking-widest -mt-0.5">Gestion & Formation</span>
          </div>
        </Link>

        {/* Droite : switcher, streak, notifications, profil */}
        <div className="flex items-center gap-3 text-sm font-semibold">
          {stats && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sidebar-foreground/10 border border-sidebar-border text-xs">
              <Flame className="w-3.5 h-3.5 text-accent" />
              <span>{stats.streak_weeks} sem.</span>
              <span className="text-sidebar-foreground/40">·</span>
              <span className="text-primary">{stats.total_xp} XP</span>
            </div>
          )}

          {/* Switcher Espace Choriste / Direction */}
          {staff && (
            <Link
              href={isAdminView ? '/' : '/admin'}
              className="text-[10px] sm:text-xs font-bold px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl transition-all duration-200 active:scale-95 border shrink-0"
              style={{
                background: isAdminView ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)',
                color: isAdminView ? '#EF4444' : '#4ADE80',
                borderColor: isAdminView ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.2)'
              }}
            >
              <span className="inline sm:hidden">{isAdminView ? 'Choriste' : 'Direction'}</span>
              <span className="hidden sm:inline">{isAdminView ? 'Espace Choriste' : 'Espace Direction'}</span>
            </Link>
          )}

          {/* Notifications / annonces */}
          <div className="relative" id="topbar-notif">
            <button
              onClick={handleNotifClick}
              className="relative p-1.5 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
              aria-label="Annonces"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 rounded-full bg-accent text-[8px] font-black text-white px-1 flex items-center justify-center border border-sidebar shadow-md animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-popover border border-border shadow-2xl p-2 animate-scale-in text-popover-foreground">
                <div className="px-3 py-2 border-b border-border text-xs font-bold">Annonces</div>
                {announcements.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-muted-foreground text-center">Aucune annonce pour le moment</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {announcements.map(a => (
                      <div key={a.id} className="px-3 py-2.5 border-b border-border/50 last:border-0">
                        <div className="text-xs font-bold flex items-center gap-1.5 flex-wrap">
                          {a.pinned && <span className="text-[8px] bg-accent/20 text-accent border border-accent/30 px-1 rounded uppercase font-extrabold">Épinglé</span>}
                          <span>{a.title}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{a.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profil */}
          <div className="relative" id="topbar-dropdown">
            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 focus:outline-none">
              <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-primary/40 grid place-items-center font-bold text-xs hover:border-primary transition-all">
                {userInitial}
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-popover border border-border shadow-2xl p-2 animate-scale-in text-popover-foreground">
                <div className="px-3 py-2 border-b border-border">
                  <div className="font-bold text-xs capitalize">{userName}</div>
                  <div className="text-[9px] text-muted-foreground truncate mt-0.5">{user?.email}</div>
                  <div className="text-[10px] text-primary font-semibold mt-1">
                    {ROLE_LABELS[role]}{voice ? ` · ${VOICE_LABELS[voice]}` : ''}
                  </div>
                </div>
                {staff && (
                  <Link
                    href={isAdminView ? '/' : '/admin'}
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 rounded-xl transition-colors border-b border-border/50 pb-2 mb-1"
                  >
                    {isAdminView ? 'Accéder Espace Choriste' : 'Accéder Espace Direction'}
                  </Link>
                )}
                <Link
                  href="/profil"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                >
                  Mon profil
                </Link>
                <Link
                  href="/account"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                >
                  Paramètres
                </Link>
                <button
                  onClick={toggle}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                >
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  {theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
                </button>
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
