import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyAndParseWebhook, shouldScan, WebhookSignatureError } from "../src/index.js";

const SECRET = "whsec_test";
function sign(body: string): string {
  return "sha256=" + createHmac("sha256", SECRET).update(body).digest("hex");
}
function headers(event: string, body: string) {
  return { "x-github-event": event, "x-hub-signature-256": sign(body) };
}

describe("webhook verification + parsing (T072)", () => {
  it("REJECTS a payload with a bad signature (forged/unsigned never scans)", () => {
    const body = JSON.stringify({ action: "opened" });
    expect(() =>
      verifyAndParseWebhook({ "x-github-event": "pull_request", "x-hub-signature-256": "sha256=bad" }, body, SECRET),
    ).toThrow(WebhookSignatureError);
    expect(() => verifyAndParseWebhook({ "x-github-event": "pull_request" }, body, SECRET)).toThrow(
      WebhookSignatureError,
    );
  });

  it("parses a pull_request event with repo, PR number, and head sha", () => {
    const body = JSON.stringify({
      action: "opened",
      repository: { full_name: "acme/app" },
      pull_request: { number: 42, head: { sha: "abc123", ref: "feature/x" } },
    });
    const ev = verifyAndParseWebhook(headers("pull_request", body), body, SECRET);
    expect(ev).toEqual({
      type: "pull_request",
      action: "opened",
      repo: "acme/app",
      prNumber: 42,
      sha: "abc123",
      ref: "feature/x",
    });
    expect(shouldScan(ev)).toBe(true);
  });

  it("parses a push event", () => {
    const body = JSON.stringify({ ref: "refs/heads/main", after: "def456", repository: { full_name: "acme/app" } });
    const ev = verifyAndParseWebhook(headers("push", body), body, SECRET);
    expect(ev).toEqual({ type: "push", repo: "acme/app", ref: "refs/heads/main", sha: "def456" });
    expect(shouldScan(ev)).toBe(true);
  });

  it("does not scan a closed PR or a ping", () => {
    const closed = JSON.stringify({
      action: "closed",
      repository: { full_name: "a/b" },
      pull_request: { number: 1, head: {} },
    });
    expect(shouldScan(verifyAndParseWebhook(headers("pull_request", closed), closed, SECRET))).toBe(false);
    const ping = JSON.stringify({ zen: "hi" });
    expect(verifyAndParseWebhook(headers("ping", ping), ping, SECRET).type).toBe("ping");
  });

  it("parses an installation event with added repos", () => {
    const body = JSON.stringify({
      action: "created",
      installation: { id: 999 },
      repositories: [{ full_name: "acme/app" }],
    });
    const ev = verifyAndParseWebhook(headers("installation", body), body, SECRET);
    expect(ev).toMatchObject({ type: "installation", installationId: "999", repos: ["acme/app"] });
  });
});
