/**
 * Per-org rate limiting middleware (T064).
 *
 * Token-bucket algorithm: each org gets `tokensPerWindow` requests per sliding window
 * of `windowMs` milliseconds. Returns 429 + Retry-After when the bucket is empty.
 * Buckets refill fully when the window expires.
 *
 * This is a fast in-process limiter suitable for dev and single-replica deploys.
 * Production with multiple replicas should swap this for a Redis-backed limiter
 * (identical interface).
 */

export interface RateLimitConfig {
  /** Maximum requests allowed within the window. Default: 100 */
  tokensPerWindow: number;
  /** Window duration in milliseconds. Default: 60_000 (1 minute) */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Absolute epoch ms when the current window ends (and the bucket refills). */
  resetMs: number;
  /** Ms until the bucket refills (for Retry-After header). Only set when !allowed. */
  retryAfterMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  tokensPerWindow: 100,
  windowMs: 60_000,
};

interface Bucket {
  /** How many tokens remain in the current window. */
  remaining: number;
  /** When this window expires (epoch ms). */
  resetMs: number;
}

export class RateLimiter {
  private readonly cfg: RateLimitConfig;
  private readonly buckets = new Map<string, Bucket>();

  constructor(config?: Partial<RateLimitConfig>) {
    this.cfg = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check whether `orgId` may proceed. The caller (server.ts) is responsible for
   * extracting the org identifier from the request (path param, header, or auth context)
   * and sending a 429 response when `result.allowed` is false.
   */
  check(orgId: string): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(orgId);

    // First request or window expired — create/reset bucket
    if (!bucket || now >= bucket.resetMs) {
      bucket = {
        remaining: this.cfg.tokensPerWindow - 1,
        resetMs: now + this.cfg.windowMs,
      };
      this.buckets.set(orgId, bucket);
      return {
        allowed: true,
        limit: this.cfg.tokensPerWindow,
        remaining: bucket.remaining,
        resetMs: bucket.resetMs,
        retryAfterMs: 0,
      };
    }

    // Token available
    if (bucket.remaining > 0) {
      bucket.remaining--;
      return {
        allowed: true,
        limit: this.cfg.tokensPerWindow,
        remaining: bucket.remaining,
        resetMs: bucket.resetMs,
        retryAfterMs: 0,
      };
    }

    // Rate limited
    const retryAfterMs = bucket.resetMs - now;
    return {
      allowed: false,
      limit: this.cfg.tokensPerWindow,
      remaining: 0,
      resetMs: bucket.resetMs,
      retryAfterMs,
    };
  }

  /** Reset all buckets (for testing). */
  reset(): void {
    this.buckets.clear();
  }
}

/**
 * HTTP helper: build the 429 response headers a RateLimitResult.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "x-ratelimit-limit": String(result.limit),
    "x-ratelimit-remaining": String(result.remaining),
    "x-ratelimit-reset": String(Math.ceil(result.resetMs / 1000)),
  };
  if (!result.allowed) {
    headers["retry-after"] = String(Math.ceil(result.retryAfterMs / 1000));
  }
  return headers;
}
