"use client";
export function PrintButton({ label }: { label: string }) {
  return (
    <button className="min-h-11 rounded-xl border px-5 text-sm" onClick={() => window.print()}>
      {label}
    </button>
  );
}
