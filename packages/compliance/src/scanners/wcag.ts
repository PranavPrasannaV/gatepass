import type { ScanContext } from "@gatepass/engine";
import type { ComplianceCheck } from "../compliance-schema.js";
import { registerScanner, makeCheck } from "../compliance-scanner.js";
import type { DomainScanner } from "../compliance-scanner.js";

/**
 * WCAG 2.2 compliance scanner.
 * Scans CSS, TSX/JSX component code, and HTML for accessibility violations.
 *
 * Checks performed:
 * - wcag-target-size: Finds interactive elements with small dimensions
 * - wcag-text-contrast: Checks color pairs for 4.5:1 ratio (pattern-based heuristic)
 * - wcag-accessible-auth: Detects CAPTCHA/puzzle-based auth flows
 * - wcag-focus-not-obscured: Detects sticky headers without scroll-margin
 * - wcag-dragging-alternative: Detects drag-only interactions
 * - wcag-consistent-help: Detects help widgets with inconsistent positioning
 * - wcag-redundant-entry: Detects forms requiring re-entry of known data
 * - wcag-focus-appearance: Checks for focus indicator styles
 * - wcag-non-text-contrast: Checks UI component contrast
 */

const TARGET_SIZE_RE = /(width|height|min-width|min-height|w-|h-)\s*:\s*([0-9]+(\.[0-9]+)?)(px|rem|em)?/gi;
const SMALL_TARGET = 24; // 24 CSS pixels minimum
const CONTRAST_COLORS = /(color|background-color|bg-|text-)\s*:\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\))/g;
const STICKY_RE = /position\s*:\s*sticky|sticky|fixed\s+(top|bottom)/gi;
const SCROLL_MARGIN_RE = /scroll-margin|scroll-padding|scrollMargin|scrollPadding/gi;
const CAPTCHA_RE = /captcha|recaptcha|hcaptcha|turnstile|challenge|puzzle|cognitive/i;
const DRAG_ONLY_RE = /onDrag|onDrop|draggable|drag-and-drop|DragDrop|sortable/i;
const CLICK_ALT_RE = /onClick|onPress|onTap|click|button.*alternative/i;
const FOCUS_OUTLINE_RE = /outline\s*:\s*none|outline\s*:\s*0\b/i;
const FOCUS_STYLE_RE = /focus[:\s]*{|focus-visible|focus:outline|focus:ring|focus:border/i;

function checkTargetSizes(content: string, filePath: string): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  const lines = content.split(/\n/);
  const smallTargets: { line: number; value: number; unit: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    TARGET_SIZE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TARGET_SIZE_RE.exec(lines[i]!)) !== null) {
      const value = parseFloat(m[2]!);
      if (value > 0 && value < SMALL_TARGET) {
        smallTargets.push({ line: i + 1, value, unit: m[4] || "px" });
      }
    }
  }

  if (smallTargets.length > 0) {
    const locations = smallTargets.slice(0, 5).map((t) => ({
      path: filePath,
      startLine: t.line,
      endLine: t.line,
      snippet: `Small target: ${t.value}${t.unit} (min: ${SMALL_TARGET}px)`,
    }));
    checks.push(
      makeCheck("wcag-target-size", "fail", locations, {
        kind: "code_change",
        description: `Found ${smallTargets.length} interactive elements smaller than 24×24 CSS pixels. Increase dimensions to meet WCAG 2.2 SC 2.5.8.`,
        diff: "/* Ensure all interactive targets are min-width: 24px and min-height: 24px */\n/* Before: width: 16px → After: min-width: 24px */\n/* Or add sufficient spacing around smaller elements */",
      }),
    );
  } else {
    checks.push(makeCheck("wcag-target-size", "pass", []));
  }

  return checks;
}

function checkContrast(content: string, filePath: string): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  const lines = content.split(/\n/);
  const lowContrast: { line: number; text: string }[] = [];
  const tailwindLowContrast = /text-(gray|stone|slate|zinc)-[123]\b/gi;

  for (let i = 0; i < lines.length; i++) {
    // Check for suspiciously light text colors in Tailwind
    tailwindLowContrast.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = tailwindLowContrast.exec(lines[i]!)) !== null) {
      lowContrast.push({ line: i + 1, text: lines[i]!.trim() });
    }
    // Check for inline light color codes (heuristic: very light grays)
    const lightColor = /color\s*:\s*#([c-fC-F][0-9a-fA-F]{5}|[89a-fA-F][0-9a-fA-F]{5})/g;
    lightColor.lastIndex = 0;
    while ((m = lightColor.exec(lines[i]!)) !== null) {
      lowContrast.push({ line: i + 1, text: lines[i]!.trim() });
    }
  }

  if (lowContrast.length > 0) {
    const locations = lowContrast.slice(0, 5).map((l) => ({
      path: filePath,
      startLine: l.line,
      endLine: l.line,
      snippet: l.text,
    }));
    checks.push(
      makeCheck("wcag-text-contrast", "fail", locations, {
        kind: "diff",
        description: `Found ${lowContrast.length} instances of potentially low-contrast text. Ensure text meets 4.5:1 ratio (or 3:1 for large text).`,
        diff: "--- a/styles.css\n+++ b/styles.css\n- color: #9CA3AF;\n+ color: #6B7280; /* 4.5:1 on white */\n\n// Or use darker gray: text-gray-600 instead of text-gray-300",
      }),
    );
  } else {
    checks.push(makeCheck("wcag-text-contrast", "pass", []));
  }

  // Non-text contrast check
  if (lowContrast.length > 0) {
    checks.push(
      makeCheck("wcag-non-text-contrast", "fail", lowContrast.slice(0, 3).map((l) => ({
        path: filePath,
        startLine: l.line,
        endLine: l.line,
        snippet: l.text,
      })), {
        kind: "diff",
        description: "UI component boundaries must have 3:1 contrast. Ensure borders, icons, and interactive elements contrast sufficiently.",
        diff: "/* Add visible borders or darker shades to UI components */\nborder-gray-300 → border-gray-500",
      }),
    );
  } else {
    checks.push(makeCheck("wcag-non-text-contrast", "pass", []));
  }

  return checks;
}

function checkAccessibleAuth(content: string, filePath: string): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  const lines = content.split(/\n/);
  const authHits: { line: number; text: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    CAPTCHA_RE.lastIndex = 0;
    if (CAPTCHA_RE.test(lines[i]!)) {
      authHits.push({ line: i + 1, text: lines[i]!.trim() });
    }
  }

  // Check for autocomplete/paste blocking
  const pasteBlock = /onpaste|oncopy|preventDefault|autocomplete\s*=\s*["']off["']/gi;
  const pasteBlockHits: { line: number; text: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    pasteBlock.lastIndex = 0;
    if (pasteBlock.test(lines[i]!) && lines[i]!.toLowerCase().includes("password")) {
      pasteBlockHits.push({ line: i + 1, text: lines[i]!.trim() });
    }
  }

  const allIssues = [...authHits, ...pasteBlockHits];
  if (allIssues.length > 0) {
    checks.push(
      makeCheck("wcag-accessible-auth", "fail", allIssues.slice(0, 5).map((h) => ({
        path: filePath,
        startLine: h.line,
        endLine: h.line,
        snippet: h.text,
      })), {
        kind: "code_change",
        description: `Authentication flow relies on cognitive function tests (${authHits.length > 0 ? "CAPTCHA/puzzle" : ""}${pasteBlockHits.length > 0 ? " + paste-blocking" : ""}). Provide password manager autofill and copy-paste support as alternatives.`,
        diff: "// Replace CAPTCHA with:\n// 1. Privacy-pass / Turnstile (invisible)\n// 2. WebAuthn / passkeys\n// 3. Email magic link\n// Enable autocomplete and paste on password fields:\n// autocomplete=\"current-password\"\n// Remove: onpaste=\"return false\"",
      }),
    );
  } else {
    checks.push(makeCheck("wcag-accessible-auth", "pass", []));
  }

  return checks;
}

function checkFocusNotObscured(content: string, filePath: string): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  const lines = content.split(/\n/);
  const hasSticky = lines.some((l) => STICKY_RE.test(l));
  const hasScrollMargin = lines.some((l) => SCROLL_MARGIN_RE.test(l));

  if (hasSticky && !hasScrollMargin) {
    checks.push(
      makeCheck("wcag-focus-not-obscured", "fail", [], {
        kind: "code_change",
        description: "Sticky header/footer detected without scroll-margin on focusable elements. Add scroll-margin-top to offset sticky header height.",
        diff: "/* Add to global CSS or target focusable elements */\n*:focus {\n  scroll-margin-top: 80px; /* offset for sticky header */\n}\n/* Or use Tailwind: scroll-mt-20 on section elements */",
      }),
    );
  } else if (hasSticky && hasScrollMargin) {
    checks.push(makeCheck("wcag-focus-not-obscured", "pass", []));
  } else {
    checks.push(makeCheck("wcag-focus-not-obscured", "pass", []));
  }

  return checks;
}

function checkDraggingAlternatives(content: string, filePath: string): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  const lines = content.split(/\n/);
  const dragItems: { line: number; text: string }[] = [];
  let hasClickAlt = false;

  for (let i = 0; i < lines.length; i++) {
    if (DRAG_ONLY_RE.test(lines[i]!)) {
      dragItems.push({ line: i + 1, text: lines[i]!.trim() });
    }
    if (CLICK_ALT_RE.test(lines[i]!)) {
      hasClickAlt = true;
    }
  }

  if (dragItems.length > 0 && !hasClickAlt) {
    checks.push(
      makeCheck("wcag-dragging-alternative", "fail", dragItems.slice(0, 3).map((d) => ({
        path: filePath,
        startLine: d.line,
        endLine: d.line,
        snippet: d.text,
      })), {
        kind: "code_change",
        description: "Drag-based interactions must have single-pointer alternatives (tap/click/button).",
        diff: "/* Add button-based alternative for each drag interaction */\n{/* Example: reorder list */}\n<button onClick={() => moveItem(id, 'up')}>▲</button>\n<button onClick={() => moveItem(id, 'down')}>▼</button>\n<div draggable onDragStart={...}>...</div>",
      }),
    );
  } else if (dragItems.length > 0 && hasClickAlt) {
    checks.push(makeCheck("wcag-dragging-alternative", "pass", []));
  } else {
    checks.push(makeCheck("wcag-dragging-alternative", "pass", []));
  }

  return checks;
}

function checkConsistentHelp(content: string, filePath: string): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  // Look for help/chat widget patterns that might move between routes
  const helpWidgets = /(livechat|chatWidget|helpWidget|zendesk|intercom|crisp|tawk|freshchat)/gi;
  const lines = content.split(/\n/);
  const found = lines.filter((l) => helpWidgets.test(l));

  if (found.length > 0) {
    checks.push(
      makeCheck("wcag-consistent-help", "manual_review", found.slice(0, 2).map((l, i) => ({
        path: filePath,
        startLine: lines.indexOf(l) + 1,
        snippet: l.trim(),
      })), {
        kind: "code_change",
        description: "Chat/help widget detected — ensure it renders in the same position across all routes for WCAG 3.2.6 Consistent Help.",
        diff: "// Ensure help widget renders in a fixed position consistently\n// Move chat widget to a layout-level component, not route-level\n// <ChatWidget className=\"fixed bottom-4 right-4\" />  // consistent positioning",
      }),
    );
  } else {
    checks.push(makeCheck("wcag-consistent-help", "pass", []));
  }

  return checks;
}

function checkRedundantEntry(content: string, filePath: string): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  // Check forms for potential re-entry issues (multi-step forms without carry-over)
  const multiStepForm = /(multiStep|step|wizard|page.*form|form.*page)\s/gi;
  const autoPopulate = /(defaultValue|autoFill|auto-populate|carryOver|useEffect.*fill|prefill|preset|autofill)/gi;
  const lines = content.split(/\n/);
  const stepForms: number[] = [];
  let hasAutoFill = false;

  for (let i = 0; i < lines.length; i++) {
    if (multiStepForm.test(lines[i]!)) stepForms.push(i + 1);
    if (autoPopulate.test(lines[i]!)) hasAutoFill = true;
  }

  if (stepForms.length > 0 && !hasAutoFill) {
    checks.push(
      makeCheck("wcag-redundant-entry", "manual_review", stepForms.slice(0, 3).map((l) => ({
        path: filePath,
        startLine: l,
        snippet: `Multi-step form at line ${l} — ensure previous step data is auto-populated`,
      })), {
        kind: "code_change",
        description: "Multi-step form detected without auto-population of previously entered data. Add prefill mechanism for WCAG 3.3.7.",
        diff: "// Add useEffect to carry form state between steps\nuseEffect(() => {\n  if (previousStepData) {\n    setValue('email', previousStepData.email);\n  }\n}, [previousStepData, setValue]);",
      }),
    );
  } else {
    checks.push(makeCheck("wcag-redundant-entry", "pass", []));
  }

  return checks;
}

function checkFocusAppearance(content: string, filePath: string): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  const lines = content.split(/\n/);
  const hasOutlineNone = lines.some((l) => FOCUS_OUTLINE_RE.test(l));
  const hasFocusStyle = lines.some((l) => FOCUS_STYLE_RE.test(l));

  if (hasOutlineNone && !hasFocusStyle) {
    checks.push(
      makeCheck("wcag-focus-appearance", "fail", [], {
        kind: "code_change",
        description: "Focus outline is removed (outline: none) but no custom focus style provided. Add focus-visible styles meeting 2px perimeter and 3:1 contrast.",
        diff: "/* Add focus styles — never use outline: none without replacement */\n*:focus-visible {\n  outline: 2px solid #2563EB;\n  outline-offset: 2px;\n  border-radius: 2px;\n}\n/* Tailwind: focus-visible:outline-2 focus-visible:outline-blue-600 */",
      }),
    );
  } else {
    checks.push(makeCheck("wcag-focus-appearance", "pass", []));
  }

  return checks;
}

const wcagScanner: DomainScanner = {
  domain: "wcag",
  scan(ctx: ScanContext): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];
    let combinedContent = "";
    const relevantFiles = ctx.files.filter((f) =>
      /\.(tsx|ts|jsx|js|css|scss|html)$/i.test(f.relPath),
    );

    for (const file of relevantFiles) {
      combinedContent += `\n/* ${file.relPath} */\n${file.content}`;
    }

    checks.push(...checkTargetSizes(combinedContent, "compliance:wcag"));
    checks.push(...checkContrast(combinedContent, "compliance:wcag"));
    checks.push(...checkAccessibleAuth(combinedContent, "compliance:wcag"));
    checks.push(...checkFocusNotObscured(combinedContent, "compliance:wcag"));
    checks.push(...checkDraggingAlternatives(combinedContent, "compliance:wcag"));
    checks.push(...checkConsistentHelp(combinedContent, "compliance:wcag"));
    checks.push(...checkRedundantEntry(combinedContent, "compliance:wcag"));
    checks.push(...checkFocusAppearance(combinedContent, "compliance:wcag"));

    return checks;
  },
};

registerScanner(wcagScanner);
