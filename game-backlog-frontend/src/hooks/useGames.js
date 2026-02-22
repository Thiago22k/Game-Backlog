import { useState } from 'react';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';

export const useGames = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isProfilePublic, setIsProfilePublic] = useState(true);

  // Obtener juegos del usuario (puede ser propio o de otro por username)
  const getUserGames = async (username = null, status = null, showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);

    try {
      let url = username
        ? `${ENDPOINTS.GAMES.USER_GAMES}/${username}`
        : ENDPOINTS.GAMES.USER_GAMES;

      if (status) {
        url += `?status=${status}`;
      }

      const response = await axios.get(url);
      setGames(response.data.games);
      if (response.data.is_profile_public !== undefined) {
        setIsProfilePublic(response.data.is_profile_public);
      }
      return { success: true, data: response.data.games, isProfilePublic: response.data.is_profile_public };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al obtener juegos';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // Buscar juegos en IGDB
  const searchGames = async (query) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${ENDPOINTS.GAMES.SEARCH}?query=${encodeURIComponent(query)}`);
      return { success: true, data: response.data.games };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al buscar juegos';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Agregar juego a la lista del usuario
  const addGame = async (igdbGameId, status = 'completed', rating = null) => {
    setError(null);

    try {
      const body = { igdb_game_id: igdbGameId, status };
      if (rating) body.rating = rating;

      const response = await axios.post(ENDPOINTS.GAMES.USER_GAMES, body);

      // Después de agregar, refrescar la lista en segundo plano (sin loading)
      await getUserGames(null, false);

      return { success: true, data: response.data.game };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al agregar juego';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Actualizar juego del usuario
  const updateGame = async (userGameId, status = null, rating = null) => {
    setError(null);

    try {
      const body = {};
      if (status !== null) body.status = status;
      if (rating !== null) body.rating = rating;

      const response = await axios.put(`${ENDPOINTS.GAMES.USER_GAMES}/${userGameId}`, body);

      // Después de actualizar, refrescar la lista en segundo plano (sin loading)
      await getUserGames(null, false);

      return { success: true, data: response.data.game };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al actualizar juego';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Eliminar juego del usuario
  const deleteGame = async (igdbGameId) => {
    setError(null);

    try {
      await axios.delete(`${ENDPOINTS.GAMES.USER_GAMES}/${igdbGameId}`);
      // Actualizar lista local eliminando el juego usando estado previo
      setGames(prev => prev.filter(game => game.igdb_game_id !== igdbGameId));
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al eliminar juego';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  return {
    games,
    userGames: games, // Alias para compatibilidad con Landing.jsx
    loading,
    error,
    isProfilePublic,
    getUserGames,
    searchGames,
    addGame,
    updateGame,
    deleteGame,
  };
};