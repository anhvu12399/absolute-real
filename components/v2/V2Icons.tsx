export function V2Icons() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
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
