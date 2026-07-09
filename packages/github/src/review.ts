import { isCrossSurface, type Finding } from "@gatepass/findings";

/**
 * Builds the PR review payload (FR-012). One review per scan, per-finding comments with a
 * tier badge and — where a fix exists — a GitHub ```suggestion``` block. This module only
 * SHAPES the review; posting it goes through the audited writer (Principle III). It never
 * mutates code.
 */

export interface ReviewComment {
  path: string;
  line: number;
  body: string;
}

export interface PullReview {
  event: "COMMENT"; // never REQUEST_CHANGES that auto-merges; humans decide
  summary: string;
  comments: ReviewComment[];
}

function badge(f: Finding): string {
  if (f.tier === "verified") return "🔴 **Verified**";
  return `🟡 **Research** (confidence ${(f.confidence * 100).toFixed(0)}%)`;
}

function commentBody(f: Finding): string {
  const lines: string[] = [];
  lines.push(`${badge(f)} · \`${f.classId}\` · ${f.severity.toUpperCase()}${isCrossSurface(f) ? " · cross-surface" : ""}`);
  lines.push("");
  lines.push(f.explanation);
  if (f.tier === "verified") {
    lines.push("");
    lines.push("<details><summary>Reproduction</summary>");
    lines.push("");
    for (const step of f.reproduction.steps) lines.push(`- ${step}`);
    lines.push(`- _Expected:_ ${f.reproduction.expected}`);
    lines.push("</details>");
  }
  if (f.suggestedFix?.kind === "diff") {
    lines.push("");
    lines.push("```suggestion");
    lines.push(f.suggestedFix.content);
    lines.push("```");
  }
  return lines.join("\n");
}

export function buildReview(findings: Finding[]): PullReview {
  const verified = findings.filter((f) => f.tier === "verified").length;
  const research = findings.length - verified;
  return {
    event: "COMMENT",
    summary:
      findings.length === 0
        ? "Gatepass: no findings on this change."
        : `Gatepass found ${verified} verified and ${research} research-tier finding(s). ` +
          `Suggestions are advisory — approve any change yourself.`,
    comments: findings.map((f) => ({
      path: f.locations[0]!.path,
      line: f.locations[0]!.startLine,
      body: commentBody(f),
    })),
  };
}
