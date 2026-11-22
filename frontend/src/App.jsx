import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './context/ToastProvider';
import { AuthProvider } from './context/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import StorefrontPage from './pages/StorefrontPage';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './pages/DashboardLayout';
import OrdersPage from './pages/OrdersPage';
import MenuPage from './pages/MenuPage';
import TeamPage from './pages/TeamPage';
import SecurityPage from './pages/SecurityPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Customer Storefront & Live Order Tracking */}
              <Route path="/" element={<StorefrontPage />} />

              {/* Authorized Admin & Kitchen Portal */}
              <Route path="/admin/login" element={<LoginPage />} />
              <Route path="/login" element={<Navigate to="/admin/login" replace />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/admin" element={<DashboardLayout />}>
                  <Route index element={<Navigate to="/admin/orders" replace />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="menu" element={<MenuPage />} />
                  <Route element={<ProtectedRoute requireRole="admin" />}>
                    <Route path="team" element={<TeamPage />} />
                    <Route path="security" element={<SecurityPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>
                </Route>
              </Route>

              {/* Backward-compatible route redirects */}
              <Route path="/orders" element={<Navigate to="/admin/orders" replace />} />
              <Route path="/menu" element={<Navigate to="/admin/menu" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
