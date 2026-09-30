import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Column } from '../components/Column';
import { useBoard } from '../hooks/useBoard';
import { downloadJson } from '../utils/downloadJson';
import type { Board, CardData } from '../types/board';
import '../styles/board.css';

export function BoardPage() {
  const { board, setBoard } = useBoard();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const activeCard = activeCardId ? board.cards[activeCardId] : null;

  function findColumnByCardId(b: Board, cardId: string) {
    return b.columns.find((col) => col.cardIds.includes(cardId));
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveCardId(String(e.active.id));
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    setBoard((prev) => {
      const fromCol = findColumnByCardId(prev, activeId);
      if (!fromCol) return prev;

      let toCol = prev.columns.find((c) => c.id === overId);
      if (!toCol) toCol = findColumnByCardId(prev, overId);
      if (!toCol || toCol.id === fromCol.id) return prev;

      const overIndex = toCol.cardIds.indexOf(overId);
      const insertAt = overIndex === -1 ? toCol.cardIds.length : overIndex;

      return {
        ...prev,
        columns: prev.columns.map((c) => {
          if (c.id === fromCol.id) {
            return { ...c, cardIds: c.cardIds.filter((id) => id !== activeId) };
          }
          if (c.id === toCol!.id) {
            const next = [...c.cardIds];
            next.splice(insertAt, 0, activeId);
            return { ...c, cardIds: next };
          }
          return c;
        }),
      };
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveCardId(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    setBoard((prev) => {
      const col = findColumnByCardId(prev, activeId);
      if (!col) return prev;
      if (!col.cardIds.includes(overId)) return prev;

      const oldIndex = col.cardIds.indexOf(activeId);
      const newIndex = col.cardIds.indexOf(overId);
      if (oldIndex === newIndex) return prev;

      return {
        ...prev,
        columns: prev.columns.map((c) =>
          c.id === col.id ? { ...c, cardIds: arrayMove(c.cardIds, oldIndex, newIndex) } : c,
        ),
      };
    });
  }

  function renameColumn(columnId: string, title: string) {
    setBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => (c.id === columnId ? { ...c, title } : c)),
    }));
  }

  function addColumn() {
    setBoard((prev) => ({
      ...prev,
      columns: [
        ...prev.columns,
        { id: crypto.randomUUID(), title: 'Nova coluna', cardIds: [] },
      ],
    }));
  }

  function removeColumn(columnId: string) {
    setBoard((prev) => {
      const col = prev.columns.find((c) => c.id === columnId);
      if (!col) return prev;
      if (col.cardIds.length > 0) {
        const ok = window.confirm(`Remover a coluna "${col.title}" e seus ${col.cardIds.length} card(s)?`);
        if (!ok) return prev;
      }
      const nextCards = { ...prev.cards };
      col.cardIds.forEach((id) => { delete nextCards[id]; });
      return {
        ...prev,
        columns: prev.columns.filter((c) => c.id !== columnId),
        cards: nextCards,
      };
    });
  }

  function addCard(columnId: string, title: string) {
    const card: CardData = {
      id: crypto.randomUUID(),
      title,
      createdAt: new Date().toISOString(),
    };
    setBoard((prev) => ({
      ...prev,
      cards: { ...prev.cards, [card.id]: card },
      columns: prev.columns.map((c) =>
        c.id === columnId ? { ...c, cardIds: [...c.cardIds, card.id] } : c,
      ),
    }));
  }

  function renameCard(cardId: string, title: string) {
    setBoard((prev) => {
      const existing = prev.cards[cardId];
      if (!existing) return prev;
      return {
        ...prev,
        cards: { ...prev.cards, [cardId]: { ...existing, title } },
      };
    });
  }

  function removeCard(cardId: string) {
    setBoard((prev) => {
      const nextCards = { ...prev.cards };
      delete nextCards[cardId];
      return {
        ...prev,
        cards: nextCards,
        columns: prev.columns.map((c) => ({
          ...c,
          cardIds: c.cardIds.filter((id) => id !== cardId),
        })),
      };
    });
  }

  return (
    <div className="board-shell">
      <header className="board-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round">
              <path d="M 128 44 A 84 84 0 1 0 212 128" />
            </svg>
          </span>
          <span className="brand-name">Ohpe</span>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={() => downloadJson(board, 'ohpe-board')}
            title="Baixar board em JSON"
            aria-label="Baixar board em JSON"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </header>

      <main className="board-canvas">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="columns-row">
            {board.columns.map((col) => (
              <Column
                key={col.id}
                column={col}
                cards={col.cardIds.map((id) => board.cards[id]).filter(Boolean) as CardData[]}
                onRename={(title) => renameColumn(col.id, title)}
                onRemove={() => removeColumn(col.id)}
                onAddCard={(title) => addCard(col.id, title)}
                onRenameCard={(cardId, title) => renameCard(cardId, title)}
                onRemoveCard={(cardId) => removeCard(cardId)}
              />
            ))}
            <button className="add-column" type="button" onClick={addColumn}>
              <span aria-hidden="true">+</span> Adicionar coluna
            </button>
          </div>

          <DragOverlay>
            {activeCard ? (
              <div className="card is-overlay">
                <div className="card-title">{activeCard.title}</div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
}
