import { describe, it, expect } from "vitest";
import { CONTROLS, CONTROL_MAP_VERSION, evaluatePosture, NoPostureError } from "../src/index.js";

describe("CONTROL_MAP_VERSION", () => {
  it('is "controls-v1"', () => {
    expect(CONTROL_MAP_VERSION).toBe("controls-v1");
  });
});

describe("CONTROLS", () => {
  it("has the expected 6 control definitions", () => {
    expect(CONTROLS).toHaveLength(6);
  });

  it("each control has a unique id", () => {
    const ids = CONTROLS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each control has soc2 and iso27001 mapping", () => {
    for (const c of CONTROLS) {
      expect(c.soc2).toBeTruthy();
      expect(c.iso27001).toBeTruthy();
    }
  });

  it("each control has a non-empty failingClasses array", () => {
    for (const c of CONTROLS) {
      expect(c.failingClasses.length).toBeGreaterThan(0);
    }
  });

  it("CONTROLS covers all expected finding classIds across failingClasses", () => {
    const allFailingClasses = CONTROLS.flatMap((c) => c.failingClasses);
    expect(allFailingClasses).toContain("exposed-secret");
    expect(allFailingClasses).toContain("rls-gap");
    expect(allFailingClasses).toContain("cross-surface-scope-mismatch");
    expect(allFailingClasses).toContain("unpinned-dependency");
    expect(allFailingClasses).toContain("unauth-mcp-transport");
    expect(allFailingClasses).toContain("unbounded-tool-param");
    expect(allFailingClasses).toContain("missing-schema-validation");
    expect(allFailingClasses).toContain("cors-misconfig");
  });
});

describe("NoPostureError", () => {
  it("has correct name and message", () => {
    const err = new NoPostureError();
    expect(err.name).toBe("NoPostureError");
    expect(err.message).toBe("No scan posture available; refusing to fabricate evidence (FR-023)");
  });

  it("is thrown when scan is null", () => {
    expect(() => evaluatePosture(null)).toThrow(NoPostureError);
  });

  it("throws with the correct message", () => {
    expect(() => evaluatePosture(null)).toThrow("No scan posture available; refusing to fabricate evidence (FR-023)");
  });
});

describe("evaluatePosture", () => {
  it("returns items with correct controlMapVersion", () => {
    const scan = { id: "s1", rulesetVersion: "v1", findings: [] };
    const items = evaluatePosture(scan);
    for (const item of items) {
      expect(item.controlMapVersion).toBe("controls-v1");
    }
  });
});
