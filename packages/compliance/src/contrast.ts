/**
 * WCAG contrast computation (SC 1.4.3 / 1.4.11).
 *
 * The previous WCAG scanner claimed to enforce a 4.5:1 text-contrast ratio but never computed
 * one — it regex-matched "light looking" hex values, which both misses real failures and
 * flags dark colors like #8B0000. This module computes the actual ratio from the WCAG
 * relative-luminance formula so a `fail` means the pair genuinely falls below threshold.
 *
 * Precision rule: when a foreground colour has no determinable background, we do NOT guess.
 * The caller reports `manual_review` rather than inventing a failure.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX_RE = /^#([0-9a-f]{3,8})$/i;

/** Parse a CSS colour literal (#rgb, #rrggbb, #rrggbbaa, rgb(), rgba()) to RGB 0-255. */
export function parseColor(input: string): Rgb | null {
  const s = input.trim().toLowerCase();

  if (s === "white") return { r: 255, g: 255, b: 255 };
  if (s === "black") return { r: 0, g: 0, b: 0 };
  if (s === "transparent") return null;

  const hex = HEX_RE.exec(s);
  if (hex) {
    const h = hex[1]!;
    if (h.length === 3 || h.length === 4) {
      return {
        r: parseInt(h[0]! + h[0]!, 16),
        g: parseInt(h[1]! + h[1]!, 16),
        b: parseInt(h[2]! + h[2]!, 16),
      };
    }
    if (h.length === 6 || h.length === 8) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
      };
    }
    return null;
  }

  const rgb = /^rgba?\(\s*([0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)/.exec(s);
  if (rgb) {
    const r = Number(rgb[1]),
      g = Number(rgb[2]),
      b = Number(rgb[3]);
    if ([r, g, b].some((v) => Number.isNaN(v) || v < 0 || v > 255)) return null;
    return { r, g, b };
  }

  return null;
}

/** WCAG relative luminance (WCAG 2.x definition). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (v: number): number => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two colours; always >= 1, max 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Convenience: ratio from two CSS colour literals; null when either is unparseable. */
export function ratioFromCss(fg: string, bg: string): number | null {
  const f = parseColor(fg);
  const b = parseColor(bg);
  if (!f || !b) return null;
  return contrastRatio(f, b);
}

export interface ContrastThreshold {
  /** 4.5:1 normal text, 3:1 large text (>=18.66px bold or >=24px), 3:1 non-text UI. */
  required: number;
  kind: "normal-text" | "large-text" | "non-text";
}

export const THRESHOLDS = {
  normalText: { required: 4.5, kind: "normal-text" } as ContrastThreshold,
  largeText: { required: 3, kind: "large-text" } as ContrastThreshold,
  nonText: { required: 3, kind: "non-text" } as ContrastThreshold,
};

/** Does this pair meet the given threshold? */
export function meetsContrast(
  fg: string,
  bg: string,
  threshold: ContrastThreshold = THRESHOLDS.normalText,
): boolean | null {
  const ratio = ratioFromCss(fg, bg);
  if (ratio === null) return null;
  return ratio >= threshold.required;
}

/**
 * Suggest the nearest accessible replacement for a foreground colour against a known
 * background: darkens (or lightens, on dark backgrounds) until the threshold is met.
 * Returns the hex string actually used in the generated fix, so remediation diffs carry a
 * real value derived from the code rather than a hardcoded template colour.
 */
export function suggestAccessibleColor(fg: string, bg: string, threshold = THRESHOLDS.normalText): string | null {
  const f = parseColor(fg);
  const b = parseColor(bg);
  if (!f || !b) return null;
  if (contrastRatio(f, b) >= threshold.required) return toHex(f);

  const bgLum = relativeLuminance(b);
  // On a light background darken the foreground; on a dark background lighten it.
  const goDarker = bgLum > 0.5;
  let best: Rgb = { ...f };
  for (let step = 1; step <= 100; step++) {
    const factor = step / 100;
    const candidate: Rgb = goDarker
      ? { r: Math.round(f.r * (1 - factor)), g: Math.round(f.g * (1 - factor)), b: Math.round(f.b * (1 - factor)) }
      : {
          r: Math.round(f.r + (255 - f.r) * factor),
          g: Math.round(f.g + (255 - f.g) * factor),
          b: Math.round(f.b + (255 - f.b) * factor),
        };
    if (contrastRatio(candidate, b) >= threshold.required) {
      best = candidate;
      break;
    }
    best = candidate;
  }
  return toHex(best);
}

export function toHex({ r, g, b }: Rgb): string {
  const h = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
