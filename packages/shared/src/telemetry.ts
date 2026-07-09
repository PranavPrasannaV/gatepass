/**
 * Lightweight telemetry (plan §observability, SC-010/SC-011, T008/T063 scaffolding).
 *
 * This is a minimal, dependency-free tracer/metrics recorder with the same shape the
 * OpenTelemetry SDK exposes (spans with attributes + durations, counters). Production swaps
 * `setTracer` with an OTel-backed implementation; the scan pipeline and API record through
 * this interface so per-scan stage timings (queue→clone→parse→detect→semantic→report) feed
 * the p95 SLOs without coupling the code to a specific backend.
 */

export interface Span {
  name: string;
  attributes: Record<string, string | number | boolean>;
  end(): void;
}

export interface Tracer {
  startSpan(name: string, attributes?: Record<string, string | number | boolean>): Span;
  counter(name: string, value?: number, attributes?: Record<string, string | number | boolean>): void;
}

export interface RecordedSpan {
  name: string;
  durationMs: number;
  attributes: Record<string, string | number | boolean>;
}

/** In-memory tracer for dev/tests; records spans and counters. */
export class InMemoryTracer implements Tracer {
  readonly spans: RecordedSpan[] = [];
  readonly counters = new Map<string, number>();

  startSpan(name: string, attributes: Record<string, string | number | boolean> = {}): Span {
    const start = Date.now();
    const attrs = { ...attributes };
    const spans = this.spans;
    return {
      name,
      attributes: attrs,
      end() {
        spans.push({ name, durationMs: Date.now() - start, attributes: attrs });
      },
    };
  }

  counter(name: string, value = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + value);
  }
}

let current: Tracer = new InMemoryTracer();

export function setTracer(tracer: Tracer): void {
  current = tracer;
}
export function getTracer(): Tracer {
  return current;
}

/** Time an async stage and record a span with the stage name. */
export async function timed<T>(
  name: string,
  fn: () => Promise<T> | T,
  attrs?: Record<string, string | number | boolean>,
): Promise<T> {
  const span = current.startSpan(name, attrs);
  try {
    return await fn();
  } finally {
    span.end();
  }
}
