import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

type Props = {
  onAdd: (title: string) => void;
};

export function NewCardForm({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function commit() {
    const t = title.trim();
    if (t) onAdd(t);
    setTitle('');
    setOpen(false);
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      setTitle('');
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="add-card-tile"
        onClick={() => setOpen(true)}
        aria-label="Adicionar card"
      >
        <span className="add-card-plus" aria-hidden="true">+</span>
      </button>
    );
  }

  return (
    <div className="add-card-editing">
      <textarea
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        rows={2}
        placeholder="Escreva a nota…"
      />
    </div>
  );
}
