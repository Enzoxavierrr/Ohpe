import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CardData } from '../types/board';

type Props = {
  card: CardData;
  onRename: (title: string) => void;
  onRemove: () => void;
};

export function Card({ card, onRename, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card.title);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', cardId: card.id },
    disabled: editing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (editing) {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }
  }, [editing]);

  function startEdit() {
    setDraft(card.title);
    setEditing(true);
  }

  function commit() {
    const next = draft.trim();
    if (next && next !== card.title) onRename(next);
    setEditing(false);
  }

  function cancel() {
    setDraft(card.title);
    setEditing(false);
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      cancel();
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card ${isDragging ? 'dragging' : ''} ${editing ? 'editing' : ''}`}
      {...(editing ? {} : attributes)}
      {...(editing ? {} : listeners)}
    >
      {editing ? (
        <textarea
          ref={textareaRef}
          className="card-edit"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKey}
          rows={2}
        />
      ) : (
        <div className="card-title">{card.title}</div>
      )}

      {!editing && (
        <div className="card-actions">
          <button
            type="button"
            className="card-action"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={startEdit}
            aria-label="Editar card"
            title="Editar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
          <button
            type="button"
            className="card-action"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onRemove}
            aria-label="Remover card"
            title="Remover"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
