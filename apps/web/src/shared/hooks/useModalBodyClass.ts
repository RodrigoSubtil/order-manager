import { useEffect } from 'react';

export function useModalBodyClass(isOpen: boolean) {
  useEffect(() => {
    document.body.classList.toggle('modal-open', isOpen);
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);
}
