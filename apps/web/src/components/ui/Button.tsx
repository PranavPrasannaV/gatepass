import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-700/90 dark:bg-teal-500 dark:hover:bg-teal-600",
  secondary:
    "border border-gatepass-300 bg-white text-gatepass-700 hover:bg-gatepass-50 active:bg-gatepass-100 dark:border-gatepass-600 dark:bg-transparent dark:text-gatepass-200 dark:hover:bg-gatepass-800",
  ghost:
    "bg-transparent text-gatepass-600 hover:bg-gatepass-100 active:bg-gatepass-100/80 dark:text-gatepass-400 dark:hover:bg-gatepass-800",
  danger: "bg-severity-critical text-white hover:bg-severity-critical-dark active:bg-severity-critical-dark/90",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded",
  md: "h-9 px-4 text-sm gap-2 rounded",
  lg: "h-11 px-6 text-base gap-2.5 rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", isLoading = false, disabled, className = "", children, ...props }, ref) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center font-medium transition-colors duration-150
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
