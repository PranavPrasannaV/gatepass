import { describe, it, expect } from "vitest";
import { exchangeCodeForUser, authorizeUrl, OAuthError } from "../src/index.js";

const config = { clientId: "cid", clientSecret: "secret", redirectUri: "https://app/cb" };

function fakeFetch(token: string | null, user: unknown) {
  return (async (url: string) => {
    if (String(url).includes("access_token")) {
      return { ok: true, status: 200, json: async () => (token ? { access_token: token } : { error: "bad_code" }) };
    }
    return { ok: true, status: 200, json: async () => user };
  }) as unknown as typeof fetch;
}

describe("GitHub OAuth (FR-027/T076)", () => {
  it("builds an authorize URL with client id, scope, and state", () => {
    const url = authorizeUrl(config, "xyz");
    expect(url).toContain("client_id=cid");
    expect(url).toContain("state=xyz");
    expect(url).toContain("login/oauth/authorize");
  });

  it("exchanges a code for the authenticated user", async () => {
    const user = await exchangeCodeForUser("thecode", config, fakeFetch("tok123", { id: 42, login: "octocat" }));
    expect(user).toEqual({ githubUserId: 42, login: "octocat", accessToken: "tok123" });
  });

  it("throws when the code is invalid (no access token)", async () => {
    await expect(exchangeCodeForUser("bad", config, fakeFetch(null, {}))).rejects.toThrow(OAuthError);
  });

  it("throws on an incomplete user profile", async () => {
    await expect(exchangeCodeForUser("c", config, fakeFetch("tok", { id: 0 }))).rejects.toThrow(OAuthError);
  });
});
