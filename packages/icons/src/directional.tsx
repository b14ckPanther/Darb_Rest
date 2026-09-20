"use client";

import React from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, type LucideProps } from "lucide-react";
import type { Direction } from "@darb-rest/types";

export interface DirectionalIconProps extends LucideProps {
  direction?: Direction;
  className?: string;
}

/**
 * An arrow pointing towards the start of reading flow:
 * Left in LTR, Right in RTL
 */
export function ArrowStart({ direction = "ltr", className, ...props }: DirectionalIconProps) {
  if (direction === "rtl") {
    return <ArrowRight aria-hidden="true" className={className} {...props} />;
  }
  return <ArrowLeft aria-hidden="true" className={className} {...props} />;
}

/**
 * An arrow pointing towards the end of reading flow:
 * Right in LTR, Left in RTL
 */
export function ArrowEnd({ direction = "ltr", className, ...props }: DirectionalIconProps) {
  if (direction === "rtl") {
    return <ArrowLeft aria-hidden="true" className={className} {...props} />;
  }
  return <ArrowRight aria-hidden="true" className={className} {...props} />;
}

/**
 * A chevron pointing towards the start of reading flow:
 * Left in LTR, Right in RTL
 */
export function ChevronStart({ direction = "ltr", className, ...props }: DirectionalIconProps) {
  if (direction === "rtl") {
    return <ChevronRight aria-hidden="true" className={className} {...props} />;
  }
  return <ChevronLeft aria-hidden="true" className={className} {...props} />;
}

/**
 * A chevron pointing towards the end of reading flow:
 * Right in LTR, Left in RTL
 */
export function ChevronEnd({ direction = "ltr", className, ...props }: DirectionalIconProps) {
  if (direction === "rtl") {
    return <ChevronLeft aria-hidden="true" className={className} {...props} />;
  }
  return <ChevronRight aria-hidden="true" className={className} {...props} />;
}
