import { describe, it, expect } from "vitest";
import { loadConfig, requireConfig } from "../src/index.js";

describe("loadConfig", () => {
  it("returns default values when env is empty", () => {
    const config = loadConfig({} as NodeJS.ProcessEnv);
    expect(config.databaseUrl).toBeUndefined();
    expect(config.redisUrl).toBeUndefined();
    expect(config.githubAppId).toBeUndefined();
    expect(config.anthropicApiKey).toBeUndefined();
    expect(config.s3Bucket).toBeUndefined();
    // llmEnabled defaults to true when GATEPASS_LLM_ENABLED is not set
    expect(config.llmEnabled).toBe(true);
  });

  it("maps DATABASE_URL correctly", () => {
    const config = loadConfig({ DATABASE_URL: "postgres://localhost/mydb" } as NodeJS.ProcessEnv);
    expect(config.databaseUrl).toBe("postgres://localhost/mydb");
  });

  it("maps REDIS_URL correctly", () => {
    const config = loadConfig({ REDIS_URL: "redis://localhost:6379" } as NodeJS.ProcessEnv);
    expect(config.redisUrl).toBe("redis://localhost:6379");
  });

  it("maps GITHUB_APP_ID correctly", () => {
    const config = loadConfig({ GITHUB_APP_ID: "123456" } as NodeJS.ProcessEnv);
    expect(config.githubAppId).toBe("123456");
  });

  it("maps ANTHROPIC_API_KEY correctly", () => {
    const config = loadConfig({ ANTHROPIC_API_KEY: "sk-ant-xxx" } as NodeJS.ProcessEnv);
    expect(config.anthropicApiKey).toBe("sk-ant-xxx");
  });

  it("maps S3_BUCKET correctly", () => {
    const config = loadConfig({ S3_BUCKET: "my-bucket" } as NodeJS.ProcessEnv);
    expect(config.s3Bucket).toBe("my-bucket");
  });

  it("loads all config keys from a fully populated env", () => {
    const config = loadConfig({
      DATABASE_URL: "postgres://db",
      REDIS_URL: "redis://r",
      GITHUB_APP_ID: "42",
      ANTHROPIC_API_KEY: "sk-ant-key",
      GATEPASS_LLM_ENABLED: "true",
      S3_BUCKET: "b",
    } as NodeJS.ProcessEnv);

    expect(config).toEqual({
      databaseUrl: "postgres://db",
      redisUrl: "redis://r",
      githubAppId: "42",
      anthropicApiKey: "sk-ant-key",
      llmEnabled: true,
      s3Bucket: "b",
    });
  });

  describe("llmEnabled default", () => {
    it("is true when GATEPASS_LLM_ENABLED is unset", () => {
      expect(loadConfig({} as NodeJS.ProcessEnv).llmEnabled).toBe(true);
    });

    it("is true when GATEPASS_LLM_ENABLED is 'true'", () => {
      expect(loadConfig({ GATEPASS_LLM_ENABLED: "true" } as NodeJS.ProcessEnv).llmEnabled).toBe(true);
    });

    it("is false when GATEPASS_LLM_ENABLED is 'false'", () => {
      expect(loadConfig({ GATEPASS_LLM_ENABLED: "false" } as NodeJS.ProcessEnv).llmEnabled).toBe(false);
    });

    it("is true when GATEPASS_LLM_ENABLED is any non-'false' value", () => {
      expect(loadConfig({ GATEPASS_LLM_ENABLED: "0" } as NodeJS.ProcessEnv).llmEnabled).toBe(true);
      expect(loadConfig({ GATEPASS_LLM_ENABLED: "1" } as NodeJS.ProcessEnv).llmEnabled).toBe(true);
      expect(loadConfig({ GATEPASS_LLM_ENABLED: "yes" } as NodeJS.ProcessEnv).llmEnabled).toBe(true);
    });
  });
});

describe("requireConfig", () => {
  it("returns the value when the key is present", () => {
    const config = loadConfig({ DATABASE_URL: "postgres://db" } as NodeJS.ProcessEnv);
    expect(requireConfig(config, "databaseUrl")).toBe("postgres://db");
  });

  it("returns an empty string value (present but empty — treated as missing)", () => {
    const config = loadConfig({ DATABASE_URL: "" } as NodeJS.ProcessEnv);
    // loadConfig maps empty string correctly
    expect(config.databaseUrl).toBe("");
    // requireConfig throws for empty string
    expect(() => requireConfig(config, "databaseUrl")).toThrow("Missing required config");
  });

  it("throws with the correct message when a key is missing", () => {
    const config = loadConfig({} as NodeJS.ProcessEnv);
    expect(() => requireConfig(config, "databaseUrl")).toThrow("Missing required config: databaseUrl");
  });

  it("throws for undefined value", () => {
    const config = loadConfig({} as NodeJS.ProcessEnv);
    expect(() => requireConfig(config, "anthropicApiKey")).toThrow("Missing required config: anthropicApiKey");
  });

  it("throws with the correct key name in the error message", () => {
    const config = loadConfig({} as NodeJS.ProcessEnv);
    expect(() => requireConfig(config, "githubAppId")).toThrow("githubAppId");
    expect(() => requireConfig(config, "redisUrl")).toThrow("redisUrl");
    expect(() => requireConfig(config, "s3Bucket")).toThrow("s3Bucket");
  });

  it("is type-safe — non-nullable return type", () => {
    const config = loadConfig({ DATABASE_URL: "postgres://db", GITHUB_APP_ID: "42" } as NodeJS.ProcessEnv);
    const db: string = requireConfig(config, "databaseUrl");
    expect(db).toBe("postgres://db");

    const appId: string = requireConfig(config, "githubAppId");
    expect(appId).toBe("42");
  });
});
