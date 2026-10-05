import { useEffect, useRef, useState } from 'react';
import type { DocumentData, Highlight, HighlightColor } from '../types';
import { HighlightedMarkdown } from '../components/HighlightedMarkdown';
import { HighlightColorPicker } from '../components/HighlightColorPicker';
import { TopicsPanel } from '../components/TopicsPanel';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useTheme } from '../../hooks/useTheme';
import { useAuth, userDisplayName } from '../../hooks/useAuth';

const COLOR_STORAGE_KEY = 'ohpe.doc.highlight-color';

type Props = {
  document: DocumentData;
  syncing: boolean;
  onUpdate: (updater: (prev: DocumentData) => DocumentData) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onBack: () => void;
};

type Mode = 'read' | 'edit';

export function DocumentPage({ document, syncing, onUpdate, onRename, onDelete, onBack }: Props) {
  const { user, signOut } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [mode, setMode] = useState<Mode>(document.content.trim() ? 'read' : 'edit');
  const [draftTitle, setDraftTitle] = useState(document.title);
  const [titleEditing, setTitleEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [highlightColor, setHighlightColor] = useState<HighlightColor>(() => {
    try {
      const saved = localStorage.getItem(COLOR_STORAGE_KEY);
      if (saved === 'yellow' || saved === 'blue' || saved === 'green' || saved === 'pink' || saved === 'orange') {
        return saved;
      }
    } catch {}
    return 'yellow';
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try { localStorage.setItem(COLOR_STORAGE_KEY, highlightColor); } catch {}
  }, [highlightColor]);

  useEffect(() => {
    setDraftTitle(document.title);
  }, [document.id, document.title]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [document.content, mode]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.doc-menu')) setMenuOpen(false);
    }
    if (menuOpen) {
      window.document.addEventListener('mousedown', onDocMouseDown);
      return () => window.document.removeEventListener('mousedown', onDocMouseDown);
    }
  }, [menuOpen]);

  function commitTitle() {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== document.title) {
      onRename(trimmed);
    } else {
      setDraftTitle(document.title);
    }
    setTitleEditing(false);
  }

  function updateContent(next: string) {
    onUpdate((prev) => ({ ...prev, content: next }));
  }

  function addHighlight(seed: Omit<Highlight, 'id' | 'createdAt'>) {
    const h: Highlight = {
      ...seed,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    onUpdate((prev) => ({ ...prev, highlights: [...prev.highlights, h] }));
    setActiveHighlightId(h.id);
    setTimeout(() => setActiveHighlightId(null), 1200);
  }

  function removeHighlight(id: string) {
    onUpdate((prev) => ({ ...prev, highlights: prev.highlights.filter((h) => h.id !== id) }));
  }

  function jumpToHighlight(id: string) {
    const nodes = window.document.querySelectorAll<HTMLElement>(`mark[data-highlight-id="${id}"]`);
    if (nodes.length === 0) return;
    nodes[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    setActiveHighlightId(id);
    nodes.forEach((n) => n.classList.add('is-flash'));
    setTimeout(() => {
      nodes.forEach((n) => n.classList.remove('is-flash'));
      setActiveHighlightId(null);
    }, 1200);
  }

  function exportMarkdown() {
    const blob = new Blob([document.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.title || 'documento'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  }

  return (
    <div className="doc-shell">
      <header className="doc-header">
        <div className="doc-header__left">
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Voltar" title="Voltar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          {titleEditing ? (
            <input
              className="doc-header__title-input"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitTitle(); }
                if (e.key === 'Escape') { setDraftTitle(document.title); setTitleEditing(false); }
              }}
              autoFocus
            />
          ) : (
            <h1 className="doc-header__title" onClick={() => setTitleEditing(true)} title="Clique para renomear">
              {document.title}
            </h1>
          )}
        </div>

        <div className="doc-header__right">
          {mode === 'read' && (
            <HighlightColorPicker
              value={highlightColor}
              onChange={setHighlightColor}
            />
          )}

          <div className="doc-mode-toggle" role="tablist" aria-label="Modo do documento">
            <button
              type="button"
              className={`doc-mode-toggle__btn${mode === 'read' ? ' is-active' : ''}`}
              onClick={() => setMode('read')}
              role="tab"
              aria-selected={mode === 'read'}
            >
              Ler
            </button>
            <button
              type="button"
              className={`doc-mode-toggle__btn${mode === 'edit' ? ' is-active' : ''}`}
              onClick={() => setMode('edit')}
              role="tab"
              aria-selected={mode === 'edit'}
            >
              Editar
            </button>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            aria-label="Alternar tema"
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

          <div className="doc-menu">
            <button
              type="button"
              className={`icon-btn ${syncing ? 'icon-btn--syncing' : ''}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Mais opções"
              title={syncing ? 'Sincronizando…' : 'Mais opções'}
            >
              {syncing ? (
                <svg className="icon-btn__spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              )}
            </button>
            {menuOpen && (
              <div className="doc-menu__dropdown">
                <button type="button" className="doc-menu__item" onClick={exportMarkdown}>
                  Exportar .md
                </button>
                <button
                  type="button"
                  className="doc-menu__item doc-menu__item--danger"
                  onClick={() => {
                    setConfirmDelete(true);
                    setMenuOpen(false);
                  }}
                >
                  Apagar documento
                </button>
                <div className="doc-menu__sep" />
                <button
                  type="button"
                  className="doc-menu__item"
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                >
                  Sair ({userDisplayName(user)})
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="doc-main">
        <div className="doc-main__center">
          {mode === 'edit' ? (
            <textarea
              ref={textareaRef}
              className="doc-editor"
              value={document.content}
              placeholder="# Comece digitando&#10;&#10;Markdown é bem-vindo. **Negrito**, *itálico*, `código`, listas, tabelas…"
              onChange={(e) => updateContent(e.target.value)}
              spellCheck
            />
          ) : (
            <HighlightedMarkdown
              content={document.content}
              highlights={document.highlights}
              activeColor={highlightColor}
              onAddHighlight={addHighlight}
              onHighlightClick={jumpToHighlight}
            />
          )}
        </div>
        <TopicsPanel
          highlights={document.highlights}
          activeId={activeHighlightId}
          onJump={jumpToHighlight}
          onRemove={removeHighlight}
        />
      </main>

      <ConfirmModal
        open={confirmDelete}
        title="Apagar esse documento?"
        message={`"${document.title}" e todos os grifos serão apagados. Essa ação não pode ser desfeita.`}
        confirmLabel="Apagar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
