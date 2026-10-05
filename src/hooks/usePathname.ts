import { useEffect, useState } from 'react';

export function usePathname(): string {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window === 'undefined' ? '/' : window.location.pathname,
  );

  useEffect(() => {
    const update = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', update);
    window.addEventListener('ohpe:navigate', update as EventListener);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('ohpe:navigate', update as EventListener);
    };
  }, []);

  return pathname;
}

export function navigate(to: string) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === to) return;
  window.history.pushState(null, '', to);
  window.dispatchEvent(new Event('ohpe:navigate'));
}
