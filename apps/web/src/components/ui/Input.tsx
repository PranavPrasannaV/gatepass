import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gatepass-700 dark:text-gatepass-300"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`h-9 rounded border bg-white px-3 text-sm text-gatepass-900 placeholder:text-gatepass-400
            focus:outline-2 focus:outline-offset-2 focus:outline-accent-600
            disabled:cursor-not-allowed disabled:opacity-50
            dark:bg-gatepass-800 dark:text-gatepass-100 dark:placeholder:text-gatepass-500
            ${error
              ? "border-severity-critical focus:outline-severity-critical"
              : "border-gatepass-300 dark:border-gatepass-600"
            }
            ${className}`}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-severity-critical">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
