import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import {
  createUser,
  createSession,
  getSessionUser,
  deleteSession,
  setFavorite,
  getQuestion,
  listQuestions,
} from "./queries.js";
import { newSessionToken, hashPassword } from "./auth.js";

let seq = 0;
/** Creates a user with a unique username and returns its id. */
async function makeUser(): Promise<{ id: string; username: string }> {
  const id = crypto.randomUUID();
  const username = `user_${seq++}_${id.slice(0, 8)}`;
  await createUser(env.DB, {
    id,
    username,
    passwordHash: await hashPassword("password123"),
    createdAt: new Date().toISOString(),
  });
  return { id, username };
}

function futureIso(msFromNow: number): string {
  return new Date(Date.now() + msFromNow).toISOString();
}

/** Inserts a minimal question row and returns its id. */
async function makeQuestion(): Promise<string> {
  const id = `ch1-${String(seq++).padStart(3, "0")}`;
  await env.DB.prepare(
    `INSERT INTO questions (id, chapter, chapter_title, number, question_it, answer)
     VALUES (?, 1, 'Test', ?, 'Domanda?', 1)`
  )
    .bind(id, seq)
    .run();
  return id;
}

describe("session lifecycle", () => {
  it("resolves a valid session to its user", async () => {
    const user = await makeUser();
    const token = await newSessionToken();
    await createSession(env.DB, {
      tokenHash: token.hash,
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: futureIso(60_000),
    });

    const resolved = await getSessionUser(env.DB, token.hash);
    expect(resolved).not.toBeNull();
    expect(resolved!.id).toBe(user.id);
    expect(resolved!.username).toBe(user.username);
  });

  it("rejects an expired session", async () => {
    const user = await makeUser();
    const token = await newSessionToken();
    await createSession(env.DB, {
      tokenHash: token.hash,
      userId: user.id,
      createdAt: futureIso(-120_000),
      expiresAt: futureIso(-60_000), // expired a minute ago
    });

    expect(await getSessionUser(env.DB, token.hash)).toBeNull();
  });

  it("invalidates a session after deleteSession", async () => {
    const user = await makeUser();
    const token = await newSessionToken();
    await createSession(env.DB, {
      tokenHash: token.hash,
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: futureIso(60_000),
    });
    expect(await getSessionUser(env.DB, token.hash)).not.toBeNull();

    await deleteSession(env.DB, token.hash);
    expect(await getSessionUser(env.DB, token.hash)).toBeNull();
  });

  it("resolves an unknown token to null", async () => {
    const token = await newSessionToken();
    expect(await getSessionUser(env.DB, token.hash)).toBeNull();
  });
});

describe("favorites", () => {
  it("flags and unflags a question for a user", async () => {
    const user = await makeUser();
    const questionId = await makeQuestion();

    // Never touched → not favorited.
    let q = await getQuestion(env.DB, user.id, questionId);
    expect(q!.favorited ?? 0).toBe(0);

    expect(await setFavorite(env.DB, user.id, questionId, true)).toBe(1);
    q = await getQuestion(env.DB, user.id, questionId);
    expect(q!.favorited).toBe(1);

    expect(await setFavorite(env.DB, user.id, questionId, false)).toBe(0);
    q = await getQuestion(env.DB, user.id, questionId);
    expect(q!.favorited).toBe(0);
  });

  it("keeps favorites per-user", async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const questionId = await makeQuestion();

    await setFavorite(env.DB, alice.id, questionId, true);

    const forAlice = await getQuestion(env.DB, alice.id, questionId);
    const forBob = await getQuestion(env.DB, bob.id, questionId);
    expect(forAlice!.favorited).toBe(1);
    expect(forBob!.favorited ?? 0).toBe(0);
  });

  it("favoritesOnly filter returns only flagged questions", async () => {
    const user = await makeUser();
    const flagged = await makeQuestion();
    await makeQuestion(); // an unflagged one

    await setFavorite(env.DB, user.id, flagged, true);

    const results = await listQuestions(env.DB, user.id, { favoritesOnly: true });
    expect(results.every((r) => r.favorited === 1)).toBe(true);
    expect(results.some((r) => r.id === flagged)).toBe(true);
  });
});
