import type { ScanContext } from "@gatepass/engine";
import type { ComplianceDomain } from "./compliance-schema.js";
import { complianceRelevantFiles } from "./source-map.js";

/**
 * Domain applicability. A compliance domain only makes sense for certain kinds of project:
 * Apple App Store rules do not apply to a repo with no iOS target, Google Play rules do not
 * apply without an Android target, and the EU AI Act applies only to AI systems. The first
 * implementation ran every domain against every repo, so a plain Next.js web app was reported
 * as failing "No PrivacyInfo.xcprivacy" — a false positive by construction.
 *
 * When a domain does not apply, its checks are reported as `not_applicable` (shown, but not
 * counted against the score), instead of a wall of irrelevant failures.
 */

export interface Applicability {
  wcag: boolean;
  ccpa: boolean;
  app_store: boolean;
  google_play: boolean;
  eu_ai_act: boolean;
  /** Human-readable reason a domain was ruled not-applicable (for the NA check message). */
  reasons: Partial<Record<ComplianceDomain, string>>;
}

// Mobile applicability is decided by PROJECT-STRUCTURE signals (file paths, build files, and
// declared dependencies), NOT by matching arbitrary source content. Content matching was too
// noisy: a web app whose UI merely renders the strings "Google Play" or "android" (like this
// product's own compliance dashboard) was wrongly classified as a mobile project.
const IOS_PATH = /\.(swift|xcodeproj|xcworkspace|pbxproj)($|\/)|(^|\/)info\.plist$|(^|\/)podfile$|(^|\/)ios\//i;
/** Only a genuine Swift/ObjC import counts as content signal — impossible in web TS/JS. */
const IOS_CONTENT = /^\s*(import\s+(UIKit|SwiftUI)|#import\s+<UIKit)/m;
const ANDROID_PATH = /(^|\/)androidmanifest\.xml$|\.gradle($|\/)|(^|\/)android\/(app|gradle|src)\//i;
/** React Native / Expo / Capacitor projects target BOTH stores. */
const CROSS_PLATFORM_DEP = /"(react-native|expo|@capacitor\/core|@ionic\/react|nativescript|cordova)"/i;
const WEB_PATH = /\.(tsx|jsx|vue|svelte|html|css|scss)$/i;
const WEB_DEP = /\b(next|react|react-dom|vue|svelte|@angular|solid-js|preact|remix|astro|gatsby)\b/;
/**
 * AI/LLM signal — the EU AI Act governs AI systems only. We require a concrete signal (an SDK
 * import/dependency or a real model-API call), not generic words like "inference" or "prompt"
 * that appear in ordinary code and would over-apply the domain.
 */
const AI_SIGNAL = new RegExp(
  [
    // SDK imports / requires / dependency declarations.
    /(?:import|require|from)\s*\(?['"]@?(openai|anthropic(-ai)?|langchain|llamaindex|huggingface|google\/generative-ai|mistralai|cohere|replicate|together-ai|ollama)/i
      .source,
    /"(openai|@anthropic-ai\/sdk|langchain|@google\/generative-ai|@huggingface\/inference|ollama|cohere-ai|replicate)"\s*:/i
      .source,
    // Concrete inference API calls.
    /\.(chat\.completions\.create|messages\.create|generateContent|invoke_model|generate_content)\s*\(/i.source,
    /\b(createNimTransport|bedrock-runtime|VertexAI|new\s+OpenAI|new\s+Anthropic)\b/.source,
  ].join("|"),
  "i",
);

function anyFile(ctx: ScanContext, pathRe: RegExp, contentRe?: RegExp): boolean {
  return ctx.files.some((f) => {
    if (pathRe.test(f.relPath)) return true;
    return contentRe ? contentRe.test(f.content) : false;
  });
}

/** Concatenated package.json manifests, to read declared dependencies once. */
function manifestText(ctx: ScanContext): string {
  return ctx.files
    .filter((f) => /(^|\/)package\.json$/i.test(f.relPath))
    .map((f) => f.content)
    .join("\n");
}

export function detectApplicability(ctx: ScanContext): Applicability {
  const manifests = manifestText(ctx);
  const relevant = complianceRelevantFiles(ctx.files);
  const crossPlatform = CROSS_PLATFORM_DEP.test(manifests);

  const hasIos = crossPlatform || anyFile(ctx, IOS_PATH, IOS_CONTENT);
  const hasAndroid = crossPlatform || anyFile(ctx, ANDROID_PATH);
  const hasWeb = crossPlatform || relevant.some((f) => WEB_PATH.test(f.relPath)) || WEB_DEP.test(manifests);
  const hasAi = ctx.files.some((f) => AI_SIGNAL.test(f.content)) || AI_SIGNAL.test(manifests);

  const reasons: Partial<Record<ComplianceDomain, string>> = {};
  if (!hasWeb) reasons.wcag = "No web UI (tsx/jsx/html/css) or web framework detected.";
  if (!hasWeb) reasons.ccpa = "No web front-end detected; CCPA web-disclosure rules do not apply.";
  if (!hasIos) reasons.app_store = "No iOS/Xcode/React-Native target detected; Apple App Store rules do not apply.";
  if (!hasAndroid)
    reasons.google_play = "No Android/Gradle/React-Native target detected; Google Play rules do not apply.";
  if (!hasAi) reasons.eu_ai_act = "No AI/LLM system detected; the EU AI Act governs AI systems only.";

  return {
    wcag: hasWeb,
    ccpa: hasWeb,
    app_store: hasIos,
    google_play: hasAndroid,
    eu_ai_act: hasAi,
    reasons,
  };
}
