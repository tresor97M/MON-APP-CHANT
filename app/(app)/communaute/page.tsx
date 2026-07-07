'use client';

import Link from 'next/link';
import { MessageSquare, BookOpen, HelpCircle } from 'lucide-react';

export default function CommunautePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Communauté</h1>
        <p className="text-sm text-muted-foreground mt-1">Échangez, progressez et apprenez ensemble.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/communaute/forum', icon: MessageSquare, title: 'Forum', desc: 'Posez vos questions et aidez la communauté.', color: 'from-primary/20 to-primary/5 text-primary border-primary/20' },
          { href: '/communaute/question', icon: HelpCircle, title: 'Poser une question', desc: 'Obtenez des réponses de la communauté.', color: 'from-secondary/20 to-secondary/5 text-secondary border-secondary/20' },
          { href: '/communaute/aide', icon: BookOpen, title: 'Centre d\'aide', desc: 'Articles et guides sur Maestro Studio.', color: 'from-accent/20 to-accent/5 text-accent border-accent/20' },
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className={`flex flex-col items-start gap-3 p-5 rounded-2xl bg-gradient-to-br ${item.color} border hover:shadow-md hover:-translate-y-0.5 transition-all`}>
            <div className="p-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-foreground">{item.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
