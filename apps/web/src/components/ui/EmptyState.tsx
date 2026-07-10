import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-gatepass-400 dark:text-gatepass-500">
        {icon ?? <Inbox className="h-12 w-12" />}
      </div>
      <h3 className="text-lg font-medium text-gatepass-700 dark:text-gatepass-200">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-gatepass-500 dark:text-gatepass-400">
          {description}
        </p>
      )}
      {action && (
        <Button variant="primary" size="md" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
