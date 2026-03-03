import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import PrivateRoute from './PrivateRoute';
import PublicRoute from './PublicRoute';
import AdminRoute from '../components/routing/AdminRoute';

const Login = lazy(() => import('../pages/auth/Login'));
const Register = lazy(() => import('../pages/auth/Register'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword'));
const Landing = lazy(() => import('../pages/Landing'));
const ProfileLayout = lazy(() => import('../pages/profile/ProfileLayout'));
const ProfileStats = lazy(() => import('../pages/profile/ProfileStats'));
const ProfileGames = lazy(() => import('../pages/profile/ProfileGames'));
const ProfileCollections = lazy(() => import('../pages/profile/ProfileCollections'));
const ProfileReviews = lazy(() => import('../pages/profile/ProfileReviews'));
const ProfileActivity = lazy(() => import('../pages/profile/ProfileActivity'));
const ProfileLikes = lazy(() => import('../pages/profile/ProfileLikes'));
const ProfileSocial = lazy(() => import('../pages/profile/ProfileSocial'));
const ProfileLikedGames = lazy(() => import('../pages/profile/ProfileLikedGames'));
const ProfileLikedCollections = lazy(() => import('../pages/profile/ProfileLikedCollections'));
const CollectionForm = lazy(() => import('../components/collections/CollectionForm'));
const CollectionDetails = lazy(() => import('../components/collections/CollectionDetails'));
const Settings = lazy(() => import('../pages/Settings'));
const Explore = lazy(() => import('../pages/Explore'));
const ExploreCollections = lazy(() => import('../pages/collections/ExploreCollections'));
const GameDetails = lazy(() => import('../pages/GameDetails'));
const GameStatDetails = lazy(() => import('../pages/GameStatDetails'));
const ReviewDetails = lazy(() => import('../pages/reviews/ReviewDetails'));
const NotFound = lazy(() => import('../pages/NotFound'));
const Notifications = lazy(() => import('../pages/Notifications'));
const TermsOfService = lazy(() => import('../pages/TermsOfService'));
const LegalPrivacy = lazy(() => import('../pages/LegalPrivacy'));
const AdminDashboard = lazy(() => import('../pages/moderation/AdminDashboard'));

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

      <Suspense fallback={
        <div className="flex justify-center flex-col items-center h-screen bg-primary-navy">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-yellow border-t-transparent mb-4"></div>
        </div>
      }>
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
          <Route path="/game/:slug/:stat" element={<GameStatDetails />} />
          <Route path="/profile/:username/reviews/:reviewId" element={<ReviewDetails />} />

          {/* Collection details público (la vista decide si permite o no basado en privacidad) */}
          <Route path="/collections/:id" element={<CollectionDetails />} />

          {/* Rutas protegidas */}
          <Route path="/profile" element={<ProfileRedirect />} />

          {/* Profile Routes con Layout Anidado */}
          <Route path="/profile/:username" element={<ProfileLayout />}>
            <Route index element={<ProfileStats />} />
            <Route path="games" element={<ProfileGames />} />
            <Route path="collections" element={<ProfileCollections />} />
            <Route path="reviews" element={<ProfileReviews />} />
            <Route path="activity" element={<ProfileActivity />} />
            <Route path="likes" element={<ProfileLikes />} />
            <Route path="likes/games" element={<ProfileLikedGames />} />
            <Route path="likes/collections" element={<ProfileLikedCollections />} />
            <Route path="social" element={<ProfileSocial />} />
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

          <Route
            path="/notifications"
            element={
              <PrivateRoute>
                <Notifications />
              </PrivateRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          {/* Legal Pages */}
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<LegalPrivacy />} />

          {/* 404 Not Found Page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRoutes;