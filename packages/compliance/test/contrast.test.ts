import { describe, it, expect } from "vitest";
import {
  parseColor,
  relativeLuminance,
  contrastRatio,
  ratioFromCss,
  suggestAccessibleColor,
  meetsContrast,
  THRESHOLDS,
  toHex,
} from "../src/contrast.js";

describe("colour parsing", () => {
  it("parses 6-digit hex", () => {
    expect(parseColor("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
  });
  it("parses 3-digit shorthand hex", () => {
    expect(parseColor("#f00")).toEqual({ r: 255, g: 0, b: 0 });
  });
  it("parses rgb() and rgba()", () => {
    expect(parseColor("rgb(18, 52, 86)")).toEqual({ r: 18, g: 52, b: 86 });
    expect(parseColor("rgba(18, 52, 86, 0.5)")).toEqual({ r: 18, g: 52, b: 86 });
  });
  it("parses the white/black keywords", () => {
    expect(parseColor("white")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor("black")).toEqual({ r: 0, g: 0, b: 0 });
  });
  it("returns null for values it cannot resolve (never guesses)", () => {
    expect(parseColor("var(--brand)")).toBeNull();
    expect(parseColor("currentColor")).toBeNull();
    expect(parseColor("transparent")).toBeNull();
  });
});

describe("WCAG relative luminance + contrast ratio", () => {
  it("matches the WCAG reference values for black and white", () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
  });

  it("black on white is exactly 21:1 (the maximum)", () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 2);
  });

  it("a colour against itself is 1:1", () => {
    expect(contrastRatio({ r: 120, g: 30, b: 200 }, { r: 120, g: 30, b: 200 })).toBeCloseTo(1, 5);
  });

  it("is symmetric regardless of argument order", () => {
    const a = { r: 10, g: 80, b: 200 };
    const b = { r: 240, g: 240, b: 240 };
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });

  it("computes the known #767676-on-white boundary (~4.54:1)", () => {
    // #767676 is the canonical lightest grey that still passes 4.5:1 on white.
    const ratio = ratioFromCss("#767676", "#ffffff")!;
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(ratio).toBeLessThan(4.7);
  });

  it("flags a genuinely low-contrast pair", () => {
    // Light grey on white — a real failure.
    expect(ratioFromCss("#cccccc", "#ffffff")!).toBeLessThan(4.5);
  });

  it("does NOT flag a dark colour merely because its hex starts high", () => {
    // Regression: the previous regex heuristic flagged #8B0000 (dark red) as "light".
    const ratio = ratioFromCss("#8B0000", "#ffffff")!;
    expect(ratio).toBeGreaterThan(4.5);
    expect(meetsContrast("#8B0000", "#ffffff")).toBe(true);
  });

  it("returns null (undetermined) rather than a verdict when a colour is unresolvable", () => {
    expect(ratioFromCss("var(--fg)", "#ffffff")).toBeNull();
    expect(meetsContrast("var(--fg)", "#ffffff")).toBeNull();
  });
});

describe("accessible colour suggestion", () => {
  it("returns a colour that actually meets the threshold on a light background", () => {
    const suggested = suggestAccessibleColor("#cccccc", "#ffffff")!;
    expect(ratioFromCss(suggested, "#ffffff")!).toBeGreaterThanOrEqual(THRESHOLDS.normalText.required);
  });

  it("returns a colour that meets the threshold on a dark background", () => {
    const suggested = suggestAccessibleColor("#333333", "#000000")!;
    expect(ratioFromCss(suggested, "#000000")!).toBeGreaterThanOrEqual(THRESHOLDS.normalText.required);
  });

  it("leaves an already-passing colour unchanged", () => {
    expect(suggestAccessibleColor("#000000", "#ffffff")).toBe("#000000");
  });

  it("honours the lower 3:1 non-text threshold", () => {
    const suggested = suggestAccessibleColor("#d0d0d0", "#ffffff", THRESHOLDS.nonText)!;
    expect(ratioFromCss(suggested, "#ffffff")!).toBeGreaterThanOrEqual(3);
  });
});

describe("toHex", () => {
  it("round-trips and clamps out-of-range channels", () => {
    expect(toHex({ r: 255, g: 0, b: 16 })).toBe("#ff0010");
    expect(toHex({ r: 300, g: -20, b: 0 })).toBe("#ff0000");
  });
});
