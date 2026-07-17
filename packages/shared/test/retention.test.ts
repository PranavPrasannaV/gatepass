import { describe, it, expect } from "vitest";
import { isExpired, expiredArtifacts, DEFAULT_TTL_DAYS, EVIDENCE_TTL_DAYS, type Artifact } from "../src/index.js";

function makeArtifact(overrides: Partial<Artifact> & { createdAt: string }): Artifact {
  return {
    id: overrides.id ?? "art-1",
    backsEvidence: overrides.backsEvidence ?? false,
    ...overrides,
  };
}

describe("retention constants", () => {
  it("DEFAULT_TTL_DAYS is 30", () => {
    expect(DEFAULT_TTL_DAYS).toBe(30);
  });

  it("EVIDENCE_TTL_DAYS is 365", () => {
    expect(EVIDENCE_TTL_DAYS).toBe(365);
  });
});

describe("isExpired", () => {
  it("a fresh artifact (created now) is not expired", () => {
    const now = new Date("2026-07-16T12:00:00Z");
    const fresh = makeArtifact({ createdAt: now.toISOString() });
    expect(isExpired(fresh, now)).toBe(false);
  });

  it("an old artifact (created 31 days ago) is expired", () => {
    const now = new Date("2026-07-16T12:00:00Z");
    const past = new Date(now.getTime() - 31 * 86_400_000);
    const old = makeArtifact({ createdAt: past.toISOString() });
    expect(isExpired(old, now)).toBe(true);
  });

  it("an artifact at exactly 30 days old is not expired (TTL is strict greater-than)", () => {
    const now = new Date("2026-07-16T12:00:00Z");
    const past = new Date(now.getTime() - 30 * 86_400_000);
    const borderline = makeArtifact({ createdAt: past.toISOString() });
    expect(isExpired(borderline, now)).toBe(false);
  });

  it("an evidence artifact at 100 days is not expired (evidence TTL is 365)", () => {
    const now = new Date("2026-07-16T12:00:00Z");
    const past = new Date(now.getTime() - 100 * 86_400_000);
    const evidence = makeArtifact({ createdAt: past.toISOString(), backsEvidence: true });
    expect(isExpired(evidence, now)).toBe(false);
  });

  it("an evidence artifact at 366 days is expired", () => {
    const now = new Date("2026-07-16T12:00:00Z");
    const past = new Date(now.getTime() - 366 * 86_400_000);
    const evidence = makeArtifact({ createdAt: past.toISOString(), backsEvidence: true });
    expect(isExpired(evidence, now)).toBe(true);
  });
});

describe("expiredArtifacts", () => {
  it("returns only expired items from a mixed list", () => {
    const now = new Date("2026-07-16T12:00:00Z");
    const fresh = makeArtifact({ id: "fresh", createdAt: now.toISOString() });
    const stale = makeArtifact({ id: "stale", createdAt: new Date(now.getTime() - 31 * 86_400_000).toISOString() });
    const evidence = makeArtifact({
      id: "evidence-young",
      createdAt: new Date(now.getTime() - 100 * 86_400_000).toISOString(),
      backsEvidence: true,
    });
    const oldEvidence = makeArtifact({
      id: "evidence-old",
      createdAt: new Date(now.getTime() - 366 * 86_400_000).toISOString(),
      backsEvidence: true,
    });

    const expired = expiredArtifacts([fresh, stale, evidence, oldEvidence], now);
    expect(expired).toHaveLength(2);
    expect(expired.map((a) => a.id).sort()).toEqual(["evidence-old", "stale"]);
  });

  it("returns empty array when none expired", () => {
    const now = new Date("2026-07-16T12:00:00Z");
    const fresh = makeArtifact({ id: "a", createdAt: now.toISOString() });
    const evidence = makeArtifact({
      id: "b",
      createdAt: new Date(now.getTime() - 100 * 86_400_000).toISOString(),
      backsEvidence: true,
    });
    expect(expiredArtifacts([fresh, evidence], now)).toEqual([]);
  });
});
