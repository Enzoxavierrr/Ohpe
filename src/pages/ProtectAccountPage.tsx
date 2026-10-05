import { useState, type FormEvent } from 'react';
import { useAuth, userDisplayName, validateEmail, extractLegacyUsername } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import '../styles/login.css';

type Props = {
  onDone: () => void;
};

export function ProtectAccountPage({ onDone }: Props) {
  const { user, updateEmail, signOut, ensureProfile } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const invalid = validateEmail(email);
    if (invalid) { setError(invalid); return; }
    setBusy(true);
    try {
      // Preserva o username antigo criando profile row (ignora erro se já existe)
      const legacyName = extractLegacyUsername(user?.email);
      if (legacyName) {
        try { await ensureProfile(legacyName); } catch { /* já tem, segue */ }
      }
      await updateEmail(email);
      setSent(true);
    } catch (err: any) {
      const m = (err?.message ?? '').toLowerCase();
      if (m.includes('already')) setError('Esse email já está em uso em outra conta.');
      else setError(err?.message ?? 'Falha ao atualizar o email.');
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
            {sent ? 'Confira seu email' : 'Adicione seu email'}
          </h1>
          <p className="login-subtitle login-anim login-anim--4">
            {sent ? (
              <>
                Mandamos um link pra <strong>{email}</strong>.<br/>
                Clica nele pra confirmar — depois disso, você entra com email + senha.
              </>
            ) : (
              <>
                Oi, <strong>{userDisplayName(user)}</strong>. A partir de agora o login é por email.
                Adicione o seu pra continuar — essa etapa é obrigatória e também habilita reset de senha.
              </>
            )}
          </p>
        </div>

        {!sent && (
          <form className="login-form" onSubmit={onSubmit}>
            <label className="login-field login-anim login-anim--5">
              <span>Email de recuperação</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
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
                <span className="login-submit__label">Enviar link de confirmação</span>
              )}
            </button>
            <button
              type="button"
              className="login-forgot"
              onClick={async () => {
                await signOut();
              }}
            >
              Sair sem adicionar
            </button>
          </form>
        )}

        {sent && (
          <div className="login-form">
            <button
              type="button"
              className="login-submit login-anim login-anim--7"
              onClick={onDone}
            >
              <span className="login-submit__label">Continuar pro app</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
