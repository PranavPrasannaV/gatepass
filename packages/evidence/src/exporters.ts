import type { EvidenceItem } from "./controls.js";

/**
 * Compliance-platform evidence exporters (FR-021, T083). Push posture-derived evidence
 * (from `evaluatePosture`) to Vanta or Drata via their public APIs. Evidence is always
 * traceable to a scan (each item carries scanId + rulesetVersion — SC-008), and nothing is
 * exported when there is no scan posture (FR-023).
 *
 * `fetchImpl` is injectable so request construction is unit-testable without a live token;
 * verifying against the real Vanta/Drata APIs needs a sandbox key.
 */

export type CompliancePlatform = "vanta" | "drata";

export interface ExportResult {
  platform: CompliancePlatform;
  delivered: number;
  /** External IDs returned by the platform, one per evidence item. */
  externalIds: string[];
}

export class NoEvidenceError extends Error {
  constructor() {
    super("no posture evidence to export (FR-023)");
    this.name = "NoEvidenceError";
  }
}

type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

const ENDPOINTS: Record<CompliancePlatform, string> = {
  vanta: "https://api.vanta.com/v1/evidence",
  drata: "https://public-api.drata.com/public/evidence",
};

/** Map a Gatepass evidence item into a platform-neutral evidence payload. */
function toPayload(item: EvidenceItem) {
  return {
    control: item.controlId,
    frameworks: { soc2: item.soc2, iso27001: item.iso27001 },
    status: item.status, // "pass" | "fail"
    description: item.description,
    source: "gatepass",
    scanId: item.scanId,
    rulesetVersion: item.rulesetVersion,
    controlMapVersion: item.controlMapVersion,
    failingFindings: item.failingFingerprints,
  };
}

export class ApiEvidenceExporter {
  constructor(
    private readonly platform: CompliancePlatform,
    private readonly token: string,
    private readonly fetchImpl: FetchLike = fetch as unknown as FetchLike,
  ) {}

  async export(items: readonly EvidenceItem[]): Promise<ExportResult> {
    if (items.length === 0) throw new NoEvidenceError();
    const endpoint = ENDPOINTS[this.platform];
    const externalIds: string[] = [];
    for (const item of items) {
      const res = await this.fetchImpl(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(toPayload(item)),
      });
      if (!res.ok) throw new Error(`${this.platform} evidence push failed (${res.status}) for ${item.controlId}`);
      const json = (await res.json()) as { id?: string };
      externalIds.push(json.id ?? `${this.platform}:${item.controlId}`);
    }
    return { platform: this.platform, delivered: items.length, externalIds };
  }
}
