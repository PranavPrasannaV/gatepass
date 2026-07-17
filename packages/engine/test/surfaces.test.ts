import { describe, it, expect } from "vitest";
import { classifySurfaces } from "../src/index.js";

describe("classifySurfaces", () => {
  it("classifies .mcp.json files as tool_defs and mcp_server", () => {
    const surfaces = classifySurfaces(".mcp.json");
    expect(surfaces).toContain("tool_defs");
    expect(surfaces).toContain("mcp_server");
  });

  it("classifies files in mcp/ directory as mcp_server + agent_code + app_code", () => {
    const surfaces = classifySurfaces("mcp/handler.ts");
    expect(surfaces).toEqual(expect.arrayContaining(["mcp_server", "agent_code", "app_code"]));
  });

  it("classifies files in agent/ directory as mcp_server + agent_code + app_code", () => {
    const surfaces = classifySurfaces("agent/worker.ts");
    expect(surfaces).toEqual(expect.arrayContaining(["mcp_server", "agent_code", "app_code"]));
  });

  it("classifies files in agents/ directory as mcp_server + agent_code + app_code", () => {
    const surfaces = classifySurfaces("agents/instruction.py");
    expect(surfaces).toEqual(expect.arrayContaining(["mcp_server", "agent_code", "app_code"]));
  });

  it("classifies .ts files as app_code", () => {
    expect(classifySurfaces("src/app.ts")).toEqual(["app_code"]);
  });

  it("classifies .py files as app_code", () => {
    expect(classifySurfaces("app.py")).toEqual(["app_code"]);
  });

  it("classifies .go files as app_code", () => {
    expect(classifySurfaces("main.go")).toEqual(["app_code"]);
  });

  it("classifies .sql files as app_code", () => {
    expect(classifySurfaces("query.sql")).toEqual(["app_code"]);
  });

  it("classifies .js files as app_code", () => {
    expect(classifySurfaces("utils.js")).toEqual(["app_code"]);
  });

  it("classifies permission.yaml files as permission_scopes", () => {
    expect(classifySurfaces("permission.yaml")).toEqual(["permission_scopes"]);
  });

  it("classifies permissions.yaml files as permission_scopes", () => {
    expect(classifySurfaces("permissions.yaml")).toEqual(["permission_scopes"]);
  });

  it("classifies policy files as permission_scopes", () => {
    expect(classifySurfaces("policy.json")).toEqual(["permission_scopes"]);
  });

  it("classifies rbac files as permission_scopes", () => {
    expect(classifySurfaces("rbac.yml")).toEqual(["permission_scopes"]);
  });

  it("classifies dist/ .js files as app_code", () => {
    const surfaces = classifySurfaces("dist/bundle.js");
    expect(surfaces).toContain("app_code");
  });

  it("classifies build/ .js files as app_code", () => {
    expect(classifySurfaces("build/output.js")).toContain("app_code");
  });

  it("classifies .next/ .js files as app_code", () => {
    expect(classifySurfaces(".next/static/chunk.js")).toContain("app_code");
  });

  it("returns at least app_code for any scannable file (empty surface fallback)", () => {
    // .env has no source-code extension but should still get app_code via fallback
    expect(classifySurfaces(".env")).toContain("app_code");
  });

  it("classifies mcp-prefixed files as mcp_server", () => {
    const surfaces = classifySurfaces("mcp_server.ts");
    expect(surfaces).toEqual(expect.arrayContaining(["mcp_server", "agent_code", "app_code"]));
  });

  it("classifies mcp-handler.py as mcp_server", () => {
    const surfaces = classifySurfaces("mcp-handler.py");
    expect(surfaces).toEqual(expect.arrayContaining(["mcp_server", "agent_code", "app_code"]));
  });

  it("does NOT classify generic server.ts as mcp_server (regression guard)", () => {
    const surfaces = classifySurfaces("server.ts");
    expect(surfaces).not.toContain("mcp_server");
    expect(surfaces).not.toContain("agent_code");
    expect(surfaces).toEqual(["app_code"]);
  });

  it("does NOT classify generic server.js as mcp_server", () => {
    const surfaces = classifySurfaces("server.js");
    expect(surfaces).not.toContain("mcp_server");
  });

  it("classifies .env files as app_code", () => {
    expect(classifySurfaces(".env")).toContain("app_code");
  });

  it("classifies .env.local files as app_code", () => {
    expect(classifySurfaces(".env.local")).toContain("app_code");
  });

  it("classifies tools.json as tool_defs and mcp_server", () => {
    const surfaces = classifySurfaces("tools.json");
    expect(surfaces).toEqual(expect.arrayContaining(["tool_defs", "mcp_server"]));
  });

  it("classifies config/tool.yaml as tool_defs and mcp_server", () => {
    const surfaces = classifySurfaces("config/tool.yaml");
    expect(surfaces).toEqual(expect.arrayContaining(["tool_defs", "mcp_server"]));
  });

  it("handles Windows-style backslash paths", () => {
    const surfaces = classifySurfaces("mcp\\server.ts");
    expect(surfaces).toEqual(expect.arrayContaining(["mcp_server", "agent_code", "app_code"]));
  });
});
