"use client";

import React from "react";
import { cn } from "./utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      startIcon,
      endIcon,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "relative inline-flex items-center justify-center font-medium select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer whitespace-nowrap active:scale-[0.98]";

    const variantStyles = {
      primary:
        "bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-hover)] focus-visible:ring-[var(--color-primary)] shadow-sm",
      secondary:
        "bg-[var(--color-secondary)] text-[var(--color-secondary-fg)] hover:bg-[var(--color-secondary-hover)] focus-visible:ring-[var(--color-secondary)] shadow-sm",
      outline:
        "border border-[var(--border-default)] bg-transparent text-[var(--fg-default)] hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--border-hover)] focus-visible:ring-[var(--color-primary)]",
      ghost:
        "bg-transparent text-[var(--fg-default)] hover:bg-[var(--bg-surface-elevated)] focus-visible:ring-[var(--color-primary)]",
      destructive:
        "bg-[var(--color-destructive)] text-white hover:opacity-90 focus-visible:ring-[var(--color-destructive)] shadow-sm",
    };

    const sizeStyles = {
      sm: "min-h-[36px] px-3.5 text-xs rounded-[var(--radius-sm)] gap-1.5",
      md: "min-h-[42px] px-5 text-sm rounded-[var(--radius-md)] gap-2",
      lg: "min-h-[48px] px-6 text-base rounded-[var(--radius-lg)] gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          startIcon
        )}
        <span>{children}</span>
        {!isLoading && endIcon}
      </button>
    );
  },
);

Button.displayName = "Button";
