const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { generateSlug, generateId } = require('../utils/id');

const VALID_QUESTION_TYPES = [
  'multiple_choice',
  'checkboxes',
  'single_text',
  'comment_box',
  'star_rating',
  'slider',
  'ranking',
  'true_false',
  'rating_1_10',
  'text'
];

const router = express.Router();
router.use(requireAuth);

function getAuthorizedSurvey(surveyId, req) {
  if (req.user && req.user.isAdmin) {
    return db.prepare('SELECT * FROM surveys WHERE id = ?').get(surveyId);
  }
  return db.prepare('SELECT * FROM surveys WHERE id = ? AND user_id = ?').get(surveyId, req.user.id);
}

// List all surveys for the authenticated creator
router.get('/', (req, res) => {
  try {
    const surveys = db.prepare(`
      SELECT 
        s.id, 
        s.title, 
        s.description, 
        s.is_active, 
        s.email_notifications,
        s.created_at,
        COUNT(DISTINCT q.id) AS question_count,
        COUNT(DISTINCT r.id) AS response_count
      FROM surveys s
      LEFT JOIN questions q ON q.survey_id = s.id
      LEFT JOIN responses r ON r.survey_id = s.id
      WHERE s.user_id = ?
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `).all(req.user.id);

    return res.json({ surveys });
  } catch (err) {
    console.error('List surveys error:', err);
    return res.status(500).json({ error: 'Failed to fetch surveys' });
  }
});

// Create a new survey with questions
router.post('/', (req, res) => {
  const { title, description, email_notifications, questions } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Survey title is required' });
  }

  const surveyId = generateSlug(10);
  const emailNotifs = email_notifications ? 1 : 0;

  const createTransaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO surveys (id, user_id, title, description, is_active, email_notifications)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(surveyId, req.user.id, title.trim(), description ? description.trim() : '', emailNotifs);

    if (Array.isArray(questions) && questions.length > 0) {
      const insertQuestion = db.prepare(`
        INSERT INTO questions (id, survey_id, order_num, question_text, question_type, options_json, is_required)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      questions.forEach((q, index) => {
        const qId = generateId();
        const orderNum = typeof q.order_num === 'number' ? q.order_num : index + 1;
        const qText = q.question_text ? q.question_text.trim() : `Question ${index + 1}`;
        const qType = VALID_QUESTION_TYPES.includes(q.question_type) 
          ? q.question_type 
          : 'multiple_choice';
        const optionsJson = ['multiple_choice', 'checkboxes', 'ranking'].includes(qType) && Array.isArray(q.options) 
          ? JSON.stringify(q.options) 
          : (q.options_json || '[]');
        const isRequired = q.is_required ? 1 : 0;

        insertQuestion.run(qId, surveyId, orderNum, qText, qType, optionsJson, isRequired);
      });
    }
  });

  try {
    createTransaction();
    const created = db.prepare('SELECT * FROM surveys WHERE id = ?').get(surveyId);
    return res.status(201).json({ survey: created });
  } catch (err) {
    console.error('Create survey error:', err);
    return res.status(500).json({ error: 'Failed to create survey' });
  }
});

// Get single survey details with questions (for creator)
router.get('/:id', (req, res) => {
  try {
    const survey = getAuthorizedSurvey(req.params.id, req);

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const questions = db.prepare(`
      SELECT * FROM questions WHERE survey_id = ? ORDER BY order_num ASC
    `).all(survey.id);

    // Parse options_json
    const parsedQuestions = questions.map(q => ({
      ...q,
      options: q.options_json ? JSON.parse(q.options_json) : []
    }));

    return res.json({ survey, questions: parsedQuestions });
  } catch (err) {
    console.error('Get survey error:', err);
    return res.status(500).json({ error: 'Failed to fetch survey details' });
  }
});

// Update survey & replace questions
router.put('/:id', (req, res) => {
  const { title, description, is_active, email_notifications, questions } = req.body;
  const surveyId = req.params.id;

  const existing = db.prepare('SELECT id FROM surveys WHERE id = ? AND user_id = ?').get(surveyId, req.user.id);
  if (!existing) {
    return res.status(404).json({ error: 'Survey not found' });
  }

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Survey title is required' });
  }

  const updateTransaction = db.transaction(() => {
    db.prepare(`
      UPDATE surveys 
      SET title = ?, description = ?, is_active = ?, email_notifications = ?
      WHERE id = ? AND user_id = ?
    `).run(
      title.trim(),
      description !== undefined ? description.trim() : '',
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      email_notifications !== undefined ? (email_notifications ? 1 : 0) : 0,
      surveyId,
      req.user.id
    );

    if (Array.isArray(questions)) {
      // Re-synchronize questions
      db.prepare('DELETE FROM questions WHERE survey_id = ?').run(surveyId);

      const insertQuestion = db.prepare(`
        INSERT INTO questions (id, survey_id, order_num, question_text, question_type, options_json, is_required)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      questions.forEach((q, index) => {
        const qId = q.id || generateId();
        const orderNum = typeof q.order_num === 'number' ? q.order_num : index + 1;
        const qText = q.question_text ? q.question_text.trim() : `Question ${index + 1}`;
        const qType = VALID_QUESTION_TYPES.includes(q.question_type)
          ? q.question_type
          : 'multiple_choice';
        const optionsJson = ['multiple_choice', 'checkboxes', 'ranking'].includes(qType) && Array.isArray(q.options)
          ? JSON.stringify(q.options)
          : (q.options_json || '[]');
        const isRequired = q.is_required ? 1 : 0;

        insertQuestion.run(qId, surveyId, orderNum, qText, qType, optionsJson, isRequired);
      });
    }
  });

  try {
    updateTransaction();
    const updated = db.prepare('SELECT * FROM surveys WHERE id = ?').get(surveyId);
    return res.json({ survey: updated });
  } catch (err) {
    console.error('Update survey error:', err);
    return res.status(500).json({ error: 'Failed to update survey' });
  }
});

// Immediate toggle active/closed switch
router.patch('/:id/toggle-active', (req, res) => {
  const surveyId = req.params.id;

  try {
    const survey = db.prepare('SELECT id, is_active FROM surveys WHERE id = ? AND user_id = ?').get(surveyId, req.user.id);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const newStatus = typeof req.body.is_active === 'boolean' 
      ? (req.body.is_active ? 1 : 0)
      : (survey.is_active === 1 ? 0 : 1);

    db.prepare('UPDATE surveys SET is_active = ? WHERE id = ?').run(newStatus, surveyId);

    return res.json({
      id: surveyId,
      is_active: newStatus,
      message: `Survey is now ${newStatus === 1 ? 'active' : 'closed'}`
    });
  } catch (err) {
    console.error('Toggle active error:', err);
    return res.status(500).json({ error: 'Failed to toggle survey status' });
  }
});

// Delete survey
router.delete('/:id', (req, res) => {
  const surveyId = req.params.id;
  try {
    const result = db.prepare('DELETE FROM surveys WHERE id = ? AND user_id = ?').run(surveyId, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    return res.json({ message: 'Survey deleted successfully' });
  } catch (err) {
    console.error('Delete survey error:', err);
    return res.status(500).json({ error: 'Failed to delete survey' });
  }
});

// Duplicate an existing survey and all its questions
router.post('/:id/duplicate', (req, res) => {
  const surveyId = req.params.id;

  try {
    const originalSurvey = getAuthorizedSurvey(surveyId, req);
    if (!originalSurvey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const originalQuestions = db.prepare(`
      SELECT order_num, question_text, question_type, options_json, is_required
      FROM questions
      WHERE survey_id = ?
      ORDER BY order_num ASC
    `).all(surveyId);

    const newSurveyId = generateSlug(10);
    const newTitle = `Copy of ${originalSurvey.title}`;
    const targetUserId = (req.user && req.user.isAdmin) ? originalSurvey.user_id : req.user.id;

    const duplicateTransaction = db.transaction(() => {
      // Insert duplicate survey with 0 responses and active status
      db.prepare(`
        INSERT INTO surveys (id, user_id, title, description, is_active, email_notifications)
        VALUES (?, ?, ?, ?, 1, ?)
      `).run(
        newSurveyId,
        targetUserId,
        newTitle,
        originalSurvey.description || '',
        originalSurvey.email_notifications || 0
      );

      // Clone each question with a unique ID
      if (Array.isArray(originalQuestions) && originalQuestions.length > 0) {
        const insertQuestion = db.prepare(`
          INSERT INTO questions (id, survey_id, order_num, question_text, question_type, options_json, is_required)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        originalQuestions.forEach((q) => {
          const newQId = generateId();
          insertQuestion.run(
            newQId,
            newSurveyId,
            q.order_num,
            q.question_text,
            q.question_type,
            q.options_json || '[]',
            q.is_required || 0
          );
        });
      }
    });

    duplicateTransaction();

    const duplicatedSurvey = db.prepare(`
      SELECT 
        s.id, 
        s.title, 
        s.description, 
        s.is_active, 
        s.email_notifications,
        s.created_at,
        COUNT(DISTINCT q.id) AS question_count,
        0 AS response_count
      FROM surveys s
      LEFT JOIN questions q ON q.survey_id = s.id
      WHERE s.id = ?
      GROUP BY s.id
    `).get(newSurveyId);

    return res.status(201).json({
      survey: duplicatedSurvey,
      message: `Survey duplicated successfully as "${newTitle}"`
    });
  } catch (err) {
    console.error('Duplicate survey error:', err);
    return res.status(500).json({ error: 'Failed to duplicate survey' });
  }
});

// Analytics & aggregated insights for a survey
router.get('/:id/analytics', (req, res) => {
  const surveyId = req.params.id;

  try {
    const survey = getAuthorizedSurvey(surveyId, req);

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const totalResponsesRow = db.prepare(`
      SELECT COUNT(*) AS total FROM responses WHERE survey_id = ?
    `).get(surveyId);
    const totalResponses = totalResponsesRow.total || 0;

    const questions = db.prepare(`
      SELECT * FROM questions WHERE survey_id = ? ORDER BY order_num ASC
    `).all(surveyId);

    const questionAnalytics = questions.map(q => {
      const answers = db.prepare(`
        SELECT value FROM answers WHERE question_id = ?
      `).all(q.id);

      const answeredCount = answers.length;

      if (q.question_type === 'multiple_choice') {
        const options = q.options_json ? JSON.parse(q.options_json) : [];
        const counts = {};
        options.forEach(opt => { counts[opt] = 0; });

        answers.forEach(a => {
          const val = a.value;
          counts[val] = (counts[val] || 0) + 1;
        });

        const breakdown = Object.keys(counts).map(option => ({
          option,
          count: counts[option],
          percentage: answeredCount > 0 ? ((counts[option] / answeredCount) * 100).toFixed(1) : 0
        }));

        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          answered_count: answeredCount,
          breakdown
        };
      }

      if (q.question_type === 'checkboxes') {
        const options = q.options_json ? JSON.parse(q.options_json) : [];
        const counts = {};
        options.forEach(opt => { counts[opt] = 0; });

        answers.forEach(a => {
          let selected = [];
          try {
            selected = JSON.parse(a.value);
          } catch (e) {
            selected = a.value ? [a.value] : [];
          }
          if (Array.isArray(selected)) {
            selected.forEach(opt => {
              counts[opt] = (counts[opt] || 0) + 1;
            });
          }
        });

        const breakdown = Object.keys(counts).map(option => ({
          option,
          count: counts[option],
          percentage: answeredCount > 0 ? ((counts[option] / answeredCount) * 100).toFixed(1) : 0
        }));

        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          answered_count: answeredCount,
          breakdown
        };
      }

      if (q.question_type === 'true_false') {
        let trueCount = 0;
        let falseCount = 0;

        answers.forEach(a => {
          const normalized = String(a.value).trim().toLowerCase();
          if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
            trueCount++;
          } else if (normalized === 'false' || normalized === '0' || normalized === 'no') {
            falseCount++;
          }
        });

        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          answered_count: answeredCount,
          true_count: trueCount,
          false_count: falseCount,
          true_percentage: answeredCount > 0 ? ((trueCount / answeredCount) * 100).toFixed(1) : 0,
          false_percentage: answeredCount > 0 ? ((falseCount / answeredCount) * 100).toFixed(1) : 0
        };
      }

      if (q.question_type === 'rating_1_10') {
        const distribution = {};
        for (let i = 1; i <= 10; i++) {
          distribution[i] = 0;
        }

        let sum = 0;
        let validScores = 0;

        answers.forEach(a => {
          const num = parseInt(a.value, 10);
          if (num >= 1 && num <= 10) {
            distribution[num] = (distribution[num] || 0) + 1;
            sum += num;
            validScores++;
          }
        });

        const average = validScores > 0 ? (sum / validScores).toFixed(2) : 0;

        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          answered_count: answeredCount,
          distribution,
          average_score: parseFloat(average)
        };
      }

      if (q.question_type === 'star_rating') {
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let sum = 0;
        let validScores = 0;

        answers.forEach(a => {
          const num = parseInt(a.value, 10);
          if (num >= 1 && num <= 5) {
            distribution[num] = (distribution[num] || 0) + 1;
            sum += num;
            validScores++;
          }
        });

        const average = validScores > 0 ? (sum / validScores).toFixed(2) : 0;

        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          answered_count: answeredCount,
          distribution,
          average_score: parseFloat(average)
        };
      }

      if (q.question_type === 'slider') {
        let sum = 0;
        let validScores = 0;
        let min = null;
        let max = null;
        const buckets = {
          '1-20': 0,
          '21-40': 0,
          '41-60': 0,
          '61-80': 0,
          '81-100': 0
        };

        answers.forEach(a => {
          const num = parseFloat(a.value);
          if (!isNaN(num)) {
            sum += num;
            validScores++;
            if (min === null || num < min) min = num;
            if (max === null || num > max) max = num;

            if (num <= 20) buckets['1-20']++;
            else if (num <= 40) buckets['21-40']++;
            else if (num <= 60) buckets['41-60']++;
            else if (num <= 80) buckets['61-80']++;
            else buckets['81-100']++;
          }
        });

        const average = validScores > 0 ? (sum / validScores).toFixed(1) : 0;

        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          answered_count: answeredCount,
          average_score: parseFloat(average),
          min: min !== null ? min : 0,
          max: max !== null ? max : 0,
          distribution: buckets
        };
      }

      if (q.question_type === 'ranking') {
        const options = q.options_json ? JSON.parse(q.options_json) : [];
        const itemStats = {};
        options.forEach(opt => {
          itemStats[opt] = { totalRank: 0, appearances: 0, firstChoiceCount: 0 };
        });

        answers.forEach(a => {
          let list = [];
          try {
            list = JSON.parse(a.value);
          } catch (e) {
            list = [];
          }
          if (Array.isArray(list)) {
            list.forEach((item, idx) => {
              const rank = idx + 1;
              if (!itemStats[item]) {
                itemStats[item] = { totalRank: 0, appearances: 0, firstChoiceCount: 0 };
              }
              itemStats[item].totalRank += rank;
              itemStats[item].appearances += 1;
              if (rank === 1) {
                itemStats[item].firstChoiceCount += 1;
              }
            });
          }
        });

        const breakdown = Object.keys(itemStats).map(item => {
          const stats = itemStats[item];
          const avgRank = stats.appearances > 0 ? (stats.totalRank / stats.appearances).toFixed(2) : 0;
          return {
            item,
            average_rank: parseFloat(avgRank),
            first_choice_count: stats.firstChoiceCount,
            appearances: stats.appearances
          };
        }).sort((a, b) => {
          if (a.average_rank === 0 && b.average_rank > 0) return 1;
          if (b.average_rank === 0 && a.average_rank > 0) return -1;
          return a.average_rank - b.average_rank;
        });

        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          answered_count: answeredCount,
          breakdown
        };
      }

      if (q.question_type === 'text' || q.question_type === 'single_text' || q.question_type === 'comment_box') {
        const textResponses = answers
          .map(a => a.value)
          .filter(val => val !== undefined && val !== null && String(val).trim().length > 0);

        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          answered_count: answeredCount,
          responses: textResponses
        };
      }

      return {
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        answered_count: answeredCount
      };
    });

    return res.json({
      survey,
      total_responses: totalResponses,
      questions: questionAnalytics
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get all individual responses for a survey (for creator)
router.get('/:id/responses', (req, res) => {
  const surveyId = req.params.id;

  try {
    const survey = getAuthorizedSurvey(surveyId, req);

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const questions = db.prepare(`
      SELECT id, order_num, question_text, question_type, options_json, is_required
      FROM questions WHERE survey_id = ? ORDER BY order_num ASC
    `).all(surveyId);

    const parsedQuestions = questions.map(q => ({
      ...q,
      options: q.options_json ? JSON.parse(q.options_json) : []
    }));

    const responsesRows = db.prepare(`
      SELECT id, submitted_at FROM responses WHERE survey_id = ? ORDER BY submitted_at DESC
    `).all(surveyId);

    const responses = responsesRows.map(r => {
      const answers = db.prepare(`
        SELECT question_id, value FROM answers WHERE response_id = ?
      `).all(r.id);

      const answerMap = {};
      answers.forEach(a => {
        answerMap[a.question_id] = a.value;
      });

      return {
        id: r.id,
        submitted_at: r.submitted_at,
        answers: answerMap
      };
    });

    return res.json({
      survey,
      questions: parsedQuestions,
      responses
    });
  } catch (err) {
    console.error('Fetch responses error:', err);
    return res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

// Update an individual response
router.put('/:id/responses/:responseId', (req, res) => {
  const { id: surveyId, responseId } = req.params;
  const { answers } = req.body;

  try {
    const survey = getAuthorizedSurvey(surveyId, req);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const existingResponse = db.prepare('SELECT id FROM responses WHERE id = ? AND survey_id = ?').get(responseId, surveyId);
    if (!existingResponse) {
      return res.status(404).json({ error: 'Response not found' });
    }

    const updateTransaction = db.transaction(() => {
      db.prepare('DELETE FROM answers WHERE response_id = ?').run(responseId);

      const insertAnswer = db.prepare(`
        INSERT INTO answers (id, response_id, question_id, value)
        VALUES (?, ?, ?, ?)
      `);

      if (answers && typeof answers === 'object') {
        Object.entries(answers).forEach(([qId, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val).trim();
            insertAnswer.run(generateId(), responseId, qId, strVal);
          }
        });
      }
    });

    updateTransaction();

    return res.json({
      success: true,
      message: 'Response updated successfully'
    });
  } catch (err) {
    console.error('Update response error:', err);
    return res.status(500).json({ error: 'Failed to update response' });
  }
});

// Delete an individual response
router.delete('/:id/responses/:responseId', (req, res) => {
  const { id: surveyId, responseId } = req.params;

  try {
    const survey = getAuthorizedSurvey(surveyId, req);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const result = db.prepare('DELETE FROM responses WHERE id = ? AND survey_id = ?').run(responseId, surveyId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Response not found' });
    }

    db.prepare('DELETE FROM answers WHERE response_id = ?').run(responseId);

    return res.json({
      success: true,
      message: 'Response deleted successfully'
    });
  } catch (err) {
    console.error('Delete response error:', err);
    return res.status(500).json({ error: 'Failed to delete response' });
  }
});

module.exports = router;
