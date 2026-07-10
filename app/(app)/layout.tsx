'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import { ConfettiCanvas } from '@/hooks/use-celebration';
import { LevelUpOverlay } from '@/components/layout/level-up-overlay';
import { Mic2 } from 'lucide-react';

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !loading && !session) {
      router.replace('/auth');
    }
  }, [mounted, loading, session, router]);

  if (loading || !session) {
    return (
      <div className="min-h-screen grid place-items-center" style={{ background: 'hsl(var(--background))' }}>
        <div className="text-center space-y-4 animate-fade-in">
          <div
            className="inline-grid place-items-center w-16 h-16 rounded-3xl shadow-lg animate-pulse"
            style={{
              background: 'linear-gradient(135deg, #4ADE80, #22C55E)',
              boxShadow: '0 0 32px rgba(74,222,128,0.35)',
            }}
          >
            <Mic2 className="w-8 h-8" style={{ color: '#071008' }} />
          </div>
          <div className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Chargement de Maestro...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(var(--background))' }}>
      {/* Top bar — visible on all devices */}
      <TopBar />

      <div className="flex-1 flex flex-row">
        <Sidebar />
        <div className="flex-1 md:pl-64">
          {/* Desktop: normal padding | Mobile: bottom padding for bottom nav */}
          <main className="px-4 md:px-8 py-4 md:py-6 pb-24 md:pb-12 max-w-6xl mx-auto">
            {children}
          </main>
        </div>
      </div>

      <ConfettiCanvas />
      <LevelUpOverlay />
    </div>
  );
}
