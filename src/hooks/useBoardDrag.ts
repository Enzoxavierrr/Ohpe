import { useState } from 'react';
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { Board, Column } from '../types/board';

type SetBoard = (updater: (prev: Board) => Board) => void;

function findColumnByCardId(board: Board, cardId: string): Column | undefined {
  return board.columns.find((col) => col.cardIds.includes(cardId));
}

export function useBoardDrag(board: Board, setBoard: SetBoard) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const activeCard = activeCardId ? board.cards[activeCardId] : null;
  const activeColumn = activeColumnId
    ? board.columns.find((c) => c.id === activeColumnId)
    : null;

  function handleDragStart(e: DragStartEvent) {
    const type = e.active.data.current?.type;
    if (type === 'column') {
      setActiveColumnId(String(e.active.id));
    } else {
      setActiveCardId(String(e.active.id));
    }
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    if (active.data.current?.type === 'column') return;

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
    const { active, over } = e;
    const activeId = String(active.id);
    const type = active.data.current?.type;

    if (type === 'column') {
      setActiveColumnId(null);
      if (!over) return;
      const overId = String(over.id);
      if (activeId === overId) return;

      setBoard((prev) => {
        const oldIdx = prev.columns.findIndex((c) => c.id === activeId);
        let newIdx = prev.columns.findIndex((c) => c.id === overId);
        if (newIdx === -1) {
          const overCol = prev.columns.find((c) => c.cardIds.includes(overId));
          if (overCol) newIdx = prev.columns.findIndex((c) => c.id === overCol.id);
        }
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev;
        return { ...prev, columns: arrayMove(prev.columns, oldIdx, newIdx) };
      });
      return;
    }

    setActiveCardId(null);
    if (!over) return;
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

  return {
    sensors,
    activeCard,
    activeColumn,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
