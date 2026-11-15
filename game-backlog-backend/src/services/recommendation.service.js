const pool = require('../config/database');
const Game = require('../models/game.model');
const igdbService = require('./igdb.service');
const steamSpyService = require('./steamspy.service');

const VALID_MODES = new Set(['for_you', 'hidden_gems', 'backlog', 'because_you_played']);

const STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'your', 'you', 'are', 'will',
    'can', 'has', 'have', 'was', 'were', 'been', 'their', 'they', 'them', 'its', 'more', 'most',
    'other', 'such', 'than', 'then', 'when', 'where', 'which', 'while', 'who', 'all', 'any',
    'both', 'each', 'few', 'some', 'own', 'same', 'too', 'very', 'just', 'also', 'new', 'one',
    'two', 'first', 'world', 'game', 'games', 'player', 'players', 'play', 'playing', 'experience',
    'features', 'mode', 'modes', 'story', 'set', 'take', 'make', 'way', 'through', 'over', 'out',
]);

const parseIdList = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    return String(val)
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
};

const extractTerms = (game) => {
    const terms = new Set();
    const text = `${game.name || ''} ${game.summary || ''} ${(game.keywords || []).map((k) => k.name).join(' ')}`;
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
    for (const w of words) {
        if (w.length >= 4 && !STOP_WORDS.has(w)) {
            terms.add(w);
        }
    }
    return terms;
};

const computeTextOverlap = (anchorTerms, candidateGame) => {
    if (!anchorTerms || anchorTerms.size === 0) return 0;
    const candTerms = extractTerms(candidateGame);
    if (candTerms.size === 0) return 0;
    let matches = 0;
    for (const t of candTerms) {
        if (anchorTerms.has(t)) matches++;
    }
    return matches;
};

// Similitud coseno ponderada por votos entre dos mapas { tag: weight }
const weightedTagSimilarity = (weightsA = {}, weightsB = {}) => {
    const keysA = Object.keys(weightsA);
    const keysB = Object.keys(weightsB);
    if (keysA.length === 0 || keysB.length === 0) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (const k of keysA) {
        const wa = weightsA[k] || 0;
        normA += wa * wa;
        if (weightsB[k]) dot += wa * weightsB[k];
    }
    for (const k of keysB) {
        const wb = weightsB[k] || 0;
        normB += wb * wb;
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Calcula el peso de señal [-1.0 .. +2.2] de un juego del usuario
const computeSignalWeight = (ug, isLiked, inCollectionCount) => {
    const rating = ug.rating !== null && ug.rating !== undefined ? Number(ug.rating) : null;
    const playtimeMin = Number(ug.playtime_minutes || 0);

    if (ug.status === 'dropped' || (rating !== null && rating <= 2.0)) {
        return rating !== null && rating <= 1.5 ? -0.9 : -0.55;
    }

    let weight = 0;

    if (rating !== null) {
        if (rating >= 3.0) {
            weight += 0.35 + (rating - 3.0) * 0.575;
        } else {
            weight -= 0.25;
        }
    } else {
        if (ug.status === 'completed') weight += 0.85;
        else if (ug.status === 'playing') weight += 0.6;
        else if (ug.status === 'wishlist') weight += 0.3;
        else if (ug.status === 'backlog') weight += 0.15;
    }

    if (playtimeMin >= 120) {
        const hours = playtimeMin / 60;
        weight += Math.min(0.55, Math.log10(hours) * 0.28);
    }

    if (isLiked) weight += 0.45;
    if (inCollectionCount > 0) weight += Math.min(0.35, inCollectionCount * 0.15);

    return Math.max(-1.0, Math.min(2.2, weight));
};

const buildReasons = (game, context) => {
    const reasons = [];
    const candTax = context.taxonomyMap.get(Number(game.id));

    // 1. Subgénero + Ambientación exacta de SteamSpy (ej. "Souls-like • Dark Fantasy" o "Hunting • Nature")
    if (candTax) {
        const matchedSub = candTax.subgenres.find((s) => context.topSubgenres.has(s));
        const matchedSet = candTax.settings.find((s) => context.topSettings.has(s));
        const matchedMech = candTax.mechanics.find((m) => context.topMechanics.has(m));

        if (matchedSub && matchedSet) {
            reasons.push(`${matchedSub} • ${matchedSet}`);
        } else if (matchedSub && matchedMech) {
            reasons.push(`${matchedSub} • ${matchedMech}`);
        } else if (matchedSub) {
            reasons.push(matchedSub);
        } else if (matchedSet && matchedMech) {
            reasons.push(`${matchedSet} • ${matchedMech}`);
        }
    }

    // 2. Similitud directa con semilla
    const simSeeds = context.similarToNames.get(game.id);
    if (simSeeds && simSeeds.length > 0 && reasons.length < 2) {
        reasons.push(`Similar to ${simSeeds[0]}`);
    }

    // 3. Misma franquicia / saga
    const franchiseName =
        game.franchises?.find((f) => context.favoriteFranchises.has(f.id))?.name ||
        (game.collection && context.favoriteCollections.has(game.collection.id) ? game.collection.name : null);
    if (franchiseName && reasons.length < 2) {
        reasons.push(`Part of ${franchiseName}`);
    }

    // 4. Fallback a género/tema IGDB si aún no hay razón
    if (reasons.length === 0) {
        const matchedGenre = game.genres?.find((g) => context.topGenreIds.has(g.id))?.name;
        const matchedTheme = game.themes?.find((t) => context.topThemeIds.has(t.id))?.name;
        if (matchedGenre && matchedTheme) reasons.push(`${matchedGenre} • ${matchedTheme}`);
        else if (matchedGenre) reasons.push(`Matches ${matchedGenre}`);
    }

    if (context.mode === 'backlog') {
        reasons.unshift('Ready in your backlog');
    } else if (context.mode === 'hidden_gems' && reasons.length < 2) {
        reasons.push('Critically acclaimed hidden gem');
    }

    return [...new Set(reasons)].slice(0, 2);
};

const RecommendationService = {
    async getRecommendations(userId, rawOptions = {}) {
        const limit = Math.min(Math.max(Number(rawOptions.limit) || 12, 1), 40);
        const mode = VALID_MODES.has(rawOptions.mode) ? rawOptions.mode : 'for_you';
        const seedGameId = rawOptions.seedGameId ? Number(rawOptions.seedGameId) : null;

        const filters = {
            genres: parseIdList(rawOptions.genres),
            excludeGenres: parseIdList(rawOptions.excludeGenres),
            themes: parseIdList(rawOptions.themes),
            platforms: parseIdList(rawOptions.platforms),
            gameModes: parseIdList(rawOptions.gameModes),
            minYear: rawOptions.minYear ? Number(rawOptions.minYear) : null,
            maxYear: rawOptions.maxYear ? Number(rawOptions.maxYear) : null,
            minRating:
                rawOptions.minRating !== undefined && rawOptions.minRating !== ''
                    ? Number(rawOptions.minRating)
                    : null,
        };

        try {
            // 1. Cargar señales del usuario en PostgreSQL
            const [userGames, likesRes, collsRes, ignoredSteamRes] = userId
                ? await Promise.all([
                    Game.getUserGames(userId),
                    pool.query('SELECT igdb_game_id FROM game_likes WHERE user_id = $1', [userId]),
                    pool.query(
                        `SELECT cg.igdb_game_id, COUNT(*)::int AS cnt
               FROM collection_games cg
               JOIN collections c ON c.id = cg.collection_id
               WHERE c.user_id = $1
               GROUP BY cg.igdb_game_id`,
                        [userId]
                    ),
                    pool.query(
                        `SELECT sim.igdb_game_id
               FROM steam_library sl
               JOIN steam_igdb_map sim ON sim.steam_appid = sl.steam_appid
               WHERE sl.user_id = $1 AND sl.ignored = true AND sim.igdb_game_id IS NOT NULL`,
                        [userId]
                    ),
                ])
                : [[], { rows: [] }, { rows: [] }, { rows: [] }];

            const likedSet = new Set(likesRes.rows.map((r) => Number(r.igdb_game_id)));
            const collectionCounts = new Map(collsRes.rows.map((r) => [Number(r.igdb_game_id), Number(r.cnt)]));
            const ignoredIgdbSet = new Set(ignoredSteamRes.rows.map((r) => Number(r.igdb_game_id)));
            const hasSteamSignals = userGames.some((g) => g.source === 'steam' || Number(g.playtime_minutes || 0) > 0);

            if (userGames.length === 0 && likedSet.size === 0 && !seedGameId) {
                const fallback = await igdbService.getPopularGames(limit);
                return {
                    mode,
                    profile_summary: {
                        seed_count: 0,
                        top_genres: [],
                        top_themes: [],
                        top_subgenres: [],
                        top_settings: [],
                        has_steam_signals: false,
                    },
                    games: fallback.map((g) => ({ ...g, match_percent: null, reasons: ['Popular on Stackd'] })),
                };
            }

            const isAnchorMode = mode === 'because_you_played' && Boolean(seedGameId);

            // 2. Ponderar señales positivas y negativas
            const weightedEntries = userGames.map((ug) => {
                const id = Number(ug.igdb_game_id);
                return {
                    ...ug,
                    igdb_game_id: id,
                    signalWeight: computeSignalWeight(ug, likedSet.has(id), collectionCounts.get(id) || 0),
                };
            });

            const inLibrarySet = new Set(weightedEntries.map((e) => e.igdb_game_id));
            for (const likedId of likedSet) {
                if (!inLibrarySet.has(likedId)) {
                    weightedEntries.push({
                        igdb_game_id: likedId,
                        status: 'liked',
                        rating: null,
                        playtime_minutes: 0,
                        signalWeight: 0.9,
                    });
                }
            }

            const positiveSeeds = weightedEntries
                .filter((e) => e.signalWeight > 0.25)
                .sort((a, b) => b.signalWeight - a.signalWeight)
                .slice(0, 14);

            const negativeSeeds = weightedEntries
                .filter((e) => e.signalWeight < -0.3)
                .sort((a, b) => a.signalWeight - b.signalWeight)
                .slice(0, 6);

            const idsToEnrich = [
                ...new Set([
                    ...(seedGameId ? [seedGameId] : []),
                    ...positiveSeeds.map((s) => s.igdb_game_id),
                    ...negativeSeeds.map((s) => s.igdb_game_id),
                ]),
            ];

            // Enriquecer en paralelo IGDB + Taxonomía SteamSpy (4 dimensiones ponderadas por votos)
            const [enrichedList, seedTaxonomyMap] = await Promise.all([
                igdbService.getGamesByIds(idsToEnrich),
                steamSpyService.getTaxonomyForIgdbGames(idsToEnrich, {
                    enqueueMissing: true,
                    maxEnqueue: 10,
                    blockingSeedIgdbId: isAnchorMode ? seedGameId : null,
                }),
            ]);

            const enrichedById = new Map(enrichedList.map((g) => [Number(g.id), g]));
            const anchorMeta = seedGameId ? enrichedById.get(seedGameId) : null;
            const anchorTax = seedGameId ? seedTaxonomyMap.get(seedGameId) : null;
            const anchorTerms = anchorMeta ? extractTerms(anchorMeta) : null;

            // 3. Construir vectores de afinidad (IGDB + 4 dimensiones de SteamSpy)
            const genreWeights = new Map();
            const genreNames = new Map();
            const themeWeights = new Map();
            const themeNames = new Map();
            const modeWeights = new Map();
            const perspectiveWeights = new Map();
            const favoriteFranchises = new Set();
            const favoriteCollections = new Set();
            const similarGameWeights = new Map();
            const similarToNames = new Map();

            // Vectores SteamSpy por dimensión (ponderados por votos * señal del usuario)
            const spySubgenreScores = new Map();
            const spyMechanicScores = new Map();
            const spySettingScores = new Map();
            const spyGenreScores = new Map();

            const accumulateMap = (map, key, delta) => {
                map.set(key, (map.get(key) || 0) + delta);
            };

            const activeSeeds = isAnchorMode
                ? anchorMeta
                    ? [{ igdb_game_id: seedGameId, signalWeight: 2.0 }]
                    : []
                : positiveSeeds;

            for (const seed of activeSeeds) {
                const meta = enrichedById.get(seed.igdb_game_id);
                if (!meta) continue;
                const w = seed.signalWeight;

                for (const g of meta.genres || []) {
                    accumulateMap(genreWeights, g.id, w);
                    genreNames.set(g.id, g.name);
                }
                for (const t of meta.themes || []) {
                    accumulateMap(themeWeights, t.id, w * 0.95);
                    themeNames.set(t.id, t.name);
                }
                for (const m of meta.game_modes || []) {
                    accumulateMap(modeWeights, m.id, w * 0.5);
                }
                for (const p of meta.player_perspectives || []) {
                    accumulateMap(perspectiveWeights, p.id, w * 0.45);
                }
                for (const f of meta.franchises || []) {
                    if (w >= 0.85) favoriteFranchises.add(f.id);
                }
                if (meta.collection?.id && w >= 0.85) {
                    favoriteCollections.add(meta.collection.id);
                }
                for (const sg of meta.similar_games || []) {
                    const sgId = typeof sg === 'object' ? Number(sg.id) : Number(sg);
                    if (!sgId) continue;
                    accumulateMap(similarGameWeights, sgId, w * 1.5);
                    if (!similarToNames.has(sgId)) similarToNames.set(sgId, []);
                    if (!similarToNames.get(sgId).includes(meta.name)) {
                        similarToNames.get(sgId).push(meta.name);
                    }
                }

                // Acumular las 4 dimensiones de SteamSpy ponderadas por votos
                const tax = seedTaxonomyMap.get(seed.igdb_game_id);
                if (tax) {
                    for (const [tag, tw] of Object.entries(tax.weights.subgenres)) {
                        accumulateMap(spySubgenreScores, tag, w * tw);
                    }
                    for (const [tag, tw] of Object.entries(tax.weights.mechanics)) {
                        accumulateMap(spyMechanicScores, tag, w * tw);
                    }
                    for (const [tag, tw] of Object.entries(tax.weights.settings)) {
                        accumulateMap(spySettingScores, tag, w * tw);
                    }
                    for (const [tag, tw] of Object.entries(tax.weights.genres)) {
                        accumulateMap(spyGenreScores, tag, w * tw);
                    }
                }
            }

            if (isAnchorMode) {
                for (const seed of positiveSeeds) {
                    if (seed.igdb_game_id === seedGameId) continue;
                    const meta = enrichedById.get(seed.igdb_game_id);
                    if (!meta) continue;
                    const w = seed.signalWeight * 0.25;
                    for (const g of meta.genres || []) accumulateMap(genreWeights, g.id, w);
                    for (const t of meta.themes || []) accumulateMap(themeWeights, t.id, w);
                }
            } else {
                for (const neg of negativeSeeds) {
                    const meta = enrichedById.get(neg.igdb_game_id);
                    if (!meta) continue;
                    const w = neg.signalWeight;
                    for (const g of meta.genres || []) accumulateMap(genreWeights, g.id, w * 0.6);
                    for (const t of meta.themes || []) accumulateMap(themeWeights, t.id, w * 0.7);
                    const negTax = seedTaxonomyMap.get(neg.igdb_game_id);
                    if (negTax) {
                        for (const [tag, tw] of Object.entries(negTax.weights.subgenres)) {
                            accumulateMap(spySubgenreScores, tag, w * tw * 0.8);
                        }
                        for (const [tag, tw] of Object.entries(negTax.weights.settings)) {
                            accumulateMap(spySettingScores, tag, w * tw * 0.7);
                        }
                    }
                }
            }

            const sortedGenres = [...genreWeights.entries()].filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]);
            const sortedThemes = [...themeWeights.entries()].filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]);
            const sortedSubgenres = [...spySubgenreScores.entries()].filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]);
            const sortedMechanics = [...spyMechanicScores.entries()].filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]);
            const sortedSettings = [...spySettingScores.entries()].filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]);

            const topGenreIds = sortedGenres.slice(0, 4).map(([id]) => id);
            const topThemeIds = sortedThemes.slice(0, 4).map(([id]) => id);

            const profileSummary = {
                seed_count: activeSeeds.length,
                top_genres: sortedGenres.slice(0, 3).map(([id]) => ({ id, name: genreNames.get(id) || 'Genre' })),
                top_themes: sortedThemes.slice(0, 3).map(([id]) => ({ id, name: themeNames.get(id) || 'Theme' })),
                top_subgenres: sortedSubgenres.slice(0, 3).map(([name]) => name),
                top_settings: sortedSettings.slice(0, 3).map(([name]) => name),
                has_steam_signals: hasSteamSignals,
            };

            // 4. Obtener candidatos según el modo seleccionado
            let rawCandidates = [];

            if (mode === 'backlog') {
                const backlogIds = userGames
                    .filter((g) => g.status === 'backlog' && !ignoredIgdbSet.has(Number(g.igdb_game_id)))
                    .map((g) => Number(g.igdb_game_id))
                    .slice(0, 60);

                if (backlogIds.length === 0) {
                    return { mode, profile_summary: profileSummary, games: [] };
                }
                rawCandidates = await igdbService.getGamesByIds(backlogIds);
            } else {
                const queryGenres = filters.genres.length > 0 ? filters.genres : topGenreIds.slice(0, 3);
                const queryThemes = filters.themes.length > 0 ? filters.themes : topThemeIds.slice(0, 2);

                const commonFilterOpts = {
                    excludeGenreIds: filters.excludeGenres,
                    platformIds: filters.platforms,
                    gameModeIds: filters.gameModes,
                    minYear: filters.minYear,
                    maxYear: filters.maxYear,
                    minRating: filters.minRating ?? (mode === 'hidden_gems' ? 78 : 72),
                    minRatingCount: mode === 'hidden_gems' ? 15 : 20,
                    maxRatingCount: mode === 'hidden_gems' ? 350 : null,
                };

                const topSimilarIds = [...similarGameWeights.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 30)
                    .map(([id]) => id);

                const queries = [];

                if (isAnchorMode) {
                    if (topSimilarIds.length > 0) {
                        queries.push(
                            igdbService.getRecommendationsCandidates({
                                gameIds: topSimilarIds,
                                excludeGenreIds: filters.excludeGenres,
                                platformIds: filters.platforms,
                                gameModeIds: filters.gameModes,
                                minYear: filters.minYear,
                                maxYear: filters.maxYear,
                                limit: 25,
                            })
                        );
                    }

                    if (queryGenres.length > 0 && queryThemes.length > 0) {
                        queries.push(
                            igdbService.getRecommendationsCandidates({
                                ...commonFilterOpts,
                                genreIds: queryGenres.slice(0, 2),
                                themeIds: queryThemes.slice(0, 2),
                                limit: 15,
                            })
                        );
                    }
                } else {
                    queries.push(
                        igdbService.getRecommendationsCandidates({
                            ...commonFilterOpts,
                            genreIds: queryGenres,
                            limit: 40,
                        })
                    );

                    if (queryThemes.length > 0) {
                        queries.push(
                            igdbService.getRecommendationsCandidates({
                                ...commonFilterOpts,
                                themeIds: queryThemes,
                                limit: 30,
                            })
                        );
                    }

                    if (topSimilarIds.length > 0) {
                        queries.push(
                            igdbService.getRecommendationsCandidates({
                                gameIds: topSimilarIds,
                                excludeGenreIds: filters.excludeGenres,
                                platformIds: filters.platforms,
                                gameModeIds: filters.gameModes,
                                minYear: filters.minYear,
                                maxYear: filters.maxYear,
                                limit: 30,
                            })
                        );
                    }
                }

                const batches = await Promise.all(queries);
                rawCandidates = batches.flat();
            }

            // 5. Deduplicar candidatos y cargar su taxonomía SteamSpy en 1 sola query SQL
            const seen = new Set();
            const preFiltered = rawCandidates.filter((game) => {
                const id = Number(game.id);
                if (!id || seen.has(id)) return false;
                seen.add(id);

                if (ignoredIgdbSet.has(id)) return false;
                if (mode !== 'backlog' && inLibrarySet.has(id)) return false;
                if (seedGameId && id === seedGameId) return false;

                if (filters.genres.length > 0 && !game.genres?.some((g) => filters.genres.includes(g.id))) return false;
                if (filters.excludeGenres.length > 0 && game.genres?.some((g) => filters.excludeGenres.includes(g.id))) return false;
                if (filters.themes.length > 0 && !game.themes?.some((t) => filters.themes.includes(t.id))) return false;
                if (filters.platforms.length > 0 && !game.platforms?.some((p) => filters.platforms.includes(p.id))) return false;
                if (filters.gameModes.length > 0 && !game.game_modes?.some((m) => filters.gameModes.includes(m.id))) return false;
                if (filters.minRating !== null && (game.rating || 0) < filters.minRating) return false;

                if (filters.minYear || filters.maxYear) {
                    if (!game.first_release_date) return false;
                    const year = new Date(game.first_release_date * 1000).getUTCFullYear();
                    if (filters.minYear && year < filters.minYear) return false;
                    if (filters.maxYear && year > filters.maxYear) return false;
                }

                return true;
            });

            const candidateTaxonomyMap = await steamSpyService.getTaxonomyForIgdbGames(
                preFiltered.map((g) => g.id),
                { enqueueMissing: true, maxEnqueue: 12 }
            );

            // Merger de mapas de taxonomía (semillas + candidatos)
            const fullTaxonomyMap = new Map([...seedTaxonomyMap, ...candidateTaxonomyMap]);

            // Filtro estricto de coherencia en modo ancla usando Subgénero / Mecánicas / Ambientación
            const filtered = preFiltered.filter((game) => {
                if (!isAnchorMode || !anchorMeta) return true;

                const id = Number(game.id);
                const isSameFranchise =
                    game.franchises?.some((f) => favoriteFranchises.has(f.id)) ||
                    (game.collection && favoriteCollections.has(game.collection.id));
                if (isSameFranchise) return true;

                const candTax = fullTaxonomyMap.get(id);

                // Si ambos juegos tienen etiquetas de SteamSpy, validar por nuestras 4 dimensiones ponderadas por votos
                if (anchorTax && candTax) {
                    const subSim = weightedTagSimilarity(anchorTax.weights.subgenres, candTax.weights.subgenres);
                    const mechSim = weightedTagSimilarity(anchorTax.weights.mechanics, candTax.weights.mechanics);
                    const setSim = weightedTagSimilarity(anchorTax.weights.settings, candTax.weights.settings);

                    // Caso A: El juego ancla tiene subgéneros definidos (ej. Souls-like, Hunting, Colony Sim)
                    if (anchorTax.subgenres.length > 0) {
                        return subSim >= 0.35 || (setSim >= 0.45 && mechSim >= 0.35);
                    }
                    // Caso B: El juego ancla no tiene subgénero cerrado -> exigir coincidencia en Ambientación o Mecánicas
                    return setSim >= 0.4 || mechSim >= 0.45;
                }

                // Respaldo si alguno aún no está en SteamSpy (ej. exclusivo de consola o primer fetch en cola)
                const anchorKeywordIds = new Set((anchorMeta.keywords || []).map((k) => k.id));
                const sharedKeywordsCount = (game.keywords || []).filter((k) => anchorKeywordIds.has(k.id)).length;
                const sharedSummaryWords = computeTextOverlap(anchorTerms, game);

                return sharedKeywordsCount >= 2 || sharedSummaryWords >= 2;
            });

            // 6. Scoring multi-factor (IGDB + 4 dimensiones SteamSpy ponderadas por votos)
            const scoringContext = {
                mode,
                taxonomyMap: fullTaxonomyMap,
                similarToNames,
                favoriteFranchises,
                favoriteCollections,
                topGenreIds: new Set(topGenreIds),
                topThemeIds: new Set(topThemeIds),
                topSubgenres: new Set(sortedSubgenres.slice(0, 5).map(([name]) => name)),
                topMechanics: new Set(sortedMechanics.slice(0, 5).map(([name]) => name)),
                topSettings: new Set(sortedSettings.slice(0, 5).map(([name]) => name)),
            };

            const scored = filtered.map((game) => {
                const id = Number(game.id);
                const baseQuality = Math.min(20, ((game.rating || 70) / 100) * 20);
                const simBonus = Math.min(32, (similarGameWeights.get(id) || 0) * 18);

                const franchiseBonus =
                    game.franchises?.some((f) => favoriteFranchises.has(f.id)) ||
                        (game.collection && favoriteCollections.has(game.collection.id))
                        ? 14
                        : 0;

                // Bonus por las 4 dimensiones de SteamSpy ponderadas por votos
                let taxonomyBonus = 0;
                const candTax = fullTaxonomyMap.get(id);

                if (isAnchorMode && anchorTax && candTax) {
                    const subSim = weightedTagSimilarity(anchorTax.weights.subgenres, candTax.weights.subgenres);
                    const mechSim = weightedTagSimilarity(anchorTax.weights.mechanics, candTax.weights.mechanics);
                    const setSim = weightedTagSimilarity(anchorTax.weights.settings, candTax.weights.settings);
                    const genSim = weightedTagSimilarity(anchorTax.weights.genres, candTax.weights.genres);
                    taxonomyBonus = subSim * 28 + mechSim * 16 + setSim * 14 + genSim * 6;
                } else if (candTax) {
                    for (const [tag, tw] of Object.entries(candTax.weights.subgenres)) {
                        taxonomyBonus += (spySubgenreScores.get(tag) || 0) * tw * 6.5;
                    }
                    for (const [tag, tw] of Object.entries(candTax.weights.mechanics)) {
                        taxonomyBonus += (spyMechanicScores.get(tag) || 0) * tw * 4.0;
                    }
                    for (const [tag, tw] of Object.entries(candTax.weights.settings)) {
                        taxonomyBonus += (spySettingScores.get(tag) || 0) * tw * 4.5;
                    }
                    taxonomyBonus = Math.max(-10, Math.min(38, taxonomyBonus));
                }

                let genreScore = 0;
                for (const g of game.genres || []) {
                    genreScore += (genreWeights.get(g.id) || 0) * 4.0;
                }
                genreScore = Math.max(-8, Math.min(16, genreScore));

                let themeScore = 0;
                for (const t of game.themes || []) {
                    themeScore += (themeWeights.get(t.id) || 0) * 4.0;
                }
                themeScore = Math.max(-8, Math.min(15, themeScore));

                let modePerspScore = 0;
                for (const m of game.game_modes || []) {
                    modePerspScore += (modeWeights.get(m.id) || 0) * 2.0;
                }
                for (const p of game.player_perspectives || []) {
                    modePerspScore += (perspectiveWeights.get(p.id) || 0) * 2.0;
                }
                modePerspScore = Math.min(8, modePerspScore);

                const rawScore =
                    baseQuality + simBonus + franchiseBonus + taxonomyBonus + genreScore + themeScore + modePerspScore;
                const matchPercent = Math.max(55, Math.min(99, Math.round((rawScore / 115) * 100)));

                return {
                    ...game,
                    recommendation_score: Number(rawScore.toFixed(2)),
                    match_percent: matchPercent,
                    reasons: buildReasons(game, scoringContext),
                };
            });

            scored.sort((a, b) => b.recommendation_score - a.recommendation_score);

            const finalResults = isAnchorMode
                ? scored.filter((g) => g.match_percent >= 68).slice(0, limit)
                : scored.slice(0, limit);

            return {
                mode,
                profile_summary: profileSummary,
                games: finalResults,
            };
        } catch (error) {
            console.error('❌ Error en RecommendationService:', error.message);
            const fallback = await igdbService.getPopularGames(limit);
            return {
                mode,
                profile_summary: {
                    seed_count: 0,
                    top_genres: [],
                    top_themes: [],
                    top_subgenres: [],
                    top_settings: [],
                    has_steam_signals: false,
                },
                games: fallback.map((g) => ({ ...g, match_percent: null, reasons: [] })),
            };
        }
    },
};

module.exports = RecommendationService;