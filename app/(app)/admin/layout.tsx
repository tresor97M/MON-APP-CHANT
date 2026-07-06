'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { isStaff } from '@/lib/permissions';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { userProfile, loading } = useAuth();

  useEffect(() => {
    if (!loading && userProfile && !isStaff(userProfile.role)) {
      router.replace('/');
    }
  }, [userProfile, loading, router]);

  if (loading || !userProfile || !isStaff(userProfile.role)) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Vérification des droits d&apos;accès...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
