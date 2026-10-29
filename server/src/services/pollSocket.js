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
      // Split any comma, semicolon or newline delimited words/phrases
      const parts = String(v.value || '').split(/[,;\n]+/).map(w => w.trim()).filter(Boolean);
      parts.forEach(word => {
        const lower = word.toLowerCase();
        // Keep display version of most frequent capitalization
        if (!wordFrequency[lower]) {
          wordFrequency[lower] = { text: word, count: 0 };
        }
        wordFrequency[lower].count += 1;
      });
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

  if (question.question_type === 'ranking') {
    let options = [];
    try {
      options = typeof question.options_json === 'string' ? JSON.parse(question.options_json) : (question.options_json || []);
    } catch (e) {
      options = [];
    }

    const n = options.length;
    const scores = {};
    const rankSums = {};
    const rankCounts = {};

    options.forEach(opt => {
      scores[opt] = 0;
      rankSums[opt] = 0;
      rankCounts[opt] = {};
      for (let r = 1; r <= n; r++) rankCounts[opt][r] = 0;
    });

    let validBallots = 0;
    rawVotes.forEach(v => {
      let ranking = [];
      try {
        ranking = typeof v.value === 'string' && (v.value.startsWith('[') || v.value.startsWith('{'))
          ? JSON.parse(v.value)
          : String(v.value || '').split(',').map(s => s.trim()).filter(Boolean);
      } catch (e) {
        ranking = String(v.value || '').split(',').map(s => s.trim()).filter(Boolean);
      }

      if (Array.isArray(ranking) && ranking.length > 0) {
        validBallots++;
        ranking.forEach((opt, idx) => {
          if (scores[opt] !== undefined) {
            const rankPos = idx + 1;
            const pts = Math.max(1, n - idx);
            scores[opt] += pts;
            rankSums[opt] += rankPos;
            rankCounts[opt][rankPos] = (rankCounts[opt][rankPos] || 0) + 1;
          }
        });
      }
    });

    const maxScore = validBallots > 0 ? validBallots * n : 1;
    const rankedOptions = options.map(opt => {
      const avgRank = validBallots > 0 && rankSums[opt] > 0
        ? Number((rankSums[opt] / validBallots).toFixed(1))
        : 0;
      const score = scores[opt] || 0;
      const percentage = validBallots > 0 ? Math.round((score / maxScore) * 100) : 0;

      return {
        option: opt,
        score,
        averageRank: avgRank,
        percentage,
        rankCounts: rankCounts[opt]
      };
    }).sort((a, b) => b.score - a.score || a.averageRank - b.averageRank);

    const results = rankedOptions.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));

    return {
      type: 'ranking',
      totalVotes,
      validBallots,
      optionsCount: n,
      results
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

function getActiveParticipantIds(pollId) {
  if (!pollVoters.has(pollId)) return [];
  return Array.from(new Set(pollVoters.get(pollId).values()));
}

function computePollLeaderboard(pollId) {
  try {
    const rows = db.prepare(`
      SELECT
        p.participant_id,
        p.name,
        p.avatar,
        COUNT(q.id) as score
      FROM poll_participants p
      LEFT JOIN poll_votes v ON v.participant_id = p.participant_id AND v.poll_id = p.poll_id
      LEFT JOIN poll_questions q ON q.id = v.question_id 
        AND q.correct_answer IS NOT NULL 
        AND TRIM(q.correct_answer) != '' 
        AND q.answer_revealed = 1
        AND LOWER(TRIM(v.value)) = LOWER(TRIM(q.correct_answer))
      WHERE p.poll_id = ?
      GROUP BY p.participant_id
      ORDER BY score DESC, p.created_at ASC
    `).all(pollId);

    // Persist scores onto poll_participants table
    const updateScoreStmt = db.prepare('UPDATE poll_participants SET score = ? WHERE poll_id = ? AND participant_id = ?');
    const updateScoresTx = db.transaction((items) => {
      for (const item of items) {
        updateScoreStmt.run(item.score, pollId, item.participant_id);
      }
    });
    updateScoresTx(rows);

    let currentRank = 1;
    return rows.map((r, idx) => {
      if (idx > 0 && r.score < rows[idx - 1].score) {
        currentRank = idx + 1;
      }
      return {
        participantId: r.participant_id,
        name: r.name,
        avatar: r.avatar || '🚀',
        score: r.score,
        rank: currentRank
      };
    });
  } catch (err) {
    console.error('[Leaderboard Calculation Error]', err);
    return [];
  }
}

function getPollState(pollId, participantId = null, isHost = false) {
  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
  if (!poll) return null;

  const questions = db.prepare('SELECT * FROM poll_questions WHERE poll_id = ? ORDER BY order_num ASC').all(pollId);
  const currentQuestion = questions.find(q => q.id === poll.current_question_id) || questions[0] || null;

  const isQuestionResultsVisible = currentQuestion ? (currentQuestion.show_results !== 0 && currentQuestion.show_results !== null) : Boolean(poll.show_results);
  const isQuestionAnswerShown = currentQuestion ? Boolean(currentQuestion.show_correct_answer === 1) : Boolean(poll.show_correct_answer);

  let liveResults = null;
  if (currentQuestion && (isHost || isQuestionResultsVisible)) {
    liveResults = computeQuestionResults(currentQuestion, pollId);
  }

  let userVotes = [];
  let userVote = null;
  if (currentQuestion && participantId) {
    userVotes = db.prepare('SELECT id, value, created_at FROM poll_votes WHERE question_id = ? AND participant_id = ? ORDER BY created_at ASC').all(currentQuestion.id, participantId);
    if (userVotes.length > 0) {
      userVote = userVotes[userVotes.length - 1].value;
      if (currentQuestion.question_type === 'ranking') {
        try {
          if (typeof userVote === 'string' && (userVote.startsWith('[') || userVote.startsWith('{'))) {
            userVote = JSON.parse(userVote);
          }
        } catch (e) {}
      }
    }
  }

  const qaQuestions = getPollQA(pollId, isHost);

  // User upvoted list
  let userUpvotes = [];
  if (participantId) {
    userUpvotes = db.prepare('SELECT qa_question_id FROM poll_qa_upvotes WHERE participant_id = ?').all(participantId).map(r => r.qa_question_id);
  }

  const participantCount = getActiveVoterCount(pollId);

  let quizProfile = null;
  if (participantId) {
    quizProfile = db.prepare('SELECT name, avatar, score FROM poll_participants WHERE poll_id = ? AND participant_id = ?').get(pollId, participantId) || null;
  }

  const leaderboard = poll.is_quiz_mode === 1 ? computePollLeaderboard(pollId) : [];

  return {
    poll: {
      id: poll.id,
      code: poll.code,
      title: poll.title,
      description: poll.description,
      status: poll.status,
      current_question_id: poll.current_question_id,
      voting_open: Boolean(poll.voting_open),
      show_results: isQuestionResultsVisible,
      show_correct_answer: isQuestionAnswerShown,
      is_quiz_mode: Boolean(poll.is_quiz_mode),
      show_leaderboard: Boolean(poll.show_leaderboard),
      qa_enabled: Boolean(poll.qa_enabled),
      qa_moderation: Boolean(poll.qa_moderation),
      show_qa_on_screen: Boolean(poll.show_qa_on_screen),
      created_at: poll.created_at,
      closed_at: poll.closed_at
    },
    questions: isHost ? questions.map(q => ({
      ...q,
      show_results: (q.show_results !== 0 && q.show_results !== null) ? 1 : 0,
      show_correct_answer: q.show_correct_answer === 1 ? 1 : 0,
      answer_revealed: Boolean(q.answer_revealed)
    })) : undefined,
    currentQuestion: currentQuestion ? {
      id: currentQuestion.id,
      order_num: currentQuestion.order_num,
      question_text: currentQuestion.question_text,
      question_type: currentQuestion.question_type,
      correct_answer: (isHost || isQuestionAnswerShown) ? (currentQuestion.correct_answer || null) : null,
      answer_revealed: Boolean(currentQuestion.answer_revealed),
      show_results: isQuestionResultsVisible,
      show_correct_answer: isQuestionAnswerShown,
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
    userVotes,
    hasVoted: userVotes.length > 0,
    qaQuestions,
    userUpvotes,
    participantCount,
    activeParticipantIds: getActiveParticipantIds(pollId),
    quizProfile,
    leaderboard
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
        io.to(roomName).emit('poll:participant_count', {
          count: getActiveVoterCount(pollId),
          activeParticipantIds: getActiveParticipantIds(pollId)
        });
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
        const question = db.prepare('SELECT * FROM poll_questions WHERE id = ?').get(questionId);
        if (!question) {
          return socket.emit('poll:error', { message: 'Question not found' });
        }
        if (poll.show_correct_answer === 1 || question.answer_revealed === 1 || question.show_correct_answer === 1) {
          return socket.emit('poll:error', { message: 'Voting has closed and responses are locked for this question' });
        }
        if (poll.current_question_id !== questionId) {
          return socket.emit('poll:error', { message: 'This question is no longer active' });
        }

        // Check question configuration for word_cloud multiple entries
        let allowMultipleWords = true;
        if (question.question_type === 'word_cloud') {
          try {
            const opts = typeof question.options_json === 'string' ? JSON.parse(question.options_json) : (question.options_json || {});
            allowMultipleWords = opts.allowMultiple !== false;
          } catch (e) {
            allowMultipleWords = true;
          }
        }

        if (question.question_type === 'word_cloud' && allowMultipleWords) {
          const words = String(value)
            .split(/[,;\n]+/)
            .map(w => w.trim())
            .filter(Boolean);

          const existingVotes = db.prepare('SELECT value FROM poll_votes WHERE question_id = ? AND participant_id = ?').all(questionId, participantId);
          const existingWordSet = new Set(existingVotes.map(v => v.value.trim().toLowerCase()));

          const insertVote = db.prepare(`
            INSERT INTO poll_votes (id, poll_id, question_id, participant_id, value)
            VALUES (?, ?, ?, ?, ?)
          `);
          words.forEach(w => {
            const lower = w.toLowerCase();
            if (!existingWordSet.has(lower)) {
              existingWordSet.add(lower);
              insertVote.run(generateId(), pollId, questionId, participantId, w);
            }
          });
        } else {
          // Single vote or ranking array upsert
          const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value).trim();
          const existing = db.prepare('SELECT id FROM poll_votes WHERE question_id = ? AND participant_id = ?').get(questionId, participantId);
          if (existing) {
            db.prepare('UPDATE poll_votes SET value = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?').run(valStr, existing.id);
          } else {
            db.prepare(`
              INSERT INTO poll_votes (id, poll_id, question_id, participant_id, value)
              VALUES (?, ?, ?, ?, ?)
            `).run(generateId(), pollId, questionId, participantId, valStr);
          }
        }

        socket.emit('poll:vote_confirmed', { questionId, value });

        if (question.question_type === 'word_cloud') {
          const participantWords = db.prepare('SELECT id, value, created_at FROM poll_votes WHERE question_id = ? AND participant_id = ? ORDER BY created_at ASC').all(questionId, participantId);
          socket.emit('poll:user_words_updated', { questionId, words: participantWords });
        }

        // Broadcast updated results if show_results is enabled
        const results = computeQuestionResults(question, pollId);
        io.to(`poll:${pollId}`).emit('poll:results_update', {
          questionId,
          results: (poll.show_results === 1) ? results : null,
          totalVotes: results.totalVotes
        });

        // If in quiz mode, update and broadcast leaderboard
        if (poll.is_quiz_mode === 1) {
          const leaderboard = computePollLeaderboard(pollId);
          io.to(`poll:${pollId}`).emit('poll:leaderboard_update', { leaderboard });
        }
      } catch (err) {
        console.error('[Socket Vote Error]', err);
        socket.emit('poll:error', { message: 'Failed to record vote' });
      }
    });

    socket.on('poll:remove_word', ({ pollId, questionId, participantId, voteId }) => {
      try {
        db.prepare('DELETE FROM poll_votes WHERE id = ? AND question_id = ? AND participant_id = ?').run(voteId, questionId, participantId);
        const participantWords = db.prepare('SELECT id, value, created_at FROM poll_votes WHERE question_id = ? AND participant_id = ? ORDER BY created_at ASC').all(questionId, participantId);
        socket.emit('poll:user_words_updated', { questionId, words: participantWords });

        const question = db.prepare('SELECT * FROM poll_questions WHERE id = ?').get(questionId);
        const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
        if (question && poll) {
          const results = computeQuestionResults(question, pollId);
          io.to(`poll:${pollId}`).emit('poll:results_update', {
            questionId,
            results: (poll.show_results === 1) ? results : null,
            totalVotes: results.totalVotes
          });

          if (poll.is_quiz_mode === 1) {
            const leaderboard = computePollLeaderboard(pollId);
            io.to(`poll:${pollId}`).emit('poll:leaderboard_update', { leaderboard });
          }
        }
      } catch (err) {
        console.error('[Socket Remove Word Error]', err);
      }
    });

    socket.on('poll:register_quiz_participant', ({ pollId, participantId, name, avatar }) => {
      try {
        const cleanName = String(name || 'Player').trim().slice(0, 30) || 'Player';
        const cleanAvatar = String(avatar || '🚀').trim().slice(0, 8) || '🚀';

        const existing = db.prepare('SELECT id FROM poll_participants WHERE poll_id = ? AND participant_id = ?').get(pollId, participantId);
        if (existing) {
          db.prepare('UPDATE poll_participants SET name = ?, avatar = ? WHERE id = ?').run(cleanName, cleanAvatar, existing.id);
        } else {
          db.prepare(`
            INSERT INTO poll_participants (id, poll_id, participant_id, name, avatar, score)
            VALUES (?, ?, ?, ?, ?, 0)
          `).run(generateId(), pollId, participantId, cleanName, cleanAvatar);
        }

        const leaderboard = computePollLeaderboard(pollId);
        const myProfile = { name: cleanName, avatar: cleanAvatar };

        socket.emit('poll:quiz_profile_confirmed', myProfile);
        io.to(`poll:${pollId}`).emit('poll:leaderboard_update', { leaderboard });
        io.to(`poll:${pollId}`).emit('poll:participant_count', {
          count: getActiveVoterCount(pollId),
          activeParticipantIds: getActiveParticipantIds(pollId)
        });
      } catch (err) {
        console.error('[Register Quiz Participant Error]', err);
        socket.emit('poll:error', { message: 'Failed to register quiz profile' });
      }
    });

    socket.on('poll:host_set_question', ({ pollId, questionId, markPreviousAction }) => {
      try {
        const currentPoll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
        if (currentPoll && currentPoll.current_question_id && markPreviousAction) {
          db.prepare('UPDATE poll_questions SET answer_revealed = 1 WHERE id = ?').run(currentPoll.current_question_id);
          if (currentPoll.is_quiz_mode === 1) {
            const leaderboard = computePollLeaderboard(pollId);
            io.to(`poll:${pollId}`).emit('poll:leaderboard_update', { leaderboard });
          }
        }

        const question = db.prepare('SELECT * FROM poll_questions WHERE id = ?').get(questionId);
        if (!question) return;

        const qShowResults = (question.show_results !== 0 && question.show_results !== null) ? 1 : 0;
        const qShowCorrect = (question.show_correct_answer === 1) ? 1 : 0;

        db.prepare('UPDATE polls SET current_question_id = ?, voting_open = 1, show_results = ?, show_correct_answer = ? WHERE id = ?')
          .run(questionId, qShowResults, qShowCorrect, pollId);

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
            correct_answer: (qShowCorrect === 1) ? (question.correct_answer || null) : null,
            answer_revealed: Boolean(question.answer_revealed),
            show_results: Boolean(qShowResults),
            show_correct_answer: Boolean(qShowCorrect),
            options: parsedOptions
          },
          voting_open: true,
          show_results: Boolean(qShowResults),
          show_correct_answer: Boolean(qShowCorrect),
          liveResults: (qShowResults === 1) ? results : null
        });
      } catch (err) {
        console.error('[Socket Host Set Question Error]', err);
      }
    });

    socket.on('poll:get_user_vote', ({ pollId, questionId, participantId }, callback) => {
      try {
        if (!pollId || !questionId || !participantId) {
          if (typeof callback === 'function') callback(null);
          return;
        }
        const votes = db.prepare('SELECT id, value, created_at FROM poll_votes WHERE question_id = ? AND participant_id = ? ORDER BY created_at ASC').all(questionId, participantId);
        let userVote = null;
        const hasVoted = votes.length > 0;
        if (hasVoted) {
          userVote = votes[votes.length - 1].value;
          const q = db.prepare('SELECT question_type FROM poll_questions WHERE id = ?').get(questionId);
          if (q && q.question_type === 'ranking') {
            try {
              if (typeof userVote === 'string' && (userVote.startsWith('[') || userVote.startsWith('{'))) {
                userVote = JSON.parse(userVote);
              }
            } catch (e) {}
          }
        }
        const payload = {
          questionId,
          hasVoted,
          userVote,
          userVotes: votes
        };
        if (typeof callback === 'function') {
          callback(payload);
        } else {
          socket.emit('poll:user_vote_response', payload);
        }
      } catch (err) {
        console.error('[Socket Get User Vote Error]', err);
        if (typeof callback === 'function') callback(null);
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

    socket.on('poll:host_toggle_results', ({ pollId, questionId, show_results }) => {
      try {
        const val = show_results ? 1 : 0;
        const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
        const targetQId = questionId || poll?.current_question_id;

        if (targetQId) {
          db.prepare('UPDATE poll_questions SET show_results = ? WHERE id = ?').run(val, targetQId);
        }

        if (!poll?.current_question_id || poll.current_question_id === targetQId) {
          db.prepare('UPDATE polls SET show_results = ? WHERE id = ?').run(val, pollId);
        }

        let results = null;
        if (targetQId && val === 1) {
          const question = db.prepare('SELECT * FROM poll_questions WHERE id = ?').get(targetQId);
          if (question) {
            results = computeQuestionResults(question, pollId);
          }
        }

        io.to(`poll:${pollId}`).emit('poll:results_toggled', {
          questionId: targetQId,
          show_results: Boolean(val),
          liveResults: results
        });
      } catch (err) {
        console.error('[Socket Host Toggle Results Error]', err);
      }
    });

    socket.on('poll:host_toggle_qa_display', ({ pollId, show_qa }) => {
      try {
        const val = show_qa ? 1 : 0;
        db.prepare('UPDATE polls SET show_qa_on_screen = ? WHERE id = ?').run(val, pollId);
        io.to(`poll:${pollId}`).emit('poll:qa_display_toggled', { show_qa: Boolean(val) });
      } catch (err) {
        console.error('[Socket Host Toggle QA Display Error]', err);
      }
    });

    socket.on('poll:host_toggle_correct_answer', ({ pollId, questionId, show_correct }) => {
      try {
        const val = show_correct ? 1 : 0;
        const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
        const targetQId = questionId || poll?.current_question_id;

        let correctAnswer = null;
        if (targetQId) {
          const q = db.prepare('SELECT * FROM poll_questions WHERE id = ?').get(targetQId);
          if (q) {
            correctAnswer = q.correct_answer || null;
            if (!correctAnswer && q.options_json) {
              try {
                const parsed = JSON.parse(q.options_json);
                correctAnswer = parsed.correctAnswer || null;
              } catch (e) {}
            }
            if (val === 1) {
              db.prepare('UPDATE poll_questions SET show_correct_answer = 1, answer_revealed = 1, show_results = 1 WHERE id = ?').run(targetQId);
            } else {
              db.prepare('UPDATE poll_questions SET show_correct_answer = 0 WHERE id = ?').run(targetQId);
            }
          }
        }

        if (!poll?.current_question_id || poll.current_question_id === targetQId) {
          db.prepare('UPDATE polls SET show_correct_answer = ? WHERE id = ?').run(val, pollId);
          if (val === 1) {
            db.prepare('UPDATE polls SET show_results = 1 WHERE id = ?').run(pollId);
          }
        }

        io.to(`poll:${pollId}`).emit('poll:correct_answer_toggled', {
          questionId: targetQId,
          show_correct_answer: Boolean(val),
          answer_revealed: val === 1 ? 1 : undefined,
          correctAnswer: val === 1 ? correctAnswer : null
        });

        // Broadcast updated leaderboard now that answers have been revealed
        if (val === 1 && poll && poll.is_quiz_mode === 1) {
          const leaderboard = computePollLeaderboard(pollId);
          io.to(`poll:${pollId}`).emit('poll:leaderboard_update', { leaderboard });
        }
      } catch (err) {
        console.error('[Socket Host Toggle Correct Answer Error]', err);
      }
    });

    socket.on('poll:host_toggle_mark_question', ({ pollId, questionId, marked }) => {
      try {
        const q = db.prepare('SELECT * FROM poll_questions WHERE id = ?').get(questionId);
        if (!q) return;

        const currentVal = q.answer_revealed === 1 ? 1 : 0;
        const nextVal = typeof marked === 'boolean' ? (marked ? 1 : 0) : (currentVal === 1 ? 0 : 1);

        db.prepare('UPDATE poll_questions SET answer_revealed = ? WHERE id = ?').run(nextVal, questionId);

        const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
        let leaderboard = [];
        if (poll && poll.is_quiz_mode === 1) {
          leaderboard = computePollLeaderboard(pollId);
          io.to(`poll:${pollId}`).emit('poll:leaderboard_update', { leaderboard });
        }

        io.to(`poll:${pollId}`).emit('poll:question_marked_toggled', {
          questionId,
          answer_revealed: Boolean(nextVal),
          is_marked: nextVal === 1,
          leaderboard
        });
      } catch (err) {
        console.error('[Socket Host Toggle Mark Question Error]', err);
      }
    });

    socket.on('poll:host_toggle_leaderboard', ({ pollId, show_leaderboard }) => {
      try {
        const val = show_leaderboard ? 1 : 0;
        db.prepare('UPDATE polls SET show_leaderboard = ? WHERE id = ?').run(val, pollId);
        const leaderboard = computePollLeaderboard(pollId);
        io.to(`poll:${pollId}`).emit('poll:leaderboard_toggled', {
          show_leaderboard: Boolean(val),
          leaderboard
        });
      } catch (err) {
        console.error('[Socket Host Toggle Leaderboard Error]', err);
      }
    });

    socket.on('poll:host_change_status', ({ pollId, status }) => {
      try {
        const closedAt = status === 'closed' ? new Date().toISOString() : null;
        db.prepare('UPDATE polls SET status = ?, closed_at = ? WHERE id = ?').run(status, closedAt, pollId);
        if (status === 'closed') {
          computePollLeaderboard(pollId);
        }
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
        } else if (action === 'unanswer') {
          db.prepare('UPDATE poll_qa_questions SET is_answered = 0 WHERE id = ?').run(qaQuestionId);
          io.to(`poll:${pollId}`).emit('qa:question_unanswered', { qaQuestionId });
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
        io.to(`poll:${currentPollId}`).emit('poll:participant_count', {
          count,
          activeParticipantIds: getActiveParticipantIds(currentPollId)
        });
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
  computePollLeaderboard,
  getPollState
};
