import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ requireRole = undefined } = {}) {
  const { token, user, verifying } = useAuth();
  const location = useLocation();

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-sm text-ink-muted">Verifying session…</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  if (requireRole && user?.role !== requireRole) {
    return <Navigate to="/admin/orders" replace />;
  }

  return <Outlet />;
}
