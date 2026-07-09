import { LlmGateway } from "./gateway.js";

/**
 * Research-tier semantic analysis that actually invokes the LLM gateway (FR-011a, T075).
 *
 * The static detectors (packages/detectors) produce a heuristic pre-filter finding with a
 * baseline confidence. This function refines that confidence with a model analysis of the
 * extracted artifact when LLM analysis is enabled for the org; when disabled it returns the
 * heuristic confidence unchanged and flags reduced coverage. Only the extracted artifact is
 * sent — never the whole repo.
 */

export interface SemanticInput {
  classId: string;
  /** The extracted artifact (e.g. a tool definition), NOT the whole file/repo. */
  artifact: string;
  /** Heuristic confidence from the static pre-filter. */
  heuristicConfidence: number;
}

export interface SemanticResult {
  classId: string;
  confidence: number;
  llmUsed: boolean;
  reducedCoverage: boolean;
  rationale?: string;
}

const SYSTEM: Record<string, string> = {
  "tool-poisoning":
    "You assess whether an MCP tool definition contains instructions aimed at the model (tool poisoning). Reply with `CONFIDENCE: 0.NN` and a one-line rationale.",
  hbv: "You assess whether a tool definition is vague enough to cause model over-privilege (hallucination-based vulnerability). Reply with `CONFIDENCE: 0.NN` and a one-line rationale.",
};

export async function analyzeSemantic(input: SemanticInput, gateway: LlmGateway): Promise<SemanticResult> {
  if (!gateway.enabled) {
    return { classId: input.classId, confidence: input.heuristicConfidence, llmUsed: false, reducedCoverage: true };
  }
  const system =
    SYSTEM[input.classId] ??
    "Assess the security risk of this artifact. Reply with `CONFIDENCE: 0.NN` and a one-line rationale.";
  const result = await gateway.analyze(system, input.artifact);
  if (!result.enabled || result.confidence === undefined) {
    return { classId: input.classId, confidence: input.heuristicConfidence, llmUsed: false, reducedCoverage: true };
  }
  // Blend heuristic and model confidence (model weighted higher), bounded to [0,1].
  const blended = Math.max(0, Math.min(1, 0.35 * input.heuristicConfidence + 0.65 * result.confidence));
  return {
    classId: input.classId,
    confidence: Number(blended.toFixed(3)),
    llmUsed: true,
    reducedCoverage: false,
    rationale: result.rationale,
  };
}
