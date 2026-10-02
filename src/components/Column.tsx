import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from './Card';
import { NewCardForm } from './NewCardForm';
import type { CardData, Column as ColumnType, ColumnStatus } from '../types/board';

type Props = {
  column: ColumnType;
  cards: CardData[];
  landedCardId: string | null;
  onRename: (title: string) => void;
  onRemove: () => void;
  onAddCard: (title: string) => void;
  onOpenCard: (cardId: string) => void;
  onArchiveCard: (cardId: string) => void;
  onCycleStatus: () => void;
  onResize: (width: number) => void;
};

const STATUS_LABEL: Record<ColumnStatus | 'none', string> = {
  none: 'sem status',
  todo: 'a fazer',
  doing: 'sendo feito',
  blocked: 'impedimento',
  done: 'feito',
};

const MIN_WIDTH = 240;
const MAX_WIDTH = 560;

export function Column({
  column, cards, landedCardId,
  onRename, onRemove, onAddCard, onOpenCard, onArchiveCard,
  onCycleStatus, onResize,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(column.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  });

  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef<{ x: number; width: number } | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!resizing) return;
    function onMove(e: PointerEvent) {
      if (!resizeStart.current) return;
      const dx = e.clientX - resizeStart.current.x;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeStart.current.width + dx));
      onResize(next);
    }
    function onUp() {
      setResizing(false);
      resizeStart.current = null;
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [resizing, onResize]);

  function startResize(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const current = column.width ?? 300;
    resizeStart.current = { x: e.clientX, width: current };
    setResizing(true);
  }

  function commit() {
    const next = draft.trim();
    if (next && next !== column.title) onRename(next);
    else setDraft(column.title);
    setEditing(false);
  }

  const status = column.status ?? 'none';
  const width = column.width ?? 300;

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    ['--col-width' as any]: `${width}px`,
  };

  return (
    <div
      ref={setNodeRef}
      className={[
        'column',
        `column--${status}`,
        isOver ? 'is-over' : '',
        resizing ? 'is-resizing' : '',
        isDragging ? 'is-dragging' : '',
      ].filter(Boolean).join(' ')}
      data-status={status}
      style={style}
      {...attributes}
    >
      <div className="column-header">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="column-grip"
          aria-label="Arrastar coluna"
          title="Arrastar para reordenar"
          {...listeners}
        >
          <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
            <circle cx="3" cy="2.5" r="1.1" fill="currentColor" />
            <circle cx="9" cy="2.5" r="1.1" fill="currentColor" />
            <circle cx="3" cy="7"   r="1.1" fill="currentColor" />
            <circle cx="9" cy="7"   r="1.1" fill="currentColor" />
            <circle cx="3" cy="11.5" r="1.1" fill="currentColor" />
            <circle cx="9" cy="11.5" r="1.1" fill="currentColor" />
          </svg>
        </button>

        <button
          type="button"
          className={`column-status column-status--${status}`}
          onClick={onCycleStatus}
          title={`Status: ${STATUS_LABEL[status]} — clique para mudar`}
          aria-label={`Status da coluna: ${STATUS_LABEL[status]}. Clique para alternar.`}
        >
          <span className="column-status__dot" aria-hidden="true" />
        </button>

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
        <div className="card-list">
          {cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              justLanded={card.id === landedCardId}
              onOpen={() => onOpenCard(card.id)}
              onArchive={() => onArchiveCard(card.id)}
            />
          ))}
        </div>
      </SortableContext>

      <NewCardForm onAdd={onAddCard} />

      <div
        className="column-resize"
        onPointerDown={startResize}
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionar coluna"
        title="Arraste para redimensionar"
      />
    </div>
  );
}
