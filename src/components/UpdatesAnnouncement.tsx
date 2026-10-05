import { useEffect, useState } from 'react';
import '../styles/announcement.css';

// Troque o VERSION pra re-exibir o modal pra todo mundo quando lançar
// um novo batch de novidades.
const CHANGELOG_VERSION = '2025-10-05';
const SEEN_KEY = `ohpe.changelog.${CHANGELOG_VERSION}.seen`;

type Update = {
  icon: 'doc' | 'folder' | 'palette' | 'lock' | 'arrow';
  title: string;
  desc: string;
};

const UPDATES: Update[] = [
  {
    icon: 'doc',
    title: 'Nova aba Documentos',
    desc: 'Escreve markdown no app, importa .md ou cola texto. Modo leitura renderiza bonito e já dá pra grifar.',
  },
  {
    icon: 'palette',
    title: 'Grifo com 5 cores',
    desc: 'Marca o que importa em amarelo, azul, verde, rosa ou laranja. Cada grifo vira um tópico clicável no painel lateral.',
  },
  {
    icon: 'folder',
    title: 'Grupos pra organizar',
    desc: 'Agrupa documentos em seções colapsáveis. Arrasta pelo menu "Mover para".',
  },
  {
    icon: 'lock',
    title: 'Email de verdade no cadastro',
    desc: 'Agora dá pra recuperar senha por email. Contas antigas migram sozinhas na primeira entrada.',
  },
  {
    icon: 'arrow',
    title: 'Mais atalhos',
    desc: 'Botão de Documentos no header da home, página 404 nova e deploy em produção sem rota quebrada.',
  },
];

function Icon({ name }: { name: Update['icon'] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'doc':
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      );
    case 'folder':
      return (
        <svg {...common}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'palette':
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M3 17l6-6 4 4 8-8" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...common}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case 'arrow':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
  }
}

export function UpdatesAnnouncement() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(SEEN_KEY);
      if (seen) return;
    } catch { /* localStorage pode estar bloqueado — segue mostrando */ }
    const t = window.setTimeout(() => setOpen(true), 450);
    return () => window.clearTimeout(t);
  }, []);

  function dismiss() {
    setClosing(true);
    window.setTimeout(() => {
      try { localStorage.setItem(SEEN_KEY, '1'); } catch {}
      setOpen(false);
      setClosing(false);
    }, 180);
  }

  if (!open) return null;

  return (
    <div className={`announcement-backdrop${closing ? ' is-closing' : ''}`} onClick={dismiss} role="dialog" aria-modal="true" aria-labelledby="announcement-title">
      <div className={`announcement-card${closing ? ' is-closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="announcement-close"
          onClick={dismiss}
          aria-label="Fechar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="announcement-header">
          <span className="announcement-badge">
            <span className="announcement-pulse" aria-hidden="true" />
            Novidades
          </span>
          <h2 id="announcement-title" className="announcement-title">O que mudou por aqui</h2>
          <p className="announcement-sub">
            Enquanto você não estava, a gente fez umas melhorias. Dá uma olhada:
          </p>
        </div>

        <ul className="announcement-list">
          {UPDATES.map((u, i) => (
            <li
              key={u.title}
              className="announcement-item"
              style={{ animationDelay: `${160 + i * 70}ms` }}
            >
              <span className="announcement-icon" data-icon={u.icon} aria-hidden="true">
                <Icon name={u.icon} />
              </span>
              <div className="announcement-text">
                <strong>{u.title}</strong>
                <span>{u.desc}</span>
              </div>
            </li>
          ))}
        </ul>

        <button type="button" className="announcement-cta" onClick={dismiss}>
          Entendi, continuar
        </button>
      </div>
    </div>
  );
}
