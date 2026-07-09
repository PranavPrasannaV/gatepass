import type { Reproduction } from "./schema.js";

/**
 * Redaction linter (contracts/findings-schema.md rule 5): a verified finding's
 * reproduction steps must never contain a secret value verbatim. Producers pass the
 * raw secret values they detected; this asserts none leak into the reproduction.
 */
export class RedactionError extends Error {
  constructor(public readonly leaked: string[]) {
    super(`Reproduction leaks ${leaked.length} secret value(s) verbatim`);
    this.name = "RedactionError";
  }
}

const PLACEHOLDER = "«REDACTED»";

export function redactSecrets(text: string, secrets: readonly string[]): string {
  let out = text;
  for (const secret of secrets) {
    if (secret.length === 0) continue;
    out = out.split(secret).join(PLACEHOLDER);
  }
  return out;
}

export function assertRedacted(
  reproduction: Reproduction,
  secrets: readonly string[],
): void {
  const haystack = [...reproduction.steps, reproduction.expected].join("\n");
  const leaked = secrets.filter((s) => s.length > 0 && haystack.includes(s));
  if (leaked.length > 0) throw new RedactionError(leaked);
}
