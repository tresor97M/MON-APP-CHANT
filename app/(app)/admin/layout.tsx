'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useLang } from '@/hooks/use-lang';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { lang } = useLang();
  const { userProfile, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'super_admin')) {
        // Redirect non-admin users to homepage
        alert(lang === 'fr' 
          ? 'Accès refusé. Vous devez être administrateur pour accéder à cet espace.' 
          : 'Access denied. You must be an administrator to access this area.'
        );
        router.replace('/');
      }
    }
  }, [userProfile, loading, router, lang]);

  if (loading || !userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'super_admin')) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">
            {lang === 'fr' ? 'Vérification des droits d\'accès...' : 'Verifying access rights...'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
