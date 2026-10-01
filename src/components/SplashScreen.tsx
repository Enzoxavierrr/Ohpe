import { useEffect, useState } from 'react';
import '../styles/splash.css';

const TILES = 5;

type Props = {
  onDone: () => void;
};

const LETTERS = ['O', 'h', 'p', 'e'];

export function SplashScreen({ onDone }: Props) {
  const [active, setActive] = useState(true);

  useEffect(() => {
    const closeAt = window.setTimeout(() => setActive(false), 3800);
    const doneAt = window.setTimeout(onDone, 5300);
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
          stroke="currentColor"
          strokeWidth="32"
          strokeLinecap="round"
        >
          <path id="ohpe-splash-arc" d="M 128 44 A 84 84 0 1 0 212 128" />
          <g transform="translate(128 128)">
            <g className="loader__orbit">
              <circle cx="84" cy="0" r="6" fill="currentColor" stroke="none" />
            </g>
            <g className="loader__orbit loader__orbit--2">
              <circle cx="84" cy="0" r="4" fill="currentColor" stroke="none" />
            </g>
            <g className="loader__orbit loader__orbit--3">
              <circle cx="84" cy="0" r="3" fill="currentColor" stroke="none" />
            </g>
          </g>
        </svg>
        <span className="loader__name" aria-hidden="true">
          {LETTERS.map((ch, i) => (
            <span
              key={i}
              className="loader__letter"
              style={{ ['--i' as any]: i }}
            >
              {ch}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
