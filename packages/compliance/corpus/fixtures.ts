import type { ComplianceFixture } from "../src/measure.js";

/**
 * Compliance corpus. One `vulnerable` and one `clean` fixture per scannable rule (plus
 * `manual` fixtures for review-only rules), each carrying the context files that make its
 * domain APPLICABLE (a web app for WCAG/CCPA, an iOS project for Apple, an Android project for
 * Google Play, an AI system for the EU AI Act).
 *
 * Measured by `runComplianceMeasurement`; the regression test asserts 0% false-positive rate
 * and full recall. Fixtures are the compliance analogue of `corpus/cases/`.
 */

// Minimal context files that establish domain applicability.
const WEB = { "package.json": JSON.stringify({ dependencies: { next: "14.0.0", react: "18.0.0" } }) };
const IOS = { "ios/App.swift": "import SwiftUI\nstruct App {}\n" };
const ANDROID = { "android/app/build.gradle": "android { namespace 'com.acme.app' }\n" };
const AI = { "src/ai.ts": "import OpenAI from 'openai';\nconst client = new OpenAI();\n" };

export const COMPLIANCE_FIXTURES: ComplianceFixture[] = [
  // ─── WCAG ───────────────────────────────────────────────────────────
  {
    ruleId: "wcag-target-size",
    label: "vulnerable",
    note: "16px interactive button",
    files: { ...WEB, "src/ui.css": ".btn {\n  cursor: pointer;\n  width: 16px;\n  height: 16px;\n}\n" },
  },
  {
    ruleId: "wcag-target-size",
    label: "clean",
    note: "44px button + small non-interactive divider",
    files: { ...WEB, "src/ui.css": ".btn {\n  cursor: pointer;\n  height: 44px;\n}\n.divider {\n  height: 2px;\n}\n" },
  },
  {
    ruleId: "wcag-text-contrast",
    label: "vulnerable",
    note: "#cccccc on white (1.6:1)",
    files: { ...WEB, "src/a.css": "body {\n  background: #ffffff;\n  color: #cccccc;\n}\n" },
  },
  {
    ruleId: "wcag-text-contrast",
    label: "clean",
    note: "#111 on white (18:1)",
    files: { ...WEB, "src/a.css": "body {\n  background: #ffffff;\n  color: #111111;\n}\n" },
  },
  {
    ruleId: "wcag-non-text-contrast",
    label: "vulnerable",
    note: "very low-contrast UI colour",
    files: { ...WEB, "src/b.css": ".card {\n  background: #ffffff;\n  color: #f0f0f0;\n}\n" },
  },
  {
    ruleId: "wcag-non-text-contrast",
    label: "clean",
    note: "strong UI contrast",
    files: { ...WEB, "src/b.css": ".card {\n  background: #ffffff;\n  color: #000000;\n}\n" },
  },
  {
    ruleId: "wcag-accessible-auth",
    label: "vulnerable",
    note: "CAPTCHA cognitive-test auth",
    files: {
      ...WEB,
      "src/login.tsx": "export const Login = () => <div className='recaptcha'>Solve the puzzle</div>;\n",
    },
  },
  {
    ruleId: "wcag-accessible-auth",
    label: "clean",
    note: "passkey/email auth, no cognitive test",
    files: { ...WEB, "src/login.tsx": "export const Login = () => <input autoComplete='current-password' />;\n" },
  },
  {
    ruleId: "wcag-focus-not-obscured",
    label: "vulnerable",
    note: "sticky header, no scroll-margin",
    files: { ...WEB, "src/h.css": ".header {\n  position: sticky;\n  top: 0;\n}\n" },
  },
  {
    ruleId: "wcag-focus-not-obscured",
    label: "clean",
    note: "sticky header WITH scroll-margin",
    files: {
      ...WEB,
      "src/h.css": ".header {\n  position: sticky;\n  top: 0;\n}\n:target {\n  scroll-margin-top: 80px;\n}\n",
    },
  },
  {
    ruleId: "wcag-dragging-alternative",
    label: "vulnerable",
    note: "drag-only reorder, no click alternative",
    files: { ...WEB, "src/list.tsx": "export const L = () => <li draggable onDragStart={reorder} />;\n" },
  },
  {
    ruleId: "wcag-dragging-alternative",
    label: "clean",
    note: "drag with click-based move buttons",
    files: {
      ...WEB,
      "src/list.tsx":
        "export const L = () => <li draggable onDragStart={reorder}><button onClick={moveUp}>Up</button></li>;\n",
    },
  },
  {
    ruleId: "wcag-focus-appearance",
    label: "vulnerable",
    note: "outline:none with no replacement",
    files: { ...WEB, "src/f.css": "button {\n  outline: none;\n}\n" },
  },
  {
    ruleId: "wcag-focus-appearance",
    label: "clean",
    note: "outline:none WITH focus-visible replacement",
    files: {
      ...WEB,
      "src/f.css": "button {\n  outline: none;\n}\nbutton:focus-visible {\n  outline: 2px solid #2563eb;\n}\n",
    },
  },
  {
    // A scanner can't be certain step-2 data isn't carried over by another mechanism, so a
    // multi-step form without visible prefill is surfaced as manual_review, not a hard fail.
    ruleId: "wcag-redundant-entry",
    label: "manual",
    note: "multi-step wizard with no visible carry-over → manual_review",
    files: { ...WEB, "src/checkout.tsx": "const wizard = true;\nexport const Step2 = () => <input name='email' />;\n" },
  },
  {
    ruleId: "wcag-redundant-entry",
    label: "clean",
    note: "multi-step form that prefills known data → pass",
    files: {
      ...WEB,
      "src/checkout.tsx":
        "const wizard = true;\nexport const Step2 = () => <input name='email' defaultValue={prefill.email} autoFill />;\n",
    },
  },
  {
    ruleId: "wcag-consistent-help",
    label: "manual",
    note: "chat widget detected — placement consistency needs runtime layout",
    files: { ...WEB, "src/help.tsx": "export const H = () => <div className='intercom-widget' />;\n" },
  },

  // ─── CCPA / CPRA ────────────────────────────────────────────────────
  {
    ruleId: "ccpa-gpc-signal",
    label: "vulnerable",
    note: "no GPC handling",
    files: { ...WEB, "src/mw.ts": "export function mw(req) {\n  return next(req);\n}\n" },
  },
  {
    ruleId: "ccpa-gpc-signal",
    label: "clean",
    note: "GPC detected AND opt-out applied",
    files: {
      ...WEB,
      "src/mw.ts":
        "export function mw(req) {\n  if (req.headers.get('Sec-GPC') === '1') {\n    disableTracking();\n    optOut();\n  }\n}\n",
    },
  },
  {
    ruleId: "ccpa-well-known-gpc",
    label: "vulnerable",
    note: "no .well-known/gpc.json",
    files: { ...WEB, "src/app.tsx": "export const A = () => <div>App</div>;\n" },
  },
  {
    ruleId: "ccpa-well-known-gpc",
    label: "clean",
    note: "gpc.json present",
    files: { ...WEB, "public/.well-known/gpc.json": '{ "gpc": true, "lastUpdate": "2026-01-01" }\n' },
  },
  {
    ruleId: "ccpa-do-not-sell-link",
    label: "vulnerable",
    note: "no do-not-sell control (only an unrelated ccpa mention)",
    files: { ...WEB, "src/notes.ts": "// This module references ccpa terminology in a comment only.\n" },
  },
  {
    ruleId: "ccpa-do-not-sell-link",
    label: "clean",
    note: "real footer opt-out link",
    files: {
      ...WEB,
      "src/Footer.tsx":
        "export const Footer = () => (\n  <footer>\n    <a href='/do-not-sell'>Your Privacy Choices</a>\n  </footer>\n);\n",
    },
  },
  {
    ruleId: "ccpa-dsar-workflow",
    label: "vulnerable",
    note: "no deletion workflow",
    files: { ...WEB, "src/user.ts": "export function getUser(id) {\n  return db.find(id);\n}\n" },
  },
  {
    ruleId: "ccpa-dsar-workflow",
    label: "clean",
    note: "deletion request with cross-system fan-out",
    files: {
      ...WEB,
      "src/dsar.ts":
        "export async function handleDeletionRequest(userId) {\n  await db.deleteUser(userId);\n  await cache.purge(userId);\n  await notifyServiceProviders(userId);\n}\n",
    },
  },
  {
    ruleId: "ccpa-privacy-policy",
    label: "vulnerable",
    note: "no privacy policy",
    files: { ...WEB, "src/home.tsx": "export const Home = () => <main>Welcome</main>;\n" },
  },
  {
    ruleId: "ccpa-privacy-policy",
    label: "clean",
    note: "privacy policy present",
    files: { ...WEB, "public/privacy.html": "<h1>Privacy Policy</h1>\n" },
  },

  // ─── Apple App Store (needs iOS context to be applicable) ───────────
  {
    ruleId: "apple-privacy-manifest",
    label: "vulnerable",
    note: "iOS app, no PrivacyInfo.xcprivacy",
    files: {
      ...IOS,
      "ios/ContentView.swift": 'import SwiftUI\nstruct ContentView: View { var body: some View { Text("Hi") } }\n',
    },
  },
  {
    ruleId: "apple-privacy-manifest",
    label: "clean",
    note: "complete PrivacyInfo.xcprivacy",
    files: {
      ...IOS,
      "ios/PrivacyInfo.xcprivacy":
        "<plist><dict>\n<key>NSPrivacyTracking</key><false/>\n<key>NSPrivacyTrackingDomains</key><array/>\n<key>NSPrivacyCollectedDataTypes</key><array/>\n<key>NSPrivacyAccessedAPITypes</key><array/>\n</dict></plist>\n",
    },
  },
  {
    ruleId: "apple-required-reason-apis",
    label: "vulnerable",
    note: "UserDefaults access in Swift, no manifest reason",
    files: { ...IOS, "ios/Store.swift": "import Foundation\nlet d = NSUserDefaults.standard\n" },
  },
  {
    ruleId: "apple-required-reason-apis",
    label: "clean",
    note: "iOS app that uses no required-reason APIs",
    files: { ...IOS, "ios/View.swift": 'import SwiftUI\nstruct V: View { var body: some View { Text("ok") } }\n' },
  },
  {
    ruleId: "apple-sdk-manifests",
    label: "vulnerable",
    note: "Firebase SDK referenced in an iOS app",
    files: { ...IOS, "ios/Podfile": "pod 'Firebase/Analytics'\npod 'firebase-crashlytics'\n" },
  },
  {
    ruleId: "apple-sdk-manifests",
    label: "clean",
    note: "iOS app with no third-party privacy-impacting SDKs",
    files: { ...IOS, "ios/Podfile": "# no third-party SDKs\n" },
  },
  {
    ruleId: "apple-privacy-labels-match",
    label: "manual",
    note: "App Store Connect labels cannot be verified from source",
    files: { ...IOS, "ios/App.swift": "import SwiftUI\n" },
  },

  // ─── Google Play (needs Android context) ────────────────────────────
  {
    ruleId: "play-data-safety-form",
    label: "vulnerable",
    note: "Android location permission declared, no data-safety declaration",
    files: {
      ...ANDROID,
      "android/app/src/main/AndroidManifest.xml":
        '<manifest>\n  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n</manifest>\n',
    },
  },
  {
    ruleId: "play-data-safety-form",
    label: "clean",
    note: "data-safety declaration present",
    files: {
      ...ANDROID,
      "android/data_safety.json":
        '{ "collectedData": [], "sharedData": [], "securityPractices": { "encryptionInTransit": true } }\n',
    },
  },
  {
    ruleId: "play-encrypted-in-transit",
    label: "vulnerable",
    note: "cleartext http:// endpoint in Android app",
    files: { ...ANDROID, "android/app/src/Api.kt": 'val url = "http://api.example.com/users"\n' },
  },
  {
    ruleId: "play-encrypted-in-transit",
    label: "clean",
    note: "https-only + cleartext disabled",
    files: {
      ...ANDROID,
      "android/app/src/Api.kt": 'val url = "https://api.example.com/users"\n',
      "android/app/src/main/AndroidManifest.xml": '<application android:usesCleartextTraffic="false" />\n',
    },
  },
  {
    ruleId: "play-deletion-url",
    label: "vulnerable",
    note: "no account-deletion URL",
    files: { ...ANDROID, "android/app/src/Main.kt": "class MainActivity {}\n" },
  },
  {
    ruleId: "play-deletion-url",
    label: "clean",
    note: "account deletion endpoint present",
    files: { ...ANDROID, "server/routes.ts": "app.get('/privacy/delete-data', deletionHandler);\n" },
  },
  {
    ruleId: "play-sdk-disclosure",
    label: "vulnerable",
    note: "analytics SDK in an Android app",
    files: {
      ...ANDROID,
      "android/app/build.gradle":
        "android { namespace 'com.acme' }\ndependencies {\n  implementation 'com.google.firebase:firebase-analytics'\n}\n",
    },
  },
  {
    ruleId: "play-sdk-disclosure",
    label: "clean",
    note: "Android app with no data-collecting SDKs",
    files: {
      ...ANDROID,
      "android/app/build.gradle":
        "android { namespace 'com.acme' }\ndependencies {\n  implementation 'androidx.core:core-ktx'\n}\n",
    },
  },
  {
    ruleId: "play-privacy-policy-consistency",
    label: "manual",
    note: "Play Console listing vs policy needs the live listing",
    files: { ...ANDROID, "android/privacy.md": "# Privacy Policy\nContact us with any privacy questions.\n" },
  },

  // ─── EU AI Act (needs an AI system to be applicable) ────────────────
  {
    ruleId: "eu-ai-tamper-evident-logs",
    label: "vulnerable",
    note: "AI system with no tamper-evident logging",
    files: {
      ...AI,
      "src/infer.ts": "export async function infer(p) {\n  return client.chat.completions.create(p);\n}\n",
    },
  },
  {
    ruleId: "eu-ai-tamper-evident-logs",
    label: "clean",
    note: "HMAC-chained logs, retention, and required events",
    files: {
      ...AI,
      "src/audit.ts":
        "import { createHmac } from 'node:crypto';\n// log retention: 6 months minimum per Article 19\nfunction log(prev, e) {\n  const inferenceLog = e;\n  const modelDeploy = e;\n  const accessLog = e;\n  return createHmac('sha256', KEY).update(prev + JSON.stringify(e)).digest('hex');\n}\n",
    },
  },
  {
    ruleId: "eu-ai-human-oversight",
    label: "vulnerable",
    note: "autonomous AI loop, no human override",
    files: {
      ...AI,
      "src/agent.ts": "while (true) {\n  const action = await model.decide();\n  await execute(action);\n}\n",
    },
  },
  {
    ruleId: "eu-ai-human-oversight",
    label: "clean",
    note: "override + explainability + role-based access (Article 14 requires all three)",
    files: {
      ...AI,
      "src/agent.ts":
        "// role-based access control: only ai_reviewer may override\nasync function step() {\n  const action = await model.decide();\n  const confidenceScore = action.confidence; // explainability surface\n  const approved = await requireHumanApproval(action); // override / human-in-the-loop\n  if (approved && !killSwitch.engaged) await execute(action);\n}\n",
    },
  },
  {
    // Absence of a risk register in the repo can't be a hard fail — it may live in Confluence,
    // etc. The scanner returns manual_review (verify externally), which this fixture asserts.
    ruleId: "eu-ai-risk-management",
    label: "manual",
    note: "AI system, no in-repo risk register → manual_review",
    files: { ...AI, "src/run.ts": "export const run = () => model.generate();\n" },
  },
  {
    ruleId: "eu-ai-risk-management",
    label: "clean",
    note: "risk assessment/register present in repo → pass",
    files: {
      ...AI,
      "docs/RISK_ASSESSMENT.md": "# Risk Management\nRisk register and mitigation matrix for the AI system.\n",
    },
  },
  {
    ruleId: "eu-ai-technical-documentation",
    label: "manual",
    note: "AI system, no in-repo model docs → manual_review",
    files: { ...AI, "src/run.ts": "export const run = () => model.generate();\n" },
  },
  {
    ruleId: "eu-ai-technical-documentation",
    label: "clean",
    note: "model card / technical docs present → pass",
    files: { ...AI, "docs/MODEL_CARD.md": "# Model Card\nModel version, training data, and dataset card.\n" },
  },
  {
    ruleId: "eu-ai-accuracy-robustness",
    label: "vulnerable",
    note: "AI system, no adversarial defenses",
    files: { ...AI, "src/run.ts": "export const run = (input) => model.generate(input);\n" },
  },
  {
    ruleId: "eu-ai-accuracy-robustness",
    label: "clean",
    note: "input sanitization + output filtering + red-team tests",
    files: {
      ...AI,
      "src/guard.ts":
        "export function sanitizeInput(s) { return s.replace(/<script>/gi, ''); }\nexport function filterOutput(o) { /* prompt-injection output filter */ return o; }\n// red-team / adversarial robustness test suite\n",
    },
  },
];
