"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Lightweight scroll-reveal hook using IntersectionObserver.
 * Adds 'revealed' class to children with '.reveal' class when they enter the viewport.
 * Respects prefers-reduced-motion by immediately showing all elements.
 */
export function useReveal<T extends HTMLElement = HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    // Respect user motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      const elements = container.querySelectorAll(".reveal");
      elements.forEach((el) => el.classList.add("revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -40px 0px",
      },
    );

    const elements = container.querySelectorAll(".reveal");
    elements.forEach((el) => {
      el.classList.add("reveal-pending");
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
      elements.forEach((el) => el.classList.remove("reveal-pending"));
    };
  }, []);

  return ref;
}
