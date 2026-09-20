"use client";

import React from "react";
import { useReveal } from "./use-reveal";

/**
 * Client wrapper that enables scroll-reveal animations on its children.
 * Server components containing .reveal elements should be wrapped in this.
 */
export function RevealProvider({ children }: { children: React.ReactNode }) {
  const ref = useReveal<HTMLDivElement>();

  return <div ref={ref}>{children}</div>;
}
