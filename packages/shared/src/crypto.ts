import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Crypto helpers (plan §shared / T008 remainder). Small, audited primitives used for runner
 * tokens, webhook signature verification, and value redaction. No secret is ever logged.
 */

/** SHA-256 hex of a value — used to store runner/API tokens hashed at rest. */
export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Generate a random opaque token (hex). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/** Constant-time string comparison (avoids token-comparison timing leaks). */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Verify an HMAC-SHA256 signature (e.g. GitHub webhook `X-Hub-Signature-256`). */
export function verifyHmac(payload: string, secret: string, signature: string): boolean {
  const expected = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
  return safeEqual(expected, signature);
}

/** Redact obvious secret-shaped substrings from arbitrary text before logging. */
export function redactForLog(text: string): string {
  return text
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, "«AWS_KEY»")
    .replace(/\bnvapi-[A-Za-z0-9_-]{20,}\b/g, "«NVIDIA_KEY»")
    .replace(/\bsk-ant-[A-Za-z0-9_-]{20,}\b/g, "«ANTHROPIC_KEY»")
    .replace(/\bsk-[A-Za-z0-9]{32,}\b/g, "«API_KEY»")
    .replace(/\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g, "«SLACK_TOKEN»")
    .replace(/(authorization:\s*bearer\s+)[\w.-]+/gi, "$1«REDACTED»");
}
