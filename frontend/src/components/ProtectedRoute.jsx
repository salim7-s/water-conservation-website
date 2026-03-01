import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const authenticated = isAuthenticated();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}


