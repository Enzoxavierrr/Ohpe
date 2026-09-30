import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CardData } from '../types/board';

type Props = {
  card: CardData;
  onRemove: () => void;
};

export function Card({ card, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', cardId: card.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="card-title">{card.title}</div>
      <button
        type="button"
        className="card-remove"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        aria-label="Remover card"
        title="Remover"
      >
        ×
      </button>
    </div>
  );
}
