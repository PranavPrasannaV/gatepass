import { describe, it, expect } from "vitest";
import type { ScanContext } from "@gatepass/engine";
import { detectApplicability } from "../src/index.js";

function ctx(files: Record<string, string>): ScanContext {
  return {
    root: "/v",
    surfacesPresent: ["app_code"],
    files: Object.entries(files).map(([relPath, content]) => ({
      relPath,
      absPath: `/v/${relPath}`,
      content,
      surfaces: ["app_code"],
    })),
  } as ScanContext;
}

describe("domain applicability", () => {
  it("a Next.js web app: web domains apply, mobile + AI do not", () => {
    const a = detectApplicability(
      ctx({
        "package.json": JSON.stringify({ dependencies: { next: "14" } }),
        "src/page.tsx": "export const P = () => null;",
      }),
    );
    expect(a.wcag).toBe(true);
    expect(a.ccpa).toBe(true);
    expect(a.app_store).toBe(false);
    expect(a.google_play).toBe(false);
    expect(a.eu_ai_act).toBe(false);
  });

  it("an iOS project makes Apple rules apply", () => {
    const a = detectApplicability(ctx({ "ios/App.swift": "import SwiftUI\nstruct App {}" }));
    expect(a.app_store).toBe(true);
    expect(a.google_play).toBe(false);
  });

  it("an Android project makes Google Play rules apply", () => {
    const a = detectApplicability(ctx({ "android/app/build.gradle": "android { namespace 'com.x' }" }));
    expect(a.google_play).toBe(true);
    expect(a.app_store).toBe(false);
  });

  it("a React Native app targets BOTH stores", () => {
    const a = detectApplicability(
      ctx({ "package.json": JSON.stringify({ dependencies: { "react-native": "0.74" } }) }),
    );
    expect(a.app_store).toBe(true);
    expect(a.google_play).toBe(true);
    expect(a.wcag).toBe(true);
  });

  it("the EU AI Act applies only when an AI/LLM system is present", () => {
    expect(detectApplicability(ctx({ "src/crud.ts": "export const list = () => db.all();" })).eu_ai_act).toBe(false);
    expect(detectApplicability(ctx({ "src/ai.ts": "import OpenAI from 'openai';" })).eu_ai_act).toBe(true);
    expect(detectApplicability(ctx({ "src/a.ts": "const r = await anthropic.messages.create(p);" })).eu_ai_act).toBe(
      true,
    );
  });

  it("provides a human-readable reason for each non-applicable domain", () => {
    const a = detectApplicability(ctx({ "src/crud.ts": "export const list = () => db.all();" }));
    expect(a.reasons.app_store).toMatch(/iOS/i);
    expect(a.reasons.eu_ai_act).toMatch(/AI/i);
  });
});
