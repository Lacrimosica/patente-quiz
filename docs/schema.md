# Schema

## Design principles

- **Raw transcribed data is separate from live app state.** The book's questions and answers (`data/raw/*.json`) are re-importable without wiping your flags, confidence ratings, or review history. Import is an upsert keyed on `id`, never a wipe-and-reload.
- **Reserve space for RAG/knowledge-base features now, build later.** The `documents` and `embeddings` tables exist in the schema from day one so the eventual explanation-generation feature doesn't require a migration that touches the `questions` table.
- **SQLite, not flat JSON, for the live DB.** Once flags/confidence/review-counts exist per question, you want to query ("all doubt-flagged questions in chapter 3, sorted by least recently reviewed"), not parse JSON by hand. Uses Node's built-in `node:sqlite`, no native compilation, no extra dependency to maintain.

## Tables

### `questions`

The core table. One row per question from the book.

| column | type | notes |
|---|---|---|
| `id` | TEXT PRIMARY KEY | e.g. `ch1-014`, chapter + question number, stable across re-imports |
| `chapter` | INTEGER | chapter number |
| `chapter_title` | TEXT | e.g. "La persona alla guida" |
| `number` | INTEGER | question number within chapter, as printed in the book |
| `question_it` | TEXT | original Italian question text |
| `question_en` | TEXT | English translation, nullable, phase 2 |
| `answer` | INTEGER | 1 = true (V), 0 = false (F) |
| `topic` | TEXT | free-text tag, e.g. `alcohol`, `shock`, `first-aid-wounds`, `eye-injury` |
| `source_page` | INTEGER | nullable, page number in the book, useful for re-checking against the source |

### `review_state`

Live app state per question. Separate table so re-importing `questions` never touches this.

| column | type | notes |
|---|---|---|
| `question_id` | TEXT PRIMARY KEY, FOREIGN KEY -> questions.id | |
| `doubt_flagged` | INTEGER | 0/1, your "I'm not sure about this one" flag |
| `confidence` | INTEGER | nullable, 1-5 self-rating |
| `times_reviewed` | INTEGER | default 0 |
| `times_correct` | INTEGER | default 0 |
| `last_reviewed_at` | TEXT | ISO timestamp, nullable |

### `documents` (reserved, phase 2)

Chapter lesson/explanation text, chunked, for future RAG grounding.

| column | type | notes |
|---|---|---|
| `id` | TEXT PRIMARY KEY | |
| `chapter` | INTEGER | |
| `chunk_index` | INTEGER | position within chapter |
| `text_it` | TEXT | original lesson text chunk |
| `text_en` | TEXT | nullable, translation |

### `embeddings` (reserved, phase 2)

| column | type | notes |
|---|---|---|
| `document_id` | TEXT, FOREIGN KEY -> documents.id | |
| `vector` | BLOB | embedding vector, format TBD when this is built |
| `model` | TEXT | which embedding model produced it |

### `explanations` (reserved, phase 2)

Generated, source-grounded explanations per question, kept separate from `questions` so they can be regenerated/edited without touching transcribed content.

| column | type | notes |
|---|---|---|
| `question_id` | TEXT, FOREIGN KEY -> questions.id | |
| `explanation_it` | TEXT | |
| `explanation_en` | TEXT | nullable |
| `source_document_ids` | TEXT | JSON array of `documents.id` used to ground the explanation |
| `generated_at` | TEXT | ISO timestamp |
| `reviewed_by_human` | INTEGER | 0/1, whether you've checked/edited it |

## Raw JSON format (`data/raw/chapter-N.json`)

This is what gets transcribed from book photos and fed into the importer.

```json
{
  "chapter": 1,
  "chapterTitle": "La persona alla guida",
  "questions": [
    {
      "number": 14,
      "question_it": "Un conducente che ha assunto una quantità eccessiva di bevande alcoliche non può recuperare velocemente l'idoneità alla guida, specie se ha assunto anche dei farmaci",
      "answer": true,
      "topic": "alcohol",
      "source_page": 14
    }
  ]
}
```

The importer derives `id` as `ch{chapter}-{number, zero-padded to 3}`, e.g. `ch1-014`.
