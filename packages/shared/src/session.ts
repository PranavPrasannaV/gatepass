import { createHmac } from "node:crypto";
import { safeEqual } from "./crypto.js";
import type { Role } from "./roles.js";

/**
 * Signed session tokens (FR-027, T076). A stateless session is a base64url JSON payload plus
 * an HMAC-SHA256 signature over it. Tokens are tamper-evident (signature) and expire (exp).
 * No server-side session store is needed; the secret is the only trust anchor.
 */

export interface Session {
  userId: string;
  login: string;
  orgId: string;
  role: Role;
  /** Unix seconds expiry. */
  exp: number;
}

const DEFAULT_TTL_SEC = 7 * 24 * 3600; // 7 days

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}
function sign(payloadB64: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(payloadB64).digest());
}

export function createSession(
  session: Omit<Session, "exp"> & { exp?: number },
  secret: string,
  ttlSec = DEFAULT_TTL_SEC,
): string {
  const full: Session = { ...session, exp: session.exp ?? Math.floor(Date.now() / 1000) + ttlSec };
  const payloadB64 = b64url(Buffer.from(JSON.stringify(full)));
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

/** Verify a session token; returns the session or null if invalid, tampered, or expired. */
export function verifySession(token: string | undefined, secret: string, now = Date.now()): Session | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, sign(payloadB64, secret))) return null;
  try {
    const session = JSON.parse(fromB64url(payloadB64).toString("utf8")) as Session;
    if (typeof session.exp !== "number" || session.exp * 1000 < now) return null;
    return session;
  } catch {
    return null;
  }
}
