"use client";
import { useFormStatus } from "react-dom";
export function ReviewButtons({
  approve,
  reject,
  sending,
}: {
  approve: string;
  reject: string;
  sending: string;
}) {
  const { pending } = useFormStatus();
  return (
    <div className="flex gap-3" aria-busy={pending}>
      <button
        disabled={pending}
        name="status"
        value="approved"
        className="min-h-12 rounded-lg bg-[var(--darb-green-deep)] px-5 text-white disabled:opacity-60"
      >
        {pending ? sending : approve}
      </button>
      <button
        disabled={pending}
        name="status"
        value="rejected"
        className="min-h-12 rounded-lg border px-5 disabled:opacity-60"
      >
        {reject}
      </button>
    </div>
  );
}
