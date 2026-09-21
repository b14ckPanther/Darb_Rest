"use client";
import React, { useEffect, useRef } from "react";
import { IconClose } from "@darb-rest/icons";
export function RequestSheet({
  title,
  closeLabel,
  onClose,
  children,
  busy = false,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = ref.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node?.showModal();
    return () => {
      node?.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      aria-busy={busy}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const node = e.currentTarget;
        const controls = Array.from(
          node.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href],[tabindex="0"]'),
        ).filter((el) => !el.matches(":disabled") && el.getClientRects().length > 0);
        const first = controls[0],
          last = controls[controls.length - 1];
        if (!first) {
          e.preventDefault();
          node.focus();
        } else if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === node)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%_-_1rem)] max-w-lg overflow-y-auto rounded-2xl border bg-[var(--bg-surface)] p-0 text-[var(--fg-default)] shadow-xl backdrop:bg-black/45"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-[var(--bg-surface)] p-5">
        <h2 className="text-xl font-bold">{title}</h2>
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
          onClick={onClose}
          disabled={busy}
          aria-label={closeLabel}
        >
          <IconClose size={18} />
        </button>
      </div>
      <div className="space-y-5 p-5">{children}</div>
    </dialog>
  );
}
