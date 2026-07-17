import { describe, it, expect } from "vitest";
import { draftAnswers, type QuestionnaireItem, type Scan } from "../src/index.js";
import type { Finding } from "@gatepass/findings";

const baseFinding: Finding = {
  fingerprint: "fp1",
  tier: "verified",
  classId: "exposed-secret",
  severity: "critical",
  surfaces: ["app_code"],
  locations: [{ path: ".env", startLine: 1, endLine: 1, surface: "app_code" }],
  explanation: "AWS key in .env",
  reproduction: { kind: "inspection", steps: ["cat .env"], expected: "key present" },
};

const cleanScan: Scan = {
  id: "scan-clean",
  rulesetVersion: "2026.07.0",
  findings: [],
};

const dirtyScan: Scan = {
  id: "scan-dirty",
  rulesetVersion: "2026.07.0",
  findings: [baseFinding],
};

describe("draftAnswers — route keyword matching", () => {
  it('routes "secret" keyword to no-exposed-secrets control', () => {
    const [ans] = draftAnswers([{ id: "q1", question: "How do you manage API keys and credentials?" }], cleanScan);
    expect(ans!.status).toBe("answered");
    expect(ans!.citations[0]!.controlId).toBe("no-exposed-secrets");
  });

  it('routes "tenant" keyword to tenant-isolation control', () => {
    const [ans] = draftAnswers([{ id: "q2", question: "Describe your multi-tenant isolation strategy." }], cleanScan);
    expect(ans!.status).toBe("answered");
    expect(ans!.citations[0]!.controlId).toBe("tenant-isolation");
  });

  it('routes "dependencies" keyword to deps-pinned control', () => {
    const [ans] = draftAnswers([{ id: "q3", question: "How do you pin third-party dependencies?" }], cleanScan);
    expect(ans!.status).toBe("answered");
    expect(ans!.citations[0]!.controlId).toBe("deps-pinned");
  });

  it('routes "MCP" keyword to mcp-authenticated control', () => {
    const [ans] = draftAnswers([{ id: "q4", question: "Is your MCP server transport authenticated?" }], cleanScan);
    expect(ans!.status).toBe("answered");
    expect(ans!.citations[0]!.controlId).toBe("mcp-authenticated");
  });

  it('routes "input validation" keyword to tool-inputs-bounded control', () => {
    const [ans] = draftAnswers([{ id: "q5", question: "Do you validate tool inputs against a schema?" }], cleanScan);
    expect(ans!.status).toBe("answered");
    expect(ans!.citations[0]!.controlId).toBe("tool-inputs-bounded");
  });

  it('routes "CORS" keyword to cors-restricted control', () => {
    const [ans] = draftAnswers([{ id: "q6", question: "Is CORS restricted to explicit origins?" }], cleanScan);
    expect(ans!.status).toBe("answered");
    expect(ans!.citations[0]!.controlId).toBe("cors-restricted");
  });
});

describe("draftAnswers — unrouteable questions", () => {
  it("flags an unmatched question as needs_human_input with empty citations", () => {
    const [ans] = draftAnswers([{ id: "q7", question: "Do you carry cyber-insurance coverage?" }], cleanScan);
    expect(ans!.status).toBe("needs_human_input");
    expect(ans!.answer).toBeUndefined();
    expect(ans!.citations).toEqual([]);
    expect(ans!.reviewStatus).toBe("draft");
  });

  it("when one question is unrouteable, only that one is needs_human_input", () => {
    const questions: QuestionnaireItem[] = [
      { id: "q1", question: "Any secrets hardcoded?" },
      { id: "q2", question: "What is your business continuity plan?" },
    ];
    const answers = draftAnswers(questions, cleanScan);
    expect(answers).toHaveLength(2);
    expect(answers[0]!.status).toBe("answered");
    expect(answers[1]!.status).toBe("needs_human_input");
  });
});

describe("draftAnswers — null scan handling", () => {
  it("does not throw when scan is null", () => {
    expect(() => draftAnswers([{ id: "q1", question: "Any secrets?" }], null)).not.toThrow();
  });

  it("returns needs_human_input for every question when scan is null", () => {
    const answers = draftAnswers(
      [
        { id: "q1", question: "How do you handle secrets?" },
        { id: "q2", question: "Is CORS restricted?" },
      ],
      null,
    );
    expect(answers).toHaveLength(2);
    for (const ans of answers) {
      expect(ans!.status).toBe("needs_human_input");
    }
  });
});

describe("draftAnswers — pass vs fail answer format", () => {
  it("produces an affirmative answer when the control passes", () => {
    const [ans] = draftAnswers([{ id: "q1", question: "How do you manage secrets?" }], cleanScan);
    expect(ans!.status).toBe("answered");
    expect(ans!.answer).toMatch(/^Yes\./);
    expect(ans!.answer).toContain("SOC 2 CC6.1");
    expect(ans!.answer).toContain("ISO 27001 A.8.24");
  });

  it("produces a partially-verified answer when the control fails", () => {
    const [ans] = draftAnswers([{ id: "q1", question: "How do you manage secrets?" }], dirtyScan);
    expect(ans!.status).toBe("answered");
    expect(ans!.answer).toMatch(/^Partially\./);
    expect(ans!.answer).toContain("remediation is tracked");
    expect(ans!.answer).toContain("(1)");
  });

  it("includes the failing count (not raw fingerprints) in fail answers", () => {
    const twoFindingsScan: Scan = {
      id: "scan-two",
      rulesetVersion: "2026.07.0",
      findings: [baseFinding, { ...baseFinding, fingerprint: "fp-extra", classId: "exposed-secret" }],
    };
    const [ans] = draftAnswers([{ id: "q1", question: "Any hardcoded credentials?" }], twoFindingsScan);
    expect(ans!.answer).toContain("(2)");
    expect(ans!.answer).not.toContain(baseFinding.fingerprint);
  });
});

describe("draftAnswers — edge cases", () => {
  it("returns an empty array for empty questions input", () => {
    const answers = draftAnswers([], cleanScan);
    expect(answers).toEqual([]);
  });

  it("preserves questionId and question text in the output", () => {
    const [ans] = draftAnswers([{ id: "q42", question: "Is CORS restricted?" }], cleanScan);
    expect(ans!.questionId).toBe("q42");
    expect(ans!.question).toBe("Is CORS restricted?");
  });

  it("attaches a citation to every answered question", () => {
    const [ans] = draftAnswers([{ id: "q1", question: "Any secrets?" }], cleanScan);
    expect(ans!.citations[0]!.controlId).toBe("no-exposed-secrets");
    expect(ans!.citations[0]!.scanId).toBe("scan-clean");
  });

  it("sets reviewStatus to draft for every answer", () => {
    const answers = draftAnswers(
      [
        { id: "q1", question: "Any secrets?" },
        { id: "q2", question: "Do you have insurance?" },
      ],
      cleanScan,
    );
    for (const ans of answers) {
      expect(ans!.reviewStatus).toBe("draft");
    }
  });

  it("routes a multi-keyword question to the first matching route", () => {
    const [ans] = draftAnswers([{ id: "q1", question: "Does your MCP server require authentication?" }], cleanScan);
    expect(ans!.citations[0]!.controlId).toBe("mcp-authenticated");
  });

  it("handles multiple questions simultaneously with different routes", () => {
    const questions: QuestionnaireItem[] = [
      { id: "q1", question: "How do you handle secrets?" },
      { id: "q2", question: "What tenant isolation mechanisms exist?" },
      { id: "q3", question: "Do you have cyber insurance?" },
    ];
    const answers = draftAnswers(questions, cleanScan);
    expect(answers).toHaveLength(3);
    expect(answers[0]!.citations[0]!.controlId).toBe("no-exposed-secrets");
    expect(answers[1]!.citations[0]!.controlId).toBe("tenant-isolation");
    expect(answers[2]!.status).toBe("needs_human_input");
  });
});
