import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { AddressInfo } from "node:net";
import { createServer } from "../src/server.js";

// Fake GitHub OAuth: code -> access_token -> user.
const oauthFetch = (async (url: string) => {
  if (String(url).includes("access_token")) {
    return { ok: true, status: 200, json: async () => ({ access_token: "gho_test" }) };
  }
  return { ok: true, status: 200, json: async () => ({ id: 4242, login: "octocat" }) };
}) as unknown as typeof fetch;

let base: string;
let close: () => void;

beforeAll(async () => {
  const { server } = await createServer({
    oauthConfig: { clientId: "cid", clientSecret: "sec", redirectUri: "https://app/cb" },
    sessionSecret: "sess-secret",
    oauthFetch,
  });
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
  close = () => server.close();
});
afterAll(() => close());

describe("GitHub OAuth sign-in + sessions (FR-027/T076)", () => {
  it("returns an authorize URL", async () => {
    const res = await fetch(`${base}/v1/auth/github/login?state=xyz`);
    const json = (await res.json()) as any;
    expect(json.url).toContain("client_id=cid");
    expect(json.url).toContain("state=xyz");
  });

  it("exchanges a code for a session token, and /auth/me verifies it", async () => {
    const cb = await fetch(`${base}/v1/auth/github/callback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "thecode" }),
    });
    const cbJson = (await cb.json()) as any;
    expect(cbJson.user.login).toBe("octocat");
    expect(cbJson.token).toBeTruthy();

    const me = await fetch(`${base}/v1/auth/me`, { headers: { authorization: `Bearer ${cbJson.token}` } });
    expect(me.status).toBe(200);
    const meJson = (await me.json()) as any;
    expect(meJson.login).toBe("octocat");
    expect(meJson.role).toBe("member");
  });

  it("rejects /auth/me without a valid session (401)", async () => {
    expect((await fetch(`${base}/v1/auth/me`)).status).toBe(401);
    expect((await fetch(`${base}/v1/auth/me`, { headers: { authorization: "Bearer garbage" } })).status).toBe(401);
  });
});
