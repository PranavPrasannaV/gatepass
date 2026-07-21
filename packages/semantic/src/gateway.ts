/**
 * LLM gateway for research-tier semantic analysis (FR-011a).
 *
 * Non-negotiables enforced here:
 *  - Requests are tagged zero-retention; the transport MUST forward that to the provider.
 *  - When analysis is disabled for the org, NO request is made and callers fall back to
 *    static heuristics (with reduced-coverage signalling).
 *  - Only extracted artifacts (tool definitions, code slices) are sent — never whole repos.
 */

export interface LlmRequest {
  model: string;
  system: string;
  /** Extracted artifact text — the caller is responsible for keeping this minimal. */
  artifact: string;
  metadata: { zeroRetention: true; purpose: "gatepass-research-tier" };
}

export interface LlmTransport {
  complete(req: LlmRequest): Promise<{ text: string }>;
}

export interface GatewayOptions {
  enabled: boolean;
  apiKey?: string;
  model?: string;
  transport?: LlmTransport;
}

export interface AnalysisResult {
  /** false → org disabled LLM analysis; caller must use static fallback. */
  enabled: boolean;
  confidence?: number;
  rationale?: string;
}

/** Default research-tier model: NVIDIA NIM GLM 5.2. */
export const DEFAULT_MODEL = "z-ai/glm-5.2";

export class LlmGateway {
  constructor(private readonly opts: GatewayOptions) {}

  get enabled(): boolean {
    return this.opts.enabled && !!this.opts.apiKey && !!this.opts.transport;
  }

  /**
   * Analyze an extracted artifact. Returns `{ enabled: false }` without any network call when
   * disabled. The transport receives a zero-retention-tagged request.
   */
  async analyze(system: string, artifact: string): Promise<AnalysisResult> {
    if (!this.opts.enabled) return { enabled: false };
    if (!this.opts.apiKey || !this.opts.transport) return { enabled: false };

    const req: LlmRequest = {
      model: this.opts.model ?? DEFAULT_MODEL,
      system,
      artifact,
      metadata: { zeroRetention: true, purpose: "gatepass-research-tier" },
    };
    const { text } = await this.opts.transport.complete(req);
    return parseAnalysis(text);
  }
}

/** Parse a `CONFIDENCE: 0.NN` + rationale response into a bounded result. */
export function parseAnalysis(text: string): AnalysisResult {
  const m = text.match(/confidence\s*[:=]\s*(0?\.\d+|1(?:\.0+)?)/i);
  const confidence = m ? Math.max(0, Math.min(1, parseFloat(m[1]!))) : 0.5;
  return { enabled: true, confidence, rationale: text.trim() };
}
