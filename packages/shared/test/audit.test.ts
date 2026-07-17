import { describe, it, expect } from "vitest";
import { InMemoryAuditSink, AuditedWriter, type AuditAction, type AuditEvent } from "../src/index.js";

describe("InMemoryAuditSink", () => {
  it("starts with an empty events array", () => {
    const sink = new InMemoryAuditSink();
    expect(sink.events).toEqual([]);
  });

  it("appends a single event", () => {
    const sink = new InMemoryAuditSink();
    const event: AuditEvent = {
      seq: 1,
      at: new Date().toISOString(),
      orgId: "org1",
      actor: "system",
      action: "pr_comment",
      subject: { pr: 42 },
    };
    sink.append(event);
    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]!).toBe(event);
  });

  it("appends multiple events in order", () => {
    const sink = new InMemoryAuditSink();
    const e1: AuditEvent = { seq: 1, at: "t1", orgId: null, actor: "a", action: "check_run", subject: {} };
    const e2: AuditEvent = { seq: 2, at: "t2", orgId: null, actor: "b", action: "pr_comment", subject: {} };
    sink.append(e1);
    sink.append(e2);
    expect(sink.events).toHaveLength(2);
    expect(sink.events[0]!.seq).toBe(1);
    expect(sink.events[1]!.seq).toBe(2);
  });
});

describe("AuditedWriter", () => {
  it("records an audit event with incremented seq on write", async () => {
    const sink = new InMemoryAuditSink();
    const writer = new AuditedWriter(sink, "test-actor");

    await writer.write("pr_comment", "org1", { pr: 42 }, async () => "done");

    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]!.seq).toBe(1);
  });

  it("seq increments across multiple writes", async () => {
    const sink = new InMemoryAuditSink();
    const writer = new AuditedWriter(sink, "bot");

    await writer.write("check_run", "o1", { sha: "a" }, async () => "ok");
    await writer.write("evidence_push", "o2", { scan: "s1" }, async () => "ok");
    await writer.write("pr_comment", "o1", { pr: 7 }, async () => "ok");

    expect(sink.events).toHaveLength(3);
    expect(sink.events[0]!.seq).toBe(1);
    expect(sink.events[1]!.seq).toBe(2);
    expect(sink.events[2]!.seq).toBe(3);
  });

  it("records the correct action on the event", async () => {
    const sink = new InMemoryAuditSink();
    const writer = new AuditedWriter(sink, "actor");

    await writer.write("pr_comment", null, {}, async () => null);
    expect(sink.events[0]!.action).toBe("pr_comment");
  });

  it("records orgId on the event", async () => {
    const sink = new InMemoryAuditSink();
    const writer = new AuditedWriter(sink, "actor");

    await writer.write("check_run", "acme-corp", { sha: "abc" }, async () => "ok");
    expect(sink.events[0]!.orgId).toBe("acme-corp");
  });

  it("records orgId as null when no org is provided", async () => {
    const sink = new InMemoryAuditSink();
    const writer = new AuditedWriter(sink, "actor");

    await writer.write("evidence_push", null, { scan: "s1" }, async () => "ok");
    expect(sink.events[0]!.orgId).toBeNull();
  });

  it("records the actor from the constructor", async () => {
    const sink = new InMemoryAuditSink();
    const writer = new AuditedWriter(sink, "my-service");

    await writer.write("questionnaire_export", "org1", { id: "q1" }, async () => "ok");
    expect(sink.events[0]!.actor).toBe("my-service");
  });

  it("records the full subject payload on the event", async () => {
    const sink = new InMemoryAuditSink();
    const writer = new AuditedWriter(sink, "actor");
    const subject = { pr: 99, repo: "acme/app", commentId: "abc123" };

    await writer.write("pr_comment", "org1", subject, async () => "done");
    expect(sink.events[0]!.subject).toEqual(subject);
  });

  it("returns the result of the wrapped function", async () => {
    const sink = new InMemoryAuditSink();
    const writer = new AuditedWriter(sink, "actor");

    const result = await writer.write("pr_comment", "org1", {}, async () => "success");
    expect(result).toBe("success");
  });

  it("returns non-string results (objects, numbers)", async () => {
    const sink = new InMemoryAuditSink();
    const writer = new AuditedWriter(sink, "actor");

    const objResult = await writer.write("evidence_push", "org1", {}, async () => ({ id: 42, ok: true }));
    expect(objResult).toEqual({ id: 42, ok: true });

    const numResult = await writer.write("check_run", "org1", {}, async () => 99);
    expect(numResult).toBe(99);
  });

  it("works with a synchronous function (not just async)", async () => {
    const sink = new InMemoryAuditSink();
    const writer = new AuditedWriter(sink, "actor");

    const result = await writer.write("public_report", "org1", {}, () => "sync-result");
    expect(result).toBe("sync-result");
    expect(sink.events).toHaveLength(1);
  });

  it("wraps an async sink (AuditSink.append returning a promise)", async () => {
    const events: AuditEvent[] = [];
    const asyncSink = {
      append: async (e: AuditEvent) => {
        events.push(e);
      },
    };
    const writer = new AuditedWriter(asyncSink, "actor");

    await writer.write("check_run", "org1", { sha: "abc" }, async () => "ok");
    expect(events).toHaveLength(1);
    expect(events[0]!.action).toBe("check_run");
  });

  it("records an ISO timestamp in the at field", async () => {
    const sink = new InMemoryAuditSink();
    const writer = new AuditedWriter(sink, "actor");

    const before = new Date();
    await writer.write("pr_comment", "org1", {}, async () => "ok");
    const after = new Date();

    const at = new Date(sink.events[0]!.at);
    expect(at.getTime()).toBeGreaterThanOrEqual(before.getTime() - 100);
    expect(at.getTime()).toBeLessThanOrEqual(after.getTime() + 100);
  });

  it("supports all five AuditAction values", async () => {
    const sink = new InMemoryAuditSink();
    const writer = new AuditedWriter(sink, "actor");

    const actions: AuditAction[] = [
      "pr_comment",
      "check_run",
      "evidence_push",
      "questionnaire_export",
      "public_report",
    ];
    for (const action of actions) {
      await writer.write(action, null, {}, async () => null);
    }

    expect(sink.events).toHaveLength(5);
    for (let i = 0; i < actions.length; i++) {
      expect(sink.events[i]!.action).toBe(actions[i]);
      expect(sink.events[i]!.seq).toBe(i + 1);
    }
  });
});
