import { readFileSync } from "node:fs";

/**
 * Environment configuration loader. Reads from process.env with typed accessors and clear
 * errors for required-but-missing values. Secrets never get logged.
 */

export interface AppConfig {
  databaseUrl?: string;
  redisUrl?: string;
  githubAppId?: string;
  /** NVIDIA NIM API key for research-tier semantic analysis (nvapi-…). */
  nvidiaApiKey?: string;
  llmEnabled: boolean;
  s3Bucket?: string;
}

/**
 * Minimal dependency-free .env loader (KEY=VALUE lines; # comments; optional surrounding
 * quotes). Values never override variables already present in the environment, so shell
 * exports and CI secrets always win. Returns the keys it set. Missing file is a no-op —
 * production platforms inject real env vars and ship no .env file.
 */
export function loadDotEnv(filePath = ".env", env: NodeJS.ProcessEnv = process.env): string[] {
  let text: string;
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    return [];
  }
  const set: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (env[key] === undefined && value !== "") {
      env[key] = value;
      set.push(key);
    }
  }
  return set;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    githubAppId: env.GITHUB_APP_ID,
    nvidiaApiKey: env.NVIDIA_API_KEY,
    llmEnabled: env.GATEPASS_LLM_ENABLED !== "false",
    s3Bucket: env.S3_BUCKET,
  };
}

export function requireConfig<K extends keyof AppConfig>(config: AppConfig, key: K): NonNullable<AppConfig[K]> {
  const v = config[key];
  if (v === undefined || v === null || v === "") throw new Error(`Missing required config: ${String(key)}`);
  return v as NonNullable<AppConfig[K]>;
}
