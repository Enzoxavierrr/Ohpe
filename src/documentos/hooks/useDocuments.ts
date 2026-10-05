import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { DocumentData, DocumentGroup, Highlight } from '../types';

const SAVE_DEBOUNCE_MS = 800;
export const DOCUMENTS_CACHE_KEY = 'ohpe.documents.v1';
export const GROUPS_CACHE_KEY = 'ohpe.document-groups.v1';

type DocRow = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  highlights: unknown;
  group_id: string | null;
  created_at: string;
  updated_at: string;
};

type GroupRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

function rowToDocument(row: DocRow): DocumentData {
  const highlights = Array.isArray(row.highlights)
    ? (row.highlights as Highlight[]).filter((h) => h && typeof h.id === 'string')
    : [];
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    highlights,
    groupId: row.group_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToGroup(row: GroupRow): DocumentGroup {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function loadDocCache(userId: string): DocumentData[] {
  try {
    const raw = localStorage.getItem(`${DOCUMENTS_CACHE_KEY}:${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((d: any) => ({ ...d, groupId: d.groupId ?? null }));
  } catch {
    return [];
  }
}
function saveDocCache(userId: string, docs: DocumentData[]) {
  try { localStorage.setItem(`${DOCUMENTS_CACHE_KEY}:${userId}`, JSON.stringify(docs)); } catch {}
}

function loadGroupCache(userId: string): DocumentGroup[] {
  try {
    const raw = localStorage.getItem(`${GROUPS_CACHE_KEY}:${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}
function saveGroupCache(userId: string, groups: DocumentGroup[]) {
  try { localStorage.setItem(`${GROUPS_CACHE_KEY}:${userId}`, JSON.stringify(groups)); } catch {}
}

function sortDocs(docs: DocumentData[]): DocumentData[] {
  return [...docs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function sortGroups(groups: DocumentGroup[]): DocumentGroup[] {
  return [...groups].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function useDocuments(userId: string | null | undefined) {
  const [documents, setDocuments] = useState<DocumentData[]>(() =>
    userId ? sortDocs(loadDocCache(userId)) : [],
  );
  const [groups, setGroups] = useState<DocumentGroup[]>(() =>
    userId ? sortGroups(loadGroupCache(userId)) : [],
  );
  const [syncing, setSyncing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const timers = useRef<Record<string, number>>({});
  const groupTimers = useRef<Record<string, number>>({});
  const lastUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (lastUserId.current === userId) return;
    lastUserId.current = userId;

    if (!userId) {
      setDocuments([]);
      setGroups([]);
      setHydrated(true);
      return;
    }

    setDocuments(sortDocs(loadDocCache(userId)));
    setGroups(sortGroups(loadGroupCache(userId)));
    setHydrated(false);
    setSyncing(true);
    let cancelled = false;

    (async () => {
      try {
        // Grupos primeiro — se a tabela não existe ainda, ignora silenciosamente
        try {
          const { data: gData, error: gError } = await supabase
            .from('document_groups')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });
          if (!cancelled) {
            if (gError) {
              console.warn('[useDocuments] grupos indisponíveis (rode o SQL de document_groups)', gError.message);
            } else {
              const gs = (gData as GroupRow[] | null)?.map(rowToGroup) ?? [];
              setGroups(gs);
              saveGroupCache(userId, gs);
            }
          }
        } catch (err) {
          console.warn('[useDocuments] grupos indisponíveis', err);
        }

        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });
        if (cancelled) return;
        if (error) throw error;
        const docs = (data as DocRow[] | null)?.map(rowToDocument) ?? [];
        setDocuments(docs);
        saveDocCache(userId, docs);
      } catch (err) {
        console.error('[useDocuments] hydrate falhou', err);
      } finally {
        if (!cancelled) {
          setHydrated(true);
          setSyncing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !hydrated) return;
    saveDocCache(userId, documents);
  }, [documents, userId, hydrated]);

  useEffect(() => {
    if (!userId || !hydrated) return;
    saveGroupCache(userId, groups);
  }, [groups, userId, hydrated]);

  const scheduleDocUpsert = useCallback(
    (doc: DocumentData) => {
      if (!userId) return;
      const existing = timers.current[doc.id];
      if (existing) window.clearTimeout(existing);
      timers.current[doc.id] = window.setTimeout(async () => {
        try {
          setSyncing(true);
          const { error } = await supabase.from('documents').upsert({
            id: doc.id,
            user_id: userId,
            title: doc.title,
            content: doc.content,
            highlights: doc.highlights,
            group_id: doc.groupId,
            updated_at: doc.updatedAt,
          });
          if (error) throw error;
        } catch (err) {
          console.error('[useDocuments] upsert doc falhou', err);
        } finally {
          setSyncing(false);
          delete timers.current[doc.id];
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [userId],
  );

  const scheduleGroupUpsert = useCallback(
    (group: DocumentGroup) => {
      if (!userId) return;
      const existing = groupTimers.current[group.id];
      if (existing) window.clearTimeout(existing);
      groupTimers.current[group.id] = window.setTimeout(async () => {
        try {
          setSyncing(true);
          const { error } = await supabase.from('document_groups').upsert({
            id: group.id,
            user_id: userId,
            name: group.name,
            updated_at: group.updatedAt,
          });
          if (error) throw error;
        } catch (err) {
          console.error('[useDocuments] upsert grupo falhou', err);
        } finally {
          setSyncing(false);
          delete groupTimers.current[group.id];
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [userId],
  );

  // ---- Documentos ----

  const create = useCallback(
    (seed?: Partial<Pick<DocumentData, 'title' | 'content' | 'groupId'>>) => {
      const now = new Date().toISOString();
      const doc: DocumentData = {
        id: crypto.randomUUID(),
        title: seed?.title?.trim() || 'Novo documento',
        content: seed?.content ?? '',
        highlights: [],
        groupId: seed?.groupId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      setDocuments((docs) => sortDocs([doc, ...docs]));
      scheduleDocUpsert(doc);
      return doc.id;
    },
    [scheduleDocUpsert],
  );

  const update = useCallback(
    (id: string, updater: (prev: DocumentData) => DocumentData) => {
      setDocuments((docs) => {
        const idx = docs.findIndex((d) => d.id === id);
        if (idx === -1) return docs;
        const next = { ...updater(docs[idx]), updatedAt: new Date().toISOString() };
        const copy = [...docs];
        copy[idx] = next;
        scheduleDocUpsert(next);
        return sortDocs(copy);
      });
    },
    [scheduleDocUpsert],
  );

  const rename = useCallback(
    (id: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      update(id, (prev) => ({ ...prev, title: trimmed }));
    },
    [update],
  );

  const moveToGroup = useCallback(
    (id: string, groupId: string | null) => {
      update(id, (prev) => ({ ...prev, groupId }));
    },
    [update],
  );

  const remove = useCallback(
    (id: string) => {
      const existing = timers.current[id];
      if (existing) {
        window.clearTimeout(existing);
        delete timers.current[id];
      }
      setDocuments((docs) => docs.filter((d) => d.id !== id));
      if (!userId) return;
      (async () => {
        try {
          setSyncing(true);
          const { error } = await supabase.from('documents').delete().eq('id', id).eq('user_id', userId);
          if (error) throw error;
        } catch (err) {
          console.error('[useDocuments] delete falhou', err);
        } finally {
          setSyncing(false);
        }
      })();
    },
    [userId],
  );

  const getById = useCallback(
    (id: string) => documents.find((d) => d.id === id) ?? null,
    [documents],
  );

  // ---- Grupos ----

  const createGroup = useCallback(
    (name: string) => {
      const now = new Date().toISOString();
      const trimmed = name.trim() || 'Novo grupo';
      const group: DocumentGroup = {
        id: crypto.randomUUID(),
        name: trimmed,
        createdAt: now,
        updatedAt: now,
      };
      setGroups((gs) => sortGroups([...gs, group]));
      scheduleGroupUpsert(group);
      return group.id;
    },
    [scheduleGroupUpsert],
  );

  const renameGroup = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setGroups((gs) => {
        const idx = gs.findIndex((g) => g.id === id);
        if (idx === -1) return gs;
        const next = { ...gs[idx], name: trimmed, updatedAt: new Date().toISOString() };
        const copy = [...gs];
        copy[idx] = next;
        scheduleGroupUpsert(next);
        return copy;
      });
    },
    [scheduleGroupUpsert],
  );

  const removeGroup = useCallback(
    (id: string) => {
      const existing = groupTimers.current[id];
      if (existing) {
        window.clearTimeout(existing);
        delete groupTimers.current[id];
      }
      // Documentos do grupo passam a ser "sem grupo" localmente — o on delete set null do schema cuida no server
      setDocuments((docs) =>
        docs.map((d) => (d.groupId === id ? { ...d, groupId: null } : d)),
      );
      setGroups((gs) => gs.filter((g) => g.id !== id));
      if (!userId) return;
      (async () => {
        try {
          setSyncing(true);
          const { error } = await supabase.from('document_groups').delete().eq('id', id).eq('user_id', userId);
          if (error) throw error;
        } catch (err) {
          console.error('[useDocuments] delete grupo falhou', err);
        } finally {
          setSyncing(false);
        }
      })();
    },
    [userId],
  );

  return {
    documents,
    groups,
    syncing,
    hydrated,
    create,
    update,
    rename,
    remove,
    getById,
    moveToGroup,
    createGroup,
    renameGroup,
    removeGroup,
  };
}
