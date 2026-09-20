"use client";
import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

let pendingScroll: { pathname: string; section: number; offset: number; y: number } | undefined;
let initialAnchorHandled = false;
const sections = () => Array.from(document.querySelectorAll<HTMLElement>("main section, footer"));

export function rememberLocalePosition(pathname: string, homepage: boolean) {
  const elements = homepage ? sections() : [];
  const section = elements.findIndex((element) => element.getBoundingClientRect().bottom > 100);
  pendingScroll = homepage
    ? {
        pathname,
        section,
        offset: elements[section]?.getBoundingClientRect().top ?? 0,
        y: window.scrollY,
      }
    : undefined;
}

/** Restore only after the real homepage has committed, not from its streamed header. */
export function HomeScrollRestoration() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    const target = pendingScroll;
    if (target?.pathname === pathname) {
      pendingScroll = undefined;
      const section = sections()[target.section];
      window.scrollTo({
        top: section
          ? window.scrollY + section.getBoundingClientRect().top - target.offset
          : target.y,
        behavior: "instant",
      });
      initialAnchorHandled = true;
      return;
    }
    let cancelled = false;
    let frame = 0;
    const cancel = () => {
      cancelled = true;
    };
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    window.addEventListener("keydown", cancel);
    void document.fonts.ready.then(() => {
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        if (!initialAnchorHandled && window.location.hash) {
          // The browser can attempt fragment scrolling while streamed content is hidden.
          // Retry once on initial entry; never replay a stale hash on a locale switch.
          try {
            document
              .getElementById(decodeURIComponent(window.location.hash.slice(1)))
              ?.scrollIntoView({ behavior: "instant" });
          } catch {
            /* Invalid fragment encoding has no scroll target. */
          }
        }
        initialAnchorHandled = true;
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("keydown", cancel);
    };
  }, [pathname]);
  return null;
}
