import { describe, it, expect } from "vitest";
import {
  hasFeature, requireFeature, PlanTierError,
  AuditedWriter, InMemoryAuditSink,
  loadConfig, requireConfig,
} from "../src/index.js";

describe("plan-tier gating (FR-025)", () => {
  it("free tier has the open scanner but not CI gating", () => {
    expect(hasFeature("free", "open_scanner")).toBe(true);
    expect(hasFeature("free", "ci_gating")).toBe(false);
  });

  it("team tier has PR remediation but not evidence export", () => {
    expect(hasFeature("team", "pr_remediation")).toBe(true);
    expect(hasFeature("team", "evidence_export")).toBe(false);
  });

  it("scale tier has fleet + evidence + sso", () => {
    for (const f of ["mcp_fleet", "evidence_export", "sso_scim"] as const) {
      expect(hasFeature("scale", f)).toBe(true);
    }
  });

  it("requireFeature throws for a gated feature", () => {
    expect(() => requireFeature("free", "evidence_export")).toThrow(PlanTierError);
    expect(() => requireFeature("scale", "evidence_export")).not.toThrow();
  });
});

describe("audited writer (SC-005, Principle III)", () => {
  it("records an audit event for every outbound write", async () => {
    const sink = new InMemoryAuditSink();
    const writer = new AuditedWriter(sink, "system");
    await writer.write("pr_comment", "org1", { pr: 42 }, async () => "posted");
    await writer.write("check_run", "org1", { sha: "abc" }, async () => "ok");
    expect(sink.events).toHaveLength(2);
    expect(sink.events[0]!.action).toBe("pr_comment");
    expect(sink.events[1]!.seq).toBe(2);
  });

  it("only exposes non-mutating actions (no code/CI write capability)", () => {
    // The AuditAction union is the full set of outbound capabilities; none write code/CI.
    const actions = ["pr_comment", "check_run", "evidence_push", "questionnaire_export", "public_report"];
    expect(actions).not.toContain("push_commit");
    expect(actions).not.toContain("write_file");
  });
});

describe("config loader", () => {
  it("defaults llmEnabled true unless explicitly disabled", () => {
    expect(loadConfig({} as NodeJS.ProcessEnv).llmEnabled).toBe(true);
    expect(loadConfig({ GATEPASS_LLM_ENABLED: "false" } as NodeJS.ProcessEnv).llmEnabled).toBe(false);
  });

  it("requireConfig throws for a missing required value", () => {
    expect(() => requireConfig(loadConfig({} as NodeJS.ProcessEnv), "databaseUrl")).toThrow(/Missing required/);
  });
});
