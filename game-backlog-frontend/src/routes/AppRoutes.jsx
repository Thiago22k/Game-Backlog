import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import Landing from '../pages/Landing';
import ProfileLayout from '../pages/profile/ProfileLayout';
import ProfileGames from '../pages/profile/ProfileGames';
import ProfileStats from '../pages/profile/ProfileStats';
import ProfileCollections from '../pages/profile/ProfileCollections';
import ProfileActivity from '../pages/profile/ProfileActivity';
import CollectionForm from '../components/collections/CollectionForm';
import CollectionDetails from '../components/collections/CollectionDetails';
import Settings from '../pages/Settings';
import Explore from '../pages/Explore';
import ExploreCollections from '../pages/collections/ExploreCollections';
import GameDetails from '../pages/GameDetails';
import NotFound from '../pages/NotFound';
import PrivateRoute from './PrivateRoute';
import PublicRoute from './PublicRoute';

const ProfileRedirect = () => {
  const { user, isAuthenticated } = useAuth();
  if (isAuthenticated && user?.username) {
    return <Navigate to={`/profile/${user.username}`} replace />;
  }
  return <Navigate to="/login" replace />;
};

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

        {/* Explore públicos */}
        <Route path="/explore" element={<Explore />} />
        <Route path="/collections" element={<ExploreCollections />} />

        {/* Game details público */}
        <Route path="/game/:slug" element={<GameDetails />} />

        {/* Collection details público (la vista decide si permite o no basado en privacidad) */}
        <Route path="/collections/:id" element={<CollectionDetails />} />

        {/* Rutas protegidas */}
        <Route path="/profile" element={<ProfileRedirect />} />

        {/* Profile Routes con Layout Anidado */}
        <Route path="/profile/:username" element={<ProfileLayout />}>
          <Route index element={<ProfileStats />} />
          <Route path="games" element={<ProfileGames />} />
          <Route path="collections" element={<ProfileCollections />} />
          <Route path="activity" element={<ProfileActivity />} />
        </Route>

        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />

        <Route
          path="/collections/new"
          element={
            <PrivateRoute>
              <CollectionForm />
            </PrivateRoute>
          }
        />

        <Route
          path="/collections/:id/edit"
          element={
            <PrivateRoute>
              <CollectionForm />
            </PrivateRoute>
          }
        />

        {/* 404 Not Found Page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;