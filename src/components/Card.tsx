import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CardData } from '../types/board';

type Props = {
  card: CardData;
  justLanded?: boolean;
  onOpen: () => void;
  onArchive: () => void;
};

export function Card({ card, justLanded, onOpen, onArchive }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', cardId: card.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasNote = Boolean(card.description?.trim() || card.resolution?.trim());

  const statusClass = card.status ? `card--${card.status}` : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card ${statusClass} ${isDragging ? 'dragging' : ''} ${justLanded ? 'card--landed' : ''}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      {...attributes}
      {...listeners}
    >
      <div className="card-body">
        <div className="card-title">{card.title}</div>
        {hasNote && (
          <div className="card-meta">
            {card.resolution?.trim() && (
              <span className="card-badge card-badge--solved" title="Tem resolução anotada">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                resolvido
              </span>
            )}
            {card.description?.trim() && !card.resolution?.trim() && (
              <span className="card-badge card-badge--note" title="Tem descrição">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M4 18h10" />
                </svg>
                nota
              </span>
            )}
          </div>
        )}
      </div>

      <div className="card-actions">
        <button
          type="button"
          className="card-action"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onArchive(); }}
          aria-label="Arquivar card"
          title="Arquivar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="5" rx="1" />
            <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
            <path d="M10 13h4" />
          </svg>
        </button>
      </div>

      {justLanded && (
        <span className="card-landed-mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </div>
  );
}
