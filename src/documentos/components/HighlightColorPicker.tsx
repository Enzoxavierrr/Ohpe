import { useEffect, useRef, useState } from 'react';
import {
  HIGHLIGHT_COLORS,
  HIGHLIGHT_COLOR_LABELS,
  type HighlightColor,
} from '../types';

type Props = {
  value: HighlightColor;
  onChange: (color: HighlightColor) => void;
  disabled?: boolean;
};

export function HighlightColorPicker({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="doc-color-picker" ref={rootRef}>
      <button
        type="button"
        className="doc-color-picker__trigger"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Cor de grifo: ${HIGHLIGHT_COLOR_LABELS[value]}`}
      >
        <svg
          className="doc-color-picker__icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 20h9" />
          <path d="M3 17l6-6 4 4 8-8" />
        </svg>
        <span className="doc-color-picker__swatch" data-color={value} aria-hidden="true" />
        <svg
          className="doc-color-picker__caret"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="doc-color-picker__pop" role="menu">
          <span className="doc-color-picker__label">Cor do grifo</span>
          <div className="doc-color-picker__row">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="menuitemradio"
                aria-checked={c === value}
                className={`doc-color-picker__opt${c === value ? ' is-active' : ''}`}
                data-color={c}
                title={HIGHLIGHT_COLOR_LABELS[c]}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
              >
                <span className="doc-color-picker__opt-dot" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
