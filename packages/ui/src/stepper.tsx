"use client";

import React from "react";
import { cn } from "./utils";

export interface StepItem {
  id: number;
  title: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  className?: string;
}

export function Stepper({ steps, currentStep, onStepClick, className }: StepperProps) {
  const currentStepItem = steps.find((s) => s.id === currentStep) || steps[0];

  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      {/* Mobile Compact Progress Bar (< 640px) */}
      <div className="sm:hidden space-y-2 py-1 px-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--color-primary)] flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] text-[10px] font-bold">
              {currentStep}
            </span>
            <span>{currentStepItem?.title}</span>
          </span>
          <span className="text-[11px] text-[var(--fg-muted)] font-medium">
            {currentStep}/{steps.length}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[var(--border-subtle)] overflow-hidden">
          <div
            className="h-full bg-[var(--color-primary)] transition-all duration-300 rounded-full"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop / Tablet Step Track (>= 640px) */}
      <ol className="hidden sm:flex items-center justify-between gap-2 overflow-x-auto py-2">
        {steps.map((step, idx) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isClickable = isCompleted && onStepClick;

          return (
            <li
              key={step.id}
              className="flex flex-1 items-center gap-2 min-w-max"
              aria-current={isCurrent ? "step" : undefined}
            >
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(step.id)}
                className={cn(
                  "group flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-start transition-colors",
                  isClickable
                    ? "cursor-pointer hover:bg-[var(--bg-surface-elevated)]"
                    : "cursor-default",
                )}
              >
                {/* Step indicator circle */}
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                    isCompleted && "bg-[var(--color-primary)] text-[var(--color-primary-fg)]",
                    isCurrent &&
                      "border-2 border-[var(--color-primary)] bg-[var(--bg-surface)] text-[var(--color-primary)] shadow-sm",
                    !isCompleted &&
                      !isCurrent &&
                      "border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] text-[var(--fg-muted)]",
                  )}
                >
                  {isCompleted ? (
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 stroke-current stroke-2"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>

                {/* Step text */}
                <div className="flex flex-col">
                  <span
                    className={cn(
                      "text-xs font-medium leading-none",
                      isCurrent
                        ? "text-[var(--color-primary)] font-semibold"
                        : isCompleted
                          ? "text-[var(--fg-default)]"
                          : "text-[var(--fg-muted)]",
                    )}
                  >
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="text-[10px] text-[var(--fg-muted)] mt-0.5 truncate max-w-[110px]">
                      {step.description}
                    </span>
                  )}
                </div>
              </button>

              {/* Connecting line */}
              {idx < steps.length - 1 && (
                <div
                  aria-hidden="true"
                  className={cn(
                    "h-0.5 flex-1 min-w-3 transition-colors",
                    step.id < currentStep
                      ? "bg-[var(--color-primary)]"
                      : "bg-[var(--border-subtle)]",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
