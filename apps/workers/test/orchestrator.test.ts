import { describe, it, expect } from "vitest";
import { ScanOrchestrator, type ScanJob } from "../src/index.js";
import { InMemoryTracer } from "@gatepass/shared";

describe("scan orchestrator (T014)", () => {
  it("drives a job queued → running → completed", async () => {
    const orch = new ScanOrchestrator(async () => {});
    orch.enqueue({ id: "j1", orgId: "o1", payload: {} });
    await orch.drain();
    expect(orch.get("j1")!.state).toBe("completed");
  });

  it("retries a transient failure then completes", async () => {
    let calls = 0;
    const orch = new ScanOrchestrator(
      async () => {
        if (++calls < 2) throw new Error("transient");
      },
      { maxAttempts: 3 },
    );
    orch.enqueue({ id: "j1", orgId: "o1", payload: {} });
    await orch.drain();
    expect(orch.get("j1")!.state).toBe("completed");
    expect(orch.get("j1")!.attempts).toBe(2);
  });

  it("marks a job failed after exhausting retries", async () => {
    const orch = new ScanOrchestrator(
      async () => {
        throw new Error("always");
      },
      { maxAttempts: 2 },
    );
    orch.enqueue({ id: "j1", orgId: "o1", payload: {} });
    await orch.drain();
    expect(orch.get("j1")!.state).toBe("failed");
    expect(orch.get("j1")!.attempts).toBe(2);
  });

  it("times out a slow job without retrying", async () => {
    const orch = new ScanOrchestrator(
      (_job, signal) =>
        new Promise<void>((resolve) => {
          const t = setTimeout(resolve, 1000);
          signal.addEventListener("abort", () => {
            clearTimeout(t);
            resolve();
          });
        }),
      { timeoutMs: 20, maxAttempts: 3 },
    );
    orch.enqueue({ id: "j1", orgId: "o1", payload: {} });
    await orch.drain();
    expect(orch.get("j1")!.state).toBe("timed_out");
    expect(orch.get("j1")!.attempts).toBe(1);
  });

  it("respects per-org concurrency fairness", async () => {
    let running = 0;
    let maxConcurrent = 0;
    const orch = new ScanOrchestrator(
      async () => {
        running++;
        maxConcurrent = Math.max(maxConcurrent, running);
        await new Promise((r) => setTimeout(r, 10));
        running--;
      },
      { concurrencyPerOrg: 2 },
    );
    const jobs: ScanJob[] = Array.from({ length: 6 }, (_, i) => ({ id: `j${i}`, orgId: "o1", payload: {} }));
    jobs.forEach((j) => orch.enqueue(j));
    await orch.drain();
    expect(maxConcurrent).toBeLessThanOrEqual(2);
    expect(jobs.every((j) => orch.get(j.id)!.state === "completed")).toBe(true);
  });

  it("records completion counters via the tracer", async () => {
    const tracer = new InMemoryTracer();
    const orch = new ScanOrchestrator(async () => {}, { tracer });
    orch.enqueue({ id: "j1", orgId: "o1", payload: {} });
    await orch.drain();
    expect(tracer.counters.get("scan.completed")).toBe(1);
  });
});
