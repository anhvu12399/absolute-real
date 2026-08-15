"use client";

/**
 * The "back to top" control that sits in every sticky sub-nav.
 *
 * The same markup was pasted into six templates, which meant six places to fix
 * a wording change and six chances for one of them to drift. It is UI chrome,
 * not content, so it stays in the code rather than becoming another WordPress
 * field nobody would ever edit.
 */
export function BackToTop({ label = "Back to Top" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "0.85rem",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "var(--ink)",
        paddingBottom: "0.3rem",
      }}
    >
      {label}
      <svg style={{ width: "16px", height: "16px", transform: "rotate(-90deg)" }}>
        <use href="#i-arrow" />
      </svg>
    </button>
  );
}
