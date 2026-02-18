import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-navy">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  // Si está autenticado, redirigir a home
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Si no está autenticado, mostrar la página (Login/Register)
  return children;
};

export default PublicRoute;