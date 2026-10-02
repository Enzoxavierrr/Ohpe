import { useCallback, useRef, useState } from 'react';
import type { Board, CardData } from '../types/board';

type SetBoard = (updater: (prev: Board) => Board) => void;

export function useBoardCards(board: Board, setBoard: SetBoard) {
  const [landedCardId, setLandedCardId] = useState<string | null>(null);
  const landedTimer = useRef<number | null>(null);

  function triggerLanded(cardId: string) {
    if (landedTimer.current) window.clearTimeout(landedTimer.current);
    setLandedCardId(cardId);
    landedTimer.current = window.setTimeout(() => {
      setLandedCardId(null);
      landedTimer.current = null;
    }, 1500);
  }

  const addCard = useCallback((columnId: string, title: string) => {
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
  }, [setBoard]);

  const updateCard = useCallback((cardId: string, patch: Partial<CardData>) => {
    setBoard((prev) => {
      const existing = prev.cards[cardId];
      if (!existing) return prev;
      if (patch.status === 'done' && existing.status !== 'done') {
        triggerLanded(cardId);
      }
      return {
        ...prev,
        cards: { ...prev.cards, [cardId]: { ...existing, ...patch } },
      };
    });
  }, [setBoard]);

  const archiveCard = useCallback((cardId: string) => {
    setBoard((prev) => {
      if (!prev.cards[cardId]) return prev;
      const now = new Date().toISOString();
      return {
        ...prev,
        cards: {
          ...prev.cards,
          [cardId]: { ...prev.cards[cardId], archivedAt: now },
        },
        columns: prev.columns.map((c) => ({
          ...c,
          cardIds: c.cardIds.filter((id) => id !== cardId),
        })),
        archive: [cardId, ...prev.archive.filter((id) => id !== cardId)],
      };
    });
  }, [setBoard]);

  const restoreCard = useCallback((cardId: string) => {
    setBoard((prev) => {
      if (!prev.cards[cardId]) return prev;
      const firstCol = prev.columns[0];
      if (!firstCol) return prev;
      const { archivedAt: _unused, ...rest } = prev.cards[cardId];
      return {
        ...prev,
        cards: { ...prev.cards, [cardId]: rest as CardData },
        columns: prev.columns.map((c, i) =>
          i === 0 ? { ...c, cardIds: [cardId, ...c.cardIds] } : c,
        ),
        archive: prev.archive.filter((id) => id !== cardId),
      };
    });
  }, [setBoard]);

  const deleteCardPermanently = useCallback((cardId: string) => {
    setBoard((prev) => {
      const nextCards = { ...prev.cards };
      delete nextCards[cardId];
      return {
        ...prev,
        cards: nextCards,
        archive: prev.archive.filter((id) => id !== cardId),
      };
    });
  }, [setBoard]);

  const restoreAllArchived = useCallback(() => {
    setBoard((prev) => {
      if (prev.archive.length === 0) return prev;
      const firstCol = prev.columns[0];
      if (!firstCol) return prev;
      const nextCards = { ...prev.cards };
      for (const id of prev.archive) {
        if (nextCards[id]) {
          const { archivedAt: _unused, ...rest } = nextCards[id];
          nextCards[id] = rest as CardData;
        }
      }
      return {
        ...prev,
        cards: nextCards,
        columns: prev.columns.map((c, i) =>
          i === 0 ? { ...c, cardIds: [...prev.archive, ...c.cardIds] } : c,
        ),
        archive: [],
      };
    });
  }, [setBoard]);

  const deleteAllArchived = useCallback(() => {
    setBoard((prev) => {
      if (prev.archive.length === 0) return prev;
      const nextCards = { ...prev.cards };
      for (const id of prev.archive) delete nextCards[id];
      return {
        ...prev,
        cards: nextCards,
        archive: [],
      };
    });
  }, [setBoard]);

  const archivedCards: CardData[] = board.archive
    .map((id) => board.cards[id])
    .filter(Boolean) as CardData[];

  const totalCards = Object.keys(board.cards).length - board.archive.length;
  const archivedCount = board.archive.length;

  return {
    landedCardId,
    addCard,
    updateCard,
    archiveCard,
    restoreCard,
    deleteCardPermanently,
    restoreAllArchived,
    deleteAllArchived,
    archivedCards,
    totalCards,
    archivedCount,
  };
}
