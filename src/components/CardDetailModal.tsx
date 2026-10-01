import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { CardData, ColumnStatus } from '../types/board';
import '../styles/modal.css';

type CardStatus = ColumnStatus | 'none';

type Props = {
  open: boolean;
  card: CardData | null;
  columnTitle?: string;
  onClose: () => void;
  onSave: (patch: {
    title: string;
    description?: string;
    resolution?: string;
    status?: ColumnStatus;
  }) => void;
  onArchive: () => void;
};

const STATUS_OPTIONS: { value: CardStatus; label: string }[] = [
  { value: 'none',  label: 'Sem status' },
  { value: 'todo',  label: 'A fazer' },
  { value: 'doing', label: 'Sendo feito' },
  { value: 'done',  label: 'Feito' },
];

function labelOf(status: CardStatus) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? 'Sem status';
}

type EditableNoteProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  rows: number;
  resolution?: boolean;
};

function EditableNote({ value, onChange, placeholder, rows, resolution }: EditableNoteProps) {
  const hasContent = value.trim().length > 0;
  const [editing, setEditing] = useState(!hasContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sincroniza quando o card muda externamente (ex: abre outro card)
  useEffect(() => {
    setEditing(value.trim().length === 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  function handleBlur() {
    if (value.trim().length > 0) setEditing(false);
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  }

  function enterEdit() {
    setEditing(true);
  }

  function noteKeyboard(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      enterEdit();
    }
  }

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        className={`card-detail__field ${resolution ? 'card-detail__field--resolution' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
      />
    );
  }

  return (
    <div
      className={`card-detail__note ${resolution ? 'card-detail__note--resolution' : ''}`}
      onClick={enterEdit}
      onKeyDown={noteKeyboard}
      role="button"
      tabIndex={0}
      title="Clique para editar"
    >
      <div className="card-detail__note-text">{value}</div>
      <button
        type="button"
        className="card-detail__note-edit"
        onClick={(e) => { e.stopPropagation(); enterEdit(); }}
        aria-label="Editar"
        title="Editar"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </button>
    </div>
  );
}

export function CardDetailModal({
  open, card, columnTitle, onClose, onSave, onArchive,
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resolution, setResolution] = useState('');
  const [status, setStatus] = useState<CardStatus>('none');
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !card) return;
    setTitle(card.title);
    setDescription(card.description ?? '');
    setResolution(card.resolution ?? '');
    setStatus((card.status as CardStatus) ?? 'none');
    setPickerOpen(false);
  }, [open, card]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (pickerOpen) setPickerOpen(false);
        else commitAndClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (!pickerOpen) return;
    function onClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [pickerOpen]);

  function commitAndClose() {
    if (!card) { onClose(); return; }
    const nextTitle = title.trim() || card.title;
    onSave({
      title: nextTitle,
      description: description.trim() ? description : undefined,
      resolution: resolution.trim() ? resolution : undefined,
      status: status === 'none' ? undefined : status,
    });
    onClose();
  }

  function pickStatus(next: CardStatus) {
    setStatus(next);
    setPickerOpen(false);
  }

  if (!card) {
    return (
      <div className={`modal ${open ? 'modal--open' : ''}`} aria-hidden={!open} />
    );
  }

  const created = new Date(card.createdAt);
  const createdLabel = created.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div
      className={`modal ${open ? 'modal--open' : ''}`}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-detail-title"
    >
      <div className="modal__backdrop" onClick={commitAndClose} />
      <div className="modal__card modal__card--wide">
        <div className="card-detail__header">
          {columnTitle && (
            <span className="card-detail__chip">
              em {columnTitle}
            </span>
          )}
          <span className="card-detail__created">Criado em {createdLabel}</span>
        </div>

        <textarea
          id="card-detail-title"
          className="card-detail__title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do card"
          rows={2}
        />

        <label className="card-detail__label">Status</label>
        <div className="status-picker" ref={pickerRef}>
          <button
            type="button"
            className={`status-picker__trigger status-picker__trigger--${status}`}
            onClick={() => setPickerOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={pickerOpen}
          >
            <span className={`status-picker__dot status-picker__dot--${status}`} aria-hidden="true" />
            <span className="status-picker__label">{labelOf(status)}</span>
            <svg
              className={`status-picker__caret ${pickerOpen ? 'is-open' : ''}`}
              width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {pickerOpen && (
            <ul className="status-picker__menu" role="listbox">
              {STATUS_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    className={`status-picker__option ${status === opt.value ? 'is-selected' : ''}`}
                    onClick={() => pickStatus(opt.value)}
                    role="option"
                    aria-selected={status === opt.value}
                  >
                    <span className={`status-picker__dot status-picker__dot--${opt.value}`} aria-hidden="true" />
                    <span>{opt.label}</span>
                    {status === opt.value && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <label className="card-detail__label">Descrição</label>
        <EditableNote
          value={description}
          onChange={setDescription}
          placeholder="Contexto, requisitos, links…"
          rows={4}
        />

        <label className="card-detail__label">Como resolvi</label>
        <EditableNote
          value={resolution}
          onChange={setResolution}
          placeholder="Anote aqui o caminho, decisões, código, links do que foi feito. Serve de memória pra depois."
          rows={6}
          resolution
        />

        <div className="modal__actions card-detail__actions">
          <button
            type="button"
            className="modal__btn modal__btn--ghost card-detail__archive"
            onClick={() => { onArchive(); onClose(); }}
            title="Arquivar card"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="5" rx="1" />
              <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
              <path d="M10 13h4" />
            </svg>
            Arquivar
          </button>
          <div className="card-detail__actions-right">
            <button type="button" className="modal__btn modal__btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="modal__btn modal__btn--primary" onClick={commitAndClose}>
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
