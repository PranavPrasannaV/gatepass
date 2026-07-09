import { pathToFileURL } from "node:url";
import { createServer } from "./server.js";
import { MemoryStore } from "./store.js";

export { createServer } from "./server.js";
export { makeHandlers } from "./handlers.js";
export { MemoryStore } from "./store.js";

// Entry point: boot the API with a demo org seeded. The guard uses a real file URL so it
// works cross-platform (Windows backslash paths would break a naive string compare).
const isEntry = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntry) {
  const store = new MemoryStore();
  store.upsertOrg({ id: "demo", planTier: "scale", llmEnabled: false });
  const { server } = createServer(store);
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`Gatepass API on :${port} (org "demo" seeded)`));
}
