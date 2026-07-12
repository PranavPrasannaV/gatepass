// get-projects.ts
import { stitch } from "@google/stitch";

async function main() {
  const projects = await stitch.projects();
  for (const p of projects) {
    console.log({
      title: p.title,
      id: p.id,
      projectId: p.projectId,
    });
  }
}

main().catch(console.error);
