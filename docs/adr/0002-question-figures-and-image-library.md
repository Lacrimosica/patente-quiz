# ADR 0002: Question figures and the image library

## Status

Accepted (2026-07-04)

## Context

Many patente questions are **schede**: a single figure (a road sign, or a carriageway /
intersection / right-of-way diagram) followed by several true/false statements about it. Our
data so far (chapter 1) is text-only, but later chapters (`segnali`, `precedenze`) are
image-driven and unusable without the figures.

Two facts shape the decision:

1. **Figures are shared, not per-question.** The official ministerial figure set is small
   (~400 images) but backs thousands of questions — roughly 9–10 statements per figure. A
   1:1 `image_path` column on `questions` would duplicate the same reference (and alt text)
   across every statement in a scheda, with no single place to correct it.
2. **A clean, licensed source already exists.** [Ed0ardo/QuizPatenteB](https://github.com/Ed0ardo/QuizPatenteB)
   (MIT) ships ~413 `img_sign/NNN.png` figures **and** the question→figure associations, as
   `{ "img": "/img_sign/550.png", "q": "…", "a": true }`. The same set covers both road signs
   and the carriageway/precedence diagrams — they are not two separate sourcing problems.

## Decision

1. **Figures are first-class content, modelled in their own `figures` table** (the *image
   library*). `questions` gains a nullable `figure_id` FK. Many questions → one figure is the
   norm. `figure_id` is **global question content, not per-user state** — it lives on
   `questions`, never on `review_state`.

2. **Our hand-cleaned `data/raw/chapter-N.json` remains the source of truth** for question
   content (it carries English translations, chapter/number/`source_page` structure that
   QuizPatenteB lacks). QuizPatenteB is a **library + a suggestion engine**, not the base
   dataset.

3. **Associations are bootstrapped by auto-match, then curated.** A one-time (re-runnable)
   offline pass fuzzy-matches each question's `question_it` against QuizPatenteB's `q` strings
   and sets `figure_id` on confident matches. This gets us most of the ~3,983 associations for
   free.

4. **Manual edits win and are sticky (the "match lock").** An admin authoring UI lets you
   change a wrong match or fill a missing one, picking from the library. Any manual set/confirm
   sets `figure_locked = 1` on that question. **The auto-match pass only writes to rows where
   `figure_locked = 0`**, so re-running it never clobbers a human decision.

5. **Writes to `figure_id` are admin-gated.** Because figures are shared content, the authoring
   endpoints require an admin (a `users.is_admin` flag; hardcode-gating to the owner username is
   acceptable for now). Reading figures is public content, like `/api/topics`.

6. **Wikimedia Commons is a documented future source, not used yet.** Its Italian road-sign SVGs
   are public domain and higher quality, but cover *signs only* (not carriageway/precedence
   diagrams), so QuizPatenteB stays the primary source. Revisit if we want to upgrade the pure-sign
   subset to vector art.

## Consequences

- New migration adds the `figures` table and `questions.figure_id` + `questions.figure_locked`.
- Figure image bytes ship as **static assets** (served by Vite in dev, Workers Assets in prod),
  consistent with the local-first goal — not R2, not D1 blobs. Seeded from QuizPatenteB `img_sign/`.
- `getQuestion` / `listQuestions` grow a `LEFT JOIN figures`; `QuestionRow` gains nullable figure
  fields. The client renders an `<img>` (with alt text, lazy load, fixed aspect ratio) above the
  question text.
- New surfaces: `GET /api/figures` (library, public), admin `PATCH /api/questions/:id { figureId }`
  and a scheda-level propagate action, both gated by `is_admin`.
- **Licensing:** QuizPatenteB is MIT; the underlying figures are official MIT/MIMS exam material
  redistributed by every quiz app. Acceptable for a personal, local-first study tool.
- Out of scope: full admin role system (single `is_admin` flag suffices), Wikimedia integration,
  and any figure editing/cropping.
