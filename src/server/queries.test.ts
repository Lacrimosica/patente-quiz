import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import {
  createUser,
  createSession,
  getSessionUser,
  deleteSession,
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
