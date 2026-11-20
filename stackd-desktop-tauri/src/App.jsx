import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import DesktopShell from "./components/layout/DesktopShell";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import SteamCallback from "./pages/auth/SteamCallback";
import SteamRegister from "./pages/auth/SteamRegister";
import DesktopHome from "./pages/DesktopHome";
import Explore from "./pages/Explore";
import GameDetails from "./pages/GameDetails";
import GameStatDetails from "./pages/GameStatDetails";
import Recommendations from "./pages/Recommendations";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import ExploreCollections from "./pages/collections/ExploreCollections";
import CollectionDetails from "./components/collections/CollectionDetails";
import CollectionForm from "./components/collections/CollectionForm";
import ReviewDetails from "./pages/reviews/ReviewDetails";

import ProfileLayout from "./pages/profile/ProfileLayout";
import ProfileGames from "./pages/profile/ProfileGames";
import ProfileActivity from "./pages/profile/ProfileActivity";
import ProfileCollections from "./pages/profile/ProfileCollections";
import ProfileLikes from "./pages/profile/ProfileLikes";
import ProfileLikedGames from "./pages/profile/ProfileLikedGames";
import ProfileLikedCollections from "./pages/profile/ProfileLikedCollections";
import ProfileReviews from "./pages/profile/ProfileReviews";
import ProfileSocial from "./pages/profile/ProfileSocial";
import ProfileStats from "./pages/profile/ProfileStats";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1b1d26",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
            },
          }}
        />
        <Routes>
          {/* Rutas de autenticación y popup de Steam */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/steam" element={<SteamRegister />} />
          <Route path="/auth/steam/callback" element={<SteamCallback />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* App principal en Shell de escritorio */}
          <Route element={<DesktopShell />}>
            <Route path="/" element={<DesktopHome />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/collections" element={<ExploreCollections />} />
            <Route path="/collections/new" element={<CollectionForm />} />
            <Route path="/collections/:id" element={<CollectionDetails />} />
            <Route path="/collections/:id/edit" element={<CollectionForm />} />

            {/* Rutas de detalle de juego con :slug */}
            <Route path="/game/:slug" element={<GameDetails />} />
            <Route path="/game/:slug/:stat" element={<GameStatDetails />} />
            <Route
              path="/profile/:username/reviews/:reviewId"
              element={<ReviewDetails />}
            />

            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />

            {/* Perfil con Layout Anidado */}
            <Route path="/profile/:username" element={<ProfileLayout />}>
              <Route index element={<ProfileStats />} />
              <Route path="stats" element={<ProfileStats />} />
              <Route path="games" element={<ProfileGames />} />
              <Route path="activity" element={<ProfileActivity />} />
              <Route path="collections" element={<ProfileCollections />} />
              <Route path="likes" element={<ProfileLikes />} />
              <Route path="likes/games" element={<ProfileLikedGames />} />
              <Route
                path="likes/collections"
                element={<ProfileLikedCollections />}
              />
              <Route path="reviews" element={<ProfileReviews />} />
              <Route path="social" element={<ProfileSocial />} />
            </Route>
          </Route>

          {/* Fallback a Inicio */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}