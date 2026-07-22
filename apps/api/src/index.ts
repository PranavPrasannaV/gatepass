import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer } from "./server.js";
import { MemoryStore } from "./store.js";
import { PgStore, loadConfig, loadDotEnv } from "@gatepass/shared";
import { getInstallationToken, RestGitHubClient, TarballRepoFetcher, githubTarballDownloader } from "@gatepass/github";
import { createNimTransport, DEFAULT_MODEL } from "@gatepass/semantic";

export { createServer } from "./server.js";
export { makeHandlers } from "./handlers.js";
export { MemoryStore } from "./store.js";

const isEntry = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntry) {
  // Dev convenience: pick up .env from the cwd or the repo root. Real env vars always win.
  loadDotEnv(".env");
  loadDotEnv(resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".env"));
  const config = loadConfig();
  const dbUrl = config.databaseUrl ?? process.env.DATABASE_URL;
  const store = dbUrl ? new PgStore(dbUrl) : new MemoryStore();

  const appId = process.env.GITHUB_APP_ID;
  const keyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH;
  const installationId = process.env.GITHUB_INSTALLATION_ID;
  let githubClient = undefined;
  let repoFetcher = undefined;
  if (appId && keyPath && installationId) {
    const privateKey = readFileSync(resolve(keyPath), "utf-8");
    const appConfig = { appId, privateKey, installationId };
    const { token } = await getInstallationToken(appConfig);
    githubClient = new RestGitHubClient(token);
    // Clone-and-scan: fetch real repos as tarballs with the installation token.
    repoFetcher = new TarballRepoFetcher(githubTarballDownloader(appConfig));
    console.log(`GitHub App client + repo fetcher ready (installation ${installationId})`);
  }

  const llmTransport = config.nvidiaApiKey ? createNimTransport({ apiKey: config.nvidiaApiKey }) : undefined;
  if (llmTransport) {
    console.log(`LLM transport ready (NVIDIA NIM, model ${DEFAULT_MODEL})`);
  }

  const { server } = await createServer({
    store,
    githubClient,
    repoFetcher,
    llmTransport,
    llmModel: DEFAULT_MODEL,
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    webhookOrgId: process.env.GATEPASS_WEBHOOK_ORG,
    vantaToken: process.env.VANTA_API_TOKEN,
    drataToken: process.env.DRATA_API_TOKEN,
    oauthConfig:
      process.env.GITHUB_OAUTH_CLIENT_ID && process.env.GITHUB_OAUTH_CLIENT_SECRET
        ? {
            clientId: process.env.GITHUB_OAUTH_CLIENT_ID,
            clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
            redirectUri: process.env.GITHUB_OAUTH_REDIRECT_URI,
          }
        : undefined,
    sessionSecret: process.env.SESSION_SECRET,
  });
  if (process.env.GITHUB_WEBHOOK_SECRET) {
    console.log("GitHub webhook receiver ready at POST /v1/webhooks/github");
  }
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => {
    console.log(`Gatepass API on :${port} (store: ${dbUrl ? "postgres" : "memory"})`);
  });
}
