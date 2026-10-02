import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Board, BoardMeta, ColumnStatus, Workspace } from '../types/board';

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

function makeEmptyBoard(): Board {
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

export function makeDefaultWorkspace(name = 'Meu primeiro board'): Workspace {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  return {
    boards: { [id]: makeEmptyBoard() },
    meta: { [id]: { id, name, createdAt: now, updatedAt: now } },
    order: [id],
  };
}

export function isBoardShape(data: unknown): data is Partial<Board> {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.columns) || (typeof d.cards === 'object' && d.cards !== null);
}

export function isWorkspaceShape(data: unknown): data is Partial<Workspace> {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.boards === 'object' && d.boards !== null &&
    typeof d.meta === 'object' && d.meta !== null &&
    Array.isArray(d.order)
  );
}

export function migrateBoard(parsed: any): Board {
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

  if (migrated.columns.length === 0) {
    const empty = makeEmptyBoard();
    migrated.columns = empty.columns;
  }
  return migrated;
}

function migrateWorkspace(parsed: any): Workspace {
  if (isWorkspaceShape(parsed)) {
    const boards: Record<string, Board> = {};
    const metaIn = parsed.meta ?? {};
    const now = new Date().toISOString();
    const meta: Record<string, BoardMeta> = {};
    const order: string[] = Array.isArray(parsed.order) ? parsed.order.map(String) : [];

    for (const [id, b] of Object.entries(parsed.boards ?? {})) {
      boards[id] = migrateBoard(b);
      const m = (metaIn as any)[id];
      meta[id] = {
        id,
        name: typeof m?.name === 'string' && m.name.trim() ? m.name : 'Board sem nome',
        createdAt: typeof m?.createdAt === 'string' ? m.createdAt : now,
        updatedAt: typeof m?.updatedAt === 'string' ? m.updatedAt : now,
      };
    }
    // Garantir que todo board tem lugar no order
    for (const id of Object.keys(boards)) {
      if (!order.includes(id)) order.push(id);
    }
    // Remover ids órfãos do order
    const filteredOrder = order.filter((id) => boards[id]);

    if (filteredOrder.length === 0) return makeDefaultWorkspace();
    return { boards, meta, order: filteredOrder };
  }
  if (isBoardShape(parsed)) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    return {
      boards: { [id]: migrateBoard(parsed) },
      meta: { [id]: { id, name: 'Meu board', createdAt: now, updatedAt: now } },
      order: [id],
    };
  }
  return makeDefaultWorkspace();
}

function loadLocal(): Workspace {
  try {
    const raw = localStorage.getItem(BOARD_STORAGE_KEY);
    if (!raw) return makeDefaultWorkspace();
    return migrateWorkspace(JSON.parse(raw));
  } catch {
    return makeDefaultWorkspace();
  }
}

function workspaceIsEmpty(ws: Workspace): boolean {
  for (const id of ws.order) {
    const b = ws.boards[id];
    if (b && (Object.keys(b.cards).length > 0 || b.archive.length > 0)) return false;
  }
  return ws.order.length === 0;
}

export function useWorkspace(userId: string | null | undefined) {
  const [workspace, setWorkspace] = useState<Workspace>(loadLocal);
  const [syncing, setSyncing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const lastUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (lastUserId.current === userId) return;
    lastUserId.current = userId;

    if (!userId) {
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

        if (data && (isWorkspaceShape(data.data) || isBoardShape(data.data))) {
          const next = migrateWorkspace(data.data);
          setWorkspace(next);
          try { localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(next)); } catch {}
        } else {
          const local = loadLocal();
          if (!workspaceIsEmpty(local)) {
            await supabase.from('boards').upsert({
              user_id: userId,
              data: local,
              updated_at: new Date().toISOString(),
            });
            setWorkspace(local);
          } else {
            const def = makeDefaultWorkspace();
            setWorkspace(def);
            try { localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(def)); } catch {}
          }
        }
      } catch (err) {
        console.error('[useWorkspace] hydrate falhou, usando cache local', err);
      } finally {
        if (!cancelled) {
          setHydrated(true);
          setSyncing(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!hydrated) return;

    try {
      localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(workspace));
    } catch {}

    if (!userId) return;

    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        setSyncing(true);
        const { error } = await supabase.from('boards').upsert({
          user_id: userId,
          data: workspace,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      } catch (err) {
        console.error('[useWorkspace] save falhou', err);
      } finally {
        setSyncing(false);
      }
    }, SAVE_DEBOUNCE_MS);
  }, [workspace, userId, hydrated]);

  // --- helpers ---

  const createBoard = useCallback((name: string) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const trimmed = name.trim() || 'Board sem nome';
    setWorkspace((ws) => ({
      ...ws,
      boards: { ...ws.boards, [id]: makeEmptyBoard() },
      meta: { ...ws.meta, [id]: { id, name: trimmed, createdAt: now, updatedAt: now } },
      order: [...ws.order, id],
    }));
    return id;
  }, []);

  const renameBoard = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setWorkspace((ws) => {
      if (!ws.meta[id]) return ws;
      return {
        ...ws,
        meta: { ...ws.meta, [id]: { ...ws.meta[id], name: trimmed, updatedAt: new Date().toISOString() } },
      };
    });
  }, []);

  const deleteBoard = useCallback((id: string) => {
    setWorkspace((ws) => {
      if (!ws.boards[id]) return ws;
      const { [id]: _removedBoard, ...boards } = ws.boards;
      const { [id]: _removedMeta, ...meta } = ws.meta;
      const order = ws.order.filter((x) => x !== id);
      return { boards, meta, order };
    });
  }, []);

  const updateBoard = useCallback((id: string, updater: (prev: Board) => Board) => {
    setWorkspace((ws) => {
      const current = ws.boards[id];
      if (!current) return ws;
      const next = updater(current);
      return {
        ...ws,
        boards: { ...ws.boards, [id]: next },
        meta: { ...ws.meta, [id]: { ...ws.meta[id], updatedAt: new Date().toISOString() } },
      };
    });
  }, []);

  const replaceWorkspace = useCallback((next: Workspace) => {
    setWorkspace(migrateWorkspace(next));
  }, []);

  return {
    workspace,
    setWorkspace,
    syncing,
    createBoard,
    renameBoard,
    deleteBoard,
    updateBoard,
    replaceWorkspace,
  };
}
