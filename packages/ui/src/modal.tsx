"use client";

import React, { useEffect } from "react";
import { cn } from "./utils";
import { IconClose } from "@darb-rest/icons";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, description, children, className }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] overflow-y-auto rounded-t-[var(--radius-2xl)] sm:rounded-[var(--radius-xl)] bg-[var(--bg-surface)] p-5 sm:p-6 text-[var(--fg-default)] shadow-[var(--shadow-xl)] border border-[var(--border-default)] transition-transform duration-200",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4 gap-3 sticky top-0 bg-[var(--bg-surface)] pt-1 pb-2 z-10 border-b border-[var(--border-subtle)] sm:border-0 sm:pb-0 sm:pt-0">
          <div>
            {title && <h2 className="text-lg font-semibold tracking-tight">{title}</h2>}
            {description && (
              <p className="text-xs sm:text-sm text-[var(--fg-muted)] mt-1">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-[var(--radius-sm)] p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--fg-default)] transition-colors cursor-pointer shrink-0"
          >
            <IconClose size={18} />
          </button>
        </div>
        <div className="pt-2 sm:pt-0">{children}</div>
      </div>
    </div>
  );
}
