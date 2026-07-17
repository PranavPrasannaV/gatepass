import { describe, it, expect, vi, beforeEach } from "vitest";
import { getInstallationToken, type GitHubAppConfig } from "../src/index.js";
import jwt from "jsonwebtoken";
import { generateKeyPairSync } from "node:crypto";

const TEST_PRIVATE_KEY = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
}).privateKey;

function makeConfig(overrides: Partial<GitHubAppConfig> = {}): GitHubAppConfig {
  return {
    appId: "123456",
    privateKey: TEST_PRIVATE_KEY,
    installationId: "789012",
    ...overrides,
  };
}

function capturingFetch(capture: { jwt?: string }, responseBody: unknown = {}) {
  return async (_url: string, init: unknown) => {
    const headers = (init as any)?.headers ?? {};
    capture.jwt = (headers.authorization ?? "").replace(/^Bearer /, "");
    return {
      ok: true,
      status: 201,
      json: async () => responseBody,
    } as Response;
  };
}

describe("getInstallationToken — JWT creation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a JWT with the appId as issuer", async () => {
    const cap: { jwt?: string } = {};
    vi.spyOn(globalThis, "fetch").mockImplementation(
      capturingFetch(cap, { token: "t", expires_at: "2026-07-17T00:00:00Z" }) as any,
    );

    await getInstallationToken(makeConfig({ appId: "98765" }));

    const payload = jwt.decode(cap.jwt!, { json: true });
    expect(payload).not.toBeNull();
    expect(payload!.iss).toBe("98765");
  });

  it("sets iat ≈ now − 60s and exp − iat = 660s", async () => {
    const cap: { jwt?: string } = {};
    vi.spyOn(globalThis, "fetch").mockImplementation(
      capturingFetch(cap, { token: "t", expires_at: "2026-07-17T00:00:00Z" }) as any,
    );

    const before = Math.floor(Date.now() / 1000);
    await getInstallationToken(makeConfig());
    const after = Math.floor(Date.now() / 1000);

    const payload = jwt.decode(cap.jwt!, { json: true });
    expect(payload!.iat).toBeGreaterThanOrEqual(before - 61);
    expect(payload!.iat).toBeLessThanOrEqual(after - 59);
    expect(payload!.exp! - payload!.iat!).toBe(660);
  });

  it("signs with RS256 algorithm", async () => {
    const cap: { jwt?: string } = {};
    vi.spyOn(globalThis, "fetch").mockImplementation(
      capturingFetch(cap, { token: "t", expires_at: "2026-07-17T00:00:00Z" }) as any,
    );

    await getInstallationToken(makeConfig());

    const full = jwt.decode(cap.jwt!, { complete: true }) as { header: { alg: string } } | null;
    expect(full!.header.alg).toBe("RS256");
  });

  it("works with a PKCS1 PEM private key", async () => {
    const cap: { jwt?: string } = {};
    vi.spyOn(globalThis, "fetch").mockImplementation(
      capturingFetch(cap, { token: "t", expires_at: "2026-07-17T00:00:00Z" }) as any,
    );

    await expect(getInstallationToken(makeConfig())).resolves.toBeDefined();
    expect(cap.jwt).toMatch(/^eyJ/);
  });

  it("works with a PKCS8 PEM private key", async () => {
    const pkcs8 = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    }).privateKey;

    const cap: { jwt?: string } = {};
    vi.spyOn(globalThis, "fetch").mockImplementation(
      capturingFetch(cap, { token: "t", expires_at: "2026-07-17T00:00:00Z" }) as any,
    );

    await expect(getInstallationToken(makeConfig({ privateKey: pkcs8 }))).resolves.toBeDefined();
    expect(cap.jwt).toMatch(/^eyJ/);
  });
});

describe("getInstallationToken — fetch success", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns token and parsed expiresAt from GitHub API", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        ({
          ok: true,
          status: 201,
          json: async () => ({ token: "ghs_abc123", expires_at: "2026-07-17T12:00:00Z" }),
        }) as any,
    );

    const result = await getInstallationToken(makeConfig());
    expect(result.token).toBe("ghs_abc123");
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.expiresAt.toISOString()).toBe("2026-07-17T12:00:00.000Z");
  });

  it("sends POST to the correct installation endpoint", async () => {
    let capturedUrl = "";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, _init) => {
      capturedUrl = url as string;
      return {
        ok: true,
        status: 201,
        json: async () => ({ token: "t", expires_at: "2026-07-17T00:00:00Z" }),
      } as Response;
    });

    await getInstallationToken(makeConfig({ installationId: "42" }));
    expect(capturedUrl).toBe("https://api.github.com/app/installations/42/access_tokens");
  });

  it("sends the correct API version header", async () => {
    let capturedHeaders: Record<string, string> = {};
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      capturedHeaders = (init as any).headers ?? {};
      return {
        ok: true,
        status: 201,
        json: async () => ({ token: "t", expires_at: "2026-07-17T00:00:00Z" }),
      } as Response;
    });

    await getInstallationToken(makeConfig());
    expect(capturedHeaders["accept"]).toBe("application/vnd.github+json");
    expect(capturedHeaders["x-github-api-version"]).toBe("2022-11-28");
  });
});

describe("getInstallationToken — fetch failures", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws on 400 Bad Request", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        ({
          ok: false,
          status: 400,
          text: async () => "Bad Request",
        }) as any,
    );

    await expect(getInstallationToken(makeConfig())).rejects.toThrow(/400/);
  });

  it("throws on 401 Unauthorized", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        ({
          ok: false,
          status: 401,
          text: async () => "Unauthorized",
        }) as any,
    );

    await expect(getInstallationToken(makeConfig())).rejects.toThrow(/401/);
  });

  it("throws on 403 Forbidden", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        ({
          ok: false,
          status: 403,
          text: async () => "Forbidden",
        }) as any,
    );

    await expect(getInstallationToken(makeConfig())).rejects.toThrow(/403/);
  });

  it("includes response body in the error message", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        ({
          ok: false,
          status: 401,
          text: async () => '{"message":"Bad credentials"}',
        }) as any,
    );

    await expect(getInstallationToken(makeConfig())).rejects.toThrow('{"message":"Bad credentials"}');
  });

  it("handles fetch error with no body gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        ({
          ok: false,
          status: 500,
          text: async () => {
            throw new Error("broken");
          },
        }) as any,
    );

    await expect(getInstallationToken(makeConfig())).rejects.toThrow(/500/);
  });
});

describe("getInstallationToken — config edge cases", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when private key is malformed", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        ({
          ok: true,
          status: 201,
          json: async () => ({ token: "t", expires_at: "2026-07-17T00:00:00Z" }),
        }) as any,
    );

    await expect(getInstallationToken(makeConfig({ privateKey: "not-a-key" }))).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses the empty string issuer when appId is empty", async () => {
    const cap: { jwt?: string } = {};
    vi.spyOn(globalThis, "fetch").mockImplementation(
      capturingFetch(cap, { token: "t", expires_at: "2026-07-17T00:00:00Z" }) as any,
    );

    await getInstallationToken(makeConfig({ appId: "" }));
    const payload = jwt.decode(cap.jwt!, { json: true });
    expect(payload!.iss).toBe("");
  });

  it("returns the correct InstallationToken type shape", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        ({
          ok: true,
          status: 201,
          json: async () => ({ token: "ghs_x", expires_at: "2026-07-17T00:00:00Z" }),
        }) as any,
    );

    const result = await getInstallationToken(makeConfig());
    expect(result).toHaveProperty("token");
    expect(result).toHaveProperty("expiresAt");
    expect(typeof result.token).toBe("string");
    expect(result.expiresAt).toBeInstanceOf(Date);
  });
});
