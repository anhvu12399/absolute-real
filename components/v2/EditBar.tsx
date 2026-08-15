"use client";

import { useEffect, useState } from "react";
import type { EditTarget } from "@/lib/admin";

/**
 * A way back to the screen that edits what you are looking at.
 *
 * Working out which WordPress post a page comes from is not obvious on a
 * headless site: the homepage is a `homepage` post, a country page is really
 * the legacy `{country}-tours` page, and several sections fill themselves from
 * live content when their repeater is left empty. Rather than expect the owner
 * to hold that map in their head, each page names its own edit targets.
 *
 * Who sees it: whoever is signed into WordPress with permission to edit posts,
 * and nobody else. The controls used to appear for anyone who added
 * `?asledit=1` to the URL. Nothing was exposed by that — every link points at
 * wp-admin, which does its own checking — but it put an editing UI in front of
 * readers. The page now asks the backend outright, sending the visitor's
 * WordPress cookie; `?asledit=0` still hides the bar for the current tab.
 */
export function EditBar({ targets }: { targets: EditTarget[] }) {
  const [open, setOpen] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [token, setToken] = useState("");
  const [publishing, setPublishing] = useState<"idle" | "sending" | "done" | "failed">("idle");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("asledit") === "0") {
      window.sessionStorage.setItem("aat-edit-hidden", "1");
      return;
    }
    if (params.get("asledit") === "1") window.sessionStorage.removeItem("aat-edit-hidden");
    if (window.sessionStorage.getItem("aat-edit-hidden") === "1") return;

    const origin = process.env.NEXT_PUBLIC_WP_URL;
    if (!origin) return;

    const stop = new AbortController();
    fetch(`${origin.replace(/\/+$/, "")}/wp-json/absolute-asia/v1/me`, {
      credentials: "include",
      signal: stop.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      /* A reader gets `canEdit: false`, not an error — no console noise on a
         page that simply has no editor looking at it. */
      .then((body) => {
        setCanEdit(Boolean(body?.canEdit));
        setToken(typeof body?.token === "string" ? body.token : "");
      })
      .catch(() => {});

    return () => stop.abort();
  }, []);

  /** Push this one page live without going back to WordPress to re-save it. */
  const republish = async () => {
    setPublishing("sending");
    try {
      const response = await fetch("/api/revalidate/self", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: window.location.pathname, token }),
      });
      setPublishing(response.ok ? "done" : "failed");
    } catch {
      setPublishing("failed");
    }
    window.setTimeout(() => setPublishing("idle"), 4000);
  };

  if (!canEdit || !targets.length) return null;

  /* Group targets by their `group` field for visual clustering. */
  const groups: { label: string; items: EditTarget[] }[] = [];
  const seen = new Map<string, EditTarget[]>();

  for (const t of targets) {
    const g = t.group || "";
    if (!seen.has(g)) {
      const items: EditTarget[] = [];
      seen.set(g, items);
      groups.push({ label: g, items });
    }
    seen.get(g)!.push(t);
  }

  /** Scroll to a section anchor on the current page. */
  const scrollTo = (section: string) => {
    const el = document.getElementById(section);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setOpen(false);
    }
  };

  return (
    <div className={`editbar${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="editbar-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close edit menu" : "Open edit menu"}
      >
        <span className="editbar-dot" aria-hidden="true" />
        ✏️ Edit
      </button>

      {open && (
        <div className="editbar-panel">
          <p className="editbar-title">Sửa nội dung trang này</p>
          {groups.map((group) => (
            <div key={group.label || "__default"}>
              {group.label && (
                <p style={{
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#8c8f94",
                  margin: "12px 0 4px",
                  fontWeight: 700,
                }}>
                  {group.label}
                </p>
              )}
              <ul>
                {group.items.map((target) => (
                  <li key={target.url + (target.section || "")}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <a href={target.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1 }}>
                        {target.label}
                      </a>
                      {target.section && (
                        <button
                          type="button"
                          onClick={() => scrollTo(target.section!)}
                          title={`Cuộn tới phần "${target.section}"`}
                          style={{
                            background: "none",
                            border: "1px solid #c3c4c7",
                            borderRadius: "3px",
                            padding: "2px 6px",
                            fontSize: "11px",
                            cursor: "pointer",
                            color: "#2271b1",
                            whiteSpace: "nowrap",
                          }}
                        >
                          👁 Xem
                        </button>
                      )}
                    </div>
                    {target.hint && <span>{target.hint}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Saving in WordPress already pushes the page live. This is for the
              other case: content changed underneath it — a term photo, a
              related post — and this page has not been asked to catch up. */}
          <div style={{ borderTop: "1px solid #dcdcde", marginTop: "12px", paddingTop: "10px" }}>
            <button
              type="button"
              onClick={republish}
              disabled={publishing === "sending"}
              style={{
                width: "100%",
                background: publishing === "done" ? "#edfaef" : "none",
                border: "1px solid #c3c4c7",
                borderRadius: "3px",
                padding: "6px 8px",
                fontSize: "12px",
                cursor: publishing === "sending" ? "wait" : "pointer",
                color: publishing === "failed" ? "#b32d2e" : "#2271b1",
              }}
            >
              {publishing === "sending" && "Đang đăng lại…"}
              {publishing === "done" && "✓ Đã đăng lại — tải lại trang để xem"}
              {publishing === "failed" && "Không đăng được — kiểm tra cấu hình revalidate"}
              {publishing === "idle" && "⟳ Đăng lại trang này"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
