/**
 * Role-based access control (FR-027, T076). Org roles form a strict hierarchy; a required
 * capability is satisfied by that role or any higher one. A user's role mirrors their GitHub
 * repository permission (admin > write > read → admin > member > viewer).
 */

export type Role = "admin" | "member" | "viewer";

const RANK: Record<Role, number> = { viewer: 0, member: 1, admin: 2 };

export function hasRole(role: Role, minimum: Role): boolean {
  return RANK[role] >= RANK[minimum];
}

export class RoleError extends Error {
  constructor(
    public readonly have: Role,
    public readonly need: Role,
  ) {
    super(`role "${have}" is insufficient; "${need}" required`);
    this.name = "RoleError";
  }
}

export function requireRole(role: Role, minimum: Role): void {
  if (!hasRole(role, minimum)) throw new RoleError(role, minimum);
}

/** Map a GitHub repository permission to a Gatepass org role. */
export function roleFromGitHubPermission(perm: string): Role {
  if (perm === "admin" || perm === "maintain") return "admin";
  if (perm === "write" || perm === "push") return "member";
  return "viewer";
}
