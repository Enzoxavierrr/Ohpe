import { useEffect } from 'react';
import type { CardData } from '../types/board';

type Props = {
  open: boolean;
  cards: CardData[];
  onClose: () => void;
  onRestore: (cardId: string) => void;
  onDelete: (cardId: string) => void;
};

export function ArchiveDrawer({ open, cards, onClose, onRestore, onDelete }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div
      className={`drawer ${open ? 'drawer--open' : ''}`}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-label="Cards arquivados"
    >
      <div className="drawer__backdrop" onClick={onClose} />
      <aside className="drawer__panel">
        <header className="drawer__header">
          <h2 className="drawer__title">Arquivados</h2>
          <button
            type="button"
            className="drawer__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        {cards.length === 0 ? (
          <div className="drawer__empty">
            Nenhum card arquivado por aqui.<br />
            Arquive em vez de apagar — assim nada se perde sem querer.
          </div>
        ) : (
          <ul className="drawer__list">
            {cards.map((c) => (
              <li key={c.id} className="drawer__item">
                <div className="drawer__item-main">
                  <div className="drawer__item-title">{c.title}</div>
                  {c.resolution && (
                    <div className="drawer__item-note">{c.resolution}</div>
                  )}
                  {c.archivedAt && (
                    <div className="drawer__item-meta">
                      Arquivado em {new Date(c.archivedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </div>
                  )}
                </div>
                <div className="drawer__item-actions">
                  <button
                    type="button"
                    className="drawer__action drawer__action--primary"
                    onClick={() => onRestore(c.id)}
                    title="Restaurar"
                  >
                    Restaurar
                  </button>
                  <button
                    type="button"
                    className="drawer__action drawer__action--danger"
                    onClick={() => onDelete(c.id)}
                    title="Apagar permanentemente"
                  >
                    Apagar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
