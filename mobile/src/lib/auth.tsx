/**
 * Auth state for Harbor. Holds the Supabase session and the household `member`
 * it maps to (member.auth_user_id = the logged-in user). The whole app is gated
 * on `session` in the root layout; `member` tells screens who "You" is.
 */

import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';
import type { Tables } from './database.types';

type Member = Tables<'member'>;

type AuthValue = {
  session: Session | null;
  member: Member | null;
  loading: boolean;
  /** Email a 6-digit sign-in code (only to already-provisioned accounts). */
  requestCode: (email: string) => Promise<{ error: string | null }>;
  /** Verify the emailed code; on success the session listener swaps the UI. */
  verifyCode: (email: string, code: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Resolve which household member this login is, once we have a session.
  useEffect(() => {
    if (!session) {
      setMember(null);
      return;
    }
    let active = true;
    supabase
      .from('member')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setMember(data);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const requestCode = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    return { error: error?.message ?? null };
  };

  const verifyCode = async (email: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, member, loading, requestCode, verifyCode, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
