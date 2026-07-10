import type { HTMLAttributes } from "react";

type BadgeVariant =
  | "verified"
  | "research"
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "passing"
  | "warning"
  | "failing"
  | "unknown"
  | "default";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  verified: "bg-tier-verified-light text-tier-verified-dark dark:bg-tier-verified/20 dark:text-tier-verified",
  research: "bg-tier-research-light text-tier-research-dark dark:bg-tier-research/20 dark:text-tier-research",
  critical:
    "bg-severity-critical-light text-severity-critical-dark dark:bg-severity-critical/20 dark:text-severity-critical",
  high: "bg-severity-high-light text-severity-high-dark dark:bg-severity-high/20 dark:text-severity-high",
  medium: "bg-severity-medium-light text-severity-medium-dark dark:bg-severity-medium/20 dark:text-severity-medium",
  low: "bg-severity-low-light text-severity-low-dark dark:bg-severity-low/20 dark:text-severity-low",
  passing: "bg-posture-passing-light text-posture-passing dark:bg-posture-passing/20 dark:text-posture-passing",
  warning: "bg-posture-warning-light text-posture-warning dark:bg-posture-warning/20 dark:text-posture-warning",
  failing: "bg-posture-failing-light text-posture-failing dark:bg-posture-failing/20 dark:text-posture-failing",
  unknown: "bg-posture-unknown-light text-posture-unknown dark:bg-posture-unknown/20 dark:text-posture-unknown",
  default: "bg-gatepass-100 text-gatepass-600 dark:bg-gatepass-800 dark:text-gatepass-400",
};

export function Badge({ variant = "default", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium
        ${variantStyles[variant]}
        ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
