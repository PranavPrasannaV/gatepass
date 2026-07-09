import type { ScanContext } from "./scan-context.js";

/**
 * Framework detection (FR-003). Drives framework-aware checks. Unsupported frameworks are
 * simply absent from the result, and framework-specific checks report "not applicable"
 * rather than silently skipping (spec edge case).
 */

export type Framework = "nextjs" | "supabase" | "firebase" | "fastapi" | "go";

export const SUPPORTED_FRAMEWORKS: Framework[] = ["nextjs", "supabase", "firebase", "fastapi", "go"];

export function detectFrameworks(ctx: ScanContext): Framework[] {
  const found = new Set<Framework>();
  for (const file of ctx.files) {
    const p = file.relPath.toLowerCase();
    const c = file.content;

    if (/(^|\/)package\.json$/.test(p)) {
      if (/"next"\s*:/.test(c)) found.add("nextjs");
      if (/"@supabase\/supabase-js"\s*:/.test(c)) found.add("supabase");
      if (/"firebase"\s*:|"firebase-admin"\s*:/.test(c)) found.add("firebase");
    }
    if (/next\.config\.(js|ts|mjs)$/.test(p)) found.add("nextjs");
    if (/supabase\/config\.toml$/.test(p) || /\.supabase\//.test(p) || /from\s+['"]@supabase\/supabase-js['"]/.test(c)) {
      found.add("supabase");
    }
    if (/firebase\.json$/.test(p) || /firestore\.rules$/.test(p) || /from\s+['"]firebase/.test(c)) {
      found.add("firebase");
    }
    if (/from\s+fastapi\s+import|import\s+fastapi/.test(c)) found.add("fastapi");
    if (/(^|\/)go\.mod$/.test(p)) found.add("go");
  }
  return SUPPORTED_FRAMEWORKS.filter((f) => found.has(f));
}
