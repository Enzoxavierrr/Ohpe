import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Board, ColumnStatus } from '../types/board';

export const BOARD_STORAGE_KEY = 'ohpe.board.v1';
const SAVE_DEBOUNCE_MS = 800;

function guessStatus(title: string): ColumnStatus | undefined {
  const t = title.trim().toLowerCase();
  if (/\bfeito\b|\bdone\b|conclu/.test(t)) return 'done';
  if (/\bmelhori|improvement|refino/.test(t)) return 'improvements';
  if (/\bimpedi|bloquea|blocked|travad/.test(t)) return 'blocked';
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

export function isBoardShape(data: unknown): data is Partial<Board> {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.columns) || (typeof d.cards === 'object' && d.cards !== null);
}

export function migrateBoard(parsed: any): Board {
  return migrate(parsed);
}

function migrate(parsed: any): Board {
  const columns = Array.isArray(parsed.columns) ? parsed.columns : [];
  const cards = parsed.cards && typeof parsed.cards === 'object' ? parsed.cards : {};
  const archive = Array.isArray(parsed.archive) ? parsed.archive : [];

  const migrated: Board = {
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

  if (migrated.columns.length === 0) return makeDefaultBoard();
  return migrated;
}

function loadLocal(): Board {
  try {
    const raw = localStorage.getItem(BOARD_STORAGE_KEY);
    if (!raw) return makeDefaultBoard();
    const parsed = JSON.parse(raw);
    if (!isBoardShape(parsed)) return makeDefaultBoard();
    return migrate(parsed);
  } catch {
    return makeDefaultBoard();
  }
}

function isEmpty(b: Board) {
  return Object.keys(b.cards).length === 0 && b.archive.length === 0;
}

export function useBoard(userId: string | null | undefined) {
  const [board, setBoard] = useState<Board>(loadLocal);
  const [syncing, setSyncing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const lastUserId = useRef<string | null | undefined>(undefined);

  // Hydrate: when userId changes, pull from server (or stay local)
  useEffect(() => {
    if (lastUserId.current === userId) return;
    lastUserId.current = userId;

    if (!userId) {
      // modo local-only: usa o que já está em memória (loadLocal no initial state)
      setHydrated(true);
      return;
    }

    let cancelled = false;
    setHydrated(false);
    setSyncing(true);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('boards')
          .select('data')
          .eq('user_id', userId)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;

        if (data && isBoardShape(data.data)) {
          const next = migrate(data.data);
          setBoard(next);
          try { localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(next)); } catch {}
        } else {
          // server vazio → sobe o board local (migração one-time) se tiver algo
          const local = loadLocal();
          if (!isEmpty(local)) {
            await supabase.from('boards').upsert({
              user_id: userId,
              data: local,
              updated_at: new Date().toISOString(),
            });
            setBoard(local);
          } else {
            // sem nada em lugar nenhum → começa com default
            const def = makeDefaultBoard();
            setBoard(def);
            try { localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(def)); } catch {}
          }
        }
      } catch (err) {
        console.error('[useBoard] hydrate falhou, continuando com cache local', err);
      } finally {
        if (!cancelled) {
          setHydrated(true);
          setSyncing(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  // Persist: localStorage sempre; server com debounce
  useEffect(() => {
    if (!hydrated) return;

    try {
      localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(board));
    } catch {}

    if (!userId) return;

    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        setSyncing(true);
        const { error } = await supabase.from('boards').upsert({
          user_id: userId,
          data: board,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      } catch (err) {
        console.error('[useBoard] save falhou', err);
      } finally {
        setSyncing(false);
      }
    }, SAVE_DEBOUNCE_MS);
  }, [board, userId, hydrated]);

  return { board, setBoard, syncing };
}
