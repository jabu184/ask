const express = require('express');
const db = require('../config/db');
const { generateId } = require('../utils/id');
const emailService = require('../services/emailService');

const router = express.Router();

// Get public survey for respondents
router.get('/surveys/:id', (req, res) => {
  const surveyId = req.params.id;

  try {
    const survey = db.prepare(`
      SELECT id, title, description, is_active
      FROM surveys
      WHERE id = ?
    `).get(surveyId);

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    if (survey.is_active === 0) {
      return res.json({
        survey: {
          id: survey.id,
          title: survey.title,
          description: survey.description,
          is_active: 0
        },
        closed: true
      });
    }

    const questions = db.prepare(`
      SELECT id, order_num, question_text, question_type, options_json, is_required
      FROM questions
      WHERE survey_id = ?
      ORDER BY order_num ASC
    `).all(surveyId);

    const parsedQuestions = questions.map(q => ({
      ...q,
      options: q.options_json ? JSON.parse(q.options_json) : []
    }));

    return res.json({
      survey,
      closed: false,
      questions: parsedQuestions
    });
  } catch (err) {
    console.error('Public survey fetch error:', err);
    return res.status(500).json({ error: 'Failed to load survey' });
  }
});

// Submit anonymous survey response atomically
router.post('/surveys/:id/submit', (req, res) => {
  const surveyId = req.params.id;
  const { answers } = req.body; // Expects { [questionId]: value } or array [{ question_id, value }]

  try {
    const survey = db.prepare(`
      SELECT s.id, s.user_id, s.title, s.is_active, s.email_notifications, u.email as creator_email 
      FROM surveys s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(surveyId);

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    if (survey.is_active === 0) {
      return res.status(403).json({ error: 'This survey is currently closed to new responses' });
    }

    const questions = db.prepare('SELECT id, question_text, is_required FROM questions WHERE survey_id = ? ORDER BY order_num ASC').all(surveyId);

    // Helper to test if a raw value is empty
    const isValEmpty = (v) => {
      if (v === undefined || v === null) return true;
      if (Array.isArray(v)) return v.length === 0;
      if (typeof v === 'string') return v.trim().length === 0;
      return false;
    };

    // Normalize answers format into a Map: questionId -> stringified trimmed value
    const answersMap = new Map();
    const rawAnswersMap = new Map();

    if (Array.isArray(answers)) {
      answers.forEach(a => {
        if (a && a.question_id !== undefined && a.value !== undefined) {
          rawAnswersMap.set(a.question_id, a.value);
          const strVal = typeof a.value === 'object' ? JSON.stringify(a.value) : String(a.value).trim();
          answersMap.set(a.question_id, strVal);
        }
      });
    } else if (answers && typeof answers === 'object') {
      Object.entries(answers).forEach(([qId, val]) => {
        if (val !== undefined && val !== null) {
          rawAnswersMap.set(qId, val);
          const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val).trim();
          answersMap.set(qId, strVal);
        }
      });
    }

    // Validate required questions
    for (const q of questions) {
      if (q.is_required === 1) {
        const raw = rawAnswersMap.get(q.id);
        const val = answersMap.get(q.id);
        if (isValEmpty(raw) || !val || val === '[]' || val.length === 0) {
          return res.status(400).json({
            error: `Question "${q.question_text}" is required.`
          });
        }
      }
    }

    const responseId = generateId();

    // Execute atomic transaction for response and answers
    const submitTransaction = db.transaction(() => {
      db.prepare('INSERT INTO responses (id, survey_id) VALUES (?, ?)').run(responseId, surveyId);

      const insertAnswer = db.prepare(`
        INSERT INTO answers (id, response_id, question_id, value)
        VALUES (?, ?, ?, ?)
      `);

      for (const [qId, val] of answersMap.entries()) {
        if (val !== undefined && val !== '') {
          insertAnswer.run(generateId(), responseId, qId, val);
        }
      }
    });

    submitTransaction();

    // Send email notification asynchronously if creator enabled notifications
    if (survey.email_notifications === 1 && survey.creator_email) {
      const summaryList = questions.map(q => ({
        question_text: q.question_text,
        value: answersMap.get(q.id) || '-'
      }));

      emailService.sendResponseNotificationEmail({
        toEmail: survey.creator_email,
        surveyTitle: survey.title,
        surveyId: survey.id,
        submittedAt: new Date().toISOString(),
        answersSummary: summaryList
      }).then(res => {
        if (res && res.success) {
          try {
            const creatorUserId = survey.user_id || db.prepare('SELECT user_id FROM surveys WHERE id = ?').get(survey.id)?.user_id || null;
            db.prepare(`
              INSERT INTO email_logs (id, user_id, survey_id, email_type, recipient)
              VALUES (?, ?, ?, 'response_notification', ?)
            `).run(generateId(), creatorUserId, survey.id, survey.creator_email);
            console.log(`[Public] Recorded response email log for survey "${survey.title}" (${survey.id}), user: ${creatorUserId}`);
          } catch (logErr) {
            console.error('[Public] Failed to record email log:', logErr);
          }
        }
      }).catch(notifErr => {
        console.error('[Public] Response notification email error:', notifErr);
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your response has been recorded anonymously.'
    });
  } catch (err) {
    console.error('Submit response error:', err);
    return res.status(500).json({ error: 'Failed to record response. Please try again.' });
  }
});

module.exports = router;
