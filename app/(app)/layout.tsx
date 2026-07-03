'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import { ConfettiCanvas } from '@/hooks/use-celebration';
import { Music } from 'lucide-react';

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
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="text-center space-y-4">
          <div className="inline-grid place-items-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-primary to-secondary text-primary-foreground animate-pulse shadow-lg shadow-primary/20">
            <Music className="w-8 h-8" />
          </div>
          <div className="text-sm text-muted-foreground font-medium">Chargement de Maestro Studio...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar />
      <div className="flex-1 flex flex-row relative">
        <Sidebar />
        <div className="flex-1 md:pl-64">
          <main className="px-4 md:px-8 py-6 pb-24 md:pb-12 max-w-6xl mx-auto">{children}</main>
        </div>
      </div>
      <ConfettiCanvas />
    </div>
  );
}
