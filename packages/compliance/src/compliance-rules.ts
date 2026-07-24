import type { ComplianceRule } from "./compliance-schema.js";

/**
 * Canonical compliance rule definitions, sourced from 2026 research:
 * - WCAG 2.2 (W3C Recommendation, Dec 2024)
 * - CCPA/CPRA (California AG enforcement, GPC mandate Jan 2026)
 * - Apple App Store (PrivacyInfo.xcprivacy enforcement since May 2024, SDK signing 2025)
 * - Google Play Store (Data Safety form, Android ID reclassification Apr 2025)
 * - EU AI Act (Article 12+14 enforcement Aug 2, 2026)
 */

export const COMPLIANCE_RULES: ComplianceRule[] = [
  // ────────────────────────────────────────────
  // WCAG 2.2 (Level AA)
  // ────────────────────────────────────────────
  {
    id: "wcag-target-size",
    domain: "wcag",
    title: "Pointer targets must be at least 24×24 CSS pixels",
    description:
      "WCAG 2.2 SC 2.5.8 (AA): Interactive pointer targets must have a minimum size of 24 by 24 CSS pixels, with exceptions for inline links, user-agent controls, and essential cases.",
    severity: "warning",
    standard: "WCAG 2.2 AA 2.5.8",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "wcag-text-contrast",
    domain: "wcag",
    title: "Text contrast ratio must be at least 4.5:1",
    description:
      "WCAG 2.2 SC 1.4.3 (AA): Body text must have a contrast ratio of at least 4.5:1 against its background. Large text (18pt or 14pt bold) requires 3:1.",
    severity: "critical",
    standard: "WCAG 2.2 AA 1.4.3",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "wcag-non-text-contrast",
    domain: "wcag",
    title: "UI component boundaries and graphical objects must have 3:1 contrast",
    description:
      "WCAG 2.2 SC 1.4.11 (AA): User interface components and graphical objects must maintain a 3:1 contrast ratio against adjacent colors.",
    severity: "warning",
    standard: "WCAG 2.2 AA 1.4.11",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "wcag-accessible-auth",
    domain: "wcag",
    title: "Authentication must not rely on cognitive function tests",
    description:
      "WCAG 2.2 SC 3.3.8 (AA): No step of an authentication flow may require a cognitive function test (memorizing a password, transcribing a code, solving a puzzle) unless an alternative exists. Password manager autofill and copy-paste support are compliant mechanisms.",
    severity: "critical",
    standard: "WCAG 2.2 AA 3.3.8",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "wcag-focus-not-obscured",
    domain: "wcag",
    title: "Keyboard focus must not be fully obscured",
    description:
      "WCAG 2.2 SC 2.4.11 (AA): When a UI component receives keyboard focus, it must not be entirely hidden by author-created content such as sticky headers or footers.",
    severity: "warning",
    standard: "WCAG 2.2 AA 2.4.11",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "wcag-dragging-alternative",
    domain: "wcag",
    title: "Dragging movements must have a single-pointer alternative",
    description:
      "WCAG 2.2 SC 2.5.7 (AA): Any function that uses dragging must have a single-pointer alternative (tap, click, or button) unless dragging is essential.",
    severity: "warning",
    standard: "WCAG 2.2 AA 2.5.7",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "wcag-consistent-help",
    domain: "wcag",
    title: "Help mechanisms must be in consistent location",
    description:
      "WCAG 2.2 SC 3.2.6 (A): When a help mechanism is repeated across pages, it must occur in the same relative order. Sticky chat widgets that move between routes fail this criterion.",
    severity: "info",
    standard: "WCAG 2.2 A 3.2.6",
    scannable: false,
    baselineVersion: "2026.1",
  },
  {
    id: "wcag-redundant-entry",
    domain: "wcag",
    title: "Previously entered information must be auto-populated",
    description:
      "WCAG 2.2 SC 3.3.7 (A): Within a single process, information the user already provided must be auto-populated or selectable. Browser autofill alone does not satisfy this.",
    severity: "info",
    standard: "WCAG 2.2 A 3.3.7",
    scannable: false,
    baselineVersion: "2026.1",
  },
  {
    id: "wcag-focus-appearance",
    domain: "wcag",
    title: "Focus indicator must be at least 2px thick with 3:1 contrast",
    description:
      "WCAG 2.2 SC 2.4.13 (AAA): The focus indicator must cover an area at least as large as a 2 CSS pixel thick perimeter and have a 3:1 contrast ratio against the unfocused state.",
    severity: "info",
    standard: "WCAG 2.2 AAA 2.4.13",
    scannable: true,
    baselineVersion: "2026.1",
  },

  // ────────────────────────────────────────────
  // CCPA / CPRA
  // ────────────────────────────────────────────
  {
    id: "ccpa-gpc-signal",
    domain: "ccpa",
    title: "Global Privacy Control (GPC) signal must be detected and honored",
    description:
      "CCPA/CPRA: Businesses must treat the GPC signal (Sec-GPC HTTP header or navigator.globalPrivacyControl) as a valid opt-out of sale/sharing of personal information. Effective January 1, 2026: visible confirmation required when GPC is processed.",
    severity: "critical",
    standard: "CCPA §1798.120 / CPRA §1798.185",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "ccpa-well-known-gpc",
    domain: "ccpa",
    title: "GPC .well-known/gpc.json must be present",
    description:
      "The GPC specification requires hosting a JSON file at /.well-known/gpc.json declaring the site supports and honors the Global Privacy Control signal.",
    severity: "warning",
    standard: "GPC Spec / CCPA",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "ccpa-do-not-sell-link",
    domain: "ccpa",
    title: '"Do Not Sell or Share" link must be present',
    description:
      "CCPA/CPRA requires businesses to provide a clear 'Do Not Sell or Share My Personal Information' link on their website homepage and mobile app.",
    severity: "critical",
    standard: "CCPA §1798.135",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "ccpa-dsar-workflow",
    domain: "ccpa",
    title: "DSAR deletion workflow must be implemented",
    description:
      "CCPA/CPRA: Consumers have the right to request deletion of their personal information. Businesses must have a mechanism to receive and process deletion requests across all systems, including downstream service providers.",
    severity: "critical",
    standard: "CCPA §1798.105 / CPRA",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "ccpa-privacy-policy",
    domain: "ccpa",
    title: "Privacy policy must be publicly accessible and current",
    description:
      "CCPA/CPRA requires a publicly accessible privacy policy that discloses categories of personal information collected, sources, business purposes, and categories of third parties with whom data is shared.",
    severity: "warning",
    standard: "CCPA §1798.130",
    scannable: true,
    baselineVersion: "2026.1",
  },

  // ────────────────────────────────────────────
  // Apple App Store
  // ────────────────────────────────────────────
  {
    id: "apple-privacy-manifest",
    domain: "app_store",
    title: "PrivacyInfo.xcprivacy manifest must be bundled",
    description:
      "Apple requires a PrivacyInfo.xcprivacy property list file in every app bundle declaring NSPrivacyTracking, NSPrivacyTrackingDomains, NSPrivacyCollectedDataTypes, and NSPrivacyAccessedAPITypes. Without it, App Store Connect rejects uploads (ITMS-91053).",
    severity: "critical",
    standard: "Apple Developer — Privacy manifest files",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "apple-required-reason-apis",
    domain: "app_store",
    title: "Required Reason API usage must be declared in manifest",
    description:
      "Apps using any of the five Required Reason API categories (FileTimestamp, SystemBootTime, DiskSpace, ActiveKeyboards, UserDefaults) must declare them in PrivacyInfo.xcprivacy with approved reason codes. Undeclared usage triggers ITMS-91053 rejection.",
    severity: "critical",
    standard: "Apple Developer — Required Reason API",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "apple-sdk-manifests",
    domain: "app_store",
    title: "Third-party SDKs must include their own privacy manifests",
    description:
      "SDKs listed in Apple's commonly-used list must ship their own PrivacyInfo.xcprivacy and, when used as binary dependencies, be signed. Missing SDK manifests cause upload rejection.",
    severity: "warning",
    standard: "Apple — Third-party SDK requirements",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "apple-privacy-labels-match",
    domain: "app_store",
    title: "App Store privacy nutrition labels must match manifest",
    description:
      "The App Privacy nutrition labels in App Store Connect must be consistent with the PrivacyInfo.xcprivacy manifest. A mismatch (e.g., label says 'Data Not Collected' while manifest declares collection) is a 5.1.1 rejection.",
    severity: "critical",
    standard: "Apple App Review — 5.1.1",
    scannable: false,
    baselineVersion: "2026.1",
  },

  // ────────────────────────────────────────────
  // Google Play Store
  // ────────────────────────────────────────────
  {
    id: "play-data-safety-form",
    domain: "google_play",
    title: "Data Safety form must be completed in Play Console",
    description:
      "Every app on Google Play must complete the Data Safety form declaring data collection across 14 categories (Location, Personal info, Financial, Health, Messages, Photos, Audio, Files, Calendar, App activity, Web browsing, App performance, Device IDs). Incomplete forms block publishing.",
    severity: "critical",
    standard: "Google Play — Data Safety requirements",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "play-encrypted-in-transit",
    domain: "google_play",
    title: "All user data must be encrypted in transit",
    description:
      "Google Play requires that all user data collected by the app (including SDK network calls) be encrypted in transit via HTTPS/TLS. A single plaintext endpoint invalidates the declaration.",
    severity: "critical",
    standard: "Google Play — Data Safety",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "play-deletion-url",
    domain: "google_play",
    title: "Data deletion mechanism must be provided",
    description:
      "Google Play requires a publicly accessible HTTPS URL where users can request data deletion, even if they have uninstalled the app. The URL must describe what gets deleted, what is retained, and processing time.",
    severity: "critical",
    standard: "Google Play — Deletion requirements",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "play-sdk-disclosure",
    domain: "google_play",
    title: "Third-party SDK data collection must be declared",
    description:
      "All third-party SDKs (analytics, ads, crash reporting) count toward the app's data collection. Each SDK's data collection must be reflected in the Data Safety form. Android ID is explicitly classified as 'Device or other IDs'.",
    severity: "warning",
    standard: "Google Play — SDK requirements",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "play-privacy-policy-consistency",
    domain: "google_play",
    title: "Privacy policy must match Data Safety declarations",
    description:
      "Google reviewers cross-check the Data Safety form against the privacy policy. Mismatches (e.g., form declares Location but policy doesn't mention it) trigger review flags and rejection.",
    severity: "warning",
    standard: "Google Play — Policy consistency",
    scannable: false,
    baselineVersion: "2026.1",
  },

  // ────────────────────────────────────────────
  // EU AI Act
  // ────────────────────────────────────────────
  {
    id: "eu-ai-tamper-evident-logs",
    domain: "eu_ai_act",
    title: "AI system must maintain tamper-evident audit logs",
    description:
      "EU AI Act Article 12: High-risk AI systems must automatically record events over their lifetime. Logs must be tamper-evident (HMAC-SHA256 cryptographic chains), retained at least 6 months (Article 19), and support post-market monitoring. Enforcement: August 2, 2026.",
    severity: "critical",
    standard: "EU AI Act Art. 12, Art. 19",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "eu-ai-human-oversight",
    domain: "eu_ai_act",
    title: "Human oversight mechanisms must be implemented",
    description:
      "EU AI Act Article 14: High-risk AI systems must enable human oversight via: interpretability surface, confidence-threshold review triggers, override/rejection path, emergency stop mechanism, and role-based access control for oversight functions.",
    severity: "critical",
    standard: "EU AI Act Art. 14",
    scannable: true,
    baselineVersion: "2026.1",
  },
  {
    id: "eu-ai-risk-management",
    domain: "eu_ai_act",
    title: "Continuous risk management process must be in place",
    description:
      "EU AI Act Article 9: Providers must establish a continuous, iterative risk management process throughout the system lifecycle, with a living risk register documenting identified risks and mitigation strategies.",
    severity: "warning",
    standard: "EU AI Act Art. 9",
    scannable: false,
    baselineVersion: "2026.1",
  },
  {
    id: "eu-ai-technical-documentation",
    domain: "eu_ai_act",
    title: "Technical documentation (Annex IV) must be maintained",
    description:
      "EU AI Act Article 11: Providers must maintain comprehensive technical documentation per Annex IV, including system design, development methodology, training data, performance metrics, and logging specifications.",
    severity: "warning",
    standard: "EU AI Act Art. 11, Annex IV",
    scannable: false,
    baselineVersion: "2026.1",
  },
  {
    id: "eu-ai-accuracy-robustness",
    domain: "eu_ai_act",
    title: "Accuracy, robustness, and cybersecurity measures must be documented",
    description:
      "EU AI Act Article 15: Systems must achieve appropriate accuracy and robustness. Measures against adversarial manipulation, model poisoning, and prompt injection must be implemented and documented.",
    severity: "warning",
    standard: "EU AI Act Art. 15",
    scannable: true,
    baselineVersion: "2026.1",
  },
];

/** Look up a rule by ID */
export function getRuleById(id: string): ComplianceRule | undefined {
  return COMPLIANCE_RULES.find((r) => r.id === id);
}

/** Get all rules for a given domain */
export function getRulesByDomain(domain: string): ComplianceRule[] {
  return COMPLIANCE_RULES.filter((r) => r.domain === domain);
}

/** Get all scannable rules */
export function getScannableRules(): ComplianceRule[] {
  return COMPLIANCE_RULES.filter((r) => r.scannable);
}
