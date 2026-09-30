import { useEffect, useState } from 'react';
import '../styles/splash.css';

const TILES = 5;

type Props = {
  onDone: () => void;
};

export function SplashScreen({ onDone }: Props) {
  const [active, setActive] = useState(true);

  useEffect(() => {
    // hold the loader open while the mark + name animate in
    const closeAt = window.setTimeout(() => setActive(false), 2500);
    // total exit: last tile delay (4 * 0.2s) + transition (0.7s) = 1.5s
    const doneAt = window.setTimeout(onDone, 4000);
    return () => {
      window.clearTimeout(closeAt);
      window.clearTimeout(doneAt);
    };
  }, [onDone]);

  return (
    <div
      className={`loader ${active ? 'loader--active' : ''}`}
      role="status"
      aria-label="Carregando Ohpe"
      aria-hidden={!active || undefined}
    >
      {Array.from({ length: TILES }, (_, i) => (
        <div key={i} className="loader__tile" />
      ))}

      <div className="loader__icon">
        <svg
          className="loader__mark"
          viewBox="0 0 256 256"
          width="112"
          height="112"
          fill="none"
          stroke="#1f1f20"
          strokeWidth="32"
          strokeLinecap="round"
        >
          <path id="ohpe-splash-arc" d="M 128 44 A 84 84 0 1 0 212 128" />
        </svg>
        <span className="loader__name" aria-hidden="true">Ohpe</span>
      </div>
    </div>
  );
}
