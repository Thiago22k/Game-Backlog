const pool = require('../config/database');

const IgdbCache = {
    // Obtener juego por ID de IGDB
    async getById(igdbId) {
        const query = 'SELECT * FROM igdb_cache WHERE igdb_id = $1';
        const result = await pool.query(query, [igdbId]);
        return result.rows[0];
    },

    // Obtener juego por slug
    async getBySlug(slug) {
        const query = 'SELECT * FROM igdb_cache WHERE slug = $1';
        const result = await pool.query(query, [slug]);
        return result.rows[0];
    },

    // Obtener múltiples juegos por sus IDs
    async getManyByIds(igdbIds) {
        if (!igdbIds || igdbIds.length === 0) return [];

        const query = 'SELECT * FROM igdb_cache WHERE igdb_id = ANY($1::int[])';
        const result = await pool.query(query, [igdbIds]);
        return result.rows;
    },

    // Guardar o actualizar datos de un juego (UPSERT)
    async upsert(igdbId, slug, name, data) {
        const query = `
      INSERT INTO igdb_cache (igdb_id, slug, name, data, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (igdb_id) DO UPDATE SET
        slug = EXCLUDED.slug,
        name = EXCLUDED.name,
        data = EXCLUDED.data,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
        const values = [igdbId, slug, name, data];
        const result = await pool.query(query, values);
        return result.rows[0];
    }
};

module.exports = IgdbCache;
