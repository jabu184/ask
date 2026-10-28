const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { requireAdmin, ADMIN_EMAIL } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

/**
 * GET /api/admin/stats
 * Overview KPIs and system-wide statistics
 */
router.get('/stats', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
    const totalSurveys = db.prepare('SELECT COUNT(*) AS count FROM surveys').get().count;
    const activeSurveys = db.prepare('SELECT COUNT(*) AS count FROM surveys WHERE is_active = 1').get().count;
    const inactiveSurveys = db.prepare('SELECT COUNT(*) AS count FROM surveys WHERE is_active = 0').get().count;
    const totalResponses = db.prepare('SELECT COUNT(*) AS count FROM responses').get().count;
    const totalQuestions = db.prepare('SELECT COUNT(*) AS count FROM questions').get().count;
    const totalEmailsSent = db.prepare("SELECT COUNT(*) AS count FROM email_logs WHERE email_type = 'response_notification'").get().count;

    const recentUsers = db.prepare(`
      SELECT id, email, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `).all();

    const recentResponses = db.prepare(`
      SELECT 
        r.id, 
        r.survey_id, 
        r.submitted_at, 
        s.title AS survey_title, 
        u.email AS author_email
      FROM responses r
      JOIN surveys s ON s.id = r.survey_id
      JOIN users u ON u.id = s.user_id
      ORDER BY r.submitted_at DESC
      LIMIT 5
    `).all();

    // Time-series trends for charts
    const userTrends = db.prepare(`
      SELECT strftime('%Y-%m-%d', created_at) AS date, COUNT(*) AS count
      FROM users
      GROUP BY strftime('%Y-%m-%d', created_at)
      ORDER BY date ASC
    `).all();

    const surveyTrends = db.prepare(`
      SELECT strftime('%Y-%m-%d', created_at) AS date, COUNT(*) AS count
      FROM surveys
      GROUP BY strftime('%Y-%m-%d', created_at)
      ORDER BY date ASC
    `).all();

    const responseTrends = db.prepare(`
      SELECT strftime('%Y-%m-%d', submitted_at) AS date, COUNT(*) AS count
      FROM responses
      GROUP BY strftime('%Y-%m-%d', submitted_at)
      ORDER BY date ASC
    `).all();

    const questionTrends = db.prepare(`
      SELECT strftime('%Y-%m-%d', s.created_at) AS date, COUNT(q.id) AS count
      FROM questions q
      JOIN surveys s ON s.id = q.survey_id
      GROUP BY strftime('%Y-%m-%d', s.created_at)
      ORDER BY date ASC
    `).all();

    return res.json({
      stats: {
        totalUsers,
        totalSurveys,
        activeSurveys,
        inactiveSurveys,
        totalResponses,
        totalQuestions,
        totalEmailsSent,
        avgResponsesPerSurvey: totalSurveys > 0 ? (totalResponses / totalSurveys).toFixed(1) : 0,
        avgSurveysPerUser: totalUsers > 0 ? (totalSurveys / totalUsers).toFixed(1) : 0
      },
      trends: {
        users: userTrends,
        surveys: surveyTrends,
        responses: responseTrends,
        questions: questionTrends
      },
      recentUsers,
      recentResponses
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve administrative statistics' });
  }
});

/**
 * GET /api/admin/users
 * Search and list all registered users with survey/response aggregates
 */
router.get('/users', (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;

    let query = `
      SELECT 
        u.id, 
        u.email, 
        u.created_at,
        COUNT(DISTINCT s.id) AS survey_count,
        SUM(CASE WHEN s.is_active = 1 THEN 1 ELSE 0 END) AS active_survey_count,
        COUNT(DISTINCT r.id) AS response_count,
        (
          SELECT COUNT(*) 
          FROM email_logs el 
          LEFT JOIN surveys s_el ON s_el.id = el.survey_id
          WHERE (el.user_id = u.id OR s_el.user_id = u.id)
            AND el.email_type = 'response_notification'
        ) AS emails_sent
      FROM users u
      LEFT JOIN surveys s ON s.user_id = u.id
      LEFT JOIN responses r ON r.survey_id = s.id
    `;

    const params = [];
    if (search) {
      query += ` WHERE u.email LIKE ?`;
      params.push(search);
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC`;

    const rawUsers = db.prepare(query).all(...params);
    const users = rawUsers.map(u => ({
      ...u,
      is_admin: u.email.toLowerCase() === ADMIN_EMAIL,
      survey_count: Number(u.survey_count || 0),
      active_survey_count: Number(u.active_survey_count || 0),
      response_count: Number(u.response_count || 0),
      emails_sent: Number(u.emails_sent || 0)
    }));

    return res.json({ users });
  } catch (err) {
    console.error('Admin users list error:', err);
    return res.status(500).json({ error: 'Failed to list users' });
  }
});

/**
 * GET /api/admin/users/:id
 * Retrieve details for a specific user and all surveys they own
 */
router.get('/users/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.is_admin = user.email.toLowerCase() === ADMIN_EMAIL;
    const emailCountRow = db.prepare(`
      SELECT COUNT(*) AS count 
      FROM email_logs el 
      LEFT JOIN surveys s_el ON s_el.id = el.survey_id
      WHERE (el.user_id = ? OR s_el.user_id = ?)
        AND el.email_type = 'response_notification'
    `).get(user.id, user.id);
    user.emails_sent = Number(emailCountRow ? emailCountRow.count : 0);

    const surveys = db.prepare(`
      SELECT 
        s.id, 
        s.title, 
        s.description, 
        s.is_active, 
        s.created_at,
        COUNT(DISTINCT q.id) AS question_count,
        COUNT(DISTINCT r.id) AS response_count
      FROM surveys s
      LEFT JOIN questions q ON q.survey_id = s.id
      LEFT JOIN responses r ON r.survey_id = s.id
      WHERE s.user_id = ?
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `).all(user.id);

    return res.json({ user, surveys });
  } catch (err) {
    console.error('Admin user detail error:', err);
    return res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update a user's email or reset password
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { email, password } = req.body;
    const userId = req.params.id;

    const existingUser = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Email update
    if (email && email.trim()) {
      const trimmedEmail = email.trim().toLowerCase();
      // Check format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return res.status(400).json({ error: 'Invalid email address format' });
      }

      // Check uniqueness if email changed
      if (trimmedEmail !== existingUser.email.toLowerCase()) {
        const conflict = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(trimmedEmail, userId);
        if (conflict) {
          return res.status(409).json({ error: 'An account with that email already exists' });
        }
        db.prepare('UPDATE users SET email = ? WHERE id = ?').run(trimmedEmail, userId);
      }
    }

    // Password reset
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
    }

    const updatedUser = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(userId);
    updatedUser.is_admin = updatedUser.email.toLowerCase() === ADMIN_EMAIL;

    return res.json({ user: updatedUser, message: 'User updated successfully' });
  } catch (err) {
    console.error('Admin update user error:', err);
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user and cascade all their surveys, questions, and responses
 */
router.delete('/users/:id', (req, res) => {
  try {
    const userId = req.params.id;
    const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.email.toLowerCase() === ADMIN_EMAIL) {
      return res.status(400).json({ error: 'Cannot delete the primary administrator account.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    return res.json({ message: `User "${user.email}" and all associated data deleted successfully.` });
  } catch (err) {
    console.error('Admin delete user error:', err);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * GET /api/admin/surveys
 * List all surveys across the system with author email, question and response counts
 */
router.get('/surveys', (req, res) => {
  try {
    const { search, status } = req.query;

    let query = `
      SELECT 
        s.id, 
        s.title, 
        s.description, 
        s.is_active, 
        s.created_at,
        s.user_id,
        u.email AS author_email,
        COUNT(DISTINCT q.id) AS question_count,
        COUNT(DISTINCT r.id) AS response_count
      FROM surveys s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN questions q ON q.survey_id = s.id
      LEFT JOIN responses r ON r.survey_id = s.id
    `;

    const conditions = [];
    const params = [];

    if (search && search.trim()) {
      conditions.push('(s.title LIKE ? OR s.description LIKE ? OR u.email LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (status === 'active') {
      conditions.push('s.is_active = 1');
    } else if (status === 'inactive') {
      conditions.push('s.is_active = 0');
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` GROUP BY s.id ORDER BY s.created_at DESC`;

    const surveys = db.prepare(query).all(...params);
    return res.json({ surveys });
  } catch (err) {
    console.error('Admin surveys list error:', err);
    return res.status(500).json({ error: 'Failed to list surveys' });
  }
});

/**
 * PUT /api/admin/surveys/:id
 * Edit survey details (title, description, is_active)
 */
router.put('/surveys/:id', (req, res) => {
  try {
    const surveyId = req.params.id;
    const { title, description, is_active } = req.body;

    const existing = db.prepare('SELECT id FROM surveys WHERE id = ?').get(surveyId);
    if (!existing) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const updates = [];
    const params = [];

    if (title !== undefined && title.trim()) {
      updates.push('title = ?');
      params.push(title.trim());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description.trim());
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(surveyId);
      db.prepare(`UPDATE surveys SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = db.prepare(`
      SELECT s.*, u.email AS author_email
      FROM surveys s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
    `).get(surveyId);

    return res.json({ survey: updated, message: 'Survey updated successfully' });
  } catch (err) {
    console.error('Admin update survey error:', err);
    return res.status(500).json({ error: 'Failed to update survey' });
  }
});

/**
 * DELETE /api/admin/surveys/:id
 * Delete any survey across the system
 */
router.delete('/surveys/:id', (req, res) => {
  try {
    const surveyId = req.params.id;
    const existing = db.prepare('SELECT id, title FROM surveys WHERE id = ?').get(surveyId);
    if (!existing) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    db.prepare('DELETE FROM surveys WHERE id = ?').run(surveyId);
    return res.json({ message: `Survey "${existing.title}" deleted successfully.` });
  } catch (err) {
    console.error('Admin delete survey error:', err);
    return res.status(500).json({ error: 'Failed to delete survey' });
  }
});

module.exports = router;
