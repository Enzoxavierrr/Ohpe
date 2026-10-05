import { useEffect, useRef } from 'react';
import { navigate } from '../hooks/usePathname';
import '../styles/notfound.css';

const GHOSTS = [1, 2, 3, 4, 5];

export function NotFoundPage() {
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const px = (e.clientX / window.innerWidth - 0.5) * 2;
        const py = (e.clientY / window.innerHeight - 0.5) * 2;
        el.style.setProperty('--px', px.toFixed(4));
        el.style.setProperty('--py', py.toFixed(4));
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="nf-shell" ref={shellRef}>
      <div className="nf-bg" aria-hidden="true">
        <div className="nf-grid" />
        <div className="nf-glow" />
        <div className="nf-scan" />
        <div className="nf-ghosts">
          {GHOSTS.map((n) => (
            <span key={n} className={`nf-ghost nf-ghost--${n}`} />
          ))}
        </div>
      </div>

      <main className="nf-content">
        <div className="nf-code">
          <span className="nf-digit nf-digit--a" aria-hidden="true">4</span>

          <span className="nf-arc" aria-hidden="true">
            <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="26" strokeLinecap="round">
              <circle className="nf-arc-track" cx="128" cy="128" r="84" />
              <path className="nf-arc-path" d="M 128 44 A 84 84 0 1 0 212 128" />
            </svg>
          </span>

          <span className="nf-digit nf-digit--b" aria-hidden="true">4</span>
          <span className="nf-sr">404</span>
        </div>

        <h1 className="nf-title">Essa página não existe</h1>
        <p className="nf-subtitle">
          O link pode ter mudado de lugar, ou nunca esteve aqui.
          Seus boards continuam intactos.
        </p>

        <div className="nf-actions">
          <button type="button" className="nf-cta" onClick={() => navigate('/')}>
            <span className="nf-cta__label">Voltar ao início</span>
            <svg className="nf-cta__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </button>

          <button type="button" className="nf-ghost-btn" onClick={() => navigate('/documentos')}>
            Ir para documentos
          </button>
        </div>
      </main>
    </div>
  );
}
