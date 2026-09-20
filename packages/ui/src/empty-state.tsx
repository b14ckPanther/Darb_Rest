"use client";

import React from "react";
import { cn } from "./utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)]",
        className,
      )}
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-surface-elevated)] text-[var(--fg-muted)] mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[var(--fg-default)]">{title}</h3>
      <p className="mt-1 text-sm text-[var(--fg-muted)] max-w-sm">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
