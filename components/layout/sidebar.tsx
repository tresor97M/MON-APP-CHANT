'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Trophy, User, Mail, Settings, Brain, Video, Award, MessageSquare, HelpCircle, BarChart2, BookOpen, Edit2, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useLang } from '@/hooks/use-lang';

type NavItem = {
  href: string;
  label: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
  adminOnly?: boolean;
};

const getSections = (userProfile: any, isAdminView: boolean, lang: string): NavSection[] => {
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';
  const isSuper = userProfile?.role === 'super_admin';

  if (isAdminView && isAdmin) {
    // Version Espace Admin complète (conforme à "INSTRUCTOR PAGES")
    return [
      {
        title: 'APPLICATIONS',
        items: [
          { href: '/', label: lang === 'fr' ? 'Espace Élève' : 'Student Space', icon: Home },
          { href: '/admin', label: lang === 'fr' ? 'Espace Admin' : 'Admin Space', icon: User }
        ]
      },
      {
        title: lang === 'fr' ? 'COMPTE' : 'ACCOUNT',
        items: [
          { href: '/account', label: lang === 'fr' ? 'Mon Compte' : 'My Account', icon: Settings },
          { href: '/messages', label: lang === 'fr' ? 'Mes Messages' : 'My Messages', icon: Mail }
        ]
      },
      {
        title: lang === 'fr' ? 'ADMINISTRATEUR' : 'INSTRUCTOR',
        items: [
          { href: '/admin/cours', label: lang === 'fr' ? 'Gérer les cours' : 'Course Manager', icon: BookOpen },
          { href: '/admin/quiz', label: lang === 'fr' ? 'Gérer les quiz' : 'Quiz Manager', icon: Brain },
          { href: '/admin/earnings', label: lang === 'fr' ? 'Gains' : 'Earnings', icon: BarChart2 },
          { href: '/admin/statement', label: lang === 'fr' ? 'Rapports' : 'Statement', icon: Award },
          { href: '/communaute/forum', label: lang === 'fr' ? 'Forum de discussion' : 'Community', icon: MessageSquare },
          { href: '/communaute/aide', label: lang === 'fr' ? 'Centre d\'aide' : 'Help Center', icon: HelpCircle },
          ...(isSuper ? [{ href: '/admin/acces', label: lang === 'fr' ? 'Gestion Accès' : 'Access Manager', icon: Settings }] : []),
        ]
      }
    ];
  }

  // Version Espace Élève standard
  return [
    {
      title: 'APPLICATIONS',
      items: [
        { href: '/', label: lang === 'fr' ? 'Espace Élève' : 'Student Space', icon: Home },
        ...(isAdmin ? [{ href: '/admin', label: lang === 'fr' ? 'Espace Admin' : 'Admin Space', icon: User }] : [])
      ]
    },
    {
      title: lang === 'fr' ? 'COMPTE' : 'ACCOUNT',
      items: [
        { href: '/account', label: lang === 'fr' ? 'Mon Compte' : 'My Account', icon: Settings },
        { href: '/messages', label: lang === 'fr' ? 'Mes Messages' : 'My Messages', icon: Mail }
      ]
    },
    {
      title: lang === 'fr' ? 'ÉLÈVE' : 'STUDENT',
      items: [
        { href: '/parcours', label: lang === 'fr' ? 'Parcourir les cours' : 'Browse Courses', icon: Compass },
        { href: '/lecon/1', label: lang === 'fr' ? 'Suivre une leçon' : 'Take Course', icon: Video },
        { href: '/lecon/1', label: lang === 'fr' ? 'Faire un quiz' : 'Take Quiz', icon: Brain },
        { href: '/profil', label: lang === 'fr' ? 'Résultats des quiz' : 'Quiz Results', icon: Award },
        { href: '/parcours', label: lang === 'fr' ? 'Mes cours' : 'My Courses', icon: Compass, badge: 'PRO', badgeColor: 'bg-primary text-primary-foreground' },
        { href: '/communaute/forum', label: lang === 'fr' ? 'Forum de discussion' : 'Forum', icon: MessageSquare },
        { href: '/communaute/aide', label: lang === 'fr' ? 'Centre d\'aide' : 'Help Center', icon: HelpCircle },
      ]
    }
  ];
};

export function Sidebar() {
  const pathname = usePathname();
  const { lang } = useLang();
  const { userProfile, signOut } = useAuth();
  
  const isAdminView = pathname.startsWith('/admin');
  const sections = getSections(userProfile, isAdminView, lang);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:top-16 md:bottom-0 md:left-0 border-r border-gray-700 bg-[#2d3436] text-white">
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 no-scrollbar">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1.5">
              {/* Section Header */}
              <div className="px-3 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                {section.title}
              </div>

              {/* Section Items */}
              <div className="space-y-0.5">
                {section.items.map((item, iIdx) => {
                  const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={iIdx}
                      href={item.href}
                      className={cn(
                        'group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200',
                        active
                          ? 'bg-gradient-to-r from-primary/30 to-secondary/10 text-white border-l-2 border-primary shadow-sm shadow-primary/5'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={cn('w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110', active ? 'text-primary' : 'text-white/40 group-hover:text-white')} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={cn('text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 scale-90', item.badgeColor)}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom area */}
        <div className="p-3 border-t border-primary/10 space-y-2">
          {isAdminView ? (
            <button 
              onClick={() => signOut()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all shadow-md"
            >
              <LogOut className="w-4 h-4" />
              {lang === 'fr' ? 'Déconnexion' : 'Log Out'}
            </button>
          ) : (
            <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent border border-primary/20 p-3.5 relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-primary/10 rounded-full blur-xl" />
              <div className="text-[11px] font-bold text-white mb-0.5 relative z-10">
                {lang === 'fr' ? 'Passe Premium' : 'Upgrade to Premium'}
              </div>
              <div className="text-[10px] text-white/50 leading-relaxed mb-2.5 relative z-10">
                {lang === 'fr' ? 'Analyse vocale et leçons illimitées.' : 'Unlock real-time feedback & extra levels.'}
              </div>
              <button className="w-full text-[10px] font-bold bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-lg py-1.5 hover:opacity-90 transition-opacity relative z-10 shadow-md shadow-primary/10">
                {lang === 'fr' ? 'Découvrir' : 'Discover'}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#2d3436]/95 backdrop-blur-md border-t border-gray-700">
        <div className="flex items-center justify-around h-16 px-2 text-white">
          <Link href="/" className={cn('flex flex-col items-center gap-1.5 px-3 py-1.5 text-xs', pathname === '/' ? 'text-primary' : 'text-white/55')}>
            <Home className="w-4 h-4" />
            <span className="text-[9px] font-semibold">{lang === 'fr' ? 'Accueil' : 'Home'}</span>
          </Link>
          <Link href="/parcours" className={cn('flex flex-col items-center gap-1.5 px-3 py-1.5 text-xs', pathname === '/parcours' ? 'text-primary' : 'text-white/55')}>
            <Compass className="w-4 h-4" />
            <span className="text-[9px] font-semibold">{lang === 'fr' ? 'Parcours' : 'Browse'}</span>
          </Link>
          <Link href="/ligue" className={cn('flex flex-col items-center gap-1.5 px-3 py-1.5 text-xs', pathname === '/ligue' ? 'text-primary' : 'text-white/55')}>
            <Trophy className="w-4 h-4" />
            <span className="text-[9px] font-semibold">{lang === 'fr' ? 'Ligue' : 'League'}</span>
          </Link>
          <Link href="/profil" className={cn('flex flex-col items-center gap-1.5 px-3 py-1.5 text-xs', pathname === '/profil' ? 'text-primary' : 'text-white/55')}>
            <User className="w-4 h-4" />
            <span className="text-[9px] font-semibold">{lang === 'fr' ? 'Profil' : 'Profile'}</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
