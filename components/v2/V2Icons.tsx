export function V2Icons() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        {/* The brand mark, as vector.
            WordPress holds it as a 765x547 PNG on the public domain, which is
            both soft at every size the header asks for and one DNS change away
            from 404. Defined once here and referenced with <use>, so the mask
            and gradient ids exist exactly once in the document however many
            times the logo appears. */}
        <linearGradient id="brand-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E0BA55" />
          <stop offset="1" stopColor="#B98F28" />
        </linearGradient>
        <mask id="brand-cut">
          <rect width="64" height="64" fill="#fff" />
          <g stroke="#000" fill="none" strokeLinecap="butt">
            {/* One polyline, not two strokes meeting: separate strokes leave a
                notch where they cross, and this letterform's apex is a point. */}
            <path d="M9 59 L30.5 5 L52 59" strokeWidth="8.5" strokeLinejoin="miter" strokeMiterlimit="8" />
            <path d="M-2 38.5 H66" strokeWidth="5.5" />
          </g>
        </mask>
        <symbol id="brand-mark" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="31" fill="url(#brand-leaf)" mask="url(#brand-cut)" />
        </symbol>
        <symbol id="i-phone" viewBox="0 0 24 24">
          <path d="M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2C10.5 20 4 13.5 4 5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        </symbol>
        <symbol id="i-menu" viewBox="0 0 24 24">
          <line x1="3" y1="7" x2="21" y2="7" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="3" y1="17" x2="21" y2="17" stroke="currentColor" strokeWidth="1.5"/>
        </symbol>
        <symbol id="i-close" viewBox="0 0 24 24">
          <line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="1.5"/>
        </symbol>
        <symbol id="i-arrow" viewBox="0 0 24 24">
          <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.5"/>
          <polyline points="14,6 20,12 14,18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </symbol>
        <symbol id="i-arrow-up-right" viewBox="0 0 24 24">
          <line x1="7" y1="17" x2="17" y2="7" stroke="currentColor" strokeWidth="1.5"/>
          <polyline points="7,7 17,7 17,17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </symbol>
        <symbol id="i-chevron-down" viewBox="0 0 24 24">
          <polyline points="6,9 12,15 18,9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </symbol>
      </defs>
    </svg>
  );
}

export function ArrowIcon() {
  return <svg><use href="#i-arrow"></use></svg>;
}
