import { describe, it, expect } from "vitest";
import { notifyMaintainer, markRemediated, canPublish, publish, DisclosureError, DEFAULT_WINDOW_DAYS, type DisclosureRecord } from "../src/index.js";

const draft = (): DisclosureRecord => ({ server: "acme/mcp", state: "draft", windowDays: DEFAULT_WINDOW_DAYS });

describe("responsible-disclosure workflow (FR-020)", () => {
  it("cannot publish a draft that was never notified", () => {
    expect(canPublish(draft(), new Date())).toBe(false);
    expect(() => publish(draft(), new Date())).toThrow(DisclosureError);
  });

  it("cannot publish before the window elapses", () => {
    const notified = notifyMaintainer(draft(), new Date("2026-01-01"));
    expect(canPublish(notified, new Date("2026-02-01"))).toBe(false); // ~31 days < 90
  });

  it("can publish after the window elapses", () => {
    const notified = notifyMaintainer(draft(), new Date("2026-01-01"));
    const later = new Date("2026-05-01"); // ~120 days > 90
    expect(canPublish(notified, later)).toBe(true);
    expect(publish(notified, later).state).toBe("published");
  });

  it("can publish immediately once remediated", () => {
    const notified = notifyMaintainer(draft(), new Date("2026-01-01"));
    const remediated = markRemediated(notified);
    expect(canPublish(remediated, new Date("2026-01-02"))).toBe(true);
  });

  it("rejects illegal transitions", () => {
    expect(() => markRemediated(draft())).toThrow(DisclosureError);
  });
});
