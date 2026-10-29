const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { generateId, generatePollPin } = require('../utils/id');
const { computeQuestionResults, getIO, computePollLeaderboard } = require('../services/pollSocket');
const { Parser } = require('json2csv');

const router = express.Router();
router.use(requireAuth);

function getAuthorizedPoll(pollId, req) {
  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
  if (!poll) return null;
  const isSuperAdmin = req.user && req.user.email && req.user.email.toLowerCase() === 'jb@urspace.com';
  if (poll.user_id !== req.user.id && !isSuperAdmin) {
    return 'UNAUTHORIZED';
  }
  return poll;
}

/**
 * GET /api/polls
 * List all polls created by current user
 */
router.get('/', (req, res) => {
  try {
    const isSuperAdmin = req.user && req.user.email && req.user.email.toLowerCase() === 'jb@urspace.com';
    let polls;

    if (isSuperAdmin && req.query.all === 'true') {
      polls = db.prepare(`
        SELECT p.*, u.email as author_email,
          (SELECT COUNT(*) FROM poll_questions pq WHERE pq.poll_id = p.id) as question_count,
          (SELECT COUNT(*) FROM poll_votes pv WHERE pv.poll_id = p.id) as total_votes
        FROM polls p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
      `).all();
    } else {
      polls = db.prepare(`
        SELECT p.*,
          (SELECT COUNT(*) FROM poll_questions pq WHERE pq.poll_id = p.id) as question_count,
          (SELECT COUNT(*) FROM poll_votes pv WHERE pv.poll_id = p.id) as total_votes
        FROM polls p
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
      `).all(req.user.id);
    }

    const formatted = polls.map(p => ({
      ...p,
      voting_open: Boolean(p.voting_open),
      show_results: Boolean(p.show_results),
      show_correct_answer: Boolean(p.show_correct_answer),
      is_quiz_mode: Boolean(p.is_quiz_mode),
      show_leaderboard: Boolean(p.show_leaderboard),
      qa_enabled: Boolean(p.qa_enabled),
      qa_moderation: Boolean(p.qa_moderation)
    }));

    res.json(formatted);
  } catch (err) {
    console.error('[Polls List Error]', err);
    res.status(500).json({ error: 'Failed to fetch polls' });
  }
});

/**
 * POST /api/polls
 * Create a new poll with questions
 */
router.post('/', (req, res) => {
  try {
    const {
      title,
      description,
      code: customCode,
      qa_enabled = true,
      qa_moderation = false,
      is_quiz_mode = false,
      isQuizMode = false,
      show_leaderboard = true,
      showLeaderboard = true,
      questions = []
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Poll title is required' });
    }

    let pollCode = (customCode || '').trim().toUpperCase();
    if (!pollCode) {
      // Generate unique 6-digit numeric PIN
      let attempts = 0;
      do {
        pollCode = generatePollPin(6);
        const exists = db.prepare('SELECT id FROM polls WHERE code = ?').get(pollCode);
        if (!exists) break;
        attempts++;
      } while (attempts < 20);
    } else {
      // Validate code: alphanumeric, dashes, underscores, 3-20 chars
      if (!/^[A-Z0-9_-]{3,20}$/.test(pollCode)) {
        return res.status(400).json({ error: 'Custom code must be 3-20 characters alphanumeric (A-Z, 0-9, - or _)' });
      }
      const existing = db.prepare('SELECT id FROM polls WHERE code = ?').get(pollCode);
      if (existing) {
        return res.status(400).json({ error: 'This poll code is already taken. Please choose another.' });
      }
    }

    const pollId = generateId();
    const quizModeVal = (is_quiz_mode || isQuizMode) ? 1 : 0;
    const showLeaderboardVal = (show_leaderboard !== undefined || showLeaderboard !== undefined)
      ? ((show_leaderboard || showLeaderboard) ? 1 : 0)
      : 1;

    const insertTransaction = db.transaction(() => {
      let firstQuestionId = null;

      db.prepare(`
        INSERT INTO polls (id, code, user_id, title, description, status, current_question_id, voting_open, show_results, is_quiz_mode, show_leaderboard, qa_enabled, qa_moderation)
        VALUES (?, ?, ?, ?, ?, 'draft', NULL, 1, 1, ?, ?, ?, ?)
      `).run(
        pollId,
        pollCode,
        req.user.id,
        title.trim(),
        description ? description.trim() : null,
        quizModeVal,
        showLeaderboardVal,
        qa_enabled ? 1 : 0,
        qa_moderation ? 1 : 0
      );

      const insertQ = db.prepare(`
        INSERT INTO poll_questions (id, poll_id, order_num, question_text, question_type, options_json, correct_answer)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      questions.forEach((q, idx) => {
        const qId = generateId();
        if (idx === 0) firstQuestionId = qId;

        let optionsJson = null;
        if (q.question_type === 'multiple_choice' || q.question_type === 'ranking') {
          optionsJson = JSON.stringify(q.options || ['Option 1', 'Option 2', 'Option 3']);
        } else if (q.question_type === 'rating') {
          optionsJson = JSON.stringify({ max: q.maxRating || 5 });
        } else if (q.question_type === 'word_cloud') {
          optionsJson = JSON.stringify({ allowMultiple: q.allowMultiple !== false });
        }

        insertQ.run(
          qId,
          pollId,
          idx + 1,
          q.question_text || `Question ${idx + 1}`,
          q.question_type || 'multiple_choice',
          optionsJson,
          q.correctAnswer || q.correct_answer || null
        );
      });

      if (firstQuestionId) {
        db.prepare('UPDATE polls SET current_question_id = ? WHERE id = ?').run(firstQuestionId, pollId);
      }
    });

    insertTransaction();

    const createdPoll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
    const createdQuestions = db.prepare('SELECT * FROM poll_questions WHERE poll_id = ? ORDER BY order_num ASC').all(pollId);

    res.status(201).json({
      poll: createdPoll,
      questions: createdQuestions
    });
  } catch (err) {
    console.error('[Poll Create Error]', err);
    res.status(500).json({ error: err.message || 'Failed to create poll' });
  }
});

/**
 * GET /api/polls/:id
 * Get poll details for the creator / host studio
 */
router.get('/:id', (req, res) => {
  try {
    const poll = getAuthorizedPoll(req.params.id, req);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll === 'UNAUTHORIZED') return res.status(403).json({ error: 'Unauthorized access to this poll' });

    const questions = db.prepare('SELECT * FROM poll_questions WHERE poll_id = ? ORDER BY order_num ASC').all(poll.id);

    // Compute live results for all questions for the host dashboard
    const questionsWithResults = questions.map(q => {
      let parsedOptions = [];
      try {
        parsedOptions = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : (q.options_json || []);
      } catch (e) {
        parsedOptions = [];
      }

      return {
        ...q,
        options: parsedOptions,
        results: computeQuestionResults(q, poll.id)
      };
    });

    const totalVotes = db.prepare('SELECT COUNT(*) as count FROM poll_votes WHERE poll_id = ?').get(poll.id).count;
    const totalParticipants = db.prepare('SELECT COUNT(DISTINCT participant_id) as count FROM poll_votes WHERE poll_id = ?').get(poll.id).count;
    const qaQuestions = db.prepare('SELECT * FROM poll_qa_questions WHERE poll_id = ? ORDER BY is_highlighted DESC, upvotes DESC, created_at DESC').all(poll.id);

    // Compute audience engagement stats
    const totalAudienceRows = db.prepare(`
      SELECT participant_id FROM poll_votes WHERE poll_id = ?
      UNION
      SELECT participant_id FROM poll_qa_questions WHERE poll_id = ?
      UNION
      SELECT participant_id FROM poll_qa_upvotes WHERE qa_question_id IN (SELECT id FROM poll_qa_questions WHERE poll_id = ?)
      UNION
      SELECT participant_id FROM poll_participants WHERE poll_id = ?
    `).all(poll.id, poll.id, poll.id, poll.id);
    const totalAudience = totalAudienceRows.length;
    const uniqueVoters = totalParticipants;
    const uniqueQaParticipants = db.prepare(`
      SELECT COUNT(DISTINCT participant_id) as count FROM (
        SELECT participant_id FROM poll_qa_questions WHERE poll_id = ?
        UNION
        SELECT participant_id FROM poll_qa_upvotes WHERE qa_question_id IN (SELECT id FROM poll_qa_questions WHERE poll_id = ?)
      )
    `).get(poll.id, poll.id).count;
    const pollEngagementPct = totalAudience > 0 ? Math.round((uniqueVoters / totalAudience) * 100) : 0;
    const qaEngagementPct = totalAudience > 0 ? Math.round((uniqueQaParticipants / totalAudience) * 100) : 0;

    const stats = {
      totalVotes,
      uniqueParticipants: totalParticipants,
      totalAudience,
      uniqueVoters,
      uniqueQaParticipants,
      pollEngagementPct,
      qaEngagementPct,
      questionCount: questions.length,
      qaCount: qaQuestions.length
    };

    res.json({
      poll: {
        ...poll,
        voting_open: Boolean(poll.voting_open),
        show_results: Boolean(poll.show_results),
        show_correct_answer: Boolean(poll.show_correct_answer),
        is_quiz_mode: Boolean(poll.is_quiz_mode),
        show_leaderboard: Boolean(poll.show_leaderboard),
        qa_enabled: Boolean(poll.qa_enabled),
        qa_moderation: Boolean(poll.qa_moderation)
      },
      questions: questionsWithResults,
      totalVotes,
      totalParticipants,
      totalAudience,
      uniqueVoters,
      uniqueQaParticipants,
      pollEngagementPct,
      qaEngagementPct,
      stats,
      qaQuestions
    });
  } catch (err) {
    console.error('[Poll Get Error]', err);
    res.status(500).json({ error: 'Failed to fetch poll details' });
  }
});

/**
 * PUT /api/polls/:id
 * Update poll settings and questions
 */
router.put('/:id', (req, res) => {
  try {
    const poll = getAuthorizedPoll(req.params.id, req);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll === 'UNAUTHORIZED') return res.status(403).json({ error: 'Unauthorized access to this poll' });

    const {
      title,
      description,
      code: customCode,
      qa_enabled,
      qa_moderation,
      is_quiz_mode,
      isQuizMode,
      show_leaderboard,
      showLeaderboard,
      questions
    } = req.body;

    let pollCode = (customCode || poll.code).trim().toUpperCase();
    if (pollCode !== poll.code) {
      if (!/^[A-Z0-9_-]{3,20}$/.test(pollCode)) {
        return res.status(400).json({ error: 'Code must be 3-20 characters alphanumeric (A-Z, 0-9, - or _)' });
      }
      const existing = db.prepare('SELECT id FROM polls WHERE code = ? AND id != ?').get(pollCode, poll.id);
      if (existing) {
        return res.status(400).json({ error: 'This code is already taken. Please choose another.' });
      }
    }

    const quizModeVal = (is_quiz_mode !== undefined || isQuizMode !== undefined)
      ? ((is_quiz_mode || isQuizMode) ? 1 : 0)
      : poll.is_quiz_mode;

    const showLeaderboardVal = (show_leaderboard !== undefined || showLeaderboard !== undefined)
      ? ((show_leaderboard || showLeaderboard) ? 1 : 0)
      : poll.show_leaderboard;

    const updateTx = db.transaction(() => {
      db.prepare(`
        UPDATE polls SET
          title = ?,
          description = ?,
          code = ?,
          is_quiz_mode = ?,
          show_leaderboard = ?,
          qa_enabled = ?,
          qa_moderation = ?
        WHERE id = ?
      `).run(
        title !== undefined ? title.trim() : poll.title,
        description !== undefined ? (description ? description.trim() : null) : poll.description,
        pollCode,
        quizModeVal,
        showLeaderboardVal,
        qa_enabled !== undefined ? (qa_enabled ? 1 : 0) : poll.qa_enabled,
        qa_moderation !== undefined ? (qa_moderation ? 1 : 0) : poll.qa_moderation,
        poll.id
      );

      if (Array.isArray(questions)) {
        // Keep track of existing IDs
        const existingQs = db.prepare('SELECT id FROM poll_questions WHERE poll_id = ?').all(poll.id);
        const updatedIds = questions.filter(q => q.id).map(q => q.id);
        const toDelete = existingQs.filter(q => !updatedIds.includes(q.id));

        for (const del of toDelete) {
          db.prepare('DELETE FROM poll_questions WHERE id = ?').run(del.id);
        }

        const updateQ = db.prepare(`
          UPDATE poll_questions SET
            order_num = ?,
            question_text = ?,
            question_type = ?,
            options_json = ?,
            correct_answer = ?
          WHERE id = ?
        `);

        const insertQ = db.prepare(`
          INSERT INTO poll_questions (id, poll_id, order_num, question_text, question_type, options_json, correct_answer)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        questions.forEach((q, idx) => {
          let optionsJson = null;
          if (q.question_type === 'multiple_choice' || q.question_type === 'ranking') {
            optionsJson = JSON.stringify(q.options || ['Option 1', 'Option 2', 'Option 3']);
          } else if (q.question_type === 'rating') {
            optionsJson = JSON.stringify({ max: q.maxRating || 5 });
          } else if (q.question_type === 'word_cloud') {
            optionsJson = JSON.stringify({ allowMultiple: q.allowMultiple !== false });
          }

          const correctAnswer = q.correctAnswer || q.correct_answer || null;

          if (q.id && existingQs.some(e => e.id === q.id)) {
            updateQ.run(idx + 1, q.question_text, q.question_type, optionsJson, correctAnswer, q.id);
          } else {
            const newQId = generateId();
            insertQ.run(newQId, poll.id, idx + 1, q.question_text, q.question_type, optionsJson, correctAnswer);
          }
        });

        // Ensure current_question_id points to a valid question
        const validQs = db.prepare('SELECT id FROM poll_questions WHERE poll_id = ? ORDER BY order_num ASC').all(poll.id);
        if (validQs.length > 0 && (!poll.current_question_id || !validQs.some(v => v.id === poll.current_question_id))) {
          db.prepare('UPDATE polls SET current_question_id = ? WHERE id = ?').run(validQs[0].id, poll.id);
        }
      }
    });

    updateTx();

    const updatedPoll = db.prepare('SELECT * FROM polls WHERE id = ?').get(poll.id);
    const updatedQuestions = db.prepare('SELECT * FROM poll_questions WHERE poll_id = ? ORDER BY order_num ASC').all(poll.id);

    res.json({
      poll: updatedPoll,
      questions: updatedQuestions
    });
  } catch (err) {
    console.error('[Poll Update Error]', err);
    res.status(500).json({ error: err.message || 'Failed to update poll' });
  }
});

/**
 * DELETE /api/polls/:id
 * Delete a poll and all associated records
 */
router.delete('/:id', (req, res) => {
  try {
    const poll = getAuthorizedPoll(req.params.id, req);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll === 'UNAUTHORIZED') return res.status(403).json({ error: 'Unauthorized' });

    db.prepare('DELETE FROM polls WHERE id = ?').run(poll.id);
    res.json({ message: 'Poll deleted successfully' });
  } catch (err) {
    console.error('[Poll Delete Error]', err);
    res.status(500).json({ error: 'Failed to delete poll' });
  }
});

/**
 * POST /api/polls/:id/purge
 * Purge all responses, votes, quiz players, scores, and Q&A from a poll
 */
router.post('/:id/purge', (req, res) => {
  try {
    const poll = getAuthorizedPoll(req.params.id, req);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll === 'UNAUTHORIZED') return res.status(403).json({ error: 'Unauthorized' });

    const purgeTx = db.transaction(() => {
      // 1. Delete all votes
      db.prepare('DELETE FROM poll_votes WHERE poll_id = ?').run(poll.id);

      // 2. Delete all Q&A upvotes
      db.prepare(`
        DELETE FROM poll_qa_upvotes 
        WHERE qa_question_id IN (SELECT id FROM poll_qa_questions WHERE poll_id = ?)
      `).run(poll.id);

      // 3. Delete all Q&A questions
      db.prepare('DELETE FROM poll_qa_questions WHERE poll_id = ?').run(poll.id);

      // 4. Delete all quiz participants
      db.prepare('DELETE FROM poll_participants WHERE poll_id = ?').run(poll.id);

      // 5. Reset poll flags
      db.prepare(`
        UPDATE polls SET
          show_correct_answer = 0,
          show_leaderboard = 0,
          closed_at = NULL
        WHERE id = ?
      `).run(poll.id);
    });

    purgeTx();

    // Broadcast reset to all clients in the poll room
    const io = getIO();
    if (io) {
      io.to(`poll:${poll.id}`).emit('poll:data_purged', {
        pollId: poll.id,
        message: 'All poll responses, quiz players, and Q&A have been purged'
      });
      io.to(`poll:${poll.id}`).emit('poll:leaderboard_update', { leaderboard: [] });
      io.to(`poll:${poll.id}`).emit('poll:results_update', { results: null, totalVotes: 0 });
      io.to(`poll:${poll.id}`).emit('qa:list', []);
    }

    res.json({ message: 'All responses, quiz players, and Q&A have been purged successfully.' });
  } catch (err) {
    console.error('[Poll Purge Error]', err);
    res.status(500).json({ error: 'Failed to purge poll data' });
  }
});

/**
 * POST /api/polls/:id/duplicate
 * Duplicate an existing poll with all its questions
 */
router.post('/:id/duplicate', (req, res) => {
  try {
    const originalPoll = getAuthorizedPoll(req.params.id, req);
    if (!originalPoll) return res.status(404).json({ error: 'Poll not found' });
    if (originalPoll === 'UNAUTHORIZED') return res.status(403).json({ error: 'Unauthorized' });

    const originalQuestions = db.prepare('SELECT * FROM poll_questions WHERE poll_id = ? ORDER BY order_num ASC').all(originalPoll.id);

    const newPollId = generateId();
    let newCode;
    let attempts = 0;
    do {
      newCode = generatePollPin(6);
      const exists = db.prepare('SELECT id FROM polls WHERE code = ?').get(newCode);
      if (!exists) break;
      attempts++;
    } while (attempts < 20);

    const targetUserId = req.user.id;
    let firstQuestionId = null;

    const dupTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO polls (id, code, user_id, title, description, status, current_question_id, voting_open, show_results, is_quiz_mode, qa_enabled, qa_moderation)
        VALUES (?, ?, ?, ?, ?, 'draft', NULL, 1, 1, ?, ?, ?)
      `).run(
        newPollId,
        newCode,
        targetUserId,
        `Copy of ${originalPoll.title}`,
        originalPoll.description,
        originalPoll.is_quiz_mode || 0,
        originalPoll.qa_enabled,
        originalPoll.qa_moderation
      );

      const insertQ = db.prepare(`
        INSERT INTO poll_questions (id, poll_id, order_num, question_text, question_type, options_json, correct_answer)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      originalQuestions.forEach((q, idx) => {
        const qId = generateId();
        if (idx === 0) firstQuestionId = qId;
        insertQ.run(qId, newPollId, q.order_num, q.question_text, q.question_type, q.options_json, q.correct_answer || null);
      });

      if (firstQuestionId) {
        db.prepare('UPDATE polls SET current_question_id = ? WHERE id = ?').run(firstQuestionId, newPollId);
      }
    });

    dupTx();

    const duplicated = db.prepare('SELECT * FROM polls WHERE id = ?').get(newPollId);
    res.status(201).json({ poll: duplicated });
  } catch (err) {
    console.error('[Poll Duplicate Error]', err);
    res.status(500).json({ error: 'Failed to duplicate poll' });
  }
});

/**
 * POST /api/polls/:id/status
 * Start (live) or close a poll session
 */
router.post('/:id/status', (req, res) => {
  try {
    const poll = getAuthorizedPoll(req.params.id, req);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll === 'UNAUTHORIZED') return res.status(403).json({ error: 'Unauthorized' });

    const { status } = req.body;
    if (!['draft', 'live', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be draft, live, or closed' });
    }

    const closedAt = status === 'closed' ? new Date().toISOString() : null;
    db.prepare('UPDATE polls SET status = ?, closed_at = ? WHERE id = ?').run(status, closedAt, poll.id);

    const io = getIO();
    if (io) {
      io.to(`poll:${poll.id}`).emit('poll:status_changed', { status });
    }

    res.json({ status, closed_at: closedAt });
  } catch (err) {
    console.error('[Poll Status Error]', err);
    res.status(500).json({ error: 'Failed to update poll status' });
  }
});

/**
 * POST /api/polls/:id/question
 * Set the currently active question
 */
router.post('/:id/question', (req, res) => {
  try {
    const poll = getAuthorizedPoll(req.params.id, req);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll === 'UNAUTHORIZED') return res.status(403).json({ error: 'Unauthorized' });

    const { question_id } = req.body;
    const question = db.prepare('SELECT * FROM poll_questions WHERE id = ? AND poll_id = ?').get(question_id, poll.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found in this poll' });
    }

    db.prepare('UPDATE polls SET current_question_id = ?, voting_open = 1 WHERE id = ?').run(question_id, poll.id);

    const io = getIO();
    if (io) {
      let parsedOptions = [];
      try {
        parsedOptions = typeof question.options_json === 'string' ? JSON.parse(question.options_json) : (question.options_json || []);
      } catch (e) {
        parsedOptions = [];
      }

      const results = computeQuestionResults(question, poll.id);

      io.to(`poll:${poll.id}`).emit('poll:question_changed', {
        currentQuestion: {
          id: question.id,
          order_num: question.order_num,
          question_text: question.question_text,
          question_type: question.question_type,
          options: parsedOptions
        },
        voting_open: true,
        liveResults: (poll.show_results === 1) ? results : null
      });
    }

    res.json({ current_question_id: question_id });
  } catch (err) {
    console.error('[Poll Set Question Error]', err);
    res.status(500).json({ error: 'Failed to set active question' });
  }
});

/**
 * POST /api/polls/:id/toggle-voting
 * Lock or open voting for the active question
 */
router.post('/:id/toggle-voting', (req, res) => {
  try {
    const poll = getAuthorizedPoll(req.params.id, req);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll === 'UNAUTHORIZED') return res.status(403).json({ error: 'Unauthorized' });

    const newVotingOpen = poll.voting_open === 1 ? 0 : 1;
    db.prepare('UPDATE polls SET voting_open = ? WHERE id = ?').run(newVotingOpen, poll.id);

    const io = getIO();
    if (io) {
      io.to(`poll:${poll.id}`).emit('poll:voting_toggled', { voting_open: Boolean(newVotingOpen) });
    }

    res.json({ voting_open: Boolean(newVotingOpen) });
  } catch (err) {
    console.error('[Poll Toggle Voting Error]', err);
    res.status(500).json({ error: 'Failed to toggle voting' });
  }
});

/**
 * POST /api/polls/:id/toggle-results
 * Show or hide live results from participants
 */
router.post('/:id/toggle-results', (req, res) => {
  try {
    const poll = getAuthorizedPoll(req.params.id, req);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll === 'UNAUTHORIZED') return res.status(403).json({ error: 'Unauthorized' });

    const newShowResults = poll.show_results === 1 ? 0 : 1;
    db.prepare('UPDATE polls SET show_results = ? WHERE id = ?').run(newShowResults, poll.id);

    const io = getIO();
    if (io) {
      let results = null;
      if (newShowResults === 1 && poll.current_question_id) {
        const question = db.prepare('SELECT * FROM poll_questions WHERE id = ?').get(poll.current_question_id);
        if (question) {
          results = computeQuestionResults(question, poll.id);
        }
      }
      io.to(`poll:${poll.id}`).emit('poll:results_toggled', {
        show_results: Boolean(newShowResults),
        liveResults: results
      });
    }

    res.json({ show_results: Boolean(newShowResults) });
  } catch (err) {
    console.error('[Poll Toggle Results Error]', err);
    res.status(500).json({ error: 'Failed to toggle results visibility' });
  }
});

/**
 * GET /api/polls/:id/analytics
 * Comprehensive analytics and saved results for review
 */
router.get('/:id/analytics', (req, res) => {
  try {
    const poll = getAuthorizedPoll(req.params.id, req);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll === 'UNAUTHORIZED') return res.status(403).json({ error: 'Unauthorized' });

    const questions = db.prepare('SELECT * FROM poll_questions WHERE poll_id = ? ORDER BY order_num ASC').all(poll.id);

    const questionsAnalytics = questions.map(q => {
      let parsedOptions = [];
      try {
        parsedOptions = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : (q.options_json || []);
      } catch (e) {
        parsedOptions = [];
      }

      return {
        ...q,
        options: parsedOptions,
        results: computeQuestionResults(q, poll.id)
      };
    });

    const totalVotes = db.prepare('SELECT COUNT(*) as count FROM poll_votes WHERE poll_id = ?').get(poll.id).count;
    const totalParticipants = db.prepare('SELECT COUNT(DISTINCT participant_id) as count FROM poll_votes WHERE poll_id = ?').get(poll.id).count;
    const qaQuestions = db.prepare('SELECT * FROM poll_qa_questions WHERE poll_id = ? ORDER BY is_highlighted DESC, upvotes DESC, created_at DESC').all(poll.id);

    // Compute audience engagement stats
    const totalAudienceRows = db.prepare(`
      SELECT participant_id FROM poll_votes WHERE poll_id = ?
      UNION
      SELECT participant_id FROM poll_qa_questions WHERE poll_id = ?
      UNION
      SELECT participant_id FROM poll_qa_upvotes WHERE qa_question_id IN (SELECT id FROM poll_qa_questions WHERE poll_id = ?)
      UNION
      SELECT participant_id FROM poll_participants WHERE poll_id = ?
    `).all(poll.id, poll.id, poll.id, poll.id);
    const totalAudience = totalAudienceRows.length;
    const uniqueVoters = totalParticipants;
    const uniqueQaParticipants = db.prepare(`
      SELECT COUNT(DISTINCT participant_id) as count FROM (
        SELECT participant_id FROM poll_qa_questions WHERE poll_id = ?
        UNION
        SELECT participant_id FROM poll_qa_upvotes WHERE qa_question_id IN (SELECT id FROM poll_qa_questions WHERE poll_id = ?)
      )
    `).get(poll.id, poll.id).count;
    const pollEngagementPct = totalAudience > 0 ? Math.round((uniqueVoters / totalAudience) * 100) : 0;
    const qaEngagementPct = totalAudience > 0 ? Math.round((uniqueQaParticipants / totalAudience) * 100) : 0;

    const stats = {
      totalVotes,
      uniqueParticipants: totalParticipants,
      totalAudience,
      uniqueVoters,
      uniqueQaParticipants,
      pollEngagementPct,
      qaEngagementPct,
      questionCount: questions.length,
      qaCount: qaQuestions.length
    };

    const leaderboard = poll.is_quiz_mode === 1 ? computePollLeaderboard(poll.id) : [];

    res.json({
      poll,
      stats,
      totalVotes,
      totalParticipants,
      totalAudience,
      uniqueVoters,
      uniqueQaParticipants,
      pollEngagementPct,
      qaEngagementPct,
      questions: questionsAnalytics,
      qaQuestions,
      leaderboard
    });
  } catch (err) {
    console.error('[Poll Analytics Error]', err);
    res.status(500).json({ error: 'Failed to load poll analytics' });
  }
});

/**
 * GET /api/polls/:id/export
 * Export votes to CSV
 */
router.get('/:id/export', (req, res) => {
  try {
    const poll = getAuthorizedPoll(req.params.id, req);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll === 'UNAUTHORIZED') return res.status(403).json({ error: 'Unauthorized' });

    let csv;
    if (poll.is_quiz_mode === 1) {
      const votes = db.prepare(`
        SELECT 
          v.id as vote_id,
          COALESCE(pp.name, 'Anonymous') as participant_name,
          COALESCE(pp.avatar, '') as participant_avatar,
          q.order_num as question_number,
          q.question_text,
          q.question_type,
          v.value as response_value,
          COALESCE(q.correct_answer, '') as correct_answer,
          CASE 
            WHEN q.correct_answer IS NOT NULL AND TRIM(q.correct_answer) != '' AND LOWER(TRIM(v.value)) = LOWER(TRIM(q.correct_answer)) THEN 'CORRECT'
            WHEN q.correct_answer IS NOT NULL AND TRIM(q.correct_answer) != '' THEN 'INCORRECT'
            ELSE 'N/A'
          END as result_status,
          v.participant_id,
          v.created_at as voted_at
        FROM poll_votes v
        JOIN poll_questions q ON v.question_id = q.id
        LEFT JOIN poll_participants pp ON pp.participant_id = v.participant_id AND pp.poll_id = v.poll_id
        WHERE v.poll_id = ?
        ORDER BY q.order_num ASC, v.created_at ASC
      `).all(poll.id);

      votes.forEach(v => {
        if (v.question_type === 'ranking') {
          try {
            const arr = typeof v.response_value === 'string' && (v.response_value.startsWith('[') || v.response_value.startsWith('{')) ? JSON.parse(v.response_value) : null;
            if (Array.isArray(arr)) {
              v.response_value = arr.map((item, idx) => `${idx + 1}. ${item}`).join(' > ');
            }
          } catch (e) {}
        }
      });

      const fields = [
        'vote_id',
        'participant_name',
        'participant_avatar',
        'question_number',
        'question_text',
        'question_type',
        'response_value',
        'correct_answer',
        'result_status',
        'participant_id',
        'voted_at'
      ];
      const json2csvParser = new Parser({ fields });
      csv = json2csvParser.parse(votes);
    } else {
      const votes = db.prepare(`
        SELECT 
          v.id as vote_id,
          q.order_num as question_number,
          q.question_text,
          q.question_type,
          v.value as response_value,
          v.participant_id,
          v.created_at as voted_at
        FROM poll_votes v
        JOIN poll_questions q ON v.question_id = q.id
        WHERE v.poll_id = ?
        ORDER BY q.order_num ASC, v.created_at ASC
      `).all(poll.id);

      votes.forEach(v => {
        if (v.question_type === 'ranking') {
          try {
            const arr = typeof v.response_value === 'string' && (v.response_value.startsWith('[') || v.response_value.startsWith('{')) ? JSON.parse(v.response_value) : null;
            if (Array.isArray(arr)) {
              v.response_value = arr.map((item, idx) => `${idx + 1}. ${item}`).join(' > ');
            }
          } catch (e) {}
        }
      });

      const fields = ['vote_id', 'question_number', 'question_text', 'question_type', 'response_value', 'participant_id', 'voted_at'];
      const json2csvParser = new Parser({ fields });
      csv = json2csvParser.parse(votes);
    }

    res.header('Content-Type', 'text/csv');
    res.attachment(`poll-${poll.code}-results.csv`);
    res.send(csv);
  } catch (err) {
    console.error('[Poll Export Error]', err);
    res.status(500).json({ error: 'Failed to export poll results' });
  }
});

module.exports = router;
