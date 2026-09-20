"use client";

import React, { useId } from "react";
import { cn } from "./utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, startAdornment, endAdornment, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full space-y-1.5 text-start">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-[var(--fg-default)]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {startAdornment && (
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-[var(--fg-muted)]">
              {startAdornment}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              "w-full h-10 px-3.5 text-sm bg-[var(--bg-surface)] text-[var(--fg-default)] rounded-[var(--radius-md)] border transition-colors outline-none",
              error
                ? "border-[var(--color-destructive)] focus:ring-1 focus:ring-[var(--color-destructive)]"
                : "border-[var(--border-default)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--focus-ring)]",
              startAdornment ? "ps-10" : "",
              endAdornment ? "pe-10" : "",
              className,
            )}
            {...props}
          />
          {endAdornment && (
            <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3 text-[var(--fg-muted)]">
              {endAdornment}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-xs text-[var(--color-destructive)]">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="text-xs text-[var(--fg-muted)]">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
