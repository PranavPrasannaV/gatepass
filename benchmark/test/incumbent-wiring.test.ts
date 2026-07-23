import { describe, it, expect } from "vitest";
import { mapRuleToClasses, parseSarifResults, attributeToCases } from "../src/run-incumbent.js";

describe("incumbent rule → Gatepass class mapping (FR-018)", () => {
  it("credits secret rules to exposed-secret", () => {
    expect(mapRuleToClasses("generic.secrets.security.detected-aws-access-key-id-value")).toContain("exposed-secret");
    expect(mapRuleToClasses("hardcoded-token-in-code")).toContain("exposed-secret");
  });

  it("credits CORS rules to cors-misconfig", () => {
    expect(mapRuleToClasses("javascript.express.security.cors-misconfiguration")).toContain("cors-misconfig");
    expect(mapRuleToClasses("access-control-allow-origin-wildcard")).toContain("cors-misconfig");
  });

  it("does NOT credit unrelated rules to any class (no free wins)", () => {
    expect(mapRuleToClasses("javascript.lang.security.audit.sqli.node-mysql-sqli")).toEqual([]);
    expect(mapRuleToClasses("python.flask.security.xss.audit.template-string")).toEqual([]);
  });
});

describe("SARIF parsing + per-case attribution", () => {
  const sarif = JSON.stringify({
    runs: [
      {
        results: [
          {
            ruleId: "generic.secrets.security.detected-aws-access-key-id-value",
            locations: [
              {
                physicalLocation: {
                  artifactLocation: {
                    uri: "C:\\stage\\verified\\exposed-secret\\vuln-aws-in-bundle\\tree\\dist\\bundle.js",
                  },
                },
              },
            ],
          },
          {
            ruleId: "some.unmapped.rule",
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: "C:/stage/verified/cors-misconfig/clean-specific-origin/tree/server.ts" },
                },
              },
            ],
          },
        ],
      },
    ],
  });

  it("extracts ruleId + uri pairs", () => {
    const results = parseSarifResults(sarif);
    expect(results).toHaveLength(2);
    expect(results[0]!.ruleId).toContain("aws-access-key");
  });

  it("attributes results to the owning corpus case across path styles", () => {
    const results = parseSarifResults(sarif);
    const caseIds = ["verified/exposed-secret/vuln-aws-in-bundle", "verified/cors-misconfig/clean-specific-origin"];
    const { classesByCase, rulesByCase } = attributeToCases(results, "C:\\stage", caseIds);

    expect([...classesByCase.get("verified/exposed-secret/vuln-aws-in-bundle")!]).toEqual(["exposed-secret"]);
    // Unmapped rule: recorded raw for transparency, but earns no class credit.
    expect(rulesByCase.get("verified/cors-misconfig/clean-specific-origin")!.has("some.unmapped.rule")).toBe(true);
    expect(classesByCase.get("verified/cors-misconfig/clean-specific-origin")?.size ?? 0).toBe(0);
  });

  it("returns empty on malformed SARIF", () => {
    expect(parseSarifResults("not json")).toEqual([]);
  });
});
