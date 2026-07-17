import { describe, it, expect } from "vitest";
import { RateLimiter, type RateLimitConfig } from "../src/rate-limit.js";

const FCFG: RateLimitConfig = { tokensPerWindow: 10, windowMs: 60_000 };

describe("RateLimiter (T064)", () => {
  it("allows requests within the limit", () => {
    const rl = new RateLimiter(FCFG);
    for (let i = 0; i < 10; i++) {
      const result = rl.check("org-1");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9 - i);
    }
  });

  it("blocks requests that exceed the limit", () => {
    const rl = new RateLimiter({ tokensPerWindow: 3, windowMs: 60_000 });
    rl.check("org-1"); // 1
    rl.check("org-1"); // 2
    rl.check("org-1"); // 3
    const result = rl.check("org-1"); // 4 — blocked
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("treats different orgs independently", () => {
    const rl = new RateLimiter({ tokensPerWindow: 2, windowMs: 60_000 });
    expect(rl.check("org-a").allowed).toBe(true);
    expect(rl.check("org-a").allowed).toBe(true);
    expect(rl.check("org-a").allowed).toBe(false); // org-a exhausted
    expect(rl.check("org-b").allowed).toBe(true); // org-b still has tokens
    expect(rl.check("org-b").allowed).toBe(true);
    expect(rl.check("org-b").allowed).toBe(false);
  });

  it("refills tokens after the window elapses", async () => {
    const rl = new RateLimiter({ tokensPerWindow: 1, windowMs: 50 });
    expect(rl.check("org-1").allowed).toBe(true);
    expect(rl.check("org-1").allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    const result = rl.check("org-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("reports correct reset time", () => {
    const rl = new RateLimiter({ tokensPerWindow: 1, windowMs: 10_000 });
    const result = rl.check("org-1");
    expect(result.resetMs).toBeGreaterThan(Date.now());
    expect(result.resetMs).toBeLessThanOrEqual(Date.now() + 10_000);
  });

  it("uses default config when none provided", () => {
    const rl = new RateLimiter();
    // default is 100 tokens / 60s — all 100 should pass
    for (let i = 0; i < 100; i++) {
      const result = rl.check("org-default");
      if (!result.allowed) {
        // If we hit the limit before 100, the default changed — fail
        expect(i).toBe(100);
      }
    }
  });

  it("serializes headers correctly for allowed requests", () => {
    const rl = new RateLimiter({ tokensPerWindow: 5, windowMs: 60_000 });
    const result = rl.check("org-headers");
    if (result.allowed) {
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(4);
      expect(typeof result.resetMs).toBe("number");
    }
  });

  it("serializes headers correctly for blocked requests", () => {
    const rl = new RateLimiter({ tokensPerWindow: 1, windowMs: 60_000 });
    rl.check("org-blocked");
    const result = rl.check("org-blocked");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(60_000);
  });
});
