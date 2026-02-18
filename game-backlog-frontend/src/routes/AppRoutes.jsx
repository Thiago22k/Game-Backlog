import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Landing from '../pages/Landing';
import Profile from '../pages/Profile';
import Settings from '../pages/Settings';
import Explore from '../pages/Explore';
import GameDetails from '../pages/GameDetails';
import PrivateRoute from './PrivateRoute';
import PublicRoute from './PublicRoute'; // ← Nuevo

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta raíz */}
        <Route path="/" element={<Landing />} />

        {/* Rutas públicas (solo para NO autenticados) */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } 
        />

        {/* Explore público */}
        <Route path="/explore" element={<Explore />} />
        
        {/* Game details público */}
        <Route path="/game/:id" element={<GameDetails />} />

        {/* Rutas protegidas */}
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;