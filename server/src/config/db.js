const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function getDbPath() {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'surveys.db');
}

const dbPath = getDbPath();
console.log(`[Database] Initializing SQLite database at: ${dbPath}`);

const db = new Database(dbPath);

// Enable WAL mode for high concurrency and performance
db.pragma('journal_mode = WAL');
// Enforce foreign key constraints
db.pragma('foreign_keys = ON');

// Initialize database schema
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS surveys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      email_notifications INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL,
      order_num INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL,
      options_json TEXT,
      is_required INTEGER DEFAULT 0,
      FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      response_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      value TEXT NOT NULL,
      FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      survey_id TEXT,
      email_type TEXT NOT NULL,
      recipient TEXT NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'draft',
      current_question_id TEXT,
      voting_open INTEGER DEFAULT 1,
      show_results INTEGER DEFAULT 1,
      show_correct_answer INTEGER DEFAULT 0,
      is_quiz_mode INTEGER DEFAULT 0,
      show_leaderboard INTEGER DEFAULT 0,
      qa_enabled INTEGER DEFAULT 1,
      qa_moderation INTEGER DEFAULT 0,
      show_qa_on_screen INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS poll_questions (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      order_num INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL,
      options_json TEXT,
      correct_answer TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS poll_votes (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES poll_questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS poll_qa_questions (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      author_name TEXT DEFAULT 'Anonymous',
      question_text TEXT NOT NULL,
      upvotes INTEGER DEFAULT 0,
      is_approved INTEGER DEFAULT 1,
      is_answered INTEGER DEFAULT 0,
      is_highlighted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS poll_qa_upvotes (
      id TEXT PRIMARY KEY,
      qa_question_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(qa_question_id, participant_id),
      FOREIGN KEY (qa_question_id) REFERENCES poll_qa_questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS poll_participants (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT DEFAULT '🚀',
      score INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(poll_id, participant_id),
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_surveys_user ON surveys(user_id);
    CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);
    CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
    CREATE INDEX IF NOT EXISTS idx_questions_survey ON questions(survey_id);
    CREATE INDEX IF NOT EXISTS idx_responses_survey ON responses(survey_id);
    CREATE INDEX IF NOT EXISTS idx_answers_response ON answers(response_id);
    CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
    CREATE INDEX IF NOT EXISTS idx_email_logs_user ON email_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_email_logs_survey ON email_logs(survey_id);
    CREATE INDEX IF NOT EXISTS idx_polls_user ON polls(user_id);
    CREATE INDEX IF NOT EXISTS idx_polls_code ON polls(code);
    CREATE INDEX IF NOT EXISTS idx_poll_questions_poll ON poll_questions(poll_id);
    CREATE INDEX IF NOT EXISTS idx_poll_votes_question ON poll_votes(question_id);
    CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
    CREATE INDEX IF NOT EXISTS idx_poll_qa_poll ON poll_qa_questions(poll_id);
    CREATE INDEX IF NOT EXISTS idx_poll_qa_upvotes ON poll_qa_upvotes(qa_question_id);
    CREATE INDEX IF NOT EXISTS idx_poll_participants_poll ON poll_participants(poll_id);
    CREATE INDEX IF NOT EXISTS idx_poll_participants_user ON poll_participants(poll_id, participant_id);
  `);

  // Migrate surveys table to add email_notifications column if missing
  try {
    const surveyCols = db.prepare("PRAGMA table_info(surveys)").all();
    if (surveyCols.length > 0 && !surveyCols.some(c => c.name === 'email_notifications')) {
      console.log('[Database] Migrating surveys table: adding email_notifications column...');
      db.exec("ALTER TABLE surveys ADD COLUMN email_notifications INTEGER DEFAULT 0;");
      console.log('[Database] email_notifications column added successfully.');
    }
  } catch (colErr) {
    console.warn('[Database] Survey column migration check warning:', colErr.message);
  }

  // Migrate existing questions table if restrictive check constraint exists
  const tableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='questions'").get();
  if (tableSql && tableSql.sql && tableSql.sql.includes("CHECK(question_type IN")) {
    console.log('[Database] Migrating questions table to unconstrained question_type...');
    db.pragma('foreign_keys = OFF');
    const migrate = db.transaction(() => {
      db.exec(`
        CREATE TABLE questions_new (
          id TEXT PRIMARY KEY,
          survey_id TEXT NOT NULL,
          order_num INTEGER NOT NULL,
          question_text TEXT NOT NULL,
          question_type TEXT NOT NULL,
          options_json TEXT,
          is_required INTEGER DEFAULT 0,
          FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
        );
        INSERT INTO questions_new SELECT id, survey_id, order_num, question_text, question_type, options_json, is_required FROM questions;
        DROP TABLE questions;
        ALTER TABLE questions_new RENAME TO questions;
        CREATE INDEX IF NOT EXISTS idx_questions_survey ON questions(survey_id);
      `);
    });
    migrate();
    db.pragma('foreign_keys = ON');
    console.log('[Database] Questions table migrated successfully.');
  }

  // Backfill any email_logs with missing user_id from survey ownership
  try {
    const repaired = db.prepare(`
      UPDATE email_logs 
      SET user_id = (SELECT user_id FROM surveys WHERE surveys.id = email_logs.survey_id)
      WHERE user_id IS NULL AND survey_id IS NOT NULL;
    `).run();
    if (repaired.changes > 0) {
      console.log(`[Database] Repaired ${repaired.changes} email_logs with missing user_id.`);
    }
  } catch (backfillErr) {
    console.warn('[Database] Email logs backfill notice:', backfillErr.message);
  }

  // Ensure show_qa_on_screen column exists on existing polls table
  try {
    db.exec(`ALTER TABLE polls ADD COLUMN show_qa_on_screen INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists
  }

  // Ensure show_correct_answer column exists on polls table
  try {
    db.exec(`ALTER TABLE polls ADD COLUMN show_correct_answer INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists
  }

  // Ensure is_quiz_mode column exists on polls table
  try {
    db.exec(`ALTER TABLE polls ADD COLUMN is_quiz_mode INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists
  }

  // Ensure show_leaderboard column exists on polls table
  try {
    db.exec(`ALTER TABLE polls ADD COLUMN show_leaderboard INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists
  }

  // Ensure correct_answer column exists on poll_questions table
  try {
    db.exec(`ALTER TABLE poll_questions ADD COLUMN correct_answer TEXT`);
  } catch (e) {
    // Column already exists
  }

  // Migrate poll_votes to remove UNIQUE(question_id, participant_id) if present
  try {
    const indexes = db.prepare("PRAGMA index_list(poll_votes)").all();
    const hasUniqueConstraint = indexes.some(idx => idx.unique === 1 && idx.origin === 'u');
    if (hasUniqueConstraint) {
      db.exec(`
        CREATE TABLE poll_votes_temp (
          id TEXT PRIMARY KEY,
          poll_id TEXT NOT NULL,
          question_id TEXT NOT NULL,
          participant_id TEXT NOT NULL,
          value TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
          FOREIGN KEY (question_id) REFERENCES poll_questions(id) ON DELETE CASCADE
        );
        INSERT INTO poll_votes_temp SELECT id, poll_id, question_id, participant_id, value, created_at FROM poll_votes;
        DROP TABLE poll_votes;
        ALTER TABLE poll_votes_temp RENAME TO poll_votes;
        CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
        CREATE INDEX IF NOT EXISTS idx_poll_votes_question ON poll_votes(question_id);
      `);
      console.log('[Database] Migrated poll_votes table to remove single-vote constraint');
    }
  } catch (e) {
    console.warn('[Database] poll_votes migration notice:', e.message);
  }

  console.log('[Database] Schema initialized successfully.');
}

initSchema();

module.exports = db;
