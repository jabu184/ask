const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { requireAuth, JWT_SECRET, ADMIN_EMAIL } = require('../middleware/auth');
const { generateId } = require('../utils/id');
const emailService = require('../services/emailService');

const router = express.Router();

function getCookieOptions(req) {
  // Only mark cookie as secure if accessed over actual HTTPS
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
}

// Register new creator
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(trimmedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = generateId();

    db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(
      userId,
      trimmedEmail,
      passwordHash
    );

    const token = jwt.sign({ userId, email: trimmedEmail }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, getCookieOptions(req));

    return res.status(201).json({
      user: { id: userId, email: trimmedEmail, isAdmin: trimmedEmail === ADMIN_EMAIL },
      token
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login creator
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(trimmedEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, getCookieOptions(req));

    return res.json({
      user: { id: user.id, email: user.email, isAdmin: user.email.toLowerCase() === ADMIN_EMAIL },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to login' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', getCookieOptions(req));
  return res.json({ message: 'Logged out successfully' });
});

// Current user check
router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

// User profile with usage stats
router.get('/profile', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM surveys WHERE user_id = ?) AS survey_count,
        (SELECT COUNT(*) FROM surveys WHERE user_id = ? AND is_active = 1) AS active_survey_count,
        (SELECT COUNT(*) FROM questions q JOIN surveys s ON s.id = q.survey_id WHERE s.user_id = ?) AS survey_question_count,
        (SELECT COUNT(*) FROM responses r JOIN surveys s ON s.id = r.survey_id WHERE s.user_id = ?) AS survey_response_count,
        (SELECT COUNT(*) FROM polls WHERE user_id = ?) AS poll_count,
        (SELECT COUNT(*) FROM polls WHERE user_id = ? AND status = 'live') AS active_poll_count,
        (SELECT COUNT(*) FROM poll_questions pq JOIN polls p ON p.id = pq.poll_id WHERE p.user_id = ?) AS poll_question_count,
        (SELECT COUNT(*) FROM poll_votes pv JOIN polls p ON p.id = pv.poll_id WHERE p.user_id = ?) AS poll_response_count
    `).get(userId, userId, userId, userId, userId, userId, userId, userId);

    const surveyCount = Number(stats?.survey_count || 0);
    const activeSurveyCount = Number(stats?.active_survey_count || 0);
    const surveyQuestionCount = Number(stats?.survey_question_count || 0);
    const surveyResponseCount = Number(stats?.survey_response_count || 0);
    const pollCount = Number(stats?.poll_count || 0);
    const activePollCount = Number(stats?.active_poll_count || 0);
    const pollQuestionCount = Number(stats?.poll_question_count || 0);
    const pollResponseCount = Number(stats?.poll_response_count || 0);

    return res.json({
      user: req.user,
      stats: {
        survey_count: surveyCount,
        active_survey_count: activeSurveyCount,
        survey_question_count: surveyQuestionCount,
        survey_response_count: surveyResponseCount,
        poll_count: pollCount,
        active_poll_count: activePollCount,
        poll_question_count: pollQuestionCount,
        poll_response_count: pollResponseCount,
        total_questions: surveyQuestionCount + pollQuestionCount,
        total_responses: surveyResponseCount + pollResponseCount,
        response_count: surveyResponseCount + pollResponseCount
      }
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Change password
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, req.user.id);

    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err);
    return res.status(500).json({ error: 'Failed to update password' });
  }
});

// Delete user account and cascade surveys
router.delete('/account', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;

    if (req.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ error: 'Cannot delete the primary administrator account.' });
    }

    const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (password) {
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
    res.clearCookie('token', getCookieOptions(req));

    return res.json({ message: 'Your account and all surveys have been permanently deleted.' });
  } catch (err) {
    console.error('Delete account error:', err);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Request password reset link (forgot password)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(trimmedEmail);

    // Standard anti-enumeration security: always return generic friendly response
    const genericResponse = {
      message: 'If that email address is registered, password reset instructions have been sent. Please check your inbox.'
    };

    if (!user) {
      return res.json(genericResponse);
    }

    // Generate secure 32-byte cryptographic random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiration

    // Clean up existing reset requests for this user
    db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);

    // Save token hash into database
    db.prepare('INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)').run(
      generateId(),
      user.id,
      tokenHash,
      expiresAt
    );

    // Asynchronously dispatch email
    emailService.sendPasswordResetEmail(user.email, rawToken).catch(err => {
      console.error('[Auth] Error sending reset email:', err);
    });

    return res.json(genericResponse);
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Verify reset token validity
router.get('/verify-reset-token', (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ valid: false, error: 'Reset token is required' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const reset = db.prepare(`
      SELECT pr.id, pr.expires_at, u.email 
      FROM password_resets pr
      JOIN users u ON u.id = pr.user_id
      WHERE pr.token_hash = ?
    `).get(tokenHash);

    if (!reset) {
      return res.status(400).json({ valid: false, error: 'Invalid or expired password reset link' });
    }

    if (new Date(reset.expires_at) < new Date()) {
      db.prepare('DELETE FROM password_resets WHERE id = ?').run(reset.id);
      return res.status(400).json({ valid: false, error: 'This password reset link has expired. Please request a new one.' });
    }

    return res.json({ valid: true, email: reset.email });
  } catch (err) {
    console.error('Verify reset token error:', err);
    return res.status(500).json({ valid: false, error: 'Failed to verify reset token' });
  }
});

// Submit new password with reset token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const reset = db.prepare(`
      SELECT pr.id, pr.user_id, pr.expires_at 
      FROM password_resets pr 
      WHERE pr.token_hash = ?
    `).get(tokenHash);

    if (!reset) {
      return res.status(400).json({ error: 'Invalid or expired password reset link' });
    }

    if (new Date(reset.expires_at) < new Date()) {
      db.prepare('DELETE FROM password_resets WHERE id = ?').run(reset.id);
      return res.status(400).json({ error: 'This password reset link has expired. Please request a new one.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updateTx = db.transaction(() => {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, reset.user_id);
      db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(reset.user_id);
    });

    updateTx();

    return res.json({ message: 'Your password has been successfully reset. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
