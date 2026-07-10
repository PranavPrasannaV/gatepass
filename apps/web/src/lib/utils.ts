import type { Severity, Tier } from "./types";

/** Human-readable label for a severity level */
export function severityLabel(severity: Severity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

/** Tailwind color class for severity */
export function severityColor(severity: Severity): string {
  const map: Record<Severity, string> = {
    critical: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950",
    high: "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950",
    medium: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950",
    low: "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-900",
  };
  return map[severity];
}

/** Tailwind color class for tier */
export function tierColor(tier: Tier): string {
  return tier === "verified"
    ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950"
    : "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950";
}

/** Format confidence as percentage string */
export function confidencePercent(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/** Format date string */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Pluralize helper */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}
