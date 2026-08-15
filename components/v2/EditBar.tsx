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
 * `?asledit=1` enables the controls for the current browser tab. The flag is
 * remembered in sessionStorage so the controls stay visible while the editor
 * follows internal links. `?asledit=0` turns them off again.
 */
export function EditBar({ targets }: { targets: EditTarget[] }) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get("asledit");

    if (requestedMode === "1") {
      window.sessionStorage.setItem("aat-edit-mode", "1");
      setEnabled(true);
      return;
    }

    if (requestedMode === "0") {
      window.sessionStorage.removeItem("aat-edit-mode");
      setEnabled(false);
      return;
    }

    setEnabled(window.sessionStorage.getItem("aat-edit-mode") === "1");
  }, []);

  if (!enabled || !targets.length) return null;

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
        </div>
      )}
    </div>
  );
}
