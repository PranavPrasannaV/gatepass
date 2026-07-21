/**
 * GitHub OAuth sign-in (FR-027, T076). Exchanges the OAuth `code` for a user access token and
 * resolves the authenticated GitHub user. `fetchImpl` is injectable so the exchange is
 * unit-testable without hitting GitHub; the real flow needs a registered OAuth app.
 */

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  /** Where GitHub redirects back after authorization. */
  redirectUri?: string;
}

export interface GitHubUser {
  githubUserId: number;
  login: string;
  accessToken: string;
}

type FetchLike = typeof fetch;

/** The URL to send a user to in order to begin the OAuth flow. */
export function authorizeUrl(config: OAuthConfig, state: string, scope = "read:user"): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    scope,
    state,
    ...(config.redirectUri ? { redirect_uri: config.redirectUri } : {}),
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export class OAuthError extends Error {}

/** Exchange an OAuth `code` for an access token and the authenticated user. */
export async function exchangeCodeForUser(
  code: string,
  config: OAuthConfig,
  fetchImpl: FetchLike = fetch,
): Promise<GitHubUser> {
  const tokenRes = await fetchImpl("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      ...(config.redirectUri ? { redirect_uri: config.redirectUri } : {}),
    }),
  });
  if (!tokenRes.ok) throw new OAuthError(`token exchange failed (${tokenRes.status})`);
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenJson.access_token) throw new OAuthError(`no access token (${tokenJson.error ?? "unknown"})`);

  const userRes = await fetchImpl("https://api.github.com/user", {
    headers: {
      authorization: `Bearer ${tokenJson.access_token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
  });
  if (!userRes.ok) throw new OAuthError(`user lookup failed (${userRes.status})`);
  const user = (await userRes.json()) as { id?: number; login?: string };
  if (!user.id || !user.login) throw new OAuthError("incomplete user profile");

  return { githubUserId: user.id, login: user.login, accessToken: tokenJson.access_token };
}
