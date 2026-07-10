import type { HTMLAttributes } from "react";

type SkeletonVariant = "text" | "card" | "avatar";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: "h-4 w-full rounded",
  card: "h-32 w-full rounded-lg",
  avatar: "h-10 w-10 rounded-full",
};

export function Skeleton({
  variant = "text",
  className = "",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={`animate-skeleton bg-gatepass-200 dark:bg-gatepass-700
        ${variantStyles[variant]}
        ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}
