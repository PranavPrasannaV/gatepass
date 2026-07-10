import { type SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = "", id, ...props }, ref) => {
    const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-gatepass-700 dark:text-gatepass-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`h-9 w-full appearance-none rounded border bg-white px-3 pr-8 text-sm text-gatepass-900
              focus:outline-2 focus:outline-offset-2 focus:outline-accent-600
              disabled:cursor-not-allowed disabled:opacity-50
              dark:bg-gatepass-800 dark:text-gatepass-100
              ${error
                ? "border-severity-critical focus:outline-severity-critical"
                : "border-gatepass-300 dark:border-gatepass-600"
              }
              ${className}`}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${selectId}-error` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gatepass-400" />
        </div>
        {error && (
          <p id={`${selectId}-error`} className="text-xs text-severity-critical">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
