"use client";

import React from "react";
import { cn } from "./utils";

export interface BrandMarkProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

/**
 * Darb REST Temporary Brand Mark Placeholder
 * Clean, geometric culinary & tech mark.
 * Easily replaceable with official production asset.
 */
export function BrandMark({ size = 28, className, ...props }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-[var(--color-primary)] shrink-0", className)}
      aria-hidden="true"
      {...props}
    >
      <rect width="32" height="32" rx="8" fill="currentColor" fillOpacity="0.12" />
      <path
        d="M9 10C9 8.89543 9.89543 8 11 8H18C20.7614 8 23 10.2386 23 13C23 15.7614 20.7614 18 18 18H13V24H9V10Z"
        fill="currentColor"
      />
      <circle cx="18" cy="13" r="2" fill="var(--bg-surface, #ffffff)" />
    </svg>
  );
}

export interface BrandLogoProps {
  markSize?: number;
  showTagline?: boolean;
  className?: string;
  taglineText?: string;
}

/**
 * Darb REST Unified Brand Logo (Mark + Typography)
 */
export function BrandLogo({
  markSize = 28,
  showTagline = false,
  className,
  taglineText,
}: BrandLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <BrandMark size={markSize} />
      <div className="flex flex-col text-start">
        <div className="flex items-center gap-1.5 font-bold tracking-tight text-[var(--fg-default)] text-base leading-none">
          <span>Darb</span>
          <span className="px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-[var(--color-primary)] text-[var(--color-primary-fg)] text-[10px] uppercase font-black tracking-widest">
            REST
          </span>
        </div>
        {showTagline && taglineText && (
          <span className="text-[10px] text-[var(--fg-muted)] mt-0.5 leading-none">
            {taglineText}
          </span>
        )}
      </div>
    </div>
  );
}
