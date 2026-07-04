# Context / Glossary

Canonical vocabulary for patente-quiz. When naming a domain concept in issues, code, tests, or
ADRs, use the term as defined here rather than a synonym.

## Terms

- **Question** — one true/false item. Stored in `questions`, keyed `ch{chapter}-{number}`. Content
  comes from our hand-cleaned `data/raw/chapter-N.json` (the source of truth).

- **Figure** — a shared image belonging to one or more questions: a road sign, or a carriageway /
  intersection / right-of-way diagram. Modelled in the `figures` table (see ADR 0002). Prefer
  "figure" over "image"/"picture" when referring to the domain object.

- **Scheda** — a group of questions that share one figure (typically ~7–10 true/false statements
  about the same diagram). The reason `figure_id` is many-questions-to-one-figure, not 1:1.

- **Image library** — the `figures` table plus its static-asset image bytes; the pool an admin
  picks from when tagging a question. Seeded from QuizPatenteB.

- **Auto-match** — the offline pass that fuzzy-matches each question's `question_it` against
  QuizPatenteB question text and sets `figure_id` on confident matches. Re-runnable; only writes to
  **unlocked** questions.

- **Match lock** (`figure_locked`) — a per-question flag set when an admin manually sets or confirms
  a figure. Locked questions are skipped by auto-match, so human decisions are never clobbered.

- **QuizPatenteB** — the MIT-licensed external dataset (~413 figures + associations) used as the
  image library and the auto-match reference. Not the source of truth for question content.

- **Wikimedia** — a documented *future* alternative source (public-domain Italian road-sign SVGs).
  Covers signs only, not carriageway/precedence diagrams. Not used yet.

- **Review state** — per-user aggregate for a question (`times_reviewed`, `times_correct`,
  `doubt_flagged`, `favorited`, `confidence`, …). Per-user, in `review_state`; never holds shared
  content like `figure_id`.

- **Favorite** (`favorited`) — a per-user "important" bookmark on a question, set from the quiz card
  (☆/★). Mirrors `doubt_flagged`: a learner-set marker for questions to revisit. Toggled via
  `POST /api/favorites`; filterable with `?favoritesOnly=true` on `GET /api/questions`.

## Decisions

Architectural decisions live in `docs/adr/`. Touching figures/images? Read ADR 0002. Touching
auth/answer tracking? Read ADR 0001.
