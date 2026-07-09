import { AuditedWriter } from "@gatepass/shared";
import type { Finding } from "@gatepass/findings";
import { buildReview, type PullReview } from "./review.js";
import { evaluateGate, type GateConfig, type GateResult } from "./checkrun.js";

/**
 * GitHub delivery (FR-012, FR-016) wired through the audited writer (Principle III, SC-005).
 *
 * The `GitHubClient` interface deliberately exposes ONLY comment + check-run capabilities —
 * there is no method that writes code, pushes commits, or edits CI. That is the structural
 * enforcement of "Gatepass never mutates customer repos". The concrete Octokit-backed client
 * (which needs a live GitHub App installation) implements this same interface; the mapping
 * and audit wiring here are provider-agnostic and fully testable with a fake client.
 */

export interface PostedReview {
  id: number;
}
export interface PostedCheckRun {
  id: number;
  conclusion: GateResult["conclusion"];
}

export interface GitHubClient {
  postReview(repo: string, prNumber: number, review: PullReview): Promise<PostedReview>;
  createCheckRun(repo: string, headSha: string, result: GateResult): Promise<PostedCheckRun>;
  // NOTE: intentionally no writeFile / createCommit / updateWorkflow — see Principle III.
}

export class Remediator {
  constructor(
    private readonly client: GitHubClient,
    private readonly writer: AuditedWriter,
  ) {}

  /** Post PR review findings as suggestions; recorded in the audit log. */
  async deliverReview(orgId: string, repo: string, prNumber: number, findings: Finding[]): Promise<PostedReview> {
    const review = buildReview(findings);
    return this.writer.write("pr_comment", orgId, { repo, prNumber, comments: review.comments.length }, () =>
      this.client.postReview(repo, prNumber, review),
    );
  }

  /** Publish the CI gate as a Check Run; recorded in the audit log. */
  async publishGate(
    orgId: string,
    repo: string,
    headSha: string,
    config: GateConfig,
    findings: Finding[] | undefined,
    scanCompleted: boolean,
  ): Promise<PostedCheckRun> {
    const result = evaluateGate(config, { findings, scanCompleted });
    return this.writer.write("check_run", orgId, { repo, headSha, conclusion: result.conclusion }, () =>
      this.client.createCheckRun(repo, headSha, result),
    );
  }
}
