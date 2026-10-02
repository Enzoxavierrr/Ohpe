import '../styles/login.css';

type Props = {
  missing: string[];
};

export function ConfigErrorPage({ missing }: Props) {
  return (
    <div className="login-shell">
      <div className="login-bg" aria-hidden="true">
        <div className="login-grid" />
        <div className="login-glow" />
      </div>

      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round">
              <path d="M 128 44 A 84 84 0 1 0 212 128" />
            </svg>
          </span>
          <span className="brand-name">Ohpe</span>
        </div>

        <h1 className="login-title">Configuração pendente</h1>
        <p className="login-subtitle">
          Esse ambiente não tem as credenciais do Supabase. Defina as variáveis
          abaixo nas <strong>Environment Variables</strong> do host (Vercel,
          Netlify, etc.) e faça um novo deploy.
        </p>

        <ul className="config-missing">
          {missing.map((name) => (
            <li key={name}><code>{name}</code></li>
          ))} </ul>

        <p className="login-subtitle" style={{ marginTop: 20, marginBottom: 0 }}>
          Em desenvolvimento local, copie <code>.env.local.example</code> pra
          <code> .env.local</code> e preencha os valores do projeto Supabase.
        </p>
      </div>
    </div>
  );
}
