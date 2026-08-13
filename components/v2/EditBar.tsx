"use client";

import { useState } from "react";
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
 * Renders nothing unless NEXT_PUBLIC_SHOW_EDIT_LINKS is on, so a visitor never
 * sees it.
 */
export function EditBar({ targets }: { targets: EditTarget[] }) {
  const [open, setOpen] = useState(false);
  if (!targets.length) return null;

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
