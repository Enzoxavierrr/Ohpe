import { useRef, useState } from 'react';
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
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Column } from '../components/Column';
import { ConfirmModal } from '../components/ConfirmModal';
import { CardDetailModal } from '../components/CardDetailModal';
import { ArchiveDrawer } from '../components/ArchiveDrawer';
import { useBoard } from '../hooks/useBoard';
import { useTheme } from '../hooks/useTheme';
import { downloadJson } from '../utils/downloadJson';
import type { Board, CardData, ColumnStatus } from '../types/board';
import '../styles/board.css';

const STATUS_CYCLE: (ColumnStatus | undefined)[] = [undefined, 'todo', 'doing', 'done'];

function nextStatus(curr: ColumnStatus | undefined): ColumnStatus | undefined {
  const i = STATUS_CYCLE.indexOf(curr);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

export function BoardPage() {
  const { board, setBoard } = useBoard();
  const { theme, toggle: toggleTheme } = useTheme();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [landedCardId, setLandedCardId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const landedTimer = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const activeCard = activeCardId ? board.cards[activeCardId] : null;
  const activeColumn = activeColumnId ? board.columns.find((c) => c.id === activeColumnId) : null;
  const detailCard = detailCardId ? board.cards[detailCardId] : null;
  const detailColumn = detailCardId
    ? board.columns.find((c) => c.cardIds.includes(detailCardId))
    : undefined;

  const archivedCards: CardData[] = board.archive
    .map((id) => board.cards[id])
    .filter(Boolean) as CardData[];

  function findColumnByCardId(b: Board, cardId: string) {
    return b.columns.find((col) => col.cardIds.includes(cardId));
  }

  function triggerLanded(cardId: string) {
    if (landedTimer.current) window.clearTimeout(landedTimer.current);
    setLandedCardId(cardId);
    landedTimer.current = window.setTimeout(() => {
      setLandedCardId(null);
      landedTimer.current = null;
    }, 1500);
  }

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
    // reorder de coluna é feito só no dragEnd — não movemos cards aqui
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

    // ---- Reorder de coluna ----
    if (type === 'column') {
      setActiveColumnId(null);
      if (!over) return;
      const overId = String(over.id);
      if (activeId === overId) return;

      setBoard((prev) => {
        const oldIdx = prev.columns.findIndex((c) => c.id === activeId);
        // overId pode ser uma coluna ou um card (de outra coluna)
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

    // ---- Drop final de card (reorder dentro da mesma coluna + landed trigger) ----
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

  function renameColumn(columnId: string, title: string) {
    setBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => (c.id === columnId ? { ...c, title } : c)),
    }));
  }

  function cycleColumnStatus(columnId: string) {
    setBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((c) =>
        c.id === columnId ? { ...c, status: nextStatus(c.status) } : c,
      ),
    }));
  }

  function resizeColumn(columnId: string, width: number) {
    setBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((c) =>
        c.id === columnId ? { ...c, width } : c,
      ),
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
        const ok = window.confirm(
          `Remover a coluna "${col.title}"? Os ${col.cardIds.length} card(s) serão arquivados.`,
        );
        if (!ok) return prev;
      }
      const now = new Date().toISOString();
      const nextCards = { ...prev.cards };
      col.cardIds.forEach((id) => {
        if (nextCards[id]) nextCards[id] = { ...nextCards[id], archivedAt: now };
      });
      return {
        ...prev,
        columns: prev.columns.filter((c) => c.id !== columnId),
        cards: nextCards,
        archive: [...col.cardIds, ...prev.archive],
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

  function updateCard(cardId: string, patch: Partial<CardData>) {
    setBoard((prev) => {
      const existing = prev.cards[cardId];
      if (!existing) return prev;
      const prevStatus = existing.status;
      const nextStatus = patch.status;
      if (nextStatus === 'done' && prevStatus !== 'done') {
        triggerLanded(cardId);
      }
      return {
        ...prev,
        cards: { ...prev.cards, [cardId]: { ...existing, ...patch } },
      };
    });
  }

  function archiveCard(cardId: string) {
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
  }

  function restoreCard(cardId: string) {
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
  }

  function deleteCardPermanently(cardId: string) {
    setBoard((prev) => {
      const nextCards = { ...prev.cards };
      delete nextCards[cardId];
      return {
        ...prev,
        cards: nextCards,
        archive: prev.archive.filter((id) => id !== cardId),
      };
    });
    setConfirmDeleteId(null);
  }

  function openResetConfirm() {
    if (Object.keys(board.cards).length === 0) return;
    setConfirmResetOpen(true);
  }

  function confirmResetCards() {
    setBoard((prev) => ({
      ...prev,
      cards: {},
      columns: prev.columns.map((c) => ({ ...c, cardIds: [] })),
      archive: [],
    }));
    setConfirmResetOpen(false);
  }

  const totalCards = Object.keys(board.cards).length - board.archive.length;
  const archivedCount = board.archive.length;

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
            className="icon-btn theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            aria-pressed={theme === 'dark'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <g className="theme-toggle__sun">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="M4.93 4.93l1.41 1.41" />
                <path d="M17.66 17.66l1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="M6.34 17.66l-1.41 1.41" />
                <path d="M19.07 4.93l-1.41 1.41" />
              </g>
              <path className="theme-toggle__moon" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--archive"
            onClick={() => setArchiveOpen(true)}
            title={`Arquivados (${archivedCount})`}
            aria-label={`Ver arquivados (${archivedCount})`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="5" rx="1" />
              <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
              <path d="M10 13h4" />
            </svg>
            {archivedCount > 0 && (
              <span className="icon-btn__badge">{archivedCount}</span>
            )}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={openResetConfirm}
            disabled={totalCards === 0}
            title="Resetar cards (arquiva todos)"
            aria-label="Resetar cards"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
          </button>
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
          <SortableContext
            items={board.columns.map((c) => c.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="columns-row">
              {board.columns.map((col) => (
                <Column
                  key={col.id}
                  column={col}
                  cards={col.cardIds.map((id) => board.cards[id]).filter(Boolean) as CardData[]}
                  landedCardId={landedCardId}
                  onRename={(title) => renameColumn(col.id, title)}
                  onRemove={() => removeColumn(col.id)}
                  onAddCard={(title) => addCard(col.id, title)}
                  onOpenCard={(cardId) => setDetailCardId(cardId)}
                  onArchiveCard={(cardId) => archiveCard(cardId)}
                  onCycleStatus={() => cycleColumnStatus(col.id)}
                  onResize={(w) => resizeColumn(col.id, w)}
                />
              ))}
              <button className="add-column" type="button" onClick={addColumn}>
                <span aria-hidden="true">+</span> Adicionar coluna
              </button>
            </div>
          </SortableContext>

          <DragOverlay>
            {activeCard ? (
              <div className="card is-overlay">
                <div className="card-title">{activeCard.title}</div>
              </div>
            ) : activeColumn ? (
              <div className="column column--overlay" style={{ width: `${activeColumn.width ?? 300}px` }}>
                <div className="column-header">
                  <span className="column-grip column-grip--ghost" aria-hidden="true">
                    <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                      <circle cx="3" cy="2.5" r="1.1" fill="currentColor" />
                      <circle cx="9" cy="2.5" r="1.1" fill="currentColor" />
                      <circle cx="3" cy="7" r="1.1" fill="currentColor" />
                      <circle cx="9" cy="7" r="1.1" fill="currentColor" />
                      <circle cx="3" cy="11.5" r="1.1" fill="currentColor" />
                      <circle cx="9" cy="11.5" r="1.1" fill="currentColor" />
                    </svg>
                  </span>
                  <span className="column-title">
                    <span>{activeColumn.title}</span>
                    <span className="column-count">{activeColumn.cardIds.length}</span>
                  </span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      <CardDetailModal
        open={detailCardId !== null}
        card={detailCard}
        columnTitle={detailColumn?.title}
        onClose={() => setDetailCardId(null)}
        onSave={(patch) => detailCardId && updateCard(detailCardId, patch)}
        onArchive={() => detailCardId && archiveCard(detailCardId)}
      />

      <ArchiveDrawer
        open={archiveOpen}
        cards={archivedCards}
        onClose={() => setArchiveOpen(false)}
        onRestore={restoreCard}
        onDelete={(id) => setConfirmDeleteId(id)}
      />

      <ConfirmModal
        open={confirmResetOpen}
        title="Resetar cards?"
        message={`Isso vai arquivar ${totalCards} card${totalCards === 1 ? '' : 's'}. Você poderá restaurar depois pelo painel de arquivados.`}
        confirmLabel="Arquivar todos"
        cancelLabel="Cancelar"
        onConfirm={confirmResetCards}
        onCancel={() => setConfirmResetOpen(false)}
      />

      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Apagar permanentemente?"
        message="Esse card será removido de vez e não poderá ser restaurado."
        confirmLabel="Apagar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => confirmDeleteId && deleteCardPermanently(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
