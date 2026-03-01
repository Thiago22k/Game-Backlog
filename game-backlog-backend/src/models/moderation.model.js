const pool = require('../config/database');

const Moderation = {
  async getPendingReviewReports() {
    const query = `
      SELECT rr.id, rr.review_id, rr.user_id as reporter_id, u.username as reporter_username, 
             r.content as review_content, r.user_id as reported_user_id, au.username as reported_username, 
             g.name as game_name, g.slug as game_slug,
             rr.reason, rr.details, rr.status, rr.created_at
      FROM review_reports rr
      JOIN users u ON rr.user_id = u.id
      JOIN reviews r ON rr.review_id = r.id
      JOIN users au ON r.user_id = au.id
      LEFT JOIN igdb_cache g ON r.igdb_game_id = g.igdb_id
      WHERE rr.status = 'pending'
      ORDER BY rr.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  async getPendingReviewCommentReports() {
    const query = `
      SELECT rcr.id, rcr.comment_id, rcr.user_id as reporter_id, u.username as reporter_username, 
             rc.content as comment_content, rc.user_id as reported_user_id, au.username as reported_username, 
             g.name as game_name, g.slug as game_slug,
             r.id as review_id,
             rcr.reason, rcr.details, rcr.status, rcr.created_at
      FROM review_comment_reports rcr
      JOIN users u ON rcr.user_id = u.id
      JOIN review_comments rc ON rcr.comment_id = rc.id
      JOIN users au ON rc.user_id = au.id
      JOIN reviews r ON rc.review_id = r.id
      LEFT JOIN igdb_cache g ON r.igdb_game_id = g.igdb_id
      WHERE rcr.status = 'pending'
      ORDER BY rcr.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  async getPendingProfileReports() {
    const query = `
      SELECT pr.id, pr.reporter_id, u.username as reporter_username, 
             pr.reported_user_id, ru.username as reported_username, 
             pr.reason, pr.details, pr.status, pr.created_at
      FROM profile_reports pr
      JOIN users u ON pr.reporter_id = u.id
      JOIN users ru ON pr.reported_user_id = ru.id
      WHERE pr.status = 'pending'
      ORDER BY pr.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  async getPendingCollectionReports() {
    const query = `
      SELECT cr.id, cr.collection_id, cr.user_id as reporter_id, u.username as reporter_username, 
             c.title as collection_title, c.user_id as reported_user_id, cu.username as reported_username, 
             cr.reason, cr.details, cr.status, cr.created_at
      FROM collection_reports cr
      JOIN users u ON cr.user_id = u.id
      JOIN collections c ON cr.collection_id = c.id
      JOIN users cu ON c.user_id = cu.id
      WHERE cr.status = 'pending'
      ORDER BY cr.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  async getPendingCollectionCommentReports() {
    const query = `
      SELECT ccr.id, ccr.comment_id, ccr.user_id as reporter_id, u.username as reporter_username, 
             cc.content as comment_content, cc.user_id as reported_user_id, au.username as reported_username, 
             c.title as collection_title, c.id as collection_id,
             ccr.reason, ccr.details, ccr.status, ccr.created_at
      FROM collection_comment_reports ccr
      JOIN users u ON ccr.user_id = u.id
      JOIN collection_comments cc ON ccr.comment_id = cc.id
      JOIN users au ON cc.user_id = au.id
      JOIN collections c ON cc.collection_id = c.id
      WHERE ccr.status = 'pending'
      ORDER BY ccr.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  async updateReviewReportStatus(reportId, status) {
    const query = `
      UPDATE review_reports
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, reportId]);
    return result.rows[0];
  },

  async updateReviewCommentReportStatus(reportId, status) {
    const query = `
      UPDATE review_comment_reports
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, reportId]);
    return result.rows[0];
  },

  async updateProfileReportStatus(reportId, status) {
    const query = `
      UPDATE profile_reports
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, reportId]);
    return result.rows[0];
  },

  async updateCollectionReportStatus(reportId, status) {
    const query = `
      UPDATE collection_reports
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, reportId]);
    return result.rows[0];
  },

  async updateCollectionCommentReportStatus(reportId, status) {
    const query = `
      UPDATE collection_comment_reports
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, reportId]);
    return result.rows[0];
  },

  // --- USER MANAGEMENT ---

  async searchUsers(searchQuery) {
    let query = `
      SELECT id, username, email, avatar_url, avatar_static_url, role, status, created_at
      FROM users
    `;
    const params = [];

    if (searchQuery && searchQuery.trim() !== '') {
      query += ` WHERE username ILIKE $1 OR email ILIKE $1`;
      params.push(`%${searchQuery}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT 50`; // Limitar resultados para no saturar

    const result = await pool.query(query, params);
    return result.rows;
  },

  async updateUserRole(userId, newRole) {
    const query = `
      UPDATE users
      SET role = $1
      WHERE id = $2
      RETURNING id, username, email, role, status
    `;
    const result = await pool.query(query, [newRole, userId]);
    return result.rows[0];
  },

  async updateUserStatus(userId, status) {
    const query = `
      UPDATE users
      SET status = $1
      WHERE id = $2
      RETURNING id, username, email, role, status
    `;
    const result = await pool.query(query, [status, userId]);
    return result.rows[0];
  }
};

module.exports = Moderation;
