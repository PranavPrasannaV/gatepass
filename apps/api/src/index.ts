import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "./server.js";
import { MemoryStore } from "./store.js";
import { PgStore } from "@gatepass/shared";
import { getInstallationToken, RestGitHubClient } from "@gatepass/github";

export { createServer } from "./server.js";
export { makeHandlers } from "./handlers.js";
export { MemoryStore, PgStore } from "./store.js";

const isEntry = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntry) {
  const dbUrl = process.env.DATABASE_URL;
  const store = dbUrl ? new PgStore(dbUrl) : new MemoryStore();

  const appId = process.env.GITHUB_APP_ID;
  const keyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH;
  const installationId = process.env.GITHUB_INSTALLATION_ID;
  let githubClient = undefined;
  if (appId && keyPath && installationId) {
    const privateKey = readFileSync(resolve(keyPath), "utf-8");
    const { token } = await getInstallationToken({ appId, privateKey, installationId });
    githubClient = new RestGitHubClient(token);
    console.log(`GitHub App client ready (installation ${installationId})`);
  }

  const { server } = await createServer({ store, githubClient });
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => {
    console.log(`Gatepass API on :${port} (store: ${dbUrl ? "postgres" : "memory"})`);
  });
}
