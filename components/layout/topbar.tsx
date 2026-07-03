'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun, LogOut, Search, Bell, HelpCircle, MessageSquare } from 'lucide-react';
import { supabase, type UserStats } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { useLang } from '@/hooks/use-lang';
import Link from 'next/link';

export function TopBar() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const { lang, setLang } = useLang();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    supabase.from('user_stats').select('*').limit(1).maybeSingle().then(({ data }) => setStats(data));
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#topbar-dropdown')) setDropdownOpen(false);
    };
    if (dropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Chanteur';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 h-16 bg-[#3490dc] border-b border-blue-600/30 text-white w-full">
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left: Brand logo */}
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-9 h-9 rounded-xl bg-white/20 shadow-lg">
            <span className="text-lg font-bold text-white">M</span>
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-white">Maestro Studio</span>
        </div>

        {/* Center: Search input */}
        <div className="hidden md:flex items-center flex-1 max-w-sm relative">
          <Search className="w-4 h-4 text-white/50 absolute left-3" />
          <input
            type="text"
            placeholder={lang === 'fr' ? 'Rechercher...' : 'Search...'}
            className="w-full bg-white/15 border border-white/20 rounded-xl py-1.5 pl-10 pr-4 text-xs text-white placeholder-white/60 focus:outline-none focus:border-white/50 transition-all"
          />
        </div>

        {/* Right: Links + Language + User */}
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Link href="/communaute/forum" className="hidden sm:inline-flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-xs">
            <MessageSquare className="w-3.5 h-3.5" /> {lang === 'fr' ? 'Forum' : 'Forum'}
          </Link>
          <Link href="/communaute/aide" className="hidden sm:inline-flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-xs">
            <HelpCircle className="w-3.5 h-3.5" /> {lang === 'fr' ? 'Aide' : 'Help'}
          </Link>

          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-bold text-white hover:bg-white/25 transition-all"
            title={lang === 'fr' ? 'Switch to English' : 'Passer en Français'}
          >
            <span className="text-base leading-none">{lang === 'fr' ? '🇫🇷' : '🇬🇧'}</span>
            <span>{lang === 'fr' ? 'FR' : 'EN'}</span>
          </button>

          {/* Notification bell */}
          <button className="relative p-1 text-white/70 hover:text-white transition-colors" aria-label="Notifications">
            <Bell className="w-4 h-4" />
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full" />
          </button>

          {/* User profile dropdown */}
          <div className="relative" id="topbar-dropdown">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/40 grid place-items-center font-bold text-white text-xs hover:border-white transition-all">
                {userInitial}
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white border border-gray-200 shadow-2xl p-2 animate-scale-in text-gray-800">
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="font-bold text-xs text-gray-800 capitalize">{userName}</div>
                  <div className="text-[9px] text-gray-400 truncate mt-0.5">{user?.email}</div>
                </div>
                {stats && (
                  <div className="px-3 py-2 border-b border-gray-100 space-y-1 text-[11px] text-gray-500">
                    <div className="flex justify-between">
                      <span>{lang === 'fr' ? 'Niveau' : 'Level'} :</span>
                      <span className="font-bold text-blue-500">{stats.level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>XP {lang === 'fr' ? 'Totaux' : 'Total'} :</span>
                      <span className="font-bold text-green-500">{stats.total_xp}</span>
                    </div>
                  </div>
                )}
                <Link
                  href="/account"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  {lang === 'fr' ? '⚙️ Mon compte' : '⚙️ My account'}
                </Link>
                <button
                  onClick={toggle}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  {theme === 'dark' 
                    ? (lang === 'fr' ? 'Thème Clair' : 'Light Theme')
                    : (lang === 'fr' ? 'Thème Sombre' : 'Dark Theme')
                  }
                </button>
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {lang === 'fr' ? 'Se déconnecter' : 'Sign out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
