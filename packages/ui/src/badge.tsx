"use client";

import React from "react";
import { cn } from "./utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "neutral" | "primary" | "success" | "warning" | "destructive" | "outline";
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  const variantStyles = {
    neutral: "bg-[var(--bg-surface-elevated)] text-[var(--fg-muted)] border-transparent",
    primary: "bg-[var(--color-primary)] text-[var(--color-primary-fg)] border-transparent",
    success: "bg-[var(--color-success-bg)] text-[var(--color-success)] border-transparent",
    warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-transparent",
    destructive:
      "bg-[var(--color-destructive-bg)] text-[var(--color-destructive)] border-transparent",
    outline: "border-[var(--border-default)] text-[var(--fg-default)] bg-transparent",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[var(--radius-full)] border px-2.5 py-0.5 text-xs font-semibold transition-colors select-none",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
