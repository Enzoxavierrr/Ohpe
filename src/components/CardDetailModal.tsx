import { useEffect, useRef, useState } from 'react';
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

        <label className="card-detail__label" htmlFor="card-detail-desc">
          Descrição
        </label>
        <textarea
          id="card-detail-desc"
          className="card-detail__field"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Contexto, requisitos, links…"
          rows={4}
        />

        <label className="card-detail__label" htmlFor="card-detail-resolution">
          Como resolvi
        </label>
        <textarea
          id="card-detail-resolution"
          className="card-detail__field card-detail__field--resolution"
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          placeholder="Anote aqui o caminho, decisões, código, links do que foi feito. Serve de memória pra depois."
          rows={6}
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
