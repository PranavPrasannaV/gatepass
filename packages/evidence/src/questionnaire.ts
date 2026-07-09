import { evaluatePosture, type EvidenceItem, type Scan } from "./controls.js";

/**
 * Security-questionnaire drafting (FR-022). Answers are drafted STRICTLY from scan posture
 * and cite the control + scan they derive from. A question with no posture backing is
 * flagged `needs_human_input` — never guessed. Drafts require human review before export.
 */

export interface QuestionnaireItem {
  id: string;
  question: string;
}

export interface DraftedAnswer {
  questionId: string;
  question: string;
  status: "answered" | "needs_human_input";
  answer?: string;
  citations: { controlId: string; scanId: string }[];
  reviewStatus: "draft";
}

/** Keyword → control mapping used to route questions to posture facts. */
const ROUTES: { controlId: string; keywords: RegExp }[] = [
  { controlId: "no-exposed-secrets", keywords: /secret|credential|api key|hardcoded/i },
  { controlId: "tenant-isolation", keywords: /tenant|multi-?tenant|isolation|row-level|data separation/i },
  { controlId: "deps-pinned", keywords: /dependenc|third-party|supply chain|package/i },
  { controlId: "mcp-authenticated", keywords: /mcp|agent.*auth|tool server|authenticat/i },
  { controlId: "tool-inputs-bounded", keywords: /input validation|schema|parameter|tool input/i },
  { controlId: "cors-restricted", keywords: /cors|cross-origin/i },
];

export function draftAnswers(questions: QuestionnaireItem[], scan: Scan | null): DraftedAnswer[] {
  const posture: EvidenceItem[] = scan ? evaluatePosture(scan) : [];
  const byControl = new Map(posture.map((p) => [p.controlId, p]));

  return questions.map((q) => {
    const route = ROUTES.find((r) => r.keywords.test(q.question));
    const item = route ? byControl.get(route.controlId) : undefined;
    if (!route || !item) {
      return { questionId: q.id, question: q.question, status: "needs_human_input", citations: [], reviewStatus: "draft" };
    }
    const answer =
      item.status === "pass"
        ? `Yes. Automated scanning (ruleset ${item.rulesetVersion}) confirms: ${item.description}. ` +
          `Mapped to SOC 2 ${item.soc2} / ISO 27001 ${item.iso27001}.`
        : `Partially. Automated scanning found open findings against "${item.description}" ` +
          `(${item.failingFingerprints.length}); remediation is tracked. SOC 2 ${item.soc2} / ISO 27001 ${item.iso27001}.`;
    return {
      questionId: q.id,
      question: q.question,
      status: "answered",
      answer,
      citations: [{ controlId: item.controlId, scanId: item.scanId }],
      reviewStatus: "draft",
    };
  });
}
