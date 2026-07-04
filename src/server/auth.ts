import type { User } from "../shared/types.js";
import { getSessionUser } from "./queries.js";

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

const SESSION_COOKIE = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    HASH_BITS
  );
  return new Uint8Array(bits);
}

/** Encodes as "pbkdf2$<iters>$<saltB64>$<hashB64>". */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** Constant-time compare of two byte arrays. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyPassword(
  password: string,
  encoded: string
): Promise<boolean> {
  const parts = encoded.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;
  const salt = fromBase64(parts[2]);
  const expected = fromBase64(parts[3]);
  const actual = await pbkdf2(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toBase64(new Uint8Array(digest));
}

/** A fresh session token: `raw` goes in the cookie, `hash` is stored in the DB. */
export async function newSessionToken(): Promise<{ raw: string; hash: string }> {
  const raw = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  const hash = await sha256Hex(raw);
  return { raw, hash };
}

export function sessionTtlSeconds(): number {
  return SESSION_TTL_SECONDS;
}

export function sessionExpiry(now = new Date()): string {
  return new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
}

function isSecure(request: Request): boolean {
  return new URL(request.url).protocol === "https:";
}

export function sessionCookie(request: Request, raw: string): string {
  const attrs = [
    `${SESSION_COOKIE}=${raw}`,
    "HttpOnly",
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (isSecure(request)) attrs.push("Secure");
  return attrs.join("; ");
}

export function clearCookie(request: Request): string {
  const attrs = [
    `${SESSION_COOKIE}=`,
    "HttpOnly",
    "SameSite=Strict",
    "Path=/",
    "Max-Age=0",
  ];
  if (isSecure(request)) attrs.push("Secure");
  return attrs.join("; ");
}

function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get("Cookie");
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

/** Returns the raw session token from the request cookie, or null. */
export function sessionTokenFrom(request: Request): string | null {
  return parseCookies(request)[SESSION_COOKIE] ?? null;
}

/** Resolves the authenticated user from the session cookie, or null. */
export async function authenticate(
  request: Request,
  db: D1Database
): Promise<User | null> {
  const raw = sessionTokenFrom(request);
  if (!raw) return null;
  const hash = await sha256Hex(raw);
  return getSessionUser(db, hash);
}

export { sha256Hex };
