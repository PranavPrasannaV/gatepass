import { describe, it, expect } from "vitest";
import {
  createSession,
  verifySession,
  hasRole,
  requireRole,
  RoleError,
  roleFromGitHubPermission,
} from "../src/index.js";

const SECRET = "session-secret";
const base = { userId: "u1", login: "octocat", orgId: "demo", role: "member" as const };

describe("session tokens (FR-027/T076)", () => {
  it("round-trips a valid session", () => {
    const token = createSession(base, SECRET);
    const s = verifySession(token, SECRET);
    expect(s).toMatchObject(base);
  });

  it("rejects a tampered payload", () => {
    const token = createSession(base, SECRET);
    const tampered = "x" + token.slice(1);
    expect(verifySession(tampered, SECRET)).toBeNull();
  });

  it("rejects a wrong secret", () => {
    expect(verifySession(createSession(base, SECRET), "other")).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = createSession({ ...base, exp: Math.floor(Date.now() / 1000) - 10 }, SECRET);
    expect(verifySession(token, SECRET)).toBeNull();
  });

  it("returns null for missing/garbage tokens", () => {
    expect(verifySession(undefined, SECRET)).toBeNull();
    expect(verifySession("garbage", SECRET)).toBeNull();
  });
});

describe("roles (RBAC)", () => {
  it("enforces the role hierarchy admin > member > viewer", () => {
    expect(hasRole("admin", "member")).toBe(true);
    expect(hasRole("viewer", "member")).toBe(false);
    expect(() => requireRole("viewer", "admin")).toThrow(RoleError);
    expect(() => requireRole("admin", "admin")).not.toThrow();
  });

  it("maps GitHub permissions to org roles", () => {
    expect(roleFromGitHubPermission("admin")).toBe("admin");
    expect(roleFromGitHubPermission("push")).toBe("member");
    expect(roleFromGitHubPermission("read")).toBe("viewer");
  });
});
