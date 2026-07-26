import { useCallback, useEffect, useMemo, useState } from 'react';

import OrdersPage from '../../features/orders/pages/OrdersPage';
import SettingsPage from '../../features/settings/pages/SettingsPage';
import { NavigationContext, type Navigate } from './navigation';

export function AppRouter() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback<Navigate>((path, options) => {
    const target = new URL(path, window.location.origin);
    const method = options?.replace ? 'replaceState' : 'pushState';
    window.history[method](null, '', `${target.pathname}${target.search}${target.hash}`);
    setPathname(target.pathname);
  }, []);

  const page = useMemo(
    () => (pathname === '/settings' ? <SettingsPage /> : <OrdersPage />),
    [pathname],
  );

  return <NavigationContext.Provider value={navigate}>{page}</NavigationContext.Provider>;
}
