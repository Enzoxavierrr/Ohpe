import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import '../styles/login.css';

type Props = {
  onDone: () => void;
};

export function ResetPasswordPage({ onDone }: Props) {
  const { updatePassword, signOut } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não batem.');
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setSuccess(true);
      // Força novo login com a senha nova
      await signOut();
      // Limpa o hash do reset
      if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      setTimeout(() => onDone(), 1500);
    } catch (err: any) {
      setError(err?.message ?? 'Falha ao atualizar a senha.');
      setBusy(false);
    }
  }

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
        aria-label="Alternar tema"
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
              <path d="M 128 44 A 84 84 0 1 0 212 128" />
            </svg>
          </span>
          <span className="brand-name">Ohpe</span>
        </div>

        <div className="login-header">
          <h1 className="login-title login-anim login-anim--3">
            {success ? 'Senha atualizada' : 'Nova senha'}
          </h1>
          <p className="login-subtitle login-anim login-anim--4">
            {success
              ? 'Pronto. Agora entre com a senha nova.'
              : 'Escolha uma senha nova pra sua conta.'}
          </p>
        </div>

        {!success && (
          <form className="login-form" onSubmit={onSubmit}>
            <label className="login-field login-anim login-anim--5">
              <span>Nova senha</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={6}
                required
                disabled={busy}
              />
            </label>
            <label className="login-field login-anim login-anim--6">
              <span>Confirme a senha</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={6}
                required
                disabled={busy}
              />
            </label>
            {error && <div className="login-error" role="alert">{error}</div>}
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
                <span className="login-submit__label">Salvar nova senha</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
