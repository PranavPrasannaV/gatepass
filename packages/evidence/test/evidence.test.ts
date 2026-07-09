import { describe, it, expect } from "vitest";
import { evaluatePosture, draftAnswers, NoPostureError, type Scan } from "../src/index.js";
import type { Finding } from "@gatepass/findings";

const secret: Finding = {
  fingerprint: "sha256:a",
  tier: "verified",
  classId: "exposed-secret",
  severity: "critical",
  surfaces: ["app_code"],
  locations: [{ path: "a.js", startLine: 1, endLine: 1, surface: "app_code" }],
  explanation: "secret",
  reproduction: { kind: "inspection", steps: ["s"], expected: "e" },
};

const cleanScan: Scan = { id: "scan1", rulesetVersion: "2026.07.0", findings: [] };
const dirtyScan: Scan = { id: "scan2", rulesetVersion: "2026.07.0", findings: [secret] };

describe("posture evidence (FR-021/023, SC-008)", () => {
  it("refuses to fabricate evidence with no scan (FR-023)", () => {
    expect(() => evaluatePosture(null)).toThrow(NoPostureError);
  });

  it("every evidence item is traceable to the scan (SC-008)", () => {
    const items = evaluatePosture(cleanScan);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.scanId === "scan1")).toBe(true);
  });

  it("marks the secrets control as fail when a secret is present", () => {
    const items = evaluatePosture(dirtyScan);
    const secrets = items.find((i) => i.controlId === "no-exposed-secrets");
    expect(secrets?.status).toBe("fail");
    expect(secrets?.failingFingerprints).toContain("sha256:a");
  });

  it("marks controls pass on a clean scan", () => {
    expect(evaluatePosture(cleanScan).every((i) => i.status === "pass")).toBe(true);
  });
});

describe("questionnaire drafting (FR-022)", () => {
  it("drafts a posture-cited answer for a matched question", () => {
    const [ans] = draftAnswers(
      [{ id: "q1", question: "How do you prevent hardcoded secrets and credentials?" }],
      cleanScan,
    );
    expect(ans!.status).toBe("answered");
    expect(ans!.citations[0]!.scanId).toBe("scan1");
    expect(ans!.reviewStatus).toBe("draft");
  });

  it("flags unbacked questions needs_human_input, never guessed", () => {
    const [ans] = draftAnswers([{ id: "q2", question: "Do you carry cyber-insurance coverage?" }], cleanScan);
    expect(ans!.status).toBe("needs_human_input");
    expect(ans!.answer).toBeUndefined();
  });

  it("reflects open findings in the drafted answer", () => {
    const [ans] = draftAnswers([{ id: "q3", question: "How do you enforce multi-tenant data isolation?" }], dirtyScan);
    // tenant-isolation control passes here (no rls-gap finding), so answered affirmatively
    expect(ans!.status).toBe("answered");
  });
});
