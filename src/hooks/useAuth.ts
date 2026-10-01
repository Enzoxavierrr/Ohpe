import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const USERNAME_DOMAIN = 'ohpe.local';
const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): string | null {
  const u = normalizeUsername(raw);
  if (!u) return 'Digite um nome de usuário.';
  if (!USERNAME_RE.test(u)) {
    return 'Usuário aceita só letras minúsculas, números, ponto, hífen e underline (3 a 32).';
  }
  return null;
}

function usernameToEmail(raw: string): string {
  return `${normalizeUsername(raw)}@${USERNAME_DOMAIN}`;
}

export function userDisplayName(user: User | null): string {
  const email = user?.email ?? '';
  const at = email.indexOf('@');
  return at > 0 ? email.slice(0, at) : email;
}

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState({ user: data.session?.user ?? null, session: data.session, loading: false });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState({ user: session?.user ?? null, session, loading: false });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(username: string, password: string) {
    const email = usernameToEmail(username);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(username: string, password: string) {
    const email = usernameToEmail(username);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { ...state, signIn, signUp, signOut };
}
