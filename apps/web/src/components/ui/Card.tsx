import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  footer?: ReactNode;
  padding?: boolean;
}

export function Card({ header, footer, padding = true, className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-gatepass-200 bg-white dark:bg-gatepass-800/50 dark:border-gatepass-700
        ${className}`}
      {...props}
    >
      {header && <div className="border-b px-4 py-3 dark:border-gatepass-700">{header}</div>}
      <div className={padding ? "p-4" : ""}>{children}</div>
      {footer && <div className="border-t px-4 py-3 dark:border-gatepass-700">{footer}</div>}
    </div>
  );
}
