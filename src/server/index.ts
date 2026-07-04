import {
  listQuestions,
  listTopics,
  getQuestion,
  createUser,
  getUserByUsername,
  createSession,
  deleteSession,
  recordAnswer,
} from "./queries.js";
import {
  hashPassword,
  verifyPassword,
  newSessionToken,
  sessionCookie,
  clearCookie,
  sessionExpiry,
  authenticate,
  sessionTokenFrom,
  sha256Hex,
} from "./auth.js";
import type { AnswerResult } from "../shared/types.js";

export interface Env {
  DB: D1Database;
}

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init);
}

async function handleRegister(request: Request, env: Env): Promise<Response> {
  const body = await request.json().catch(() => null);
  const username = (body as { username?: unknown })?.username;
  const password = (body as { password?: unknown })?.password;

  if (typeof username !== "string" || !USERNAME_RE.test(username)) {
    return json(
      { error: "Username must be 3-32 chars (letters, digits, . _ -)." },
      { status: 400 }
    );
  }
  if (typeof password !== "string" || password.length < 8) {
    return json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  if (await getUserByUsername(env.DB, username)) {
    return json({ error: "Username already taken." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  await createUser(env.DB, { id, username, passwordHash, createdAt: now });

  const token = await newSessionToken();
  await createSession(env.DB, {
    tokenHash: token.hash,
    userId: id,
    createdAt: now,
    expiresAt: sessionExpiry(),
  });

  return json(
    { id, username },
    { headers: { "Set-Cookie": sessionCookie(request, token.raw) } }
  );
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = await request.json().catch(() => null);
  const username = (body as { username?: unknown })?.username;
  const password = (body as { password?: unknown })?.password;

  const invalid = json({ error: "Invalid credentials." }, { status: 401 });
  if (typeof username !== "string" || typeof password !== "string") {
    return invalid;
  }

  const user = await getUserByUsername(env.DB, username);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return invalid;
  }

  const now = new Date().toISOString();
  const token = await newSessionToken();
  await createSession(env.DB, {
    tokenHash: token.hash,
    userId: user.id,
    createdAt: now,
    expiresAt: sessionExpiry(),
  });

  return json(
    { id: user.id, username: user.username },
    { headers: { "Set-Cookie": sessionCookie(request, token.raw) } }
  );
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  const raw = sessionTokenFrom(request);
  if (raw) await deleteSession(env.DB, await sha256Hex(raw));
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": clearCookie(request) },
  });
}

async function handleAnswer(request: Request, env: Env): Promise<Response> {
  const user = await authenticate(request, env.DB);
  if (!user) return json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const questionId = (body as { questionId?: unknown })?.questionId;
  const chosen = (body as { chosen?: unknown })?.chosen;

  if (typeof questionId !== "string" || typeof chosen !== "boolean") {
    return json(
      { error: "Expected { questionId: string, chosen: boolean }." },
      { status: 400 }
    );
  }

  const question = await getQuestion(env.DB, user.id, questionId);
  if (!question) {
    return json({ error: "Question not found." }, { status: 404 });
  }

  const chosenInt = chosen ? 1 : 0;
  const correct = chosenInt === question.answer ? 1 : 0;
  const reviewState = await recordAnswer(env.DB, {
    userId: user.id,
    questionId,
    chosen: chosenInt,
    correct,
    answeredAt: new Date().toISOString(),
  });

  const result: AnswerResult = {
    correct: correct === 1,
    answer: question.answer,
    reviewState,
  };
  return json(result);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    // --- Auth ---
    if (method === "POST" && pathname === "/api/auth/register") {
      return handleRegister(request, env);
    }
    if (method === "POST" && pathname === "/api/auth/login") {
      return handleLogin(request, env);
    }
    if (method === "POST" && pathname === "/api/auth/logout") {
      return handleLogout(request, env);
    }
    if (method === "GET" && pathname === "/api/auth/me") {
      const user = await authenticate(request, env.DB);
      if (!user) return json({ error: "Not authenticated." }, { status: 401 });
      return json({ id: user.id, username: user.username });
    }

    // --- Answers ---
    if (method === "POST" && pathname === "/api/answers") {
      return handleAnswer(request, env);
    }

    // --- Questions (per-user review state → requires auth) ---
    if (method === "GET" && pathname === "/api/questions") {
      const user = await authenticate(request, env.DB);
      if (!user) return json({ error: "Not authenticated." }, { status: 401 });

      const chapterParam = url.searchParams.get("chapter");
      const topicParam = url.searchParams.get("topic");
      const doubtOnlyParam = url.searchParams.get("doubtOnly");

      const questions = await listQuestions(env.DB, user.id, {
        chapter: chapterParam !== null ? parseInt(chapterParam, 10) : undefined,
        topic: topicParam ?? undefined,
        doubtOnly: doubtOnlyParam === "true" || undefined,
      });

      return json(questions);
    }

    // --- Topics (public question content) ---
    if (method === "GET" && pathname === "/api/topics") {
      const topics = await listTopics(env.DB);
      return json(topics);
    }

    return new Response("Not Found", { status: 404 });
  },
};
