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
 * Who sees it, in order:
 *   `?asledit=1` — turn it on for this browser, remembered while the tab
 *                  lives. The quick way in, and the only one that works
 *                  before the plugin is uploaded or the Frontend URL is set.
 *   `?asledit=0` — turn it back off.
 *   otherwise    — ask WordPress. Signed in with permission to edit posts,
 *                  the bar appears on its own; a reader never sees it.
 *
 * The manual switch is safe to keep: every link here points at wp-admin,
 * which checks permission itself, and the republish button carries a token
 * only WordPress issues to a real editor.
 */
export function EditBar({ targets }: { targets: EditTarget[] }) {
  const [open, setOpen] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [token, setToken] = useState("");
  const [publishing, setPublishing] = useState<"idle" | "sending" | "done" | "failed">("idle");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const asked = params.get("asledit");

    if (asked === "0") {
      window.sessionStorage.removeItem("aat-edit-mode");
      setCanEdit(false);
      return;
    }
    if (asked === "1") window.sessionStorage.setItem("aat-edit-mode", "1");

    const forced = window.sessionStorage.getItem("aat-edit-mode") === "1";
    if (forced) setCanEdit(true);

    const origin = process.env.NEXT_PUBLIC_WP_URL;
    if (!origin) return;

    /* Asked either way: a forced bar still wants the token, so "republish"
       works for an editor who is also signed in. */
    const stop = new AbortController();
    fetch(`${origin.replace(/\/+$/, "")}/wp-json/absolute-asia/v1/me`, {
      credentials: "include",
      signal: stop.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      /* A reader gets `canEdit: false`, not an error — no console noise on a
         page that simply has no editor looking at it. */
      .then((body) => {
        if (body?.canEdit) setCanEdit(true);
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
