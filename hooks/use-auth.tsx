'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type UserProfile } from '@/lib/supabase';
import type { VoicePart } from '@/lib/types';

type AuthCtx = {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, voicePart: VoicePart | null) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  session: null, user: null, userProfile: null, loading: true,
  signIn: async () => ({ error: 'not ready' }),
  signUp: async () => ({ error: 'not ready' }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérification synchrone du localStorage pour éviter d'attendre le réseau si aucun token n'existe
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

  // Charger le profil quand la session change
  useEffect(() => {
    if (session?.user) {
      supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()
        .then(async ({ data }) => {
          if (!data) {
            const meta = session.user.user_metadata || {};
            const name = meta.name || session.user.email?.split('@')[0] || 'Membre';
            const { data: newProfile } = await supabase
              .from('user_profiles')
              .insert({
                user_id: session.user.id,
                display_name: name,
                role: 'choriste',
                voice_part: meta.voice_part || null,
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

  const refreshProfile = async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (data) setUserProfile(data);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signUp = async (email: string, password: string, name: string, voicePart: VoicePart | null) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, voice_part: voicePart } },
    });

    if (error) return { error: error.message };

    if (data?.user && data.session) {
      // Session immédiate (confirmation email désactivée) : créer le profil tout de suite
      await supabase.from('user_profiles').insert({
        user_id: data.user.id,
        display_name: name,
        role: 'choriste',
        voice_part: voicePart,
      });
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user || null, userProfile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
