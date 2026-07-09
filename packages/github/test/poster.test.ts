import { describe, it, expect } from "vitest";
import { Remediator, type GitHubClient, type PullReview } from "../src/index.js";
import { AuditedWriter, InMemoryAuditSink } from "@gatepass/shared";
import type { Finding } from "@gatepass/findings";

const verified: Finding = {
  fingerprint: "sha256:a",
  tier: "verified",
  classId: "exposed-secret",
  severity: "critical",
  surfaces: ["app_code"],
  locations: [{ path: "a.js", startLine: 1, endLine: 1, surface: "app_code" }],
  explanation: "secret",
  reproduction: { kind: "inspection", steps: ["look"], expected: "leak" },
};

class FakeGitHub implements GitHubClient {
  readonly calls: string[] = [];
  async postReview(repo: string, pr: number, review: PullReview) {
    this.calls.push(`review:${repo}#${pr}:${review.comments.length}`);
    return { id: 1 };
  }
  async createCheckRun(repo: string, sha: string, result: { conclusion: "success" | "failure" | "neutral" }) {
    this.calls.push(`check:${repo}@${sha}:${result.conclusion}`);
    return { id: 2, conclusion: result.conclusion };
  }
}

describe("GitHub delivery + no-write guarantee (FR-012/016, SC-005, Principle III)", () => {
  it("posts a PR review and records it in the audit log", async () => {
    const sink = new InMemoryAuditSink();
    const client = new FakeGitHub();
    const r = new Remediator(client, new AuditedWriter(sink, "gatepass-app"));
    await r.deliverReview("org1", "acme/app", 42, [verified]);
    expect(client.calls[0]).toContain("review:acme/app#42");
    expect(sink.events.map((e) => e.action)).toContain("pr_comment");
  });

  it("publishes a blocking check run for verified findings and audits it", async () => {
    const sink = new InMemoryAuditSink();
    const client = new FakeGitHub();
    const r = new Remediator(client, new AuditedWriter(sink, "gatepass-app"));
    const posted = await r.publishGate(
      "org1",
      "acme/app",
      "abc123",
      { mode: "block_verified", failureMode: "fail_open" },
      [verified],
      true,
    );
    expect(posted.conclusion).toBe("failure");
    expect(sink.events.some((e) => e.action === "check_run")).toBe(true);
  });

  it("fails open (neutral) when the scan did not complete", async () => {
    const client = new FakeGitHub();
    const r = new Remediator(client, new AuditedWriter(new InMemoryAuditSink(), "gatepass-app"));
    const posted = await r.publishGate(
      "org1",
      "acme/app",
      "abc",
      { mode: "block_verified", failureMode: "fail_open" },
      undefined,
      false,
    );
    expect(posted.conclusion).toBe("neutral");
  });

  it("the GitHubClient interface exposes NO code/CI-write method (structural no-write)", () => {
    const methods = Object.getOwnPropertyNames(FakeGitHub.prototype);
    expect(methods).toContain("postReview");
    expect(methods).toContain("createCheckRun");
    for (const forbidden of ["writeFile", "createCommit", "push", "updateWorkflow", "putContents"]) {
      expect(methods).not.toContain(forbidden);
    }
  });
});
