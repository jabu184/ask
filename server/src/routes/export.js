const express = require('express');
const { Parser } = require('json2csv');
const XLSX = require('xlsx');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

/**
 * Helper to fetch and format tabular data for a survey
 */
function getSurveyTabularData(surveyId, userId, isAdmin) {
  const survey = isAdmin
    ? db.prepare('SELECT id, title FROM surveys WHERE id = ?').get(surveyId)
    : db.prepare('SELECT id, title FROM surveys WHERE id = ? AND user_id = ?').get(surveyId, userId);
  if (!survey) {
    return null;
  }

  const questions = db.prepare('SELECT id, order_num, question_text, question_type FROM questions WHERE survey_id = ? ORDER BY order_num ASC').all(surveyId);
  const responses = db.prepare('SELECT id, submitted_at FROM responses WHERE survey_id = ? ORDER BY submitted_at ASC').all(surveyId);

  // Map response ID to an object of answers
  const rows = responses.map((resp, idx) => {
    const row = {
      '#': idx + 1,
      'Response ID': resp.id,
      'Submitted At (UTC)': resp.submitted_at
    };

    const answers = db.prepare('SELECT question_id, value FROM answers WHERE response_id = ?').all(resp.id);
    const answerMap = new Map();
    answers.forEach(a => answerMap.set(a.question_id, a.value));

    questions.forEach(q => {
      const raw = answerMap.get(q.id) || '';
      let formatted = raw;
      if (typeof raw === 'string' && raw.startsWith('[') && raw.endsWith(']')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            if (q.question_type === 'ranking') {
              formatted = parsed.map((item, i) => `${i + 1}. ${item}`).join(', ');
            } else {
              formatted = parsed.join(', ');
            }
          }
        } catch (e) {
          formatted = raw;
        }
      }
      row[q.question_text] = formatted;
    });

    return row;
  });

  return { survey, questions, rows };
}

// Export as CSV: /api/surveys/:id/export/csv
router.get('/:id/export/csv', (req, res) => {
  const surveyId = req.params.id;

  try {
    const data = getSurveyTabularData(surveyId, req.user.id, req.user.isAdmin);
    if (!data) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const { survey, questions, rows } = data;
    const fields = ['#', 'Response ID', 'Submitted At (UTC)', ...questions.map(q => q.question_text)];

    let csvContent = '';
    if (rows.length > 0) {
      const json2csvParser = new Parser({ fields });
      csvContent = json2csvParser.parse(rows);
    }

    const safeTitle = (survey.title || 'survey').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const filename = `${safeTitle}_responses_${surveyId}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (err) {
    console.error('CSV export error:', err);
    return res.status(500).json({ error: 'Failed to generate CSV export' });
  }
});

// Export as Excel (.xlsx): /api/surveys/:id/export/xlsx
router.get('/:id/export/xlsx', (req, res) => {
  const surveyId = req.params.id;

  try {
    const data = getSurveyTabularData(surveyId, req.user.id, req.user.isAdmin);
    if (!data) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const { survey, rows } = data;

    const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Status: 'No responses yet' }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Responses');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const safeTitle = (survey.title || 'survey').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const filename = `${safeTitle}_responses_${surveyId}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Excel export error:', err);
    return res.status(500).json({ error: 'Failed to generate Excel export' });
  }
});

module.exports = router;
