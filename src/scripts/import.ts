import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { DB_PATH, RAW_DIR } from "../config.js";
import type { RawChapter } from "../shared/types.js";

function makeId(chapter: number, number: number): string {
  return `ch${chapter}-${String(number).padStart(3, "0")}`;
}

const db = new DatabaseSync(DB_PATH);

const upsertQuestion = db.prepare(`
  INSERT INTO questions (id, chapter, chapter_title, number, question_it, question_en, answer, topic, source_page)
  VALUES ($id, $chapter, $chapter_title, $number, $question_it, $question_en, $answer, $topic, $source_page)
  ON CONFLICT(id) DO UPDATE SET
    chapter_title = excluded.chapter_title,
    question_it = excluded.question_it,
    question_en = excluded.question_en,
    answer = excluded.answer,
    topic = excluded.topic,
    source_page = excluded.source_page
`);

const ensureReviewState = db.prepare(`
  INSERT INTO review_state (question_id)
  VALUES (?)
  ON CONFLICT(question_id) DO NOTHING
`);

let total = 0;

function importChapter(chapterData: RawChapter) {
  db.exec("BEGIN");
  try {
    for (const q of chapterData.questions) {
      const id = makeId(chapterData.chapter, q.number);
      upsertQuestion.run({
        id,
        chapter: chapterData.chapter,
        chapter_title: chapterData.chapterTitle,
        number: q.number,
        question_it: q.question_it,
        question_en: q.question_en ?? null,
        answer: q.answer ? 1 : 0,
        topic: q.topic ?? null,
        source_page: q.source_page ?? null,
      });
      ensureReviewState.run(id);
      total++;
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

const files = readdirSync(RAW_DIR).filter((f) => f.endsWith(".json"));

for (const file of files) {
  const data: RawChapter = JSON.parse(readFileSync(join(RAW_DIR, file), "utf-8"));
  importChapter(data);
  console.log(`Imported ${data.questions.length} questions from ${file}`);
}

console.log(`Done. ${total} questions processed across ${files.length} file(s).`);
db.close();
