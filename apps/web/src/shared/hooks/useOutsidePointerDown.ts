import { useEffect, useRef } from 'react';

export function useOutsidePointerDown(onOutside: () => void, ignoreSelector: string) {
  const onOutsideRef = useRef(onOutside);

  useEffect(() => {
    onOutsideRef.current = onOutside;
  }, [onOutside]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Element && event.target.closest(ignoreSelector)) return;
      onOutsideRef.current();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [ignoreSelector]);
}
