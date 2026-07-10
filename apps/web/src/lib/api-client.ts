import { API_BASE } from "./constants";
import type {
  OrgRecord, RepoRecord, ScanResult, FleetView, FleetServer,
  AgentGuidance, EvidenceExport, QuestionnaireDraft, BenchmarkData,
} from "./types";
import type { Finding } from "./types";
import { ApiError } from "./types";

class ApiClient {
  private base: string;

  constructor(base: string = API_BASE) {
    this.base = base;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.base}/v1${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const externalSignal = options.signal;
    if (externalSignal) {
      externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    const { signal: _sig, ...rest } = options;
    const res = await fetch(url, {
      headers: { "content-type": "application/json", ...rest.headers },
      ...rest,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      if (res.status === 404) throw new ApiError(404, "Resource not found");
      if (res.status === 403) {
        const body = await res.json().catch(() => ({ error: "Forbidden" }));
        throw new ApiError(403, body.error ?? "Forbidden");
      }
      throw new ApiError(res.status, `API error: ${res.statusText}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  // === ORGS ===
  getOrg(orgId: string): Promise<OrgRecord> {
    return this.request(`/orgs/${orgId}`);
  }

  getRepos(orgId: string): Promise<RepoRecord[]> {
    return this.request(`/orgs/${orgId}/repos`);
  }

  patchRepoSettings(orgId: string, repo: string, settings: Partial<{
    gate_mode: string; gate_failure_mode: string; agent_loop_enabled: boolean;
  }>): Promise<void> {
    return this.request(`/orgs/${orgId}/repos/${repo}`, {
      method: "PATCH", body: JSON.stringify(settings),
    });
  }

  patchOrgSettings(orgId: string, settings: Partial<{ llm_analysis_enabled: boolean }>): Promise<void> {
    return this.request(`/orgs/${orgId}/settings`, {
      method: "PATCH", body: JSON.stringify(settings),
    });
  }

  // === SCANS ===
  triggerScan(orgId: string, repoPath: string): Promise<ScanResult> {
    return this.request(`/orgs/${orgId}/scans`, {
      method: "POST", body: JSON.stringify({ path: repoPath }),
    });
  }

  // The GET /v1/orgs/:org/scans path doesn't exist — scans are per-repo
  // Use the scan-based findings endpoint
  getScan(scanId: string): Promise<{ id: string; status: string }> {
    return this.request(`/scans/${scanId}`);
  }

  getFindings(scanId: string, includeSuppressed?: boolean): Promise<Finding[]> {
    const qs = includeSuppressed ? "?includeSuppressed=1" : "";
    return this.request(`/scans/${scanId}/findings${qs}`);
  }

  getSarif(scanId: string): Promise<unknown> {
    return this.request(`/scans/${scanId}/findings.sarif`);
  }

  // === FINDINGS ===
  disputeFinding(fingerprint: string, scanId: string, reason: string): Promise<{ ok: boolean; suppressed: string }> {
    return this.request(`/findings/${fingerprint}/dispute`, {
      method: "POST", body: JSON.stringify({ scanId, reason }),
    });
  }

  getAgentGuidance(orgId: string, scanId: string, fingerprint: string): Promise<AgentGuidance> {
    return this.request(`/orgs/${orgId}/scans/${scanId}/agent-guidance?fingerprint=${encodeURIComponent(fingerprint)}`);
  }

  // === FLEET ===
  getFleet(orgId: string): Promise<FleetView> {
    return this.request(`/orgs/${orgId}/fleet`);
  }

  registerFleetServer(orgId: string, data: { name: string; endpointOrRepo: string; configHash: string }): Promise<FleetServer> {
    return this.request(`/orgs/${orgId}/fleet/servers`, {
      method: "POST", body: JSON.stringify(data),
    });
  }

  rescanFleetServer(serverId: string, repoPath: string): Promise<FleetServer> {
    return this.request(`/fleet/servers/${serverId}/rescan`, {
      method: "POST", body: JSON.stringify({ path: repoPath }),
    });
  }

  // === BENCHMARK (public — no org) ===
  getBenchmark(corpusVersion?: string): Promise<BenchmarkData | BenchmarkData[]> {
    const path = corpusVersion ? `/public/benchmark/${corpusVersion}` : "/public/benchmark";
    return this.request(path);
  }

  // === EVIDENCE ===
  getEvidence(orgId: string, scanId: string): Promise<EvidenceExport[]> {
    return this.request(`/orgs/${orgId}/evidence?scanId=${encodeURIComponent(scanId)}`);
  }

  getQuestionnaire(orgId: string, questionnaireId: string): Promise<QuestionnaireDraft> {
    return this.request(`/orgs/${orgId}/questionnaires/${questionnaireId}`);
  }

  draftQuestionnaire(orgId: string, data: { scanId: string; format: string; content: string }): Promise<QuestionnaireDraft> {
    return this.request(`/orgs/${orgId}/questionnaires`, {
      method: "POST", body: JSON.stringify(data),
    });
  }

  connectIntegration(orgId: string, platform: "vanta" | "drata"): Promise<{ ok: boolean }> {
    return this.request(`/orgs/${orgId}/integrations/${platform}`, {
      method: "POST", body: JSON.stringify({}),
    });
  }
}

export const api = new ApiClient();
export default ApiClient;
