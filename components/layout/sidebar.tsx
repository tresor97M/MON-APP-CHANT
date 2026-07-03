'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Trophy, User, Mail, Settings, Play, Brain, Video, Award, Users, MessageSquare, HelpCircle, BarChart2, BookOpen, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
};

const sections: NavSection[] = [
  {
    title: 'APPLICATIONS',
    items: [
      { href: '/', label: 'Student', icon: Home },
      { href: '/instructor', label: 'Instructor', icon: User }
    ]
  },
  {
    title: 'ACCOUNT',
    items: [
      { href: '/account', label: 'Account', icon: Settings },
      { href: '/messages', label: 'Messages', icon: Mail }
    ]
  },
  {
    title: 'STUDENT',
    items: [
      { href: '/parcours', label: 'Browse Courses', icon: Compass },
      { href: '/lecon/1', label: 'Take Course', icon: Video },
      { href: '/lecon/1', label: 'Take a Quiz', icon: Brain },
      { href: '/profil', label: 'Quiz Results', icon: Award },
      { href: '/parcours', label: 'My Courses', icon: Compass, badge: 'PRO', badgeColor: 'bg-primary text-primary-foreground' },
      { href: '/communaute/forum', label: 'Forum', icon: MessageSquare },
      { href: '/communaute/aide', label: 'Help Center', icon: HelpCircle },
    ]
  },
  {
    title: 'INSTRUCTOR',
    items: [
      { href: '/instructor', label: 'Dashboard', icon: BarChart2 },
      { href: '/instructor/cours', label: 'Manage Courses', icon: BookOpen },
      { href: '/instructor/cours/nouveau', label: 'Add/Edit Course', icon: Edit2 },
      { href: '/instructor/lecon/nouvelle', label: 'Add Lesson', icon: Video },
      { href: '/instructor/quiz', label: 'Manage Quizzes', icon: Brain },
      { href: '/messages', label: 'Messages', icon: Mail },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();

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

        {/* Upgrade card at bottom */}
        <div className="p-3 border-t border-primary/10">
          <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent border border-primary/20 p-3.5 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-primary/10 rounded-full blur-xl" />
            <div className="text-[11px] font-bold text-white mb-0.5 relative z-10">Passe Premium</div>
            <div className="text-[10px] text-white/50 leading-relaxed mb-2.5 relative z-10">Analyse vocale et leçons illimitées.</div>
            <button className="w-full text-[10px] font-bold bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-lg py-1.5 hover:opacity-90 transition-opacity relative z-10 shadow-md shadow-primary/10">
              Découvrir
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#2d3436]/95 backdrop-blur-md border-t border-gray-700">
        <div className="flex items-center justify-around h-16 px-2 text-white">
          <Link href="/" className={cn('flex flex-col items-center gap-1.5 px-3 py-1.5 text-xs', pathname === '/' ? 'text-primary' : 'text-white/55')}>
            <Home className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Accueil</span>
          </Link>
          <Link href="/parcours" className={cn('flex flex-col items-center gap-1.5 px-3 py-1.5 text-xs', pathname === '/parcours' ? 'text-primary' : 'text-white/55')}>
            <Compass className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Parcours</span>
          </Link>
          <Link href="/ligue" className={cn('flex flex-col items-center gap-1.5 px-3 py-1.5 text-xs', pathname === '/ligue' ? 'text-primary' : 'text-white/55')}>
            <Trophy className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Ligue</span>
          </Link>
          <Link href="/profil" className={cn('flex flex-col items-center gap-1.5 px-3 py-1.5 text-xs', pathname === '/profil' ? 'text-primary' : 'text-white/55')}>
            <User className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Profil</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
