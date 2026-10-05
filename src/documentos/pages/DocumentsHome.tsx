import { useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentData, DocumentGroup } from '../types';
import { useTheme } from '../../hooks/useTheme';
import { useAuth, userDisplayName } from '../../hooks/useAuth';
import { navigate } from '../../hooks/usePathname';
import { ConfirmModal } from '../../components/ConfirmModal';
import { UpdatesAnnouncement } from '../../components/UpdatesAnnouncement';
import { NewDocumentMenu } from '../components/NewDocumentMenu';

type Props = {
  documents: DocumentData[];
  groups: DocumentGroup[];
  syncing: boolean;
  onOpen: (id: string) => void;
  onCreate: (seed?: { title?: string; content?: string; groupId?: string | null }) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onMoveToGroup: (id: string, groupId: string | null) => void;
  onCreateGroup: (name: string) => string;
  onRenameGroup: (id: string, name: string) => void;
  onRemoveGroup: (id: string) => void;
};

const COLLAPSED_KEY = 'ohpe.documents.collapsed-groups';

function loadCollapsed(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, boolean>;
    return {};
  } catch {
    return {};
  }
}

export function DocumentsHome({
  documents,
  groups,
  syncing,
  onOpen,
  onCreate,
  onRename,
  onDelete,
  onMoveToGroup,
  onCreateGroup,
  onRenameGroup,
  onRemoveGroup,
}: Props) {
  const { user, signOut } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const newGroupRef = useRef<HTMLInputElement>(null);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameGroupDraft, setRenameGroupDraft] = useState('');
  const renameGroupRef = useRef<HTMLInputElement>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => loadCollapsed());
  const [moveMenuDocId, setMoveMenuDocId] = useState<string | null>(null);

  useEffect(() => {
    try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed)); } catch {}
  }, [collapsed]);

  useEffect(() => {
    if (renamingId) {
      renameRef.current?.focus();
      renameRef.current?.select();
    }
  }, [renamingId]);

  useEffect(() => {
    if (renamingGroupId) {
      renameGroupRef.current?.focus();
      renameGroupRef.current?.select();
    }
  }, [renamingGroupId]);

  useEffect(() => {
    if (newGroupOpen) newGroupRef.current?.focus();
  }, [newGroupOpen]);

  useEffect(() => {
    if (!moveMenuDocId) return;
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.doc-move-menu') && !target.closest('[data-move-trigger]')) {
        setMoveMenuDocId(null);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [moveMenuDocId]);

  function commitRename() {
    if (!renamingId) return;
    const trimmed = renameDraft.trim();
    if (trimmed) onRename(renamingId, trimmed);
    setRenamingId(null);
  }

  function commitRenameGroup() {
    if (!renamingGroupId) return;
    const trimmed = renameGroupDraft.trim();
    if (trimmed) onRenameGroup(renamingGroupId, trimmed);
    setRenamingGroupId(null);
  }

  function submitNewGroup() {
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      setNewGroupOpen(false);
      return;
    }
    onCreateGroup(trimmed);
    setNewGroupName('');
    setNewGroupOpen(false);
  }

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const docsByGroup = useMemo(() => {
    const map: Record<string, DocumentData[]> = { __none__: [] };
    for (const g of groups) map[g.id] = [];
    for (const d of documents) {
      const key = d.groupId && map[d.groupId] !== undefined ? d.groupId : '__none__';
      map[key].push(d);
    }
    return map;
  }, [documents, groups]);

  const total = documents.length;
  const ungrouped = docsByGroup.__none__;

  return (
    <div className="docs-shell">
      <div className="home-bg" aria-hidden="true">
        <div className="home-grid" />
        <div className="home-glow" />
      </div>

      <header className="home-header">
        <div className="brand home-brand">
          <span className="brand-mark" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round">
              <path d="M 128 44 A 84 84 0 1 0 212 128" />
            </svg>
          </span>
          <span className="brand-name">Ohpe</span>
          <span className="docs-badge">documentos</span>
        </div>

        <div className="home-user">
          <button
            type="button"
            className="icon-btn home-anim home-anim--2"
            onClick={() => navigate('/')}
            title="Voltar para Boards"
            aria-label="Voltar para Boards"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn home-anim home-anim--3"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {theme === 'dark' ? (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" /><path d="M12 20v2" />
                  <path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" />
                  <path d="M2 12h2" /><path d="M20 12h2" />
                  <path d="M6.34 17.66l-1.41 1.41" /><path d="M19.07 4.93l-1.41 1.41" />
                </>
              ) : (
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              )}
            </svg>
          </button>
          <button
            type="button"
            className={`icon-btn home-anim home-anim--4 ${syncing ? 'icon-btn--syncing' : ''}`}
            onClick={() => setConfirmSignOut(true)}
            title={syncing ? 'Sincronizando…' : `Sair (${userDisplayName(user)})`}
            aria-label="Sair"
          >
            {syncing ? (
              <svg className="icon-btn__spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <main className="home-main">
        <div className="docs-hero">
          <div className="home-hero">
            <h1 className="home-title home-anim home-anim--2">
              {user ? `Documentos de ${userDisplayName(user)}` : 'Documentos'}
            </h1>
            <p className="home-subtitle home-anim home-anim--3">
              {total === 0
                ? 'Crie seu primeiro documento. Markdown, upload de .md ou texto colado.'
                : total === 1
                  ? 'Você tem 1 documento. Abra ou crie outro.'
                  : `Você tem ${total} documentos. Escolha um pra abrir.`}
            </p>
          </div>

          <div className="docs-hero__actions home-anim home-anim--3">
            {newGroupOpen ? (
              <div className="docs-new-group__form">
                <input
                  ref={newGroupRef}
                  className="docs-new-group__input"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Nome do grupo…"
                  maxLength={60}
                  onBlur={submitNewGroup}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); submitNewGroup(); }
                    if (e.key === 'Escape') { setNewGroupName(''); setNewGroupOpen(false); }
                  }}
                />
              </div>
            ) : (
              <button
                type="button"
                className="docs-new-group__btn"
                onClick={() => setNewGroupOpen(true)}
                title="Criar novo grupo"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
                Novo grupo
              </button>
            )}
          </div>
        </div>

        {/* Ungrouped section */}
        <section className="docs-section">
          {groups.length > 0 && (
            <header className="docs-section__header">
              <h2 className="docs-section__title">Sem grupo</h2>
              <span className="docs-section__count">{ungrouped.length}</span>
            </header>
          )}
          <div className="docs-grid">
            {ungrouped.map((doc, i) => (
              <DocCard
                key={doc.id}
                doc={doc}
                index={i}
                groups={groups}
                renaming={renamingId === doc.id}
                renameDraft={renameDraft}
                renameRef={renameRef}
                onStartRename={() => { setRenameDraft(doc.title); setRenamingId(doc.id); }}
                onRenameChange={setRenameDraft}
                onCommitRename={commitRename}
                onCancelRename={() => setRenamingId(null)}
                onOpen={() => onOpen(doc.id)}
                onAskDelete={() => setConfirmDeleteId(doc.id)}
                moveOpen={moveMenuDocId === doc.id}
                onToggleMove={() => setMoveMenuDocId(moveMenuDocId === doc.id ? null : doc.id)}
                onMove={(gid) => { onMoveToGroup(doc.id, gid); setMoveMenuDocId(null); }}
              />
            ))}
            <NewDocumentMenu onCreate={(seed) => onCreate({ ...seed, groupId: null })} />
          </div>
        </section>

        {/* Grouped sections */}
        {groups.map((group) => {
          const docs = docsByGroup[group.id] ?? [];
          const isCollapsed = collapsed[group.id];
          return (
            <section key={group.id} className={`docs-section docs-section--group${isCollapsed ? ' is-collapsed' : ''}`}>
              <header className="docs-section__header">
                <button
                  type="button"
                  className="docs-section__toggle"
                  onClick={() => toggleCollapsed(group.id)}
                  aria-expanded={!isCollapsed}
                  aria-label={isCollapsed ? 'Expandir grupo' : 'Recolher grupo'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {renamingGroupId === group.id ? (
                  <input
                    ref={renameGroupRef}
                    className="docs-section__rename"
                    value={renameGroupDraft}
                    onChange={(e) => setRenameGroupDraft(e.target.value)}
                    onBlur={commitRenameGroup}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); commitRenameGroup(); }
                      if (e.key === 'Escape') { setRenamingGroupId(null); }
                    }}
                  />
                ) : (
                  <h2 className="docs-section__title">{group.name}</h2>
                )}
                <span className="docs-section__count">{docs.length}</span>

                <div className="docs-section__actions">
                  <button
                    type="button"
                    className="docs-section__action"
                    onClick={() => { setRenameGroupDraft(group.name); setRenamingGroupId(group.id); }}
                    aria-label="Renomear grupo"
                    title="Renomear"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="docs-section__action docs-section__action--danger"
                    onClick={() => setConfirmDeleteGroupId(group.id)}
                    aria-label="Apagar grupo"
                    title="Apagar grupo (documentos continuam)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              </header>

              {!isCollapsed && (
                <div className="docs-grid">
                  {docs.map((doc, i) => (
                    <DocCard
                      key={doc.id}
                      doc={doc}
                      index={i}
                      groups={groups}
                      renaming={renamingId === doc.id}
                      renameDraft={renameDraft}
                      renameRef={renameRef}
                      onStartRename={() => { setRenameDraft(doc.title); setRenamingId(doc.id); }}
                      onRenameChange={setRenameDraft}
                      onCommitRename={commitRename}
                      onCancelRename={() => setRenamingId(null)}
                      onOpen={() => onOpen(doc.id)}
                      onAskDelete={() => setConfirmDeleteId(doc.id)}
                      moveOpen={moveMenuDocId === doc.id}
                      onToggleMove={() => setMoveMenuDocId(moveMenuDocId === doc.id ? null : doc.id)}
                      onMove={(gid) => { onMoveToGroup(doc.id, gid); setMoveMenuDocId(null); }}
                    />
                  ))}
                  <button
                    type="button"
                    className="doc-card doc-card--new doc-card--inline-new"
                    onClick={() => onCreate({ groupId: group.id })}
                    title="Novo documento neste grupo"
                  >
                    <span className="doc-card__plus">+</span>
                    <span className="doc-card__name">Novo documento</span>
                    <span className="doc-card__meta">Direto neste grupo</span>
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </main>

      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Apagar esse documento?"
        message={
          confirmDeleteId
            ? `"${documents.find((d) => d.id === confirmDeleteId)?.title ?? 'esse documento'}" e todos os grifos serão apagados. Essa ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Apagar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => {
          if (confirmDeleteId) onDelete(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ConfirmModal
        open={confirmDeleteGroupId !== null}
        title="Apagar esse grupo?"
        message={
          confirmDeleteGroupId
            ? `O grupo "${groups.find((g) => g.id === confirmDeleteGroupId)?.name ?? ''}" será apagado. Os documentos continuam — só saem do grupo.`
            : ''
        }
        confirmLabel="Apagar grupo"
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => {
          if (confirmDeleteGroupId) onRemoveGroup(confirmDeleteGroupId);
          setConfirmDeleteGroupId(null);
        }}
        onCancel={() => setConfirmDeleteGroupId(null)}
      />

      <ConfirmModal
        open={confirmSignOut}
        title="Sair da conta?"
        message={`Você será deslogado${user?.email ? ' de ' + userDisplayName(user) : ''}. Seus documentos continuam salvos na nuvem.`}
        confirmLabel="Sair"
        cancelLabel="Cancelar"
        onConfirm={async () => {
          setConfirmSignOut(false);
          await signOut();
        }}
        onCancel={() => setConfirmSignOut(false)}
      />

      <UpdatesAnnouncement />
    </div>
  );
}

type DocCardProps = {
  doc: DocumentData;
  index: number;
  groups: DocumentGroup[];
  renaming: boolean;
  renameDraft: string;
  renameRef: React.RefObject<HTMLInputElement>;
  onStartRename: () => void;
  onRenameChange: (v: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onOpen: () => void;
  onAskDelete: () => void;
  moveOpen: boolean;
  onToggleMove: () => void;
  onMove: (groupId: string | null) => void;
};

function DocCard({
  doc, index, groups,
  renaming, renameDraft, renameRef,
  onStartRename, onRenameChange, onCommitRename, onCancelRename,
  onOpen, onAskDelete,
  moveOpen, onToggleMove, onMove,
}: DocCardProps) {
  const updated = new Date(doc.updatedAt);
  const updatedLabel = updated.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const wordCount = doc.content.trim() ? doc.content.trim().split(/\s+/).length : 0;
  const highlightCount = doc.highlights.length;

  return (
    <div
      className="doc-card home-anim"
      style={{ animationDelay: `${1200 + index * 70}ms` }}
    >
      <button type="button" className="doc-card__open" onClick={onOpen}>
        <span className="doc-card__dot" aria-hidden="true" />
        {renaming ? (
          <input
            ref={renameRef}
            className="doc-card__rename"
            value={renameDraft}
            onChange={(e) => onRenameChange(e.target.value)}
            onBlur={onCommitRename}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); onCommitRename(); }
              if (e.key === 'Escape') { onCancelRename(); }
            }}
          />
        ) : (
          <span className="doc-card__name">{doc.title}</span>
        )}
        <span className="doc-card__meta">
          <span>{wordCount} palavra{wordCount === 1 ? '' : 's'}</span>
          <span className="doc-card__sep" aria-hidden="true">·</span>
          <span>{highlightCount} grifo{highlightCount === 1 ? '' : 's'}</span>
          <span className="doc-card__sep" aria-hidden="true">·</span>
          <span>atualizado {updatedLabel}</span>
        </span>
      </button>

      <div className="doc-card__actions">
        <button
          type="button"
          className="doc-card__action"
          data-move-trigger
          onClick={(e) => { e.stopPropagation(); onToggleMove(); }}
          aria-label="Mover para grupo"
          title="Mover para grupo"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        <button
          type="button"
          className="doc-card__action"
          onClick={(e) => { e.stopPropagation(); onStartRename(); }}
          aria-label="Renomear documento"
          title="Renomear"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
        <button
          type="button"
          className="doc-card__action doc-card__action--danger"
          onClick={(e) => { e.stopPropagation(); onAskDelete(); }}
          aria-label="Apagar documento"
          title="Apagar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>

      {moveOpen && (
        <div className="doc-move-menu" onClick={(e) => e.stopPropagation()}>
          <span className="doc-move-menu__label">Mover para</span>
          <button
            type="button"
            className={`doc-move-menu__item${doc.groupId === null ? ' is-current' : ''}`}
            onClick={() => onMove(null)}
          >
            <span className="doc-move-menu__dot doc-move-menu__dot--none" aria-hidden="true" />
            Sem grupo
          </button>
          {groups.length === 0 && (
            <span className="doc-move-menu__empty">Nenhum grupo criado ainda.</span>
          )}
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`doc-move-menu__item${doc.groupId === g.id ? ' is-current' : ''}`}
              onClick={() => onMove(g.id)}
            >
              <span className="doc-move-menu__dot" aria-hidden="true" />
              {g.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
