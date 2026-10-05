import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { BoardMeta, Workspace } from '../types/board';
import { useTheme } from '../hooks/useTheme';
import { useAuth, userDisplayName } from '../hooks/useAuth';
import { BOARD_STORAGE_KEY } from '../hooks/useBoard';
import { navigate } from '../hooks/usePathname';
import { ConfirmModal } from '../components/ConfirmModal';
import { UpdatesAnnouncement } from '../components/UpdatesAnnouncement';
import '../styles/home.css';

type Props = {
  workspace: Workspace;
  syncing: boolean;
  onOpenBoard: (id: string) => void;
  onCreateBoard: (name: string) => string;
  onRenameBoard: (id: string, name: string) => void;
  onDeleteBoard: (id: string) => void;
};

export function HomePage({
  workspace, syncing, onOpenBoard, onCreateBoard, onRenameBoard, onDeleteBoard,
}: Props) {
  const { user, signOut } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [newBoardOpen, setNewBoardOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const newBoardRef = useRef<HTMLInputElement>(null);
  const hasOpenedNewBoard = useRef(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    if (newBoardOpen) {
      newBoardRef.current?.focus();
      hasOpenedNewBoard.current = true;
    }
  }, [newBoardOpen]);

  useEffect(() => {
    if (renamingId) {
      renameRef.current?.focus();
      renameRef.current?.select();
    }
  }, [renamingId]);

  function submitNewBoard(e: FormEvent) {
    e.preventDefault();
    const trimmed = newBoardName.trim();
    if (!trimmed) return;
    const id = onCreateBoard(trimmed);
    setNewBoardName('');
    setNewBoardOpen(false);
    onOpenBoard(id);
  }

  function commitRename() {
    if (!renamingId) return;
    const trimmed = renameDraft.trim();
    if (trimmed) onRenameBoard(renamingId, trimmed);
    setRenamingId(null);
  }

  async function doSignOut() {
    setConfirmSignOut(false);
    try { localStorage.removeItem(BOARD_STORAGE_KEY); } catch {}
    await signOut();
  }

  const orderedBoards = workspace.order
    .map((id) => workspace.meta[id])
    .filter((m): m is BoardMeta => Boolean(m));

  const totalBoards = orderedBoards.length;

  return (
    <div className="home-shell">
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
        </div>

        <div className="home-user">
          <button
            type="button"
            className="icon-btn home-anim home-anim--2"
            onClick={() => navigate('/documentos')}
            title="Ir para Documentos"
            aria-label="Ir para Documentos"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="13" y2="17" />
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
        <div className="home-hero">
          <h1 className="home-title home-anim home-anim--2">
            {user ? `Olá, ${userDisplayName(user)}` : 'Seus boards'}
          </h1>
          <p className="home-subtitle home-anim home-anim--3">
            {totalBoards === 0
              ? 'Comece criando seu primeiro board.'
              : totalBoards === 1
                ? 'Você tem 1 board. Entre nele ou crie outro.'
                : `Você tem ${totalBoards} boards. Escolha um pra entrar.`}
          </p>
        </div>

        <div className="home-grid-boards">
          {orderedBoards.map((meta, i) => {
            const board = workspace.boards[meta.id];
            const cardCount = board ? Object.keys(board.cards).length - board.archive.length : 0;
            const colCount = board ? board.columns.length : 0;
            const updated = new Date(meta.updatedAt);
            const updatedLabel = updated.toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'short',
            });

            return (
              <div
                key={meta.id}
                className="board-card home-anim"
                style={{ ['--i' as any]: 4 + i, animationDelay: `${1200 + i * 70}ms` }}
              >
                <button
                  type="button"
                  className="board-card__open"
                  onClick={() => onOpenBoard(meta.id)}
                >
                  <span className="board-card__dot" aria-hidden="true" />

                  {renamingId === meta.id ? (
                    <input
                      ref={renameRef}
                      className="board-card__rename"
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={commitRename}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                        if (e.key === 'Escape') { setRenamingId(null); }
                      }}
                    />
                  ) : (
                    <span className="board-card__name">{meta.name}</span>
                  )}

                  <span className="board-card__meta">
                    <span>{cardCount} card{cardCount === 1 ? '' : 's'}</span>
                    <span className="board-card__sep" aria-hidden="true">·</span>
                    <span>{colCount} coluna{colCount === 1 ? '' : 's'}</span>
                    <span className="board-card__sep" aria-hidden="true">·</span>
                    <span>atualizado {updatedLabel}</span>
                  </span>
                </button>

                <div className="board-card__actions">
                  <button
                    type="button"
                    className="board-card__action"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameDraft(meta.name);
                      setRenamingId(meta.id);
                    }}
                    aria-label="Renomear board"
                    title="Renomear"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="board-card__action board-card__action--danger"
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(meta.id); }}
                    aria-label="Apagar board"
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
              </div>
            );
          })}

          <div
            className={`board-card board-card--new${newBoardOpen ? ' is-editing' : ''}${!hasOpenedNewBoard.current && !newBoardOpen ? ' home-anim' : ''}`}
            style={!hasOpenedNewBoard.current && !newBoardOpen ? { animationDelay: `${1200 + orderedBoards.length * 70}ms` } : undefined}
            onClick={() => { if (!newBoardOpen) setNewBoardOpen(true); }}
          >
            <div className="new-board__idle" aria-hidden={newBoardOpen}>
              <span className="board-card__plus">+</span>
              <span className="board-card__name">Novo board</span>
              <span className="board-card__meta">Pra separar projetos, contextos, times</span>
            </div>
            <form className="new-board__form" aria-hidden={!newBoardOpen} onSubmit={submitNewBoard}>
              <input
                ref={newBoardRef}
                className="board-card__rename board-card__rename--new"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                tabIndex={newBoardOpen ? 0 : -1}
                onBlur={() => {
                  if (!newBoardName.trim()) setNewBoardOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setNewBoardName(''); setNewBoardOpen(false); }
                }}
                placeholder="Nome do novo board…"
                maxLength={60}
              />
              <span className="board-card__meta">
                Enter para criar, Esc para cancelar
              </span>
            </form>
          </div>
        </div>
      </main>

      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Apagar esse board?"
        message={
          confirmDeleteId
            ? `"${workspace.meta[confirmDeleteId]?.name ?? 'esse board'}" e todos os seus cards serão apagados. Essa ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Apagar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => {
          if (confirmDeleteId) onDeleteBoard(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ConfirmModal
        open={confirmSignOut}
        title="Sair da conta?"
        message={`Você será deslogado${user?.email ? ' de ' + userDisplayName(user) : ''}. Seus boards continuam salvos na nuvem — é só entrar de novo pra voltar.`}
        confirmLabel="Sair"
        cancelLabel="Cancelar"
        onConfirm={doSignOut}
        onCancel={() => setConfirmSignOut(false)}
      />

      <UpdatesAnnouncement />
    </div>
  );
}
