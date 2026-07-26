import { createContext, useContext } from 'react';

export type NavigateOptions = {
  replace?: boolean;
};

export type Navigate = (path: string, options?: NavigateOptions) => void;

export const NavigationContext = createContext<Navigate | null>(null);

export function useAppNavigate() {
  const navigate = useContext(NavigationContext);
  if (!navigate) {
    throw new Error('useAppNavigate deve ser utilizado dentro de AppRouter.');
  }
  return navigate;
}
