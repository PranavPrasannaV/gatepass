/**
 * Responsible-disclosure workflow (FR-020). Public reports on third-party MCP servers follow
 * a fixed lifecycle with a notification window; a report may only be published after the
 * maintainer was notified and either fixed the issue or the window elapsed.
 */

export type DisclosureState = "draft" | "notified" | "remediated" | "published" | "withdrawn";

export const DEFAULT_WINDOW_DAYS = 90;

export interface DisclosureRecord {
  server: string;
  state: DisclosureState;
  notifiedAt?: string; // ISO date
  windowDays: number;
}

export class DisclosureError extends Error {}

const MS_PER_DAY = 86_400_000;

export function notifyMaintainer(rec: DisclosureRecord, at: Date): DisclosureRecord {
  if (rec.state !== "draft") throw new DisclosureError(`cannot notify from state ${rec.state}`);
  return { ...rec, state: "notified", notifiedAt: at.toISOString() };
}

export function markRemediated(rec: DisclosureRecord): DisclosureRecord {
  if (rec.state !== "notified") throw new DisclosureError(`cannot remediate from state ${rec.state}`);
  return { ...rec, state: "remediated" };
}

/**
 * Whether a report may be published now: only after the maintainer was notified AND the
 * disclosure window has elapsed (or the issue was remediated, which unblocks a fixed-report).
 */
export function canPublish(rec: DisclosureRecord, now: Date): boolean {
  if (rec.state === "remediated") return true;
  if (rec.state !== "notified" || !rec.notifiedAt) return false;
  const elapsedDays = (now.getTime() - new Date(rec.notifiedAt).getTime()) / MS_PER_DAY;
  return elapsedDays >= rec.windowDays;
}

export function publish(rec: DisclosureRecord, now: Date): DisclosureRecord {
  if (!canPublish(rec, now)) {
    throw new DisclosureError("disclosure window has not elapsed and issue is not remediated");
  }
  return { ...rec, state: "published" };
}
