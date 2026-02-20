import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // ← Importar
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import Landing from '../pages/Landing';
import Profile from '../pages/Profile';
import Settings from '../pages/Settings';
import Explore from '../pages/Explore';
import GameDetails from '../pages/GameDetails';
import PrivateRoute from './PrivateRoute';
import PublicRoute from './PublicRoute';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      {/* Toaster global */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1a2332', // primary-navy-dark
            color: '#fff',
            border: '1px solid #fbbf24', // primary-yellow
          },
          success: {
            iconTheme: {
              primary: '#fbbf24', // primary-yellow
              secondary: '#1a2332',
            },
          },
        }}
      />

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
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
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