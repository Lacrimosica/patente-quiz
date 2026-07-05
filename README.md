# Patente Quiz

A local-first study tool for Italian driving license (patente) theory exam practice questions. Tracks which questions you've gotten wrong, how confident you are, and how often you've reviewed them, so review time goes toward weak spots instead of everything.

Started as a personal tool, intended to be released open source once the core is stable.

## Why this exists

The official practice books have thousands of true/false questions across many chapters. Going through them once isn't enough, recall fades and certain topics ("dubious" or counter-intuitive ones) need repeated review. This project:

1. Stores every question with its chapter, topic, and correct answer.
2. Lets you flag questions you got wrong or felt unsure about.
3. Tracks review history per question (times reviewed, confidence, last reviewed date).
4. Lets you quiz yourself filtered by chapter, topic, or "doubtful only".

## Planned (not yet built)

- **Knowledge base / RAG**: ingest the actual lesson/explanation text from each chapter (not just the Q&A), chunk and embed it, and use it to generate grounded explanations for *why* an answer is true/false, rather than relying on an LLM's unsupported guess.
- **Translations**: English versions of questions and explanations.
- **Explanation generation loop**: for each question, retrieve relevant chunks from the knowledge base and have an LLM draft an explanation grounded in that source text, reviewed/editable by hand.

These are deliberately deferred. The schema reserves space for them (see `docs/schema.md`) but no retrieval or LLM-calling code exists yet, that's a phase 2 task once the question dataset is complete and clean.

## Stack

- **Database**: SQLite via Node's built-in `node:sqlite` module (stable enough for this use case, no native compilation step, nothing to break on `npm install`). Lives at `data/db/patente.db`. Requires Node 22.5+; scripts run with `--experimental-sqlite` until the API stabilizes.
- **Backend**: Node + TypeScript, Express, thin REST API over the DB.
- **Frontend**: Vite + React + TypeScript, talks to the local API over `localhost`.
- **Transcription pipeline**: raw per-chapter JSON files (`data/raw/`) are the source of truth for transcribed book content; a script imports them into SQLite. This keeps "what was transcribed from the book" separate from "live app state" (flags, confidence, review counts), so re-imports never clobber your progress.

No hosting, no auth, no cloud, this runs on `localhost` only, per your call. The architecture doesn't block adding a hosted version later, but nothing here assumes it.

## Project structure

```
patente-quiz/
├── data/
│   ├── raw/           # transcribed chapter JSON (source of truth for Q&A content)
│   └── db/            # SQLite database file (gitignored, generated)
├── src/
│   ├── server/        # Express API
│   ├── client/         # Vite + React frontend
│   └── scripts/        # import/ingest scripts (raw JSON -> SQLite)
├── docs/
│   └── schema.md       # full DB schema + design notes
└── README.md
```

## Setup

Requires **Node 22.5+** (uses the built-in `node:sqlite` module).

```bash
npm install
npm run db:init       # creates SQLite schema
npm run import        # loads data/raw/*.json into the database
npm run dev            # starts API + frontend
```

## Data entry workflow

1. Photograph/type a batch of questions from the book.
2. Transcribe into `data/raw/chapter-N.json` (see `docs/schema.md` for the format).
3. Run `npm run import` to load new questions into the DB (idempotent, safe to re-run).
4. Quiz yourself in the app, flag doubts, rate confidence as you go.

## License

MIT (planned, once public).
