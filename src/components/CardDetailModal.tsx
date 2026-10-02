import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { CardData, ColumnStatus } from '../types/board';
import '../styles/modal.css';

function autoSize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

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
    impediment?: string;
    improvements?: string;
    status?: ColumnStatus;
  }) => void;
  onArchive: () => void;
};

const STATUS_OPTIONS: { value: CardStatus; label: string }[] = [
  { value: 'none',         label: 'Sem status' },
  { value: 'todo',         label: 'A fazer' },
  { value: 'doing',        label: 'Sendo feito' },
  { value: 'blocked',      label: 'Impedimento' },
  { value: 'improvements', label: 'Melhorias' },
  { value: 'done',         label: 'Feito' },
];

function labelOf(status: CardStatus) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? 'Sem status';
}

function buildClaudePrompt(input: {
  title: string;
  status: CardStatus;
  description: string;
  resolution: string;
}): string {
  const existing: string[] = [];
  if (input.description.trim()) {
    existing.push(`- Já anotado na descrição: ${input.description.trim()}`);
  }
  if (input.resolution.trim()) {
    existing.push(`- Já anotado em "como resolvi": ${input.resolution.trim()}`);
  }

  return [
    'Documente essa demanda num card do meu kanban Ohpe. Com base em TODO o contexto da nossa conversa acima, me retorne EXATAMENTE neste formato, sem comentários antes nem depois:',
    '',
    '## Descrição',
    '<2 a 4 linhas: qual era o problema/objetivo, por que surgiu, o que estava em jogo. Direto, sem enrolação.>',
    '',
    '## Como resolvi',
    '<passo a passo em markdown do caminho real que seguimos — decisões importantes, trechos de código quando fizer sentido, armadilhas que evitamos, links úteis. Escreva pensando como memória pro meu eu-futuro reabrir esse card daqui a 3 meses e lembrar na hora.>',
    '',
    '---',
    'Contexto do card:',
    `- Título: "${input.title.trim() || 'sem título'}"`,
    `- Status atual: ${labelOf(input.status)}`,
    ...existing,
  ].join('\n');
}

type NoteVariant = 'default' | 'resolution' | 'blocked' | 'improvements';

type EditableNoteProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  rows: number;
  variant?: NoteVariant;
};

function EditableNote({ value, onChange, placeholder, rows, variant = 'default' }: EditableNoteProps) {
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    autoSize(el);
  }, [editing]);

  useLayoutEffect(() => {
    if (editing) autoSize(textareaRef.current);
  }, [value, editing]);

  function handleBlur() {
    setEditing(false);
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

  const hasContent = value.trim().length > 0;

  const variantClass =
    variant === 'resolution'   ? '--resolution'   :
    variant === 'blocked'      ? '--blocked'      :
    variant === 'improvements' ? '--improvements' : '';

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        className={`card-detail__field ${variantClass ? 'card-detail__field' + variantClass : ''}`}
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
      className={[
        'card-detail__note',
        variantClass ? 'card-detail__note' + variantClass : '',
        hasContent ? '' : 'card-detail__note--empty',
      ].filter(Boolean).join(' ')}
    >
      <div className="card-detail__note-text">
        {hasContent ? value : placeholder}
      </div>
      <button
        type="button"
        className="card-detail__note-edit"
        onClick={enterEdit}
        aria-label={hasContent ? 'Editar' : 'Adicionar'}
        title={hasContent ? 'Editar' : 'Adicionar'}
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
  const [impediment, setImpediment] = useState('');
  const [improvements, setImprovements] = useState('');
  const [status, setStatus] = useState<CardStatus>('none');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (open) autoSize(titleRef.current);
  }, [title, open]);

  useEffect(() => {
    if (!open || !card) return;
    setTitle(card.title);
    setDescription(card.description ?? '');
    setResolution(card.resolution ?? '');
    setImpediment(card.impediment ?? '');
    setImprovements(card.improvements ?? '');
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
      impediment: impediment.trim() ? impediment : undefined,
      improvements: improvements.trim() ? improvements : undefined,
      status: status === 'none' ? undefined : status,
    });
    onClose();
  }

  function pickStatus(next: CardStatus) {
    setStatus(next);
    setPickerOpen(false);
  }

  async function doCopy(text: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
      setCopied(true);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[CardDetailModal] copy falhou', err);
    }
  }

  function copyPromptForClaude() {
    const prompt = buildClaudePrompt({ title, status, description, resolution });
    doCopy(prompt);
  }

  function copyImprovementsAsTopics() {
    const bullets = improvements
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => (line.startsWith('-') || line.startsWith('*') ? line : `- ${line}`))
      .join('\n');
    const header = title.trim() ? `Melhorias — ${title.trim()}\n\n` : 'Melhorias\n\n';
    doCopy(header + bullets);
  }

  useEffect(() => {
    return () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    };
  }, []);

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
          ref={titleRef}
          className="card-detail__title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do card"
          rows={1}
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

        {status === 'blocked' ? (
          <>
            <label className="card-detail__label">O que está impedindo</label>
            <EditableNote
              value={impediment}
              onChange={setImpediment}
              placeholder="Descreva o impedimento — o que travou, quem/o que você está esperando, qual decisão falta. Serve pra não esquecer quando voltar."
              rows={6}
              variant="blocked"
            />
          </>
        ) : status === 'improvements' ? (
          <>
            <label className="card-detail__label card-detail__label--with-action">
              Melhorias (uma por linha)
              <button
                type="button"
                className={`card-detail__copy-icon ${copied ? 'is-copied' : ''}`}
                onClick={copyImprovementsAsTopics}
                aria-label="Copiar como tópicos"
                title="Copiar como tópicos"
              >
                {copied ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </label>
            <EditableNote
              value={improvements}
              onChange={setImprovements}
              placeholder={'Liste as melhorias, uma por linha. Ex:\nAjustar contraste no tema escuro\nMelhorar carregamento inicial\nAdicionar atalhos de teclado'}
              rows={6}
              variant="improvements"
            />
          </>
        ) : (
          <>
            <label className="card-detail__label card-detail__label--with-action">
              Descrição
              <button
                type="button"
                className={`card-detail__copy-icon ${copied ? 'is-copied' : ''}`}
                onClick={copyPromptForClaude}
                aria-label="Copiar Template"
                title="Copiar Template"
              >
                {copied ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </label>
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
              variant="resolution"
            />
          </>
        )}

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
