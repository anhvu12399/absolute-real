"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Admin Preview Bridge — loads only when ?_aat_preview=1 is in the URL.
 *
 * Listens for postMessage from the WP admin iframe and updates DOM elements
 * in real time as the editor types.
 */
export function AdminPreviewBridge() {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("_aat_preview") === "1";

  useEffect(() => {
    if (!isPreview) return;

    let highlighted: HTMLElement | null = null;

    function clearHighlight() {
      if (highlighted) {
        highlighted.style.outline = "";
        highlighted.style.outlineOffset = "";
        highlighted.style.boxShadow = "";
        highlighted.style.transition = "";
        highlighted = null;
      }
    }

    function highlightElement(el: HTMLElement) {
      clearHighlight();
      highlighted = el;
      el.style.transition = "all 0.3s ease";
      el.style.outline = "3px solid #c9a84c";
      el.style.outlineOffset = "4px";
      el.style.boxShadow = "0 0 20px rgba(201, 168, 76, 0.5)";
      setTimeout(() => {
        if (highlighted === el) clearHighlight();
      }, 3000);
    }

    function findElement(selector: string): HTMLElement | null {
      if (!selector) return null;
      const selectors = selector.split(",").map((s) => s.trim());
      for (const sel of selectors) {
        try {
          const el = document.querySelector<HTMLElement>(sel);
          if (el) return el;
        } catch {
          /* Invalid selector */
        }
      }
      return null;
    }

    function applyUpdate(selector: string, value: string, updateType: string): HTMLElement | null {
      const el = findElement(selector);
      if (!el) return null;

      switch (updateType) {
        case "text":
          el.textContent = value;
          break;
        case "html":
          el.innerHTML = value;
          break;
        case "image":
          if (el instanceof HTMLImageElement) {
            el.src = value;
          } else {
            el.style.backgroundImage = value ? `url(${value})` : "";
          }
          break;
      }

      const container = el.closest<HTMLElement>("[data-preview]");
      if (container) {
        if (!value || String(value).trim() === "0" || String(value).trim() === "") {
          container.style.display = "none";
        } else {
          container.style.display = "";
        }
      }

      return el;
    }

    function scrollToTarget(sectionId?: string, selector?: string) {
      let el: HTMLElement | null = null;

      if (selector) {
        el = findElement(selector);
      }
      if (!el && sectionId) {
        el = document.getElementById(sectionId);
      }

      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        highlightElement(el);
      }
    }

    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "aat-live-update") {
        const el = applyUpdate(data.selector, data.value, data.updateType);
        if (el) {
          highlightElement(el);
          const rect = el.getBoundingClientRect();
          if (rect.top < 0 || rect.bottom > window.innerHeight) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }

      if (data.type === "aat-scroll-to") {
        scrollToTarget(data.section, data.selector);
      }
    }

    window.addEventListener("message", handleMessage);

    /* Add preview mode banner. */
    const banner = document.createElement("div");
    banner.id = "aat-preview-banner";
    banner.innerHTML = '<span style="margin-right:8px">👁</span> Chế độ Preview — thay đổi từ WP Admin sẽ hiện ngay ở đây';
    Object.assign(banner.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      zIndex: "999999",
      background: "linear-gradient(135deg, #1d2327, #2c3338)",
      color: "#fff",
      padding: "6px 16px",
      fontSize: "12px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      textAlign: "center" as const,
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    });
    document.body.prepend(banner);
    document.body.style.paddingTop = "32px";

    console.log("[AAT Preview Bridge] Loaded — listening for postMessage events");

    return () => {
      window.removeEventListener("message", handleMessage);
      banner.remove();
      document.body.style.paddingTop = "";
      clearHighlight();
    };
  }, [isPreview]);

  return null;
}
