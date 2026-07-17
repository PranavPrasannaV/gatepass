import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { InMemoryTracer, setTracer, getTracer, timed } from "../src/index.js";

describe("InMemoryTracer", () => {
  it("startSpan creates a span, end() records duration", () => {
    const tracer = new InMemoryTracer();
    const span = tracer.startSpan("test-op");
    span.end();

    expect(tracer.spans).toHaveLength(1);
    expect(tracer.spans[0]!.name).toBe("test-op");
    expect(tracer.spans[0]!.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("counter increments and tracks counts", () => {
    const tracer = new InMemoryTracer();
    tracer.counter("hits");
    tracer.counter("hits");
    tracer.counter("misses");

    expect(tracer.counters.get("hits")).toBe(2);
    expect(tracer.counters.get("misses")).toBe(1);
  });

  it("counter accepts a custom value", () => {
    const tracer = new InMemoryTracer();
    tracer.counter("bytes", 1024);
    expect(tracer.counters.get("bytes")).toBe(1024);
  });

  it("span records attributes passed to startSpan", () => {
    const tracer = new InMemoryTracer();
    const span = tracer.startSpan("db-query", { db: "postgres", rows: 42 });
    span.end();

    expect(tracer.spans[0]!.attributes).toEqual({ db: "postgres", rows: 42 });
  });
});

describe("setTracer / getTracer", () => {
  beforeEach(() => {
    setTracer(new InMemoryTracer());
  });

  afterEach(() => {
    // Reset to a fresh InMemoryTracer so subsequent tests are clean
    setTracer(new InMemoryTracer());
  });

  it("setTracer/getTracer swap the global tracer", () => {
    const custom = new InMemoryTracer();
    setTracer(custom);
    expect(getTracer()).toBe(custom);
  });
});

describe("timed", () => {
  it("wraps an async function and records a span", async () => {
    const tracer = new InMemoryTracer();
    setTracer(tracer);

    const result = await timed("compute", async () => {
      return 42;
    });

    expect(result).toBe(42);
    expect(tracer.spans).toHaveLength(1);
    expect(tracer.spans[0]!.name).toBe("compute");
    expect(tracer.spans[0]!.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("records a span even when the function throws", async () => {
    const tracer = new InMemoryTracer();
    setTracer(tracer);

    await expect(
      timed("failing-op", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(tracer.spans).toHaveLength(1);
    expect(tracer.spans[0]!.name).toBe("failing-op");
    expect(tracer.spans[0]!.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("passes attributes to the recorded span", async () => {
    const tracer = new InMemoryTracer();
    setTracer(tracer);

    await timed("compute", async () => "done", { stage: "scan", attempt: 1 });

    expect(tracer.spans[0]!.attributes).toEqual({ stage: "scan", attempt: 1 });
  });
});
