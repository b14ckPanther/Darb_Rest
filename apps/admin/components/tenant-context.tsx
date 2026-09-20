"use client";

import React, { createContext, useContext } from "react";
import type { TenantContext } from "@darb-rest/types";

const TenantReactContext = createContext<TenantContext | null>(null);

export interface TenantProviderProps {
  value: TenantContext;
  children: React.ReactNode;
}

export function TenantProvider({ value, children }: TenantProviderProps) {
  return <TenantReactContext.Provider value={value}>{children}</TenantReactContext.Provider>;
}

export function useTenantContext(): TenantContext {
  const context = useContext(TenantReactContext);
  if (!context) {
    throw new Error("[Darb REST] useTenantContext must be used within a <TenantProvider> wrapper.");
  }
  return context;
}
