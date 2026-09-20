import React from "react";

export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-[var(--bg-surface-elevated)] rounded-[var(--radius-md)]" />
          <div className="h-4 w-72 bg-[var(--bg-surface-elevated)] rounded-[var(--radius-sm)]" />
        </div>
        <div className="h-10 w-32 bg-[var(--bg-surface-elevated)] rounded-[var(--radius-md)]" />
      </div>

      {/* 4 Cards Skeleton */}
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 space-y-4 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[var(--bg-surface-elevated)]" />
            <div className="space-y-1.5 flex-1">
              <div className="h-5 w-40 bg-[var(--bg-surface-elevated)] rounded-[var(--radius-sm)]" />
              <div className="h-3 w-60 bg-[var(--bg-surface-elevated)] rounded-[var(--radius-xs)]" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="h-10 bg-[var(--bg-surface-elevated)] rounded-xl" />
            <div className="h-10 bg-[var(--bg-surface-elevated)] rounded-xl" />
            <div className="h-10 bg-[var(--bg-surface-elevated)] rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
