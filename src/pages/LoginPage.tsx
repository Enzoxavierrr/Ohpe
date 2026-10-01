import { useState, type FormEvent } from 'react';
import { useAuth, validateUsername } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { BOARD_STORAGE_KEY } from '../hooks/useBoard';
import { downloadJson } from '../utils/downloadJson';
import '../styles/login.css';

type Mode = 'signin' | 'signup';

const BRAND_LETTERS = ['O', 'h', 'p', 'e'];

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerFading, setHeaderFading] = useState(false);
  const [errorKey, setErrorKey] = useState(0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const invalid = validateUsername(username);
    if (invalid) {
      setError(invalid);
      setErrorKey((k) => k + 1);
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signin') await signIn(username, password);
      else await signUp(username, password);
    } catch (err: any) {
      setError(translateError(err?.message || 'Falha ao autenticar'));
      setErrorKey((k) => k + 1);
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    setHeaderFading(true);
    setError(null);
    window.setTimeout(() => {
      setMode(next);
      setHeaderFading(false);
    }, 180);
  }

  function hasLocalBoard(): boolean {
    try {
      const raw = localStorage.getItem(BOARD_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const hasCards = parsed?.cards && Object.keys(parsed.cards).length > 0;
      const hasArchive = Array.isArray(parsed?.archive) && parsed.archive.length > 0;
      return Boolean(hasCards || hasArchive);
    } catch { return false; }
  }

  function exportLocal() {
    try {
      const raw = localStorage.getItem(BOARD_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      downloadJson(parsed, 'ohpe-board-local');
    } catch {}
  }

  const localExists = hasLocalBoard();

  return (
    <div className="login-shell">
      <div className="login-bg" aria-hidden="true">
        <div className="login-grid" />
        <div className="login-glow" />
        <div className="login-scan" />
      </div>

      <button
        type="button"
        className="login-theme-toggle"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {theme === 'dark' ? (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" /><path d="M12 20v2" />
              <path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" />
              <path d="M2 12h2" /><path d="M20 12h2" />
              <path d="M6.34 17.66l-1.41 1.41" /><path d="M19.07 4.93l-1.41 1.41" />
            </>
          ) : (
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          )}
        </svg>
      </button>

      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round">
              <path id="login-arc" d="M 128 44 A 84 84 0 1 0 212 128" />
            </svg>
          </span>
          <span className="brand-name" aria-label="Ohpe">
            {BRAND_LETTERS.map((ch, i) => (
              <span
                key={i}
                className="login-letter"
                style={{ ['--i' as any]: i }}
                aria-hidden="true"
              >
                {ch}
              </span>
            ))}
          </span>
        </div>

        <div className={`login-header ${headerFading ? 'is-fading' : ''}`}>
          <h1 className="login-title login-anim login-anim--3">
            {mode === 'signin' ? 'Entre na sua conta' : 'Crie sua conta'}
          </h1>
          <p className="login-subtitle login-anim login-anim--4">
            {mode === 'signin'
              ? 'Seus cards te esperam em qualquer dispositivo.'
              : 'Pra que seu board viaje com você entre casa e trabalho.'}
          </p>
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          <label className="login-field login-anim login-anim--5">
            <span>Usuário</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="seunome"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              minLength={3}
              maxLength={32}
              required
              disabled={busy}
            />
          </label>

          <label className="login-field login-anim login-anim--6">
            <span>Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
              required
              disabled={busy}
            />
          </label>

          {error && (
            <div key={errorKey} className="login-error" role="alert">{error}</div>
          )}

          <button
            type="submit"
            className={`login-submit login-anim login-anim--7 ${busy ? 'is-busy' : ''}`}
            disabled={busy}
          >
            {busy ? (
              <span className="login-submit__dots" aria-label="Carregando">
                <i /><i /><i />
              </span>
            ) : (
              <span className="login-submit__label">
                {mode === 'signin' ? 'Entrar' : 'Criar conta'}
              </span>
            )}
          </button>

          <p className="login-remember login-anim login-anim--7">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Mantemos você conectado nesse navegador até clicar em Sair.
          </p>
        </form>

        <div className="login-swap login-anim login-anim--8">
          {mode === 'signin' ? (
            <>
              Primeira vez?{' '}
              <button type="button" onClick={() => switchMode('signup')}>Criar uma conta</button>
            </>
          ) : (
            <>
              Já tem conta?{' '}
              <button type="button" onClick={() => switchMode('signin')}>Entrar</button>
            </>
          )}
        </div>

        {localExists && (
          <div className="login-local-note login-anim login-anim--9">
            <div className="login-local-note__text">
              Tem um board salvo nesse navegador da versão antiga.
            </div>
            <button type="button" className="login-local-note__btn" onClick={exportLocal}>
              Baixar antes de entrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Usuário ou senha incorretos.';
  if (m.includes('user already registered')) return 'Já existe uma conta com esse usuário.';
  if (m.includes('password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('email') && (m.includes('invalid') || m.includes('not allowed'))) {
    return 'Esse usuário não é aceito. Tente outro (só letras, números, . _ -).';
  }
  if (m.includes('rate limit')) return 'Muitas tentativas. Espera um instante e tenta de novo.';
  if (m.includes('confirm') || m.includes('not confirmed')) {
    return 'Confirmação de email está ligada no Supabase. Desligue em Auth → Providers → Email.';
  }
  return msg;
}
