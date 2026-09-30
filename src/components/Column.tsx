import { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card } from './Card';
import { NewCardForm } from './NewCardForm';
import type { CardData, Column as ColumnType } from '../types/board';

type Props = {
  column: ColumnType;
  cards: CardData[];
  onRename: (title: string) => void;
  onRemove: () => void;
  onAddCard: (title: string) => void;
  onRemoveCard: (cardId: string) => void;
};

export function Column({ column, cards, onRename, onRemove, onAddCard, onRemoveCard }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(column.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  });

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const next = draft.trim();
    if (next && next !== column.title) onRename(next);
    else setDraft(column.title);
    setEditing(false);
  }

  return (
    <div className={`column ${isOver ? 'is-over' : ''}`}>
      <div className="column-header">
        {editing ? (
          <input
            ref={inputRef}
            className="column-title-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setDraft(column.title); setEditing(false); }
            }}
          />
        ) : (
          <button
            type="button"
            className="column-title"
            onClick={() => setEditing(true)}
            title="Clique para renomear"
          >
            <span>{column.title}</span>
            <span className="column-count">{column.cardIds.length}</span>
          </button>
        )}
        <button
          type="button"
          className="column-remove"
          onClick={onRemove}
          aria-label="Remover coluna"
          title="Remover coluna"
        >
          ×
        </button>
      </div>

      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="card-list">
          {cards.map((card) => (
            <Card key={card.id} card={card} onRemove={() => onRemoveCard(card.id)} />
          ))}
        </div>
      </SortableContext>

      <NewCardForm onAdd={onAddCard} />
    </div>
  );
}
