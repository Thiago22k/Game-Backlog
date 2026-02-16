import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Landing from '../pages/Landing';
import Profile from '../pages/Profile';
import Settings from '../pages/Settings';
import Explore from '../pages/Explore'; // ← Nueva importación
import PrivateRoute from './PrivateRoute';
import GameDetails from '../pages/GameDetails';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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

        {/* Nueva ruta de Explore */}
        
        <Route path="/explore" element={<Explore />} />

        <Route path="*" element={<Navigate to="/" replace />} />

        <Route
          path="/explore"
          element={
            <PrivateRoute>
              <Explore />
            </PrivateRoute>
          }
        />

        <Route path="/game/:id" element={<GameDetails />} />

      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;