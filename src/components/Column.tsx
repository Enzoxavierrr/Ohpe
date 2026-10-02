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
  onSetStatus: (status: ColumnStatus | undefined) => void;
  onResize: (width: number) => void;
};

type StatusKey = ColumnStatus | 'none';

const STATUS_LABEL: Record<StatusKey, string> = {
  none: 'Sem status',
  todo: 'A fazer',
  doing: 'Sendo feito',
  blocked: 'Impedimento',
  improvements: 'Melhorias',
  done: 'Feito',
};

const STATUS_OPTIONS: StatusKey[] = ['none', 'todo', 'doing', 'blocked', 'improvements', 'done'];

const MIN_WIDTH = 240;
const MAX_WIDTH = 560;

export function Column({
  column, cards, landedCardId,
  onRename, onRemove, onAddCard, onOpenCard, onArchiveCard,
  onSetStatus, onResize,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(column.title);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

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
    if (!statusMenuOpen) return;
    function onClick(e: MouseEvent) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setStatusMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setStatusMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [statusMenuOpen]);

  function pickStatus(next: StatusKey) {
    onSetStatus(next === 'none' ? undefined : next);
    setStatusMenuOpen(false);
  }

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

        <div className="column-status-wrap" ref={statusMenuRef}>
          <button
            type="button"
            className={`column-status column-status--${status}`}
            onClick={() => setStatusMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={statusMenuOpen}
            title={`Tag: ${STATUS_LABEL[status]}`}
            aria-label={`Tag da coluna: ${STATUS_LABEL[status]}. Clique para escolher.`}
          >
            <span className="column-status__dot" aria-hidden="true" />
          </button>
          {statusMenuOpen && (
            <ul className="column-status-menu" role="menu">
              <li className="column-status-menu__title">Escolha a tag</li>
              {STATUS_OPTIONS.map((opt) => (
                <li key={opt}>
                  <button
                    type="button"
                    className={`column-status-menu__item ${status === opt ? 'is-selected' : ''}`}
                    onClick={() => pickStatus(opt)}
                    role="menuitem"
                  >
                    <span className={`column-status-menu__dot column-status-menu__dot--${opt}`} aria-hidden="true" />
                    <span className="column-status-menu__label">{STATUS_LABEL[opt]}</span>
                    {status === opt && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

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
