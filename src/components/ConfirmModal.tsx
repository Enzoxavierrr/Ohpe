import { useEffect, useRef } from 'react';
import '../styles/modal.css';

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmBtnRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel, onConfirm]);

  return (
    <div
      className={`modal ${open ? 'modal--open' : ''}`}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal__backdrop" onClick={onCancel} />
      <div className="modal__card">
        <h2 id="modal-title" className="modal__title">{title}</h2>
        <p className="modal__message">{message}</p>
        <div className="modal__actions">
          <button type="button" className="modal__btn modal__btn--ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={`modal__btn ${destructive ? 'modal__btn--danger' : 'modal__btn--primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
