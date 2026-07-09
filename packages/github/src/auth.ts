import jwt from "jsonwebtoken";

/**
 * Configuration for a GitHub App installation (T096).
 */
export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  installationId: string;
}

/**
 * Generate a JWT for a GitHub App using its private key.
 * The JWT expires in 10 minutes (GitHub max) and is used to request
 * an installation access token.
 */
function createAppJwt(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // 60s clock skew tolerance
    exp: now + 600, // 10 minutes
    iss: appId,
  };
  return jwt.sign(payload, privateKey, { algorithm: "RS256" });
}

/**
 * Exchange a GitHub App JWT for an installation access token.
 * Returns the token string and its expiry.
 */
export interface InstallationToken {
  token: string;
  expiresAt: Date;
}

export async function getInstallationToken(config: GitHubAppConfig): Promise<InstallationToken> {
  const appJwt = createAppJwt(config.appId, config.privateKey);
  const url = `https://api.github.com/app/installations/${config.installationId}/access_tokens`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${appJwt}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    throw new Error(
      `GitHub App auth failed (${res.status}): ${body}`,
    );
  }
  const json = (await res.json()) as { token: string; expires_at: string };
  return { token: json.token, expiresAt: new Date(json.expires_at) };
}