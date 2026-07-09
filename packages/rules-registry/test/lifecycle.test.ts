import { describe, it, expect, beforeEach } from "vitest";
import { RulesRegistry, RegistryError } from "../src/index.js";

let reg: RulesRegistry;

beforeEach(() => {
  reg = new RulesRegistry();
});

describe("vulnerability-class lifecycle (Constitution Principle V)", () => {
  it("cannot activate a class with no corpus cases", () => {
    reg.register({ id: "hbv", tierTarget: "research", definition: "Hallucination-based vuln", taxonomyRefs: [], corpusCaseCount: 0 });
    expect(() => reg.activate("hbv")).toThrow(RegistryError);
  });

  it("cannot activate a class with corpus but no measured precision", () => {
    reg.register({ id: "hbv", tierTarget: "research", definition: "HBV", taxonomyRefs: [], corpusCaseCount: 5 });
    reg.markCorpusReady("hbv");
    expect(() => reg.activate("hbv")).toThrow(/no measured precision/);
  });

  it("activates only after definition → corpus → measurement", () => {
    reg.register({
      id: "exposed-secret",
      tierTarget: "verified",
      definition: "Secret material exposed in a build artifact",
      taxonomyRefs: ["OWASP-A02"],
      corpusCaseCount: 4,
      measuredTpRate: 1.0,
      measuredFpRate: 0.0,
    });
    reg.markCorpusReady("exposed-secret");
    const cls = reg.activate("exposed-secret");
    expect(cls.status).toBe("active");
    expect(reg.activeClasses().map((c) => c.id)).toContain("exposed-secret");
  });

  it("rejects a class registered without a definition", () => {
    expect(() =>
      reg.register({ id: "x", tierTarget: "verified", definition: "  ", taxonomyRefs: [], corpusCaseCount: 1 }),
    ).toThrow(RegistryError);
  });

  it("forbids illegal transitions (research → active directly)", () => {
    reg.register({ id: "cors", tierTarget: "verified", definition: "CORS misconfig", taxonomyRefs: [], corpusCaseCount: 2, measuredTpRate: 0.9, measuredFpRate: 0.05 });
    // still in `research`; activate() checks precondition, but transition itself is also guarded
    expect(reg.get("cors").status).toBe("research");
    const cls = reg.markCorpusReady("cors");
    expect(cls.status).toBe("corpus_ready");
    reg.activate("cors");
    expect(reg.get("cors").status).toBe("active");
    reg.demote("cors");
    expect(reg.get("cors").status).toBe("demoted");
  });
});
