import { useEffect, useState } from 'react';
import '../styles/route-wipe.css';

const DURATION_MS = 420;

export function RouteWipeOverlay() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDone(true), DURATION_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (done) return null;

  return (
    <div className="route-wipe" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="route-wipe__tile"
          style={{ ['--i' as any]: i }}
        />
      ))}
    </div>
  );
}
