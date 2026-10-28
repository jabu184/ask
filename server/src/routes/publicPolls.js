const express = require('express');
const db = require('../config/db');
const { generateId } = require('../utils/id');
const { computeQuestionResults, getIO, getPollState } = require('../services/pollSocket');

const router = express.Router();

/**
 * GET /api/public/polls/code/:code
 * Find poll by 6-digit numeric PIN or custom alphanumeric code (case-insensitive)
 */
router.get('/code/:code', (req, res) => {
  try {
    const rawCode = (req.params.code || '').trim().toUpperCase();
    if (!rawCode) {
      return res.status(400).json({ error: 'Poll code is required' });
    }

    const poll = db.prepare('SELECT * FROM polls WHERE UPPER(code) = ?').get(rawCode);
    if (!poll) {
      return res.status(404).json({ error: 'No active poll found with this code. Please check and try again.' });
    }

    const participantId = req.query.participantId || null;
    const state = getPollState(poll.id, participantId, false);

    res.json(state);
  } catch (err) {
    console.error('[Public Poll by Code Error]', err);
    res.status(500).json({ error: 'Failed to look up poll' });
  }
});

/**
 * GET /api/public/polls/:id
 * Get public poll state by ID
 */
router.get('/:id', (req, res) => {
  try {
    const pollId = req.params.id;
    const participantId = req.query.participantId || null;

    const state = getPollState(pollId, participantId, false);
    if (!state) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    res.json(state);
  } catch (err) {
    console.error('[Public Poll State Error]', err);
    res.status(500).json({ error: 'Failed to load poll state' });
  }
});

/**
 * POST /api/public/polls/:id/vote
 * Submit vote (HTTP fallback for WebSocket)
 */
router.post('/:id/vote', (req, res) => {
  try {
    const pollId = req.params.id;
    const { questionId, participantId, value } = req.body;

    if (!questionId || !participantId || value === undefined) {
      return res.status(400).json({ error: 'Missing required voting parameters' });
    }

    const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
    if (!poll || poll.status !== 'live') {
      return res.status(400).json({ error: 'Poll is not currently live' });
    }
    if (poll.voting_open === 0) {
      return res.status(400).json({ error: 'Voting is currently closed for this question' });
    }
    if (poll.current_question_id !== questionId) {
      return res.status(400).json({ error: 'This question is no longer active' });
    }

    const question = db.prepare('SELECT * FROM poll_questions WHERE id = ?').get(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Upsert vote
    const existing = db.prepare('SELECT id FROM poll_votes WHERE question_id = ? AND participant_id = ?').get(questionId, participantId);
    if (existing) {
      db.prepare('UPDATE poll_votes SET value = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?').run(String(value), existing.id);
    } else {
      db.prepare(`
        INSERT INTO poll_votes (id, poll_id, question_id, participant_id, value)
        VALUES (?, ?, ?, ?, ?)
      `).run(generateId(), pollId, questionId, participantId, String(value));
    }

    const results = computeQuestionResults(question, pollId);

    const io = getIO();
    if (io) {
      io.to(`poll:${pollId}`).emit('poll:results_update', {
        questionId,
        results: (poll.show_results === 1) ? results : null,
        totalVotes: results.totalVotes
      });
    }

    res.json({ success: true, results: (poll.show_results === 1) ? results : null });
  } catch (err) {
    console.error('[Public Poll Vote Error]', err);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

/**
 * POST /api/public/polls/:id/qa
 * Submit audience Q&A question
 */
router.post('/:id/qa', (req, res) => {
  try {
    const pollId = req.params.id;
    const { participantId, author_name, question_text } = req.body;

    const text = (question_text || '').trim();
    if (!text) {
      return res.status(400).json({ error: 'Question text is required' });
    }

    const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
    if (!poll || poll.qa_enabled === 0) {
      return res.status(400).json({ error: 'Audience Q&A is disabled for this poll' });
    }

    const isApproved = poll.qa_moderation === 1 ? 0 : 1;
    const newId = generateId();
    const author = (author_name || '').trim() || 'Anonymous';

    db.prepare(`
      INSERT INTO poll_qa_questions (id, poll_id, participant_id, author_name, question_text, upvotes, is_approved)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(newId, pollId, participantId || 'anon', author, text, isApproved);

    const createdItem = db.prepare('SELECT * FROM poll_qa_questions WHERE id = ?').get(newId);

    const io = getIO();
    if (io) {
      if (isApproved === 1) {
        io.to(`poll:${pollId}`).emit('qa:question_added', createdItem);
      } else {
        io.to(`poll:${pollId}`).emit('qa:pending_question', createdItem);
      }
    }

    res.status(201).json(createdItem);
  } catch (err) {
    console.error('[Public Poll QA Submit Error]', err);
    res.status(500).json({ error: 'Failed to submit question' });
  }
});

/**
 * POST /api/public/polls/:id/qa/:questionId/upvote
 * Upvote a question
 */
router.post('/:id/qa/:questionId/upvote', (req, res) => {
  try {
    const { id: pollId, questionId } = req.params;
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ error: 'Participant ID is required' });
    }

    const existing = db.prepare('SELECT id FROM poll_qa_upvotes WHERE qa_question_id = ? AND participant_id = ?').get(questionId, participantId);
    let hasUpvoted = false;

    if (existing) {
      db.prepare('DELETE FROM poll_qa_upvotes WHERE id = ?').run(existing.id);
      db.prepare('UPDATE poll_qa_questions SET upvotes = MAX(0, upvotes - 1) WHERE id = ?').run(questionId);
      hasUpvoted = false;
    } else {
      db.prepare('INSERT INTO poll_qa_upvotes (id, qa_question_id, participant_id) VALUES (?, ?, ?)').run(generateId(), questionId, participantId);
      db.prepare('UPDATE poll_qa_questions SET upvotes = upvotes + 1 WHERE id = ?').run(questionId);
      hasUpvoted = true;
    }

    const updated = db.prepare('SELECT id, upvotes FROM poll_qa_questions WHERE id = ?').get(questionId);

    const io = getIO();
    if (io && updated) {
      io.to(`poll:${pollId}`).emit('qa:upvote_updated', {
        qaQuestionId: questionId,
        upvotes: updated.upvotes
      });
    }

    res.json({ qaQuestionId: questionId, upvotes: updated ? updated.upvotes : 0, hasUpvoted });
  } catch (err) {
    console.error('[Public Poll QA Upvote Error]', err);
    res.status(500).json({ error: 'Failed to upvote' });
  }
});

module.exports = router;
