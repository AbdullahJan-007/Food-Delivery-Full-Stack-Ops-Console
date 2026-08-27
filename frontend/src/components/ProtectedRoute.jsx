import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Wraps any branch of the route tree that needs a signed-in user. No token,
// no render — sent straight to /login instead, carrying along the page they
// were headed to so LoginPage can send them back after signing in. Nested
// routes render through <Outlet />, so this composes cleanly with
// DashboardLayout underneath it.
export default function ProtectedRoute() {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
