"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function RevealWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { el.classList.add("is-visible"); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <div ref={ref} className={`reveal ${className}`}>{children}</div>;
}

/**
 * Reveals every `.reveal` on the page, wherever it came from.
 *
 * `.reveal` sits at opacity 0 until something adds `is-visible`. Server-rendered
 * templates carry no JavaScript of their own, so an article could render its
 * full body and show a blank page - which is exactly what happened. Mounted once
 * in the layout, this covers every route:
 *
 *   - re-scans on navigation, since the effect would otherwise run only once,
 *   - watches for nodes added later by streaming or client rendering,
 *   - and gives up gracefully: anything still hidden after a moment is shown
 *     outright, because invisible content is worse than a missing animation.
 */
export function RevealInit() {
  const pathname = usePathname();

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const showAll = () => {
      document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => el.classList.add("is-visible"));
    };
    if (prefersReduced) { showAll(); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -5% 0px" });

    const observe = () => document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => io.observe(el));
    observe();

    const mo = new MutationObserver(observe);
    mo.observe(document.body, { childList: true, subtree: true });

    /* Nothing below the fold should stay hidden if the observer never fires -
       a wrong scroll container or a print stylesheet would hide the article. */
    const failsafe = window.setTimeout(showAll, 4000);

    return () => {
      io.disconnect();
      mo.disconnect();
      window.clearTimeout(failsafe);
    };
  }, [pathname]);

  return null;
}
