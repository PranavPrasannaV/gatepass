import { describe, it, expect } from "vitest";
import { parseCsvQuestionnaire, parseSigLite, ingest, draftAnswers, type Scan } from "../src/index.js";

const scan: Scan = { id: "s1", rulesetVersion: "2026.07.0", findings: [] };

describe("questionnaire ingestion (FR-022)", () => {
  it("parses a CSV questionnaire with id + question columns", () => {
    const csv = 'id,question\nQ1,"How do you prevent hardcoded secrets, tokens?"\nQ2,Do you enforce tenant isolation?';
    const items = parseCsvQuestionnaire(csv);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ id: "Q1", question: "How do you prevent hardcoded secrets, tokens?" });
  });

  it("handles quoted fields with embedded commas", () => {
    const items = parseCsvQuestionnaire('question\n"a, b, c"');
    expect(items[0]!.question).toBe("a, b, c");
  });

  it("filters SIG-lite to supported sections", () => {
    const csv = "num,section,question\n1,Application Security,How are secrets managed?\n2,Legal,Do you have insurance?";
    const items = parseSigLite(csv);
    expect(items).toHaveLength(1);
    expect(items[0]!.question).toContain("secrets");
  });

  it("ingested questions flow into posture-cited drafting", () => {
    const items = ingest("csv", "id,question\nQ1,How do you prevent hardcoded credentials?");
    const answers = draftAnswers(items, scan);
    expect(answers[0]!.status).toBe("answered");
    expect(answers[0]!.citations[0]!.scanId).toBe("s1");
  });
});
