const { Server } = require('socket.io');
const db = require('../config/db');
const { generateId } = require('../utils/id');

let io = null;

function computeQuestionResults(question, pollId) {
  if (!question) return null;

  const totalVotes = db.prepare('SELECT COUNT(*) as count FROM poll_votes WHERE question_id = ?').get(question.id).count;
  const rawVotes = db.prepare('SELECT value FROM poll_votes WHERE question_id = ? ORDER BY created_at ASC').all(question.id);

  if (question.question_type === 'multiple_choice') {
    let options = [];
    try {
      options = typeof question.options_json === 'string' ? JSON.parse(question.options_json) : (question.options_json || []);
    } catch (e) {
      options = [];
    }

    const voteCounts = {};
    options.forEach(opt => { voteCounts[opt] = 0; });
    rawVotes.forEach(v => {
      voteCounts[v.value] = (voteCounts[v.value] || 0) + 1;
    });

    const results = options.map(opt => ({
      option: opt,
      count: voteCounts[opt] || 0,
      percentage: totalVotes > 0 ? Math.round(((voteCounts[opt] || 0) / totalVotes) * 100) : 0
    }));

    return {
      type: 'multiple_choice',
      totalVotes,
      results
    };
  }

  if (question.question_type === 'word_cloud') {
    const wordFrequency = {};
    rawVotes.forEach(v => {
      // Normalise phrases: trim, lowercase
      const word = (v.value || '').trim();
      if (!word) return;
      const lower = word.toLowerCase();
      // Keep capitalized display version of most frequent capitalization
      if (!wordFrequency[lower]) {
        wordFrequency[lower] = { text: word, count: 0 };
      }
      wordFrequency[lower].count += 1;
    });

    const words = Object.values(wordFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    return {
      type: 'word_cloud',
      totalVotes,
      words
    };
  }

  if (question.question_type === 'rating') {
    let maxRating = 5;
    try {
      const opts = typeof question.options_json === 'string' ? JSON.parse(question.options_json) : (question.options_json || {});
      maxRating = opts.max || 5;
    } catch (e) {
      maxRating = 5;
    }

    const counts = {};
    for (let i = 1; i <= maxRating; i++) counts[i] = 0;

    let sum = 0;
    rawVotes.forEach(v => {
      const num = parseInt(v.value, 10);
      if (!isNaN(num) && num >= 1 && num <= maxRating) {
        counts[num] = (counts[num] || 0) + 1;
        sum += num;
      }
    });

    const average = totalVotes > 0 ? Number((sum / totalVotes).toFixed(1)) : 0;

    return {
      type: 'rating',
      totalVotes,
      maxRating,
      average,
      counts
    };
  }

  // open_text or default
  return {
    type: 'open_text',
    totalVotes,
    responses: rawVotes.slice(-30).map(v => v.value)
  };
}

function getPollQA(pollId, isHost = false) {
  let query = 'SELECT * FROM poll_qa_questions WHERE poll_id = ?';
  if (!isHost) {
    query += ' AND is_approved = 1';
  }
  query += ' ORDER BY is_highlighted DESC, upvotes DESC, created_at DESC';
  return db.prepare(query).all(pollId);
}

// Map<pollId, Map<socketId, participantId>> to count only active voting participants
const pollVoters = new Map();

function getActiveVoterCount(pollId) {
  if (!pollVoters.has(pollId)) return 0;
  return new Set(pollVoters.get(pollId).values()).size;
}

function getPollState(pollId, participantId = null, isHost = false) {
  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
  if (!poll) return null;

  const questions = db.prepare('SELECT * FROM poll_questions WHERE poll_id = ? ORDER BY order_num ASC').all(pollId);
  const currentQuestion = questions.find(q => q.id === poll.current_question_id) || questions[0] || null;

  let liveResults = null;
  if (currentQuestion && (isHost || poll.show_results === 1)) {
    liveResults = computeQuestionResults(currentQuestion, pollId);
  }

  let userVote = null;
  if (currentQuestion && participantId) {
    const existingVote = db.prepare('SELECT value FROM poll_votes WHERE question_id = ? AND participant_id = ?').get(currentQuestion.id, participantId);
    if (existingVote) {
      userVote = existingVote.value;
    }
  }

  const qaQuestions = getPollQA(pollId, isHost);

  // User upvoted list
  let userUpvotes = [];
  if (participantId) {
    userUpvotes = db.prepare('SELECT qa_question_id FROM poll_qa_upvotes WHERE participant_id = ?').all(participantId).map(r => r.qa_question_id);
  }

  const participantCount = getActiveVoterCount(pollId);

  return {
    poll: {
      id: poll.id,
      code: poll.code,
      title: poll.title,
      description: poll.description,
      status: poll.status,
      current_question_id: poll.current_question_id,
      voting_open: Boolean(poll.voting_open),
      show_results: Boolean(poll.show_results),
      qa_enabled: Boolean(poll.qa_enabled),
      qa_moderation: Boolean(poll.qa_moderation),
      created_at: poll.created_at,
      closed_at: poll.closed_at
    },
    questions: isHost ? questions : undefined,
    currentQuestion: currentQuestion ? {
      id: currentQuestion.id,
      order_num: currentQuestion.order_num,
      question_text: currentQuestion.question_text,
      question_type: currentQuestion.question_type,
      options: (() => {
        try {
          return typeof currentQuestion.options_json === 'string' ? JSON.parse(currentQuestion.options_json) : (currentQuestion.options_json || []);
        } catch (e) {
          return [];
        }
      })()
    } : null,
    liveResults,
    userVote,
    hasVoted: Boolean(userVote),
    qaQuestions,
    userUpvotes,
    participantCount
  };
}

function initPollSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true
    },
    pingInterval: 10000,
    pingTimeout: 5000
  });

  io.on('connection', (socket) => {
    let currentPollId = null;
    let currentParticipantId = null;
    let isSocketHost = false;

    socket.on('poll:join', ({ pollId, participantId, isHost = false, isPresenter = false }) => {
      if (!pollId) return;

      currentPollId = pollId;
      currentParticipantId = participantId;
      isSocketHost = Boolean(isHost);

      const roomName = `poll:${pollId}`;
      socket.join(roomName);

      // Only count actual voting participants (not host, not presenter screen)
      const isVoter = !isHost && !isPresenter;
      if (isVoter && participantId) {
        if (!pollVoters.has(pollId)) {
          pollVoters.set(pollId, new Map());
        }
        pollVoters.get(pollId).set(socket.id, participantId);
      }

      // Send current state to joining socket
      const state = getPollState(pollId, participantId, isSocketHost);
      if (state) {
        socket.emit('poll:state', state);

        // Broadcast participant count update (only actual voting participants!)
        io.to(roomName).emit('poll:participant_count', { count: getActiveVoterCount(pollId) });
      }
    });

    socket.on('poll:submit_vote', ({ pollId, questionId, participantId, value }) => {
      try {
        const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
        if (!poll || poll.status !== 'live') {
          return socket.emit('poll:error', { message: 'Poll is not currently live' });
        }
        if (poll.voting_open === 0) {
          return socket.emit('poll:error', { message: 'Voting is currently locked for this question' });
        }
        if (poll.current_question_id !== questionId) {
          return socket.emit('poll:error', { message: 'This question is no longer active' });
        }

        const question = db.prepare('SELECT * FROM poll_questions WHERE id = ?').get(questionId);
        if (!question) {
          return socket.emit('poll:error', { message: 'Question not found' });
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

        socket.emit('poll:vote_confirmed', { questionId, value });

        // Broadcast updated results if show_results is enabled
        const results = computeQuestionResults(question, pollId);
        io.to(`poll:${pollId}`).emit('poll:results_update', {
          questionId,
          results: (poll.show_results === 1) ? results : null,
          totalVotes: results.totalVotes
        });
      } catch (err) {
        console.error('[Socket Vote Error]', err);
        socket.emit('poll:error', { message: 'Failed to record vote' });
      }
    });

    socket.on('poll:host_set_question', ({ pollId, questionId }) => {
      try {
        db.prepare('UPDATE polls SET current_question_id = ?, voting_open = 1 WHERE id = ?').run(questionId, pollId);
        const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
        const question = db.prepare('SELECT * FROM poll_questions WHERE id = ?').get(questionId);

        let parsedOptions = [];
        try {
          parsedOptions = typeof question.options_json === 'string' ? JSON.parse(question.options_json) : (question.options_json || []);
        } catch (e) {
          parsedOptions = [];
        }

        const results = computeQuestionResults(question, pollId);

        io.to(`poll:${pollId}`).emit('poll:question_changed', {
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
      } catch (err) {
        console.error('[Socket Host Set Question Error]', err);
      }
    });

    socket.on('poll:host_toggle_voting', ({ pollId, voting_open }) => {
      try {
        const val = voting_open ? 1 : 0;
        db.prepare('UPDATE polls SET voting_open = ? WHERE id = ?').run(val, pollId);
        io.to(`poll:${pollId}`).emit('poll:voting_toggled', { voting_open: Boolean(val) });
      } catch (err) {
        console.error('[Socket Host Toggle Voting Error]', err);
      }
    });

    socket.on('poll:host_toggle_results', ({ pollId, show_results }) => {
      try {
        const val = show_results ? 1 : 0;
        db.prepare('UPDATE polls SET show_results = ? WHERE id = ?').run(val, pollId);

        const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
        let results = null;
        if (val === 1 && poll.current_question_id) {
          const question = db.prepare('SELECT * FROM poll_questions WHERE id = ?').get(poll.current_question_id);
          if (question) {
            results = computeQuestionResults(question, pollId);
          }
        }

        io.to(`poll:${pollId}`).emit('poll:results_toggled', {
          show_results: Boolean(val),
          liveResults: results
        });
      } catch (err) {
        console.error('[Socket Host Toggle Results Error]', err);
      }
    });

    socket.on('poll:host_change_status', ({ pollId, status }) => {
      try {
        const closedAt = status === 'closed' ? new Date().toISOString() : null;
        db.prepare('UPDATE polls SET status = ?, closed_at = ? WHERE id = ?').run(status, closedAt, pollId);
        io.to(`poll:${pollId}`).emit('poll:status_changed', { status });
      } catch (err) {
        console.error('[Socket Host Change Status Error]', err);
      }
    });

    socket.on('qa:submit', ({ pollId, participantId, author_name, question_text }) => {
      try {
        const text = (question_text || '').trim();
        if (!text) return;

        const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
        if (!poll || poll.qa_enabled === 0) return;

        const isApproved = poll.qa_moderation === 1 ? 0 : 1;
        const newId = generateId();
        const author = (author_name || '').trim() || 'Anonymous';

        db.prepare(`
          INSERT INTO poll_qa_questions (id, poll_id, participant_id, author_name, question_text, upvotes, is_approved)
          VALUES (?, ?, ?, ?, ?, 0, ?)
        `).run(newId, pollId, participantId, author, text, isApproved);

        const createdItem = db.prepare('SELECT * FROM poll_qa_questions WHERE id = ?').get(newId);

        if (isApproved === 1) {
          io.to(`poll:${pollId}`).emit('qa:question_added', createdItem);
        } else {
          // If moderation is on, send to all sockets (client handles host vs participant display)
          io.to(`poll:${pollId}`).emit('qa:pending_question', createdItem);
        }
      } catch (err) {
        console.error('[Socket QA Submit Error]', err);
      }
    });

    socket.on('qa:upvote', ({ pollId, qaQuestionId, participantId }) => {
      try {
        const existing = db.prepare('SELECT id FROM poll_qa_upvotes WHERE qa_question_id = ? AND participant_id = ?').get(qaQuestionId, participantId);
        let hasUpvoted = false;

        if (existing) {
          // Remove upvote (toggle)
          db.prepare('DELETE FROM poll_qa_upvotes WHERE id = ?').run(existing.id);
          db.prepare('UPDATE poll_qa_questions SET upvotes = MAX(0, upvotes - 1) WHERE id = ?').run(qaQuestionId);
          hasUpvoted = false;
        } else {
          db.prepare('INSERT INTO poll_qa_upvotes (id, qa_question_id, participant_id) VALUES (?, ?, ?)').run(generateId(), qaQuestionId, participantId);
          db.prepare('UPDATE poll_qa_questions SET upvotes = upvotes + 1 WHERE id = ?').run(qaQuestionId);
          hasUpvoted = true;
        }

        const updated = db.prepare('SELECT id, upvotes FROM poll_qa_questions WHERE id = ?').get(qaQuestionId);
        if (updated) {
          socket.emit('qa:my_upvote_status', { qaQuestionId, hasUpvoted });
          io.to(`poll:${pollId}`).emit('qa:upvote_updated', {
            qaQuestionId,
            upvotes: updated.upvotes
          });
        }
      } catch (err) {
        console.error('[Socket QA Upvote Error]', err);
      }
    });

    socket.on('qa:host_moderate', ({ pollId, qaQuestionId, action }) => {
      try {
        if (action === 'approve') {
          db.prepare('UPDATE poll_qa_questions SET is_approved = 1 WHERE id = ?').run(qaQuestionId);
          const item = db.prepare('SELECT * FROM poll_qa_questions WHERE id = ?').get(qaQuestionId);
          io.to(`poll:${pollId}`).emit('qa:question_added', item);
        } else if (action === 'answer') {
          db.prepare('UPDATE poll_qa_questions SET is_answered = 1, is_highlighted = 0 WHERE id = ?').run(qaQuestionId);
          io.to(`poll:${pollId}`).emit('qa:question_answered', { qaQuestionId });
        } else if (action === 'highlight') {
          // Clear other highlighted questions first
          db.prepare('UPDATE poll_qa_questions SET is_highlighted = 0 WHERE poll_id = ?').run(pollId);
          db.prepare('UPDATE poll_qa_questions SET is_highlighted = 1 WHERE id = ?').run(qaQuestionId);
          io.to(`poll:${pollId}`).emit('qa:question_highlighted', { qaQuestionId });
        } else if (action === 'unhighlight') {
          db.prepare('UPDATE poll_qa_questions SET is_highlighted = 0 WHERE id = ?').run(qaQuestionId);
          io.to(`poll:${pollId}`).emit('qa:question_unhighlighted', { qaQuestionId });
        } else if (action === 'delete') {
          db.prepare('DELETE FROM poll_qa_questions WHERE id = ?').run(qaQuestionId);
          io.to(`poll:${pollId}`).emit('qa:question_deleted', { qaQuestionId });
        }
      } catch (err) {
        console.error('[Socket QA Moderate Error]', err);
      }
    });

    socket.on('disconnect', () => {
      if (currentPollId) {
        if (pollVoters.has(currentPollId)) {
          pollVoters.get(currentPollId).delete(socket.id);
        }
        const count = getActiveVoterCount(currentPollId);
        io.to(`poll:${currentPollId}`).emit('poll:participant_count', { count });
      }
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = {
  initPollSocket,
  getIO,
  computeQuestionResults,
  getPollState
};
