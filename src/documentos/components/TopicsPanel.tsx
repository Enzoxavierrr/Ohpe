import type { Highlight } from '../types';

type Props = {
  highlights: Highlight[];
  activeId: string | null;
  onJump: (id: string) => void;
  onRemove: (id: string) => void;
};

export function TopicsPanel({ highlights, activeId, onJump, onRemove }: Props) {
  return (
    <aside className="doc-topics">
      <header className="doc-topics__header">
        <h2 className="doc-topics__title">Tópicos</h2>
        <span className="doc-topics__count">{highlights.length}</span>
      </header>

      {highlights.length === 0 ? (
        <div className="doc-topics__empty">
          <p>Selecione um trecho no documento e clique em <strong>Grifar</strong>.</p>
          <p className="doc-topics__hint">Cada grifo vira um tópico aqui — clica pra pular até ele.</p>
        </div>
      ) : (
        <ul className="doc-topics__list">
          {highlights.map((h) => (
            <li
              key={h.id}
              className={`doc-topics__item${activeId === h.id ? ' is-active' : ''}`}
            >
              <button
                type="button"
                className="doc-topics__jump"
                data-color={h.color ?? 'yellow'}
                onClick={() => onJump(h.id)}
              >
                <span className="doc-topics__dot" aria-hidden="true" />
                <span className="doc-topics__snippet">{h.text}</span>
              </button>
              <button
                type="button"
                className="doc-topics__remove"
                aria-label="Remover grifo"
                title="Remover"
                onClick={() => onRemove(h.id)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
