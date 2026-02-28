const Game = require('../models/game.model');
const igdbService = require('./igdb.service');

const RecommendationService = {
    /**
     * Genera recomendaciones personalizadas para un usuario
     */
    async getRecommendations(userId, limit = 10) {
        try {
            // 1. Obtener juegos del usuario (semillas)
            // Buscamos juegos completados o con rating >= 4
            const userGames = await Game.getUserGames(userId);
            if (userGames.length === 0) {
                // Si no tiene juegos, devolvemos juegos populares como fallback
                return await igdbService.getPopularGames(limit);
            }

            const seedGames = userGames
                .filter(g => (g.rating && g.rating >= 3.5)) // Solo juegos con 3.5+ influyen
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                .slice(0, 5); // Tomamos los 5 mejores como semilla

            if (seedGames.length === 0) {
                return await igdbService.getPopularGames(limit);
            }

            // 2. Enriquecer datos de las semillas con IGDB (necesitamos géneros y similares)
            const seedIds = seedGames.map(g => g.igdb_game_id);
            const enrichedSeeds = await igdbService.getGamesByIds(seedIds);

            // 3. Mapeo de preferencias (PESADO por calificación)
            const genreWeights = {};
            const similarGameWeights = {}; // ID -> accumulated weight

            enrichedSeeds.forEach((game) => {
                // Encontrar la calificación original del usuario para este juego
                const userGame = userGames.find(ug => ug.igdb_game_id === game.id);
                const weight = (userGame?.rating || 0) / 5.0;

                // Ponderar géneros
                if (game.genres) {
                    game.genres.forEach(genre => {
                        genreWeights[genre.id] = (genreWeights[genre.id] || 0) + weight;
                    });
                }

                // Ponderar similares
                if (game.similar_games) {
                    game.similar_games.forEach(sg => {
                        similarGameWeights[sg.id] = (similarGameWeights[sg.id] || 0) + weight;
                    });
                }
            });

            // Obtener top 3 géneros por peso acumulado
            const topGenres = Object.entries(genreWeights)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(entry => parseInt(entry[0]));

            // 4. Obtener candidatos
            const [similarCandidates, genreCandidates] = await Promise.all([
                igdbService.getRecommendationsCandidates({ gameIds: Object.keys(similarGameWeights).map(Number).slice(0, 20) }),
                igdbService.getRecommendationsCandidates({ genreIds: topGenres, limit: 30 })
            ]);

            // 5. Combinar y filtrar
            const allLibraryIds = new Set(userGames.map(g => g.igdb_game_id));
            const combined = [...similarCandidates, ...genreCandidates];

            const seen = new Set();
            const filtered = combined.filter(game => {
                if (allLibraryIds.has(game.id)) return false;
                if (seen.has(game.id)) return false;
                seen.add(game.id);
                return true;
            });

            // 6. Ordenar por relevancia (Fórmula Híbrida)
            const result = filtered
                .map(game => {
                    let score = game.rating || 0;

                    // Bonus por similitud (ponderado)
                    const simWeight = similarGameWeights[game.id] || 0;
                    score += simWeight * 50;

                    // Bonus por géneros (ponderado)
                    if (game.genres) {
                        game.genres.forEach(g => {
                            const gWeight = genreWeights[g.id] || 0;
                            score += gWeight * 10;
                        });
                    }

                    return { ...game, recommendation_score: score };
                })
                .sort((a, b) => b.recommendation_score - a.recommendation_score)
                .slice(0, limit);

            return result;

        } catch (error) {
            console.error('❌ Error en RecommendationService:', error.message);
            // Fallback a populares si algo falla
            return await igdbService.getPopularGames(limit);
        }
    }
};

module.exports = RecommendationService;
