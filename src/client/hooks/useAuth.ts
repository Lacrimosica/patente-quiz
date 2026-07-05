import { useState, useEffect, useCallback } from "react";
import type { User, AnswerResult } from "../../shared/types";

type Credentials = { username: string; password: string };

async function authRequest(
  path: string,
  credentials: Credentials
): Promise<User> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return data as User;
}

/** POST an answer as it's given. The session cookie is sent automatically. */
export async function submitAnswer(
  questionId: string,
  chosen: boolean
): Promise<AnswerResult> {
  const res = await fetch("/api/answers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, chosen }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Toggle the per-user "important / favorite" flag for a question. */
export async function setFavorite(
  questionId: string,
  favorited: boolean
): Promise<boolean> {
  const res = await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, favorited }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { favorited: boolean };
  return data.favorited;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap: who am I? (session cookie is HttpOnly, so ask the server).
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/me");
        setUser(res.ok ? await res.json() : null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const login = useCallback(async (credentials: Credentials) => {
    setUser(await authRequest("/api/auth/login", credentials));
  }, []);

  const register = useCallback(async (credentials: Credentials) => {
    setUser(await authRequest("/api/auth/register", credentials));
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  return { user, loading, login, register, logout };
}
