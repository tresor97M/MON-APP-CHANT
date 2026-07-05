'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, type UserProfile } from '@/lib/supabase';

type AuthCtx = {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, role?: string, learningProfile?: string, instrument?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  session: null, user: null, userProfile: null, loading: true,
  signIn: async () => ({ error: 'not ready' }),
  signUp: async () => ({ error: 'not ready' }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Vérification synchrone et rapide du localStorage pour éviter d'attendre le réseau si aucun token n'existe
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      const hasAuthToken = keys.some(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
      if (!hasAuthToken) {
        setLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (!sess) {
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Fetch profile when session changes
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUserProfile(null);
      setLoading(false);
      return;
    }
    if (session?.user) {
      supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()
        .then(async ({ data }) => {
          if (!data) {
            const name = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Utilisateur';
            const { data: newProfile } = await supabase
              .from('user_profiles')
              .insert({
                user_id: session.user.id,
                display_name: name,
                role: 'student',
              })
              .select()
              .maybeSingle();
            setUserProfile(newProfile);
          } else {
            setUserProfile(data);
          }
          setLoading(false);
        });
    } else {
      setUserProfile(null);
      setLoading(false);
    }
  }, [session]);

  const notConfiguredError =
    "Supabase n'est pas configuré. Ajoutez les variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.";

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) return { error: notConfiguredError };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signUp = async (email: string, password: string, name: string, role = 'student', learningProfile?: string, instrument?: string) => {
    if (!isSupabaseConfigured) return { error: notConfiguredError };
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { name } },
    });

    if (error) return { error: error.message };

    if (data?.user) {
      // Create profile record in user_profiles
      await supabase.from('user_profiles').insert({
        user_id: data.user.id,
        display_name: name,
        role: role,
        learning_profile: learningProfile || null,
        instrument: instrument || null,
      });
    }

    return { error: null };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user || null, userProfile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
