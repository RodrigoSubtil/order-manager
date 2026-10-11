import { useEffect, useState } from 'react';

export function useMinuteClock(enabled: boolean) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!enabled) return;
    let timer: number;
    const tick = () => {
      window.clearTimeout(timer);
      setNow(Date.now());
      timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000));
    };
    const onVisibility = () => {
      if (!document.hidden) tick();
    };
    tick();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);
  return now;
}
