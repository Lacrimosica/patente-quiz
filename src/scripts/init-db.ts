import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "fs";
import { dirname } from "path";
import { DB_PATH } from "../config.js";

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    chapter INTEGER NOT NULL,
    chapter_title TEXT NOT NULL,
    number INTEGER NOT NULL,
    question_it TEXT NOT NULL,
    question_en TEXT,
    answer INTEGER NOT NULL CHECK (answer IN (0, 1)),
    topic TEXT,
    source_page INTEGER
  );

  CREATE TABLE IF NOT EXISTS review_state (
    question_id TEXT PRIMARY KEY REFERENCES questions(id),
    doubt_flagged INTEGER NOT NULL DEFAULT 0 CHECK (doubt_flagged IN (0, 1)),
    confidence INTEGER CHECK (confidence BETWEEN 1 AND 5),
    times_reviewed INTEGER NOT NULL DEFAULT 0,
    times_correct INTEGER NOT NULL DEFAULT 0,
    last_reviewed_at TEXT
  );

  -- Reserved for phase 2 (knowledge base / RAG), not yet used by the app.
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    chapter INTEGER NOT NULL,
    chunk_index INTEGER NOT NULL,
    text_it TEXT NOT NULL,
    text_en TEXT
  );

  -- Reserved for phase 2, not yet used by the app.
  CREATE TABLE IF NOT EXISTS embeddings (
    document_id TEXT NOT NULL REFERENCES documents(id),
    vector BLOB NOT NULL,
    model TEXT NOT NULL
  );

  -- Reserved for phase 2, not yet used by the app.
  CREATE TABLE IF NOT EXISTS explanations (
    question_id TEXT PRIMARY KEY REFERENCES questions(id),
    explanation_it TEXT,
    explanation_en TEXT,
    source_document_ids TEXT,
    generated_at TEXT,
    reviewed_by_human INTEGER NOT NULL DEFAULT 0 CHECK (reviewed_by_human IN (0, 1))
  );

  CREATE INDEX IF NOT EXISTS idx_questions_chapter ON questions(chapter);
  CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);
  CREATE INDEX IF NOT EXISTS idx_review_doubt ON review_state(doubt_flagged);
`);

console.log(`Database initialized at ${DB_PATH}`);
db.close();
