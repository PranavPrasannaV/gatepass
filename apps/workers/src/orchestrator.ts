import { InMemoryTracer, type Tracer } from "@gatepass/shared";

/**
 * Scan orchestrator (plan §workers, T014). Manages the scan lifecycle:
 * queued → running → completed | failed | timed_out, with per-org concurrency fairness,
 * bounded retries, per-job timeouts, and stage timings recorded via the tracer.
 *
 * This is the in-process driver (a BullMQ/Redis driver implements the same `enqueue`/`drain`
 * contract in production). It is fully testable without external infrastructure.
 */

export type ScanState = "queued" | "running" | "completed" | "failed" | "timed_out";

export interface ScanJob {
  id: string;
  orgId: string;
  payload: unknown;
}

export interface JobRecord {
  job: ScanJob;
  state: ScanState;
  attempts: number;
  error?: string;
  timings: Record<string, number>;
}

export interface OrchestratorOptions {
  /** Max concurrently-running jobs per org (fairness). */
  concurrencyPerOrg: number;
  maxAttempts: number;
  timeoutMs: number;
  tracer?: Tracer;
}

export type JobHandler = (job: ScanJob, signal: AbortSignal) => Promise<void>;

const DEFAULTS: OrchestratorOptions = { concurrencyPerOrg: 2, maxAttempts: 2, timeoutMs: 30_000 };

export class ScanOrchestrator {
  private readonly opts: OrchestratorOptions;
  private readonly tracer: Tracer;
  private readonly queue: ScanJob[] = [];
  private readonly records = new Map<string, JobRecord>();
  private readonly runningByOrg = new Map<string, number>();

  constructor(
    private readonly handler: JobHandler,
    opts: Partial<OrchestratorOptions> = {},
  ) {
    this.opts = { ...DEFAULTS, ...opts };
    this.tracer = this.opts.tracer ?? new InMemoryTracer();
  }

  enqueue(job: ScanJob): void {
    this.queue.push(job);
    this.records.set(job.id, { job, state: "queued", attempts: 0, timings: {} });
  }

  get(id: string): JobRecord | undefined {
    return this.records.get(id);
  }

  /** Process the queue to completion, respecting per-org concurrency. */
  async drain(): Promise<void> {
    const pending = new Set<Promise<void>>();
    let index = 0;
    const canStart = (job: ScanJob) => (this.runningByOrg.get(job.orgId) ?? 0) < this.opts.concurrencyPerOrg;

    while (index < this.queue.length || pending.size > 0) {
      // Start as many jobs as concurrency allows.
      while (index < this.queue.length) {
        const job = this.queue[index]!;
        if (!canStart(job)) break;
        index++;
        this.runningByOrg.set(job.orgId, (this.runningByOrg.get(job.orgId) ?? 0) + 1);
        const p = this.runJob(job).finally(() => {
          this.runningByOrg.set(job.orgId, (this.runningByOrg.get(job.orgId) ?? 1) - 1);
          pending.delete(p);
        });
        pending.add(p);
      }
      if (pending.size > 0) await Promise.race(pending);
      else if (index < this.queue.length) await Promise.resolve(); // yield; concurrency full
    }
  }

  private async runJob(job: ScanJob): Promise<void> {
    const rec = this.records.get(job.id)!;
    while (rec.attempts < this.opts.maxAttempts) {
      rec.attempts++;
      rec.state = "running";
      const span = this.tracer.startSpan("scan.run", { orgId: job.orgId, attempt: rec.attempts });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs);
      try {
        await this.handler(job, controller.signal);
        if (controller.signal.aborted) throw new Error("timed_out");
        rec.state = "completed";
        rec.timings["run"] = 0;
        span.end();
        this.tracer.counter("scan.completed");
        return;
      } catch (err) {
        span.end();
        const msg = (err as Error).message;
        if (msg === "timed_out" || controller.signal.aborted) {
          rec.state = "timed_out";
          rec.error = "timed_out";
          this.tracer.counter("scan.timed_out");
          return; // do not retry timeouts
        }
        rec.error = msg;
        if (rec.attempts >= this.opts.maxAttempts) {
          rec.state = "failed";
          this.tracer.counter("scan.failed");
          return;
        }
        // else loop to retry
      } finally {
        clearTimeout(timer);
      }
    }
  }
}
