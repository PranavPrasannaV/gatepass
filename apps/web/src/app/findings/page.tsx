import { api } from "@/lib/api-client";
import { ORG_ID } from "@/lib/constants";

import type { Finding } from "@/lib/types";
import FindingsClient from "./FindingsClient";

// Re-fetch on every request (don't statically render at build time)
export const dynamic = "force-dynamic";

// This is a Server Component that fetches data
export default async function FindingsPage() {
  let findings: Finding[] = [];
  let error: string | null = null;

  try {
    // Try to get the latest scan from the first repo
    const repos = await api.getRepos(ORG_ID);
    const completedRepos = repos.filter((r) => r.scanStatus === "complete");
    if (completedRepos.length > 0) {
      const scanRepo = completedRepos[0];
      if (scanRepo?.lastScanId) {
        findings = await api.getFindings(scanRepo.lastScanId);
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load findings";
  }

  return <FindingsClient findings={findings} error={error} />;
}
