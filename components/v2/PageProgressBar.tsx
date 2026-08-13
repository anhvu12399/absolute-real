"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Thin gold progress bar that slides across the top of the page
 * whenever Next.js navigates to a new route.
 */
export function PageProgressBar() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    // Clear any previous animation
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    // Reset + start
    bar.style.transition = "none";
    bar.style.opacity = "1";
    bar.style.width = "0%";

    rafRef.current = requestAnimationFrame(() => {
      bar.style.transition = "width 0.4s ease";
      bar.style.width = "30%";

      timerRef.current = setTimeout(() => {
        bar.style.transition = "width 0.6s ease";
        bar.style.width = "75%";

        timerRef.current = setTimeout(() => {
          bar.style.transition = "width 0.3s ease";
          bar.style.width = "100%";

          timerRef.current = setTimeout(() => {
            bar.style.transition = "opacity 0.3s ease";
            bar.style.opacity = "0";
          }, 300);
        }, 500);
      }, 100);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [pathname]);

  return (
    <div
      ref={barRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "3px",
        width: "0%",
        background: "linear-gradient(90deg, var(--brass, #c9a84c), var(--celadon, #8fb5a0))",
        zIndex: 9999,
        pointerEvents: "none",
        boxShadow: "0 0 8px rgba(201,168,76,0.6)",
        opacity: 0,
      }}
      aria-hidden="true"
    />
  );
}
