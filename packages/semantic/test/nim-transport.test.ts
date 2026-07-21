import { describe, it, expect, vi } from "vitest";
import { createNimTransport, NIM_CHAT_COMPLETIONS_URL, NIM_DEFAULT_MODEL } from "../src/nim-transport.js";
import { DEFAULT_MODEL, LlmGateway, parseAnalysis } from "../src/gateway.js";
import type { LlmRequest } from "../src/gateway.js";

function sampleRequest(overrides: Partial<LlmRequest> = {}): LlmRequest {
  return {
    model: DEFAULT_MODEL,
    system: "You are a security analyzer. Reply with CONFIDENCE: 0.NN",
    artifact: "tool definition: execute_shell with no auth",
    metadata: { zeroRetention: true, purpose: "gatepass-research-tier" },
    ...overrides,
  };
}

describe("createNimTransport (NVIDIA NIM)", () => {
  it("POSTs to the NIM chat completions URL with Bearer auth and OpenAI messages", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe(NIM_CHAT_COMPLETIONS_URL);
      expect(init?.method).toBe("POST");
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe("Bearer nvapi-test-key-abcdefghijklmnopqrstuvwxyz");
      expect(headers.get("Content-Type")).toBe("application/json");

      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("z-ai/glm-5.2");
      expect(body.messages).toEqual([
        { role: "system", content: "You are a security analyzer. Reply with CONFIDENCE: 0.NN" },
        { role: "user", content: "tool definition: execute_shell with no auth" },
      ]);
      expect(body.stream).toBe(false);

      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "CONFIDENCE: 0.91 — likely tool poisoning" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const transport = createNimTransport({
      apiKey: "nvapi-test-key-abcdefghijklmnopqrstuvwxyz",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const { text } = await transport.complete(sampleRequest());
    expect(text).toBe("CONFIDENCE: 0.91 — likely tool poisoning");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("extracts choices[0].message.content and ignores reasoning_content", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "CONFIDENCE: 0.7",
                  reasoning_content: "internal chain of thought should not leak",
                },
              },
            ],
          }),
          { status: 200 },
        ),
    );

    const transport = createNimTransport({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const { text } = await transport.complete(sampleRequest());
    expect(text).toBe("CONFIDENCE: 0.7");
    expect(text).not.toContain("chain of thought");
  });

  it("returns empty text when choices are missing", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    const transport = createNimTransport({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect((await transport.complete(sampleRequest())).text).toBe("");
  });

  it("throws on non-OK HTTP status with status and body", async () => {
    const fetchImpl = vi.fn(async () => new Response("model not found", { status: 404 }));
    const transport = createNimTransport({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(transport.complete(sampleRequest())).rejects.toThrow(/NVIDIA NIM API error: 404 model not found/);
  });

  it("uses the request model (not a hardcoded override inside the body)", async () => {
    let capturedModel = "";
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedModel = JSON.parse(String(init?.body)).model;
      return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
        status: 200,
      });
    });
    const transport = createNimTransport({
      apiKey: "k",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await transport.complete(sampleRequest({ model: "z-ai/glm-5.2" }));
    expect(capturedModel).toBe("z-ai/glm-5.2");
  });

  it("wires into LlmGateway with DEFAULT_MODEL z-ai/glm-5.2", async () => {
    expect(DEFAULT_MODEL).toBe("z-ai/glm-5.2");
    expect(NIM_DEFAULT_MODEL).toBe("z-ai/glm-5.2");

    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("z-ai/glm-5.2");
      return new Response(JSON.stringify({ choices: [{ message: { content: "CONFIDENCE: 0.88" } }] }), { status: 200 });
    });

    const transport = createNimTransport({
      apiKey: "nvapi-wired",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const gw = new LlmGateway({ enabled: true, apiKey: "nvapi-wired", transport });
    const result = await gw.analyze("sys", "artifact");
    expect(result.enabled).toBe(true);
    expect(result.confidence).toBeCloseTo(0.88);
    expect(parseAnalysis(result.rationale ?? "").confidence).toBeCloseTo(0.88);
  });
});
