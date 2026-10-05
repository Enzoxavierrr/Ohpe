import { useRef, useState } from 'react';

type Seed = { title?: string; content?: string };

type Props = {
  onCreate: (seed?: Seed) => void;
};

export function NewDocumentMenu({ onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const name = file.name.replace(/\.(md|markdown|txt)$/i, '').trim() || 'Documento importado';
      onCreate({ title: name, content });
      setOpen(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function submitPaste() {
    const content = pasteValue.trim();
    if (!content) return;
    const firstLine = content.split('\n')[0].replace(/^#\s*/, '').slice(0, 60).trim();
    onCreate({ title: firstLine || 'Documento colado', content });
    setPasteValue('');
    setPasting(false);
    setOpen(false);
  }

  return (
    <>
      <div
        className={`doc-card doc-card--new${open ? ' is-open' : ''}`}
        onClick={() => !open && setOpen(true)}
      >
        {!open ? (
          <div className="doc-new__idle">
            <span className="doc-card__plus">+</span>
            <span className="doc-card__name">Novo documento</span>
            <span className="doc-card__meta">Markdown, upload ou colar texto</span>
          </div>
        ) : (
          <div className="doc-new__menu" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="doc-new__opt"
              onClick={() => {
                onCreate();
                setOpen(false);
              }}
            >
              <span className="doc-new__opt-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </span>
              <span className="doc-new__opt-text">
                <strong>Em branco</strong>
                <span>Começar do zero</span>
              </span>
            </button>
            <button
              type="button"
              className="doc-new__opt"
              onClick={() => fileRef.current?.click()}
            >
              <span className="doc-new__opt-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </span>
              <span className="doc-new__opt-text">
                <strong>Importar .md</strong>
                <span>Enviar arquivo markdown</span>
              </span>
            </button>
            <button
              type="button"
              className="doc-new__opt"
              onClick={() => setPasting(true)}
            >
              <span className="doc-new__opt-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="4" rx="1" />
                  <path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
                </svg>
              </span>
              <span className="doc-new__opt-text">
                <strong>Colar texto</strong>
                <span>Jogar markdown ou texto cru</span>
              </span>
            </button>
            <button
              type="button"
              className="doc-new__cancel"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
          </div>
        )}
      </div>

      {pasting && (
        <div className="doc-paste__backdrop" onClick={() => setPasting(false)}>
          <div className="doc-paste__modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="doc-paste__title">Colar texto</h3>
            <p className="doc-paste__hint">
              Cole markdown ou texto cru. A primeira linha vira o título.
            </p>
            <textarea
              className="doc-paste__input"
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              placeholder="# Meu documento&#10;&#10;Escreva aqui..."
              autoFocus
            />
            <div className="doc-paste__actions">
              <button
                type="button"
                className="doc-paste__btn"
                onClick={() => {
                  setPasting(false);
                  setPasteValue('');
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="doc-paste__btn doc-paste__btn--primary"
                onClick={submitPaste}
                disabled={!pasteValue.trim()}
              >
                Criar documento
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
