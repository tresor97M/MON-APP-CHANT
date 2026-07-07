'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Music, CalendarDays, Trophy, Settings,
  GraduationCap, Sparkles, LayoutDashboard,
  BookOpenCheck, Stethoscope, ShieldCheck, Users, ClipboardCheck, Megaphone, Table2, User,
  Mail, MicVocal,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { isStaff, canManageRoles } from '@/lib/permissions';
import { VOICE_LABELS, ROLE_LABELS, type Role, type VoicePart } from '@/lib/types';

/* ─── Bottom Nav items (mobile, scrollable) ──────────────── */
const BOTTOM_NAV = [
  { href: '/',             label: 'Accueil',     icon: Home },
  { href: '/cantiques',    label: 'Cantiques',   icon: Music },
  { href: '/calendrier',   label: 'Calendrier',  icon: CalendarDays },
  { href: '/repetitions',  label: 'Répétitions', icon: MicVocal },
  { href: '/parcours',     label: 'Parcours',    icon: BookOpenCheck },
  { href: '/formation',    label: 'Formation',   icon: GraduationCap },
  { href: '/coach',        label: 'Coach IA',    icon: Sparkles },
  { href: '/ligue',        label: 'Classement',  icon: Trophy },
  { href: '/communaute',   label: 'Communauté',  icon: Users },
  { href: '/messages',     label: 'Messages',    icon: Mail },
  { href: '/profil',       label: 'Profil',      icon: User },
];

/* ─── Desktop sidebar sections (unchanged logic) ─────────── */
type NavItem  = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; };
type NavSection = { title: string; items: NavItem[]; };

function getSections(role: string | undefined, isAdminView: boolean): NavSection[] {
  const staff = isStaff(role);

  if (isAdminView && staff) {
    return [
      {
        title: 'ESPACES',
        items: [
          { href: '/', label: 'Espace Choriste', icon: Home },
          { href: '/admin', label: 'Espace Direction', icon: LayoutDashboard },
        ],
      },
      {
        title: 'DIRECTION',
        items: [
          { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
          { href: '/admin/cantiques', label: 'Cantiques', icon: Music },
          { href: '/admin/calendrier', label: 'Calendrier (sheet)', icon: Table2 },
          { href: '/admin/repetitions', label: 'Répétitions & Pointage', icon: ClipboardCheck },
          { href: '/admin/membres', label: 'Membres & Pupitres', icon: Users },
          { href: '/admin/evaluations', label: 'Évaluations & Lacunes', icon: Stethoscope },
          { href: '/admin/formation', label: 'Formation', icon: GraduationCap },
          { href: '/admin/annonces', label: 'Annonces', icon: Megaphone },
          ...(canManageRoles(role) ? [{ href: '/admin/acces', label: 'Gestion Accès', icon: ShieldCheck }] : []),
        ],
      },
      {
        title: 'COMPTE',
        items: [
          { href: '/account', label: 'Paramètres', icon: Settings },
          { href: '/messages', label: 'Messages', icon: Mail },
        ],
      },
    ];
  }

  return [
    {
      title: 'ESPACES',
      items: [
        { href: '/', label: 'Tableau de bord', icon: Home },
        ...(staff ? [{ href: '/admin', label: 'Espace Direction', icon: LayoutDashboard }] : []),
      ],
    },
    {
      title: 'CHORALE',
      items: [
        { href: '/cantiques', label: 'Répertoire', icon: Music },
        { href: '/calendrier', label: 'Calendrier', icon: CalendarDays },
        { href: '/repetitions', label: 'Répétitions', icon: MicVocal },
        { href: '/parcours', label: 'Parcours & Cours', icon: BookOpenCheck },
        { href: '/formation', label: 'Formations spécifiques', icon: GraduationCap },
        { href: '/coach', label: 'Coach IA (Bêta)', icon: Sparkles },
        { href: '/ligue', label: 'Classement', icon: Trophy },
        { href: '/communaute', label: 'Communauté / Forum', icon: Users },
        { href: '/annonces', label: 'Annonces', icon: Megaphone },
      ],
    },
    {
      title: 'COMPTE',
      items: [
        { href: '/profil', label: 'Mon Profil', icon: User },
        { href: '/account', label: 'Paramètres', icon: Settings },
        { href: '/messages', label: 'Messages', icon: Mail },
      ],
    },
  ];
}

/* ─── Desktop Sidebar ────────────────────────────────────── */
export function Sidebar() {
  const pathname = usePathname();
  const { userProfile: profile, signOut } = useAuth();
  const role = profile?.role;
  const isAdminView = pathname.startsWith('/admin');
  const sections = getSections(role, isAdminView);
  const staff = isStaff(role);

  const voiceLabel =
    profile?.instrument
      ? profile.instrument
      : profile?.voice_part
        ? VOICE_LABELS[profile.voice_part as VoicePart] ?? profile.voice_part
        : null;

  return (
    <>
      {/* ── Desktop sidebar (md+) ── */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 z-40 border-r"
        style={{ background: 'hsl(var(--sidebar))', borderColor: 'hsl(var(--sidebar-border))' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 h-16 px-5 border-b" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4ADE80, #22C55E)', boxShadow: '0 0 16px rgba(74,222,128,0.4)' }}>
            <span className="text-lg">🎵</span>
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'hsl(var(--sidebar-foreground))' }}>
            Maestro
          </span>
          {staff && (
            <Link href={isAdminView ? '/' : '/admin'} className="ml-auto text-xs px-2 py-1 rounded-lg transition-colors"
              style={{ background: 'rgba(74,222,128,0.15)', color: '#4ADE80' }}>
              {isAdminView ? 'Choriste' : 'Direction'}
            </Link>
          )}
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto no-scrollbar space-y-6">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-2 text-xs font-semibold tracking-widest uppercase"
                style={{ color: 'rgba(255,255,255,0.3)' }}>
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link href={item.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                        style={{
                          color: active ? '#4ADE80' : 'rgba(255,255,255,0.65)',
                          background: active ? 'rgba(74,222,128,0.12)' : 'transparent',
                          borderLeft: active ? '2px solid #4ADE80' : '2px solid transparent',
                        }}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Profile card */}
        <div className="p-3 border-t" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #4ADE80, #22C55E)', color: '#071008' }}>
              {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
                {profile?.display_name ?? '—'}
              </p>
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {ROLE_LABELS[role as Role] ?? role ?? '—'}
                {voiceLabel && ` · ${voiceLabel}`}
              </p>
            </div>
            <button onClick={signOut} className="p-1.5 rounded-lg transition-colors" title="Se déconnecter"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h6a2 2 0 012 2v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav (< md) ── */}
      <BottomNav />
    </>
  );
}

/* ─── Mobile Bottom Navigation ───────────────────────────── */
function BottomNav() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [pathname]);

  return (
    <nav
      ref={containerRef}
      className="md:hidden fixed bottom-0 inset-x-0 z-50 glass-nav flex items-center justify-start gap-1 px-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory"
      style={{
        height: 'calc(3.75rem + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {BOTTOM_NAV.map((item) => {
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            data-active={active}
            className="flex flex-col items-center gap-0.5 px-3 py-2 transition-all duration-200 active:scale-90 flex-shrink-0 snap-center"
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200"
              style={{
                background: active ? 'rgba(74,222,128,0.18)' : 'transparent',
                boxShadow: active ? '0 0 16px rgba(74,222,128,0.2)' : 'none',
              }}
            >
              <item.icon
                className="w-5 h-5 transition-all duration-200"
                style={{ color: active ? '#4ADE80' : 'rgba(255,255,255,0.4)' }}
              />
            </div>
            <span
              className="text-[10px] font-semibold transition-colors duration-200"
              style={{ color: active ? '#4ADE80' : 'rgba(255,255,255,0.35)' }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
