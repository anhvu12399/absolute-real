export function V2Icons() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        {/* The brand mark, measured off the original artwork.

            The letter was not drawn by eye. The source PNG's alpha channel is
            a clean hole where the A is, so scanning rows and columns gives the
            four stroke edges and the two bar edges, each fitted by least
            squares; the result differs from the original by 1.9% of pixels,
            nearly all of it antialiasing. Three things an eyeballed version
            got wrong: the A is narrow rather than splayed, its apex is a
            virtual point ABOVE the disc so the top is the letter cut off by
            the circle, and the crossbar rises to the right and tapers.

            Defined once here and referenced with <use>, so the mask and
            gradient ids exist exactly once however often the logo appears. */}
        <linearGradient id="brand-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E0BA55" />
          <stop offset="1" stopColor="#B98F28" />
        </linearGradient>
        <mask id="brand-cut" maskUnits="userSpaceOnUse" x="-10" y="-10" width="84" height="84">
          <rect x="-10" y="-10" width="84" height="84" fill="#fff" />
          <g fill="#000">
            <path d="M34.4 -8L36.96 -8L-0.69 72L-3.15 72Z" />
            <path d="M22.08 -8L29.79 -8L66.54 72L58.91 72Z" />
            <path d="M-4 39.42L70 29.26L70 34.75L-4 39.85Z" />
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
