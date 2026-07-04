import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RAW_DIR, SEED_SQL_PATH } from "../config.js";
import type { RawChapter } from "../shared/types.js";

function makeId(chapter: number, number: number): string {
  return `ch${chapter}-${String(number).padStart(3, "0")}`;
}

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

function buildInserts(chapter: RawChapter): string[] {
  const lines: string[] = [];
  for (const q of chapter.questions) {
    const id = makeId(chapter.chapter, q.number);
    const questionEn = q.question_en != null ? `'${escapeSql(q.question_en)}'` : "NULL";
    const topic = q.topic != null ? `'${escapeSql(q.topic)}'` : "NULL";
    const sourcePage = q.source_page != null ? String(q.source_page) : "NULL";
    const answer = q.answer ? 1 : 0;

    lines.push(
      `INSERT OR REPLACE INTO questions (id, chapter, chapter_title, number, question_it, question_en, answer, topic, source_page) VALUES ('${escapeSql(id)}', ${chapter.chapter}, '${escapeSql(chapter.chapterTitle)}', ${q.number}, '${escapeSql(q.question_it)}', ${questionEn}, ${answer}, ${topic}, ${sourcePage});`
    );
    // review_state rows are per-user and created lazily on first answer; the
    // importer only seeds re-importable question content.
  }
  return lines;
}

const files = readdirSync(RAW_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

const allInserts: string[] = [];
let total = 0;

for (const file of files) {
  const data: RawChapter = JSON.parse(readFileSync(join(RAW_DIR, file), "utf-8"));
  const inserts = buildInserts(data);
  allInserts.push(...inserts);
  total += data.questions.length;
  console.log(`Processed ${data.questions.length} questions from ${file}`);
}

const sql = [
  "PRAGMA defer_foreign_keys = ON;",
  ...allInserts,
].join("\n");

writeFileSync(SEED_SQL_PATH, sql, "utf-8");
console.log(`Done. ${total} questions written to ${SEED_SQL_PATH}`);
