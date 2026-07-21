/**
 * NVIDIA NIM OpenAI-compatible transport for research-tier semantic analysis.
 *
 * Base: https://integrate.api.nvidia.com/v1
 * Chat: POST /chat/completions
 * Auth: Authorization: Bearer <NVIDIA_API_KEY>
 * Default model: z-ai/glm-5.2
 *
 * Maps LlmRequest (system + artifact) into OpenAI-style messages and extracts
 * choices[0].message.content. Zero-retention tagging stays on the request metadata
 * for Gatepass auditing; NVIDIA does not document Anthropic-style ZDR headers.
 */

import type { LlmRequest, LlmTransport } from "./gateway.js";

export const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const NIM_CHAT_COMPLETIONS_URL = `${NIM_BASE_URL}/chat/completions`;

/** Working NIM model id for GLM 5.2 (z-ai/glm-5.1 is EOL). */
export const NIM_DEFAULT_MODEL = "z-ai/glm-5.2";

export interface NimTransportOptions {
  apiKey: string;
  /** Inject for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Override chat completions URL (tests / proxies). */
  endpoint?: string;
  maxTokens?: number;
}

interface OpenAiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAiChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      reasoning_content?: string | null;
    };
  }>;
}

/**
 * Create an LlmTransport that calls NVIDIA NIM's OpenAI-compatible chat endpoint.
 */
export function createNimTransport(opts: NimTransportOptions): LlmTransport {
  const fetchFn = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const endpoint = opts.endpoint ?? NIM_CHAT_COMPLETIONS_URL;
  const maxTokens = opts.maxTokens ?? 256;

  return {
    async complete(req: LlmRequest): Promise<{ text: string }> {
      const messages: OpenAiChatMessage[] = [
        { role: "system", content: req.system },
        { role: "user", content: req.artifact },
      ];

      const resp = await fetchFn(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${opts.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: req.model,
          messages,
          max_tokens: maxTokens,
          temperature: 0.2,
          stream: false,
        }),
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        throw new Error(`NVIDIA NIM API error: ${resp.status} ${body}`);
      }

      const json = (await resp.json()) as OpenAiChatResponse;
      const text = json.choices?.[0]?.message?.content ?? "";
      return { text };
    },
  };
}
