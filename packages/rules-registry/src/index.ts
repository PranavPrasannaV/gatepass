import type { Tier } from "@gatepass/findings";

/**
 * Vulnerability-class registry (Constitution Principle V).
 *
 * A class advances through a fixed lifecycle and may only reach `active` (i.e. run in
 * the default ruleset) after it has both a written definition AND corpus examples AND a
 * measured precision. The order definition → corpus → analyzer → measurement is enforced
 * by `activate()`; you cannot shortcut it.
 */

export type ClassStatus = "research" | "corpus_ready" | "active" | "demoted";

export interface VulnerabilityClass {
  id: string;
  tierTarget: Tier;
  /** Written class definition (required before corpus_ready). */
  definition: string;
  taxonomyRefs: string[];
  status: ClassStatus;
  /** Number of labeled corpus cases; must be > 0 to leave `research`. */
  corpusCaseCount: number;
  /** Measured false-positive rate against the corpus; required to activate. */
  measuredFpRate?: number;
  measuredTpRate?: number;
}

export class RegistryError extends Error {}

const VALID_TRANSITIONS: Record<ClassStatus, ClassStatus[]> = {
  research: ["corpus_ready"],
  corpus_ready: ["active", "research"],
  active: ["demoted"],
  demoted: ["active"],
};

export class RulesRegistry {
  private readonly classes = new Map<string, VulnerabilityClass>();

  register(def: Omit<VulnerabilityClass, "status">): VulnerabilityClass {
    if (this.classes.has(def.id)) throw new RegistryError(`Duplicate class ${def.id}`);
    if (!def.definition.trim()) throw new RegistryError(`Class ${def.id} needs a definition`);
    const cls: VulnerabilityClass = { ...def, status: "research" };
    this.classes.set(def.id, cls);
    return cls;
  }

  get(id: string): VulnerabilityClass {
    const cls = this.classes.get(id);
    if (!cls) throw new RegistryError(`Unknown class ${id}`);
    return cls;
  }

  private transition(id: string, to: ClassStatus): VulnerabilityClass {
    const cls = this.get(id);
    if (!VALID_TRANSITIONS[cls.status].includes(to)) {
      throw new RegistryError(`Illegal transition ${cls.status} → ${to} for ${id}`);
    }
    cls.status = to;
    return cls;
  }

  markCorpusReady(id: string): VulnerabilityClass {
    const cls = this.get(id);
    if (cls.corpusCaseCount <= 0) {
      throw new RegistryError(`Class ${id} has no corpus cases; cannot be corpus_ready`);
    }
    return this.transition(id, "corpus_ready");
  }

  /** Activate into the default ruleset. Requires corpus + a recorded precision measurement. */
  activate(id: string): VulnerabilityClass {
    const cls = this.get(id);
    if (cls.corpusCaseCount <= 0) throw new RegistryError(`Class ${id}: no corpus cases`);
    if (cls.measuredFpRate === undefined || cls.measuredTpRate === undefined) {
      throw new RegistryError(`Class ${id}: no measured precision; cannot activate (Principle V)`);
    }
    return this.transition(id, "active");
  }

  /** Demote out of the default ruleset (e.g. on precision regression, FR-019). */
  demote(id: string): VulnerabilityClass {
    return this.transition(id, "demoted");
  }

  activeClasses(): VulnerabilityClass[] {
    return [...this.classes.values()].filter((c) => c.status === "active");
  }

  all(): VulnerabilityClass[] {
    return [...this.classes.values()];
  }
}
