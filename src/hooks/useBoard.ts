import { useEffect, useRef, useState } from 'react';
import type { Board, ColumnStatus } from '../types/board';

const STORAGE_KEY = 'ohpe.board.v1';

function guessStatus(title: string): ColumnStatus | undefined {
  const t = title.trim().toLowerCase();
  if (/\bfeito\b|\bdone\b|conclu/.test(t)) return 'done';
  if (/\bfazendo\b|\bsendo\b|doing|progress|andamento/.test(t)) return 'doing';
  if (/\ba fazer\b|\btodo\b|\bbacklog\b|\bpendente/.test(t)) return 'todo';
  return undefined;
}

function makeDefaultBoard(): Board {
  return {
    columns: [
      { id: crypto.randomUUID(), title: 'A fazer', cardIds: [], status: 'todo' },
      { id: crypto.randomUUID(), title: 'Sendo feito', cardIds: [], status: 'doing' },
      { id: crypto.randomUUID(), title: 'Feito', cardIds: [], status: 'done' },
    ],
    cards: {},
    archive: [],
  };
}

function migrate(parsed: any): Board {
  const columns = Array.isArray(parsed.columns) ? parsed.columns : [];
  const cards = parsed.cards && typeof parsed.cards === 'object' ? parsed.cards : {};
  const archive = Array.isArray(parsed.archive) ? parsed.archive : [];

  return {
    columns: columns.map((c: any) => ({
      id: String(c.id),
      title: String(c.title ?? ''),
      cardIds: Array.isArray(c.cardIds) ? c.cardIds.map(String) : [],
      status: c.status ?? guessStatus(String(c.title ?? '')),
      width: typeof c.width === 'number' ? c.width : undefined,
    })),
    cards,
    archive,
  };
}

function loadBoard(): Board {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeDefaultBoard();
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.columns || !parsed.cards) return makeDefaultBoard();
    return migrate(parsed);
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
