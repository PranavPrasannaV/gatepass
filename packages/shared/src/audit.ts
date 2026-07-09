/**
 * Audited outbound writer (Constitution Principle III, SC-005). EVERY external write — PR
 * comment, check run, evidence push — must go through this writer, which records an
 * append-only AuditEvent. There is deliberately no method here that writes to customer code
 * or CI: the only capabilities are "comment", "check", "evidence", "questionnaire". This is
 * the structural proof behind "zero repo mutations".
 */

export type AuditAction =
  | "pr_comment"
  | "check_run"
  | "evidence_push"
  | "questionnaire_export"
  | "public_report";

export interface AuditEvent {
  seq: number;
  at: string;
  orgId: string | null;
  actor: string;
  action: AuditAction;
  subject: Record<string, unknown>;
}

export interface AuditSink {
  append(event: AuditEvent): void | Promise<void>;
}

/** In-memory sink (tests / dev). Production swaps in an append-only DB-backed sink. */
export class InMemoryAuditSink implements AuditSink {
  readonly events: AuditEvent[] = [];
  append(event: AuditEvent): void {
    this.events.push(event);
  }
}

export class AuditedWriter {
  private seq = 0;
  constructor(private readonly sink: AuditSink, private readonly actor: string) {}

  /**
   * Perform an outbound write through `fn`, recording an audit event. `action` is a closed
   * set that excludes any code/CI mutation. Returns fn's result.
   */
  async write<T>(
    action: AuditAction,
    orgId: string | null,
    subject: Record<string, unknown>,
    fn: () => Promise<T> | T,
  ): Promise<T> {
    const result = await fn();
    await this.sink.append({
      seq: ++this.seq,
      at: new Date().toISOString(),
      orgId,
      actor: this.actor,
      action,
      subject,
    });
    return result;
  }
}
