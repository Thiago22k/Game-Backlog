const SUBGENRES = new Set([
    'Souls-like', 'Roguelike', 'Roguelite', 'Action Roguelike', 'Traditional Roguelike',
    'Metroidvania', 'Colony Sim', 'City Builder', 'Immersive Sim', 'CRPG', 'JRPG',
    'Action RPG', 'Tactical RPG', 'Strategy RPG', 'MMORPG', 'Dungeon Crawler',
    'Survival Horror', 'Psychological Horror', 'Boomer Shooter', 'Hero Shooter',
    'Looter Shooter', 'Extraction Shooter', 'Tactical Shooter', 'Twin Stick Shooter',
    'Bullet Hell', 'Deckbuilding', 'Card Battler', 'Auto Battler', 'Tower Defense',
    'Grand Strategy', '4X', 'Turn-Based Strategy', 'Turn-Based Tactics', 'RTS',
    'Visual Novel', 'Point & Click', 'Walking Simulator', 'Interactive Fiction',
    'Precision Platformer', '3D Platformer', 'Puzzle Platformer', 'Rhythm',
    'Hunting', 'Fishing', 'Farming Sim', 'Life Sim', 'Dating Sim', 'God Game',
    'Automobile Sim', 'Flight', 'Space Sim', 'Submarine', 'Trains', 'Mechs',
    'Fighting', '2D Fighter', '3D Fighter', "Beat 'em up", 'Spectacle Fighter',
    'Character Action Game', 'Stealth', 'Sandbox', 'Survival', 'Open World Survival Craft',
    'Battle Royale', 'MOBA', 'Card Game', 'Board Game', 'Tabletop',
]);

const MECHANICS = new Set([
    'Crafting', 'Base Building', 'Building', 'Resource Management', 'Management',
    'Economy', 'Trading', 'Automation', 'Inventory Management', 'Time Management',
    'Turn-Based Combat', 'Real-Time with Pause', 'Hack and Slash', 'Parry',
    'Swordplay', 'Archery', 'Gun Customization', 'Character Customization',
    'Permadeath', 'Procedural Generation', 'Replay Value', 'Choices Matter',
    'Multiple Endings', 'Narration', 'Investigation', 'Detective', 'Hacking',
    'Parkour', 'Physics', 'Destruction', 'Naval Combat', 'Vehicular Combat',
    'Co-op Campaign', 'Moddable', 'Level Editor', 'Exploration', 'Collectathon',
    'Logic', 'Sokoban', 'Escape Room',
]);

const SETTINGS = new Set([
    'Cyberpunk', 'Medieval', 'Space', 'Dark Fantasy', 'High Fantasy', 'Fantasy',
    'Post-apocalyptic', 'Sci-fi', 'Horror', 'Gothic', 'Lovecraftian', 'Vampire',
    'Werewolves', 'Zombies', 'Demons', 'Mythology', 'Nature', 'Wildlife',
    'Western', 'Historical', 'World War I', 'World War II', 'Cold War', 'Modern',
    'Futuristic', 'Noir', 'Crime', 'Heist', 'Pirates', 'Ninja', 'Samurai',
    'Vikings', 'Steampunk', 'Dieselpunk', 'Dystopian', 'Underground', 'Underwater',
    'Snow', 'Mars', 'Aliens', 'Dinosaurs', 'Supernatural', 'Magic', 'Anime',
]);

const GENRES = new Set([
    'RPG', 'Action', 'Adventure', 'Strategy', 'Simulation', 'Shooter',
    'Platformer', 'Puzzle', 'Racing', 'Sports', 'Horror', 'Casual', 'Indie',
]);

/**
 * Clasifica { "Tag Name": votes } de SteamSpy en 4 dimensiones y calcula pesos normalizados [0..1]
 */
const classifySteamTags = (rawTags = {}) => {
    const entries = Object.entries(rawTags)
        .map(([tag, votes]) => [tag, Number(votes) || 0])
        .filter(([, votes]) => votes > 0)
        .sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
        return {
            top_tags: [],
            subgenres: [],
            mechanics: [],
            settings: [],
            genres: [],
            weights: { subgenres: {}, mechanics: {}, settings: {}, genres: {} },
        };
    }

    const maxVotes = entries[0][1] || 1;
    const top_tags = entries.slice(0, 15).map(([tag]) => tag);

    const subgenres = [];
    const mechanics = [];
    const settings = [];
    const genres = [];
    const weights = { subgenres: {}, mechanics: {}, settings: {}, genres: {} };

    for (const [tag, votes] of entries) {
        // Peso relativo respecto al tag más votado del juego (suavizado con raíz cuadrada para no anular el 2º/3º tag)
        const relWeight = Number(Math.sqrt(votes / maxVotes).toFixed(3));

        if (SUBGENRES.has(tag) && subgenres.length < 6) {
            subgenres.push(tag);
            weights.subgenres[tag] = relWeight;
        } else if (MECHANICS.has(tag) && mechanics.length < 8) {
            mechanics.push(tag);
            weights.mechanics[tag] = relWeight;
        } else if (SETTINGS.has(tag) && settings.length < 6) {
            settings.push(tag);
            weights.settings[tag] = relWeight;
        } else if (GENRES.has(tag) && genres.length < 5) {
            genres.push(tag);
            weights.genres[tag] = relWeight;
        }
    }

    return { top_tags, subgenres, mechanics, settings, genres, weights };
};

module.exports = {
    SUBGENRES,
    MECHANICS,
    SETTINGS,
    GENRES,
    classifySteamTags,
};