import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const USERNAME_DOMAIN = 'ohpe.local';
const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function validateEmail(raw: string): string | null {
  const e = raw.trim();
  if (!e) return 'Digite um email.';
  if (!EMAIL_RE.test(e)) return 'Email inválido.';
  return null;
}

function usernameToLegacyEmail(raw: string): string {
  return `${normalizeUsername(raw)}@${USERNAME_DOMAIN}`;
}

function isLegacyEmail(email: string | undefined | null): boolean {
  return Boolean(email && email.toLowerCase().endsWith(`@${USERNAME_DOMAIN}`));
}

export function extractLegacyUsername(email: string | undefined | null): string {
  if (!email || !isLegacyEmail(email)) return '';
  return email.slice(0, email.length - (USERNAME_DOMAIN.length + 1));
}

export function userDisplayName(user: User | null): string {
  const metaName = typeof user?.user_metadata?.username === 'string' ? user.user_metadata.username : '';
  if (metaName) return metaName;
  const email = user?.email ?? '';
  const at = email.indexOf('@');
  return at > 0 ? email.slice(0, at) : email;
}

export function needsAccountMigration(user: User | null): boolean {
  if (!user) return false;
  return isLegacyEmail(user.email);
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const u = normalizeUsername(username);
  if (!u) return false;
  const { data, error } = await supabase.rpc('username_available', { uname: u });
  if (error) {
    console.warn('[useAuth] username_available RPC falhou', error);
    return true; // fail-open — o unique constraint protege no insert
  }
  return Boolean(data);
}

async function emailForUsername(username: string): Promise<string | null> {
  const u = normalizeUsername(username);
  if (!u) return null;
  const { data, error } = await supabase.rpc('email_for_username', { uname: u });
  if (error) {
    console.warn('[useAuth] email_for_username RPC falhou', error);
    return null;
  }
  return typeof data === 'string' && data.length > 0 ? data : null;
}

async function createProfile(userId: string, username: string) {
  const u = normalizeUsername(username);
  const { error } = await supabase.from('profiles').insert({ user_id: userId, username: u });
  if (error) {
    // 23505 = unique violation
    if ((error as any).code === '23505') {
      throw new Error('Esse usuário já está em uso.');
    }
    throw error;
  }
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

  async function signIn(identifier: string, password: string) {
    const trimmed = identifier.trim();
    let email: string;

    if (trimmed.includes('@')) {
      email = trimmed.toLowerCase();
    } else {
      // Tenta primeiro resolver via profiles (usuário com email real)
      const resolved = await emailForUsername(trimmed);
      if (resolved) {
        email = resolved;
      } else {
        // Fallback pra contas legadas que ainda têm @ohpe.local
        email = usernameToLegacyEmail(trimmed);
      }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(username: string, email: string, password: string) {
    const u = normalizeUsername(username);
    const emailNormalized = email.trim().toLowerCase();

    // Pré-check de disponibilidade (reduz lixo em auth.users; a unique constraint segura o resto)
    const available = await isUsernameAvailable(u);
    if (!available) {
      throw new Error('Esse usuário já está em uso.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: emailNormalized,
      password,
      options: {
        data: { username: u },
      },
    });
    if (error) throw error;

    // Supabase pode retornar o user mesmo com confirmação pendente — temos id pra inserir profile
    const userId = data.user?.id;
    if (userId) {
      try {
        await createProfile(userId, u);
      } catch (profileErr) {
        // Se o usuário é criado mas o profile falha (ex.: username pegou race), o signUp "vence"
        // mas o login por username não funciona. Logamos pra investigar.
        console.error('[useAuth] profile create falhou', profileErr);
        throw profileErr;
      }
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function sendResetEmail(email: string) {
    // Sem hash no redirectTo — o Supabase anexa #access_token=...&type=recovery
    // e o detectSessionInUrl do client lê isso automaticamente.
    const redirectTo = `${window.location.origin}/`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo,
    });
    if (error) throw error;
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async function updateEmail(newEmail: string) {
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim().toLowerCase() });
    if (error) throw error;
  }

  async function ensureProfile(username: string) {
    if (!state.user) throw new Error('Sem usuário logado.');
    await createProfile(state.user.id, username);
  }

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    sendResetEmail,
    updatePassword,
    updateEmail,
    ensureProfile,
  };
}
