/**
 * Environment configuration loader. Reads from process.env with typed accessors and clear
 * errors for required-but-missing values. Secrets never get logged.
 */

export interface AppConfig {
  databaseUrl?: string;
  redisUrl?: string;
  githubAppId?: string;
  anthropicApiKey?: string;
  llmEnabled: boolean;
  s3Bucket?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    githubAppId: env.GITHUB_APP_ID,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    llmEnabled: env.GATEPASS_LLM_ENABLED !== "false",
    s3Bucket: env.S3_BUCKET,
  };
}

export function requireConfig<K extends keyof AppConfig>(config: AppConfig, key: K): NonNullable<AppConfig[K]> {
  const v = config[key];
  if (v === undefined || v === null || v === "") throw new Error(`Missing required config: ${String(key)}`);
  return v as NonNullable<AppConfig[K]>;
}
