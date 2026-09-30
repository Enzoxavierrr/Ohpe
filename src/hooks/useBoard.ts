import { useEffect, useRef, useState } from 'react';
import type { Board } from '../types/board';

const STORAGE_KEY = 'ohpe.board.v1';

function makeDefaultBoard(): Board {
  return {
    columns: [
      { id: crypto.randomUUID(), title: 'A fazer', cardIds: [] },
      { id: crypto.randomUUID(), title: 'Feito', cardIds: [] },
    ],
    cards: {},
  };
}

function loadBoard(): Board {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeDefaultBoard();
    const parsed = JSON.parse(raw) as Board;
    if (!parsed.columns || !parsed.cards) return makeDefaultBoard();
    return parsed;
  } catch {
    return makeDefaultBoard();
  }
}

export function useBoard() {
  const [board, setBoard] = useState<Board>(loadBoard);
  const skipFirstSave = useRef(true);

  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    } catch {
      // storage cheio ou bloqueado — ignora
    }
  }, [board]);

  return { board, setBoard };
}
