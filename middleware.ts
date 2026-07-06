import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-middleware';

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);
  const pathname = request.nextUrl.pathname;

  // 1. Récupérer l'utilisateur courant de Supabase Auth (vérifié de façon sécurisée par le serveur)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Redirection vers /auth si l'utilisateur n'est pas connecté
  if (!user) {
    if (pathname !== '/auth') {
      const loginUrl = new URL('/auth', request.url);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // 3. Redirection si déjà connecté et tente d'aller sur la page /auth
  if (user && pathname === '/auth') {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
    const targetUrl = new URL(isAdmin ? '/admin' : '/', request.url);
    return NextResponse.redirect(targetUrl);
  }

  // 4. Garde de rôle strict pour l'espace /admin/*
  if (pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
    if (!isAdmin) {
      // Bloquer l'accès et rediriger vers l'espace élève (accueil)
      const forbiddenUrl = new URL('/', request.url);
      return NextResponse.redirect(forbiddenUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Intercepte toutes les requêtes de pages pour sécuriser l'accès
     * en excluant les fichiers de style statiques, images et scripts internes.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
