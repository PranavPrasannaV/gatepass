import { verifyHmac } from "@gatepass/shared";

/**
 * GitHub webhook receiving (T072). The security-critical parts — HMAC signature verification
 * and event parsing — live here as pure functions so they are unit-testable in isolation.
 * The API route feeds raw request bytes in and gets a typed, verified event out.
 */

export class WebhookSignatureError extends Error {
  constructor() {
    super("invalid webhook signature");
    this.name = "WebhookSignatureError";
  }
}

export type WebhookEvent =
  | { type: "pull_request"; action: string; repo: string; prNumber: number; sha: string; ref: string }
  | { type: "push"; repo: string; ref: string; sha: string }
  | { type: "installation"; action: string; installationId: string; repos: string[] }
  | { type: "ping" }
  | { type: "other"; event: string };

export interface WebhookHeaders {
  "x-github-event"?: string;
  "x-hub-signature-256"?: string;
  [k: string]: string | undefined;
}

/**
 * Verify a webhook's HMAC signature and parse it into a typed event. Throws
 * WebhookSignatureError on any signature mismatch — an unsigned or forged payload never
 * reaches the scan pipeline.
 */
export function verifyAndParseWebhook(headers: WebhookHeaders, rawBody: string, secret: string): WebhookEvent {
  const signature = headers["x-hub-signature-256"] ?? "";
  if (!signature || !verifyHmac(rawBody, secret, signature)) {
    throw new WebhookSignatureError();
  }
  const event = headers["x-github-event"] ?? "";
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return { type: "other", event };
  }
  return parseEvent(event, payload);
}

function parseEvent(event: string, p: Record<string, unknown>): WebhookEvent {
  const repo = ((p.repository as { full_name?: string } | undefined)?.full_name ?? "") as string;

  if (event === "ping") return { type: "ping" };

  if (event === "pull_request") {
    const pr = (p.pull_request as { number?: number; head?: { sha?: string; ref?: string } } | undefined) ?? {};
    return {
      type: "pull_request",
      action: String(p.action ?? ""),
      repo,
      prNumber: Number(pr.number ?? 0),
      sha: String(pr.head?.sha ?? ""),
      ref: String(pr.head?.ref ?? ""),
    };
  }

  if (event === "push") {
    return {
      type: "push",
      repo,
      ref: String(p.ref ?? ""),
      sha: String(p.after ?? ""),
    };
  }

  if (event === "installation" || event === "installation_repositories") {
    const inst = (p.installation as { id?: number } | undefined) ?? {};
    const added = (p.repositories ?? p.repositories_added ?? []) as { full_name?: string }[];
    return {
      type: "installation",
      action: String(p.action ?? ""),
      installationId: String(inst.id ?? ""),
      repos: added.map((r) => r.full_name ?? "").filter(Boolean),
    };
  }

  return { type: "other", event };
}

/** Which events should trigger a scan. PR opened/synchronize and pushes to a branch. */
export function shouldScan(event: WebhookEvent): boolean {
  if (event.type === "pull_request") return ["opened", "synchronize", "reopened"].includes(event.action);
  if (event.type === "push") return true;
  return false;
}
