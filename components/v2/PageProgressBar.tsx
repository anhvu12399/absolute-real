"use client";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Top gold progress bar that starts INSTANTLY on link clicks
 * and finishes smoothly when Next.js completes route navigation.
 */
export function PageProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const barRef = useRef<HTMLDivElement>(null);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startProgress = () => {
    const bar = barRef.current;
    if (!bar) return;

    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    bar.style.transition = "none";
    bar.style.opacity = "1";
    bar.style.width = "15%";

    // Animate smoothly to ~80% while waiting for page to load
    progressTimerRef.current = setTimeout(() => {
      bar.style.transition = "width 0.3s ease-out";
      bar.style.width = "45%";

      let currentWidth = 45;
      intervalRef.current = setInterval(() => {
        if (currentWidth < 85) {
          currentWidth += Math.random() * 8 + 2;
          bar.style.transition = "width 0.2s ease";
          bar.style.width = `${Math.min(currentWidth, 88)}%`;
        }
      }, 250);
    }, 50);
  };

  const completeProgress = () => {
    const bar = barRef.current;
    if (!bar) return;

    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    bar.style.transition = "width 0.2s ease-out";
    bar.style.width = "100%";

    progressTimerRef.current = setTimeout(() => {
      bar.style.transition = "opacity 0.25s ease";
      bar.style.opacity = "0";

      progressTimerRef.current = setTimeout(() => {
        bar.style.width = "0%";
      }, 250);
    }, 200);
  };

  // When pathname or searchParams change -> navigation has finished
  useEffect(() => {
    completeProgress();
  }, [pathname, searchParams]);

  // Global click listener to start progress bar INSTANTLY on any link click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external links, downloads, new tabs, hash-only anchors
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        target.target === "_blank" ||
        target.hasAttribute("download") ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Ignore clicks on same exact path
      const currentFullUrl = window.location.pathname + window.location.search;
      if (href === currentFullUrl || href === window.location.pathname) {
        return;
      }

      // Trigger progress bar immediately on click
      startProgress();
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div
      ref={barRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "3px",
        width: "0%",
        background: "linear-gradient(90deg, var(--chrome-gold, #c9a84c), var(--celadon, #8fb5a0))",
        zIndex: 99999,
        pointerEvents: "none",
        boxShadow: "0 0 10px rgba(201,168,76,0.8)",
        opacity: 0,
      }}
      aria-hidden="true"
    />
  );
}
