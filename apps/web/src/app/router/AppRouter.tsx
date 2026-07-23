import { BrowserRouter, Route, Routes } from 'react-router-dom';

import OrdersPage from '../../features/orders/pages/OrdersPage';
import SettingsPage from '../../features/settings/pages/SettingsPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<OrdersPage />} />
      </Routes>
    </BrowserRouter>
  );
}
