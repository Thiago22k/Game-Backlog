import { useState, useCallback } from 'react';
import axios from '../api/axios';

export const useCollections = () => {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const clearError = () => setError(null);

    // Obtener colecciones de un usuario (por username)
    const getUserCollections = useCallback(async (username, showLoader = true) => {
        if (showLoader) setLoading(true);
        clearError();

        try {
            const response = await axios.get(`/collections/user/${username}`);
            setCollections(response.data.collections);
            return { success: true, data: response.data.collections };
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Error al obtener colecciones';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            if (showLoader) setLoading(false);
        }
    }, []);

    // Obtener detalles de una colección (incluye juegos completos)
    const getCollectionDetails = useCallback(async (collectionId, showLoader = true) => {
        if (showLoader) setLoading(true);
        clearError();

        try {
            const response = await axios.get(`/collections/${collectionId}`);
            return { success: true, data: response.data.collection };
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Error al obtener detalles de la colección';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            if (showLoader) setLoading(false);
        }
    }, []);

    // Crear una nueva colección
    const createCollection = useCallback(async (collectionData) => {
        setLoading(true);
        clearError();

        try {
            const response = await axios.post('/collections', collectionData);
            // Optional: Agregar al principio de la lista actual
            setCollections((prev) => [response.data.collection, ...prev]);
            return { success: true, data: response.data.collection };
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Error al crear la colección';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    }, []);

    // Actualizar una colección
    const updateCollection = useCallback(async (collectionId, collectionData) => {
        setLoading(true);
        clearError();

        try {
            const response = await axios.put(`/collections/${collectionId}`, collectionData);

            // Actualizar en la lista local si existe
            setCollections((prev) =>
                prev.map(c => c.id === parseInt(collectionId) ? { ...c, ...response.data.collection } : c)
            );

            return { success: true, data: response.data.collection };
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Error al actualizar la colección';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    }, []);

    // Eliminar una colección
    const deleteCollection = useCallback(async (collectionId) => {
        setLoading(true);
        clearError();

        try {
            await axios.delete(`/collections/${collectionId}`);
            setCollections((prev) => prev.filter(c => c.id !== parseInt(collectionId)));
            return { success: true };
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Error al eliminar la colección';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    }, []);

    // --- SOCIAL FEATURES ---

    const toggleLike = useCallback(async (collectionId) => {
        try {
            const response = await axios.post(`/collections/${collectionId}/like`);
            return { success: true, data: response.data };
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Error al procesar el like';
            return { success: false, error: errorMsg };
        }
    }, []);

    const getComments = useCallback(async (collectionId) => {
        try {
            const response = await axios.get(`/collections/${collectionId}/comments`);
            return { success: true, data: response.data.comments };
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Error al obtener comentarios';
            return { success: false, error: errorMsg };
        }
    }, []);

    const addComment = useCallback(async (collectionId, content) => {
        try {
            const response = await axios.post(`/collections/${collectionId}/comments`, { content });
            return { success: true, data: response.data.comment };
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Error al añadir comentario';
            return { success: false, error: errorMsg };
        }
    }, []);

    const deleteComment = useCallback(async (collectionId, commentId) => {
        try {
            await axios.delete(`/collections/${collectionId}/comments/${commentId}`);
            return { success: true };
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Error al eliminar comentario';
            return { success: false, error: errorMsg };
        }
    }, []);

    return {
        collections,
        loading,
        error,
        getUserCollections,
        getCollectionDetails,
        createCollection,
        updateCollection,
        deleteCollection,
        toggleLike,
        getComments,
        addComment,
        deleteComment,
        clearError
    };
};
