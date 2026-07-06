'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Music, CalendarDays, Users, Trophy, User, Mail, Settings,
  GraduationCap, ClipboardCheck, Megaphone, LogOut, MicVocal,
  LayoutDashboard, Table2, Stethoscope, ShieldCheck, BookOpenCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { isStaff, canManageRoles } from '@/lib/permissions';
import { VOICE_LABELS, ROLE_LABELS, type Role, type VoicePart } from '@/lib/types';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

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
          { href: '/account', label: 'Mon Compte', icon: Settings },
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
        { href: '/formation', label: 'Formation', icon: BookOpenCheck },
        { href: '/coach', label: 'Coach IA (Bêta)', icon: Sparkles },
        { href: '/ligue', label: 'Classement', icon: Trophy },
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

export function Sidebar() {
  const pathname = usePathname();
  const { userProfile, signOut } = useAuth();

  const isAdminView = pathname.startsWith('/admin');
  const sections = getSections(userProfile?.role, isAdminView);
  const voice = userProfile?.voice_part as VoicePart | null;
  const role = (userProfile?.role || 'choriste') as Role;

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:top-16 md:bottom-0 md:left-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 no-scrollbar">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1.5">
              <div className="px-3 text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item, iIdx) => {
                  const active = pathname === item.href || (item.href !== '/' && item.href !== '/admin' && pathname.startsWith(item.href)) || (item.href === '/admin' && pathname === '/admin');
                  const Icon = item.icon;
                  return (
                    <Link
                      key={iIdx}
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200',
                        active
                          ? 'bg-primary/15 text-sidebar-foreground border-l-2 border-primary'
                          : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/5',
                      )}
                    >
                      <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-primary' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground')} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Carte identité pupitre + déconnexion */}
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="rounded-2xl bg-sidebar-foreground/5 border border-sidebar-border p-3.5">
            <div className="text-[11px] font-bold text-sidebar-foreground mb-0.5 truncate">
              {userProfile?.display_name || 'Membre'}
            </div>
            <div className="text-[10px] text-sidebar-foreground/50 leading-relaxed">
              {ROLE_LABELS[role]}
              {userProfile?.instrument ? (
                ` · ${
                  ({
                    piano: 'Piano / Clavier',
                    guitare: 'Guitare',
                    basse: 'Basse',
                    batterie: 'Batterie',
                    cuivres: 'Vents / Cuivres',
                    autre: 'Instrumentiste'
                  }[userProfile.instrument] || userProfile.instrument)
                }`
              ) : voice ? (
                ` · Pupitre ${VOICE_LABELS[voice]}`
              ) : (
                ' · Voix à évaluer'
              )}
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Navigation mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-sidebar/95 backdrop-blur-md border-t border-sidebar-border">
        <div className="flex items-center justify-around h-16 px-2 text-sidebar-foreground">
          <Link href="/" className={cn('flex flex-col items-center gap-1.5 px-3 py-1.5', pathname === '/' ? 'text-primary' : 'text-sidebar-foreground/55')}>
            <Home className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Accueil</span>
          </Link>
          <Link href="/cantiques" className={cn('flex flex-col items-center gap-1.5 px-3 py-1.5', pathname.startsWith('/cantiques') ? 'text-primary' : 'text-sidebar-foreground/55')}>
            <Music className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Cantiques</span>
          </Link>
          <Link href="/calendrier" className={cn('flex flex-col items-center gap-1.5 px-3 py-1.5', pathname.startsWith('/calendrier') ? 'text-primary' : 'text-sidebar-foreground/55')}>
            <CalendarDays className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Calendrier</span>
          </Link>
          <Link href="/repetitions" className={cn('flex flex-col items-center gap-1.5 px-3 py-1.5', pathname.startsWith('/repetitions') ? 'text-primary' : 'text-sidebar-foreground/55')}>
            <MicVocal className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Répétitions</span>
          </Link>
          <Link href="/profil" className={cn('flex flex-col items-center gap-1.5 px-3 py-1.5', pathname.startsWith('/profil') ? 'text-primary' : 'text-sidebar-foreground/55')}>
            <User className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Profil</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
