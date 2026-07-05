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
| `figure_id` | TEXT | nullable, FOREIGN KEY -> figures.id; the shared image for this question (see ADR 0002). Many questions may point at one figure (a *scheda*). |
| `figure_locked` | INTEGER | 0/1, default 0. When 1, an admin has set/confirmed `figure_id` manually and the auto-match pass must not overwrite it. |

### `figures` (the image library)

The shared image library (see ADR 0002). One row per unique figure (road sign, or carriageway /
intersection / right-of-way diagram). Seeded from [QuizPatenteB](https://github.com/Ed0ardo/QuizPatenteB)
`img_sign/`. Many questions reference one figure (a *scheda*). Image bytes ship as static assets,
not in the DB.

| column | type | notes |
|---|---|---|
| `id` | TEXT PRIMARY KEY | stable key, e.g. `sign-550` (derived from the QuizPatenteB file name) |
| `file` | TEXT NOT NULL | static-asset path, e.g. `figures/550.png` |
| `alt_it` | TEXT | accessibility text + fallback when the image is missing |
| `alt_en` | TEXT | nullable translation |
| `width` | INTEGER | nullable intrinsic width, so the card reserves space (no layout shift) |
| `height` | INTEGER | nullable intrinsic height |
| `source` | TEXT | provenance, e.g. `quizpatenteb`; leaves room for a future `wikimedia` upgrade |

### `users`

Basic user accounts (see ADR 0001). Passwords are hashed with PBKDF2-SHA256 via Web Crypto.

| column | type | notes |
|---|---|---|
| `id` | TEXT PRIMARY KEY | `crypto.randomUUID()` |
| `username` | TEXT UNIQUE NOT NULL | 3-32 chars, `[a-zA-Z0-9_.-]` |
| `password_hash` | TEXT NOT NULL | `pbkdf2$<iters>$<saltB64>$<hashB64>`; never leaves the server |
| `created_at` | TEXT NOT NULL | ISO timestamp |
| `is_admin` | INTEGER | 0/1, default 0. Admins may set/lock question figures (see ADR 0002). |

### `sessions`

Server-side session tokens. The raw token lives only in an `HttpOnly` cookie; the DB stores its hash.

| column | type | notes |
|---|---|---|
| `token_hash` | TEXT PRIMARY KEY | SHA-256 of the raw cookie token |
| `user_id` | TEXT, FOREIGN KEY -> users.id ON DELETE CASCADE | |
| `created_at` | TEXT NOT NULL | ISO timestamp |
| `expires_at` | TEXT NOT NULL | ISO timestamp; expired sessions are rejected |

### `answers`

Append-only log — one row per answer event. The durable record of who answered what, when.

| column | type | notes |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `user_id` | TEXT, FOREIGN KEY -> users.id ON DELETE CASCADE | |
| `question_id` | TEXT, FOREIGN KEY -> questions.id | |
| `chosen` | INTEGER | 0/1, the answer the user picked |
| `correct` | INTEGER | 0/1, whether `chosen` matched `questions.answer` |
| `answered_at` | TEXT | ISO timestamp |

### `review_state`

Live per-user aggregate state per question. Composite key `(user_id, question_id)`; rows are created
lazily on first answer (the importer no longer seeds this table). Separate from `questions` so
re-importing question content never touches it.

| column | type | notes |
|---|---|---|
| `user_id` | TEXT, FOREIGN KEY -> users.id ON DELETE CASCADE | part of composite PK |
| `question_id` | TEXT, FOREIGN KEY -> questions.id | part of composite PK |
| `doubt_flagged` | INTEGER | 0/1, "I'm not sure about this one" flag |
| `favorited` | INTEGER | 0/1, default 0, per-user "important / favorite" bookmark (migration 0003) |
| `confidence` | INTEGER | nullable, 1-5 self-rating |
| `times_reviewed` | INTEGER | default 0 |
| `times_correct` | INTEGER | default 0 |
| `last_answer` | INTEGER | nullable 0/1, the most recent answer given |
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
