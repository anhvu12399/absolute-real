export function NativeFooter({ blocks = {} }: { blocks?: Record<string, string> }) {
  const hasDifference = Boolean(blocks.difference || blocks.differenceList);
  const hasConnect = Boolean(blocks.connect);
  const hasFooterBlocks = Boolean(blocks.footer || blocks.footerMiddle || blocks.footerImage || blocks.copyright);

  return (
    <>
      {hasDifference && (
        <section className="native-difference">
          <div dangerouslySetInnerHTML={{ __html: blocks.difference || "" }} />
          <div className="native-difference__list" dangerouslySetInnerHTML={{ __html: blocks.differenceList || "" }} />
        </section>
      )}

      {hasConnect && (
        <section className="native-specialist" dangerouslySetInnerHTML={{ __html: blocks.connect || "" }} />
      )}

      <footer className="native-footer site-footer">
        {hasFooterBlocks ? (
          <>
            {blocks.footer && <div dangerouslySetInnerHTML={{ __html: blocks.footer }} />}
            {blocks.footerMiddle && <div dangerouslySetInnerHTML={{ __html: blocks.footerMiddle }} />}
            {blocks.footerImage && <div dangerouslySetInnerHTML={{ __html: blocks.footerImage }} />}
            {blocks.copyright && <div dangerouslySetInnerHTML={{ __html: blocks.copyright }} />}
          </>
        ) : (
          <div className="container">
            <div className="footer-brand">
              <span className="brand-title">ABSOLUTE ASIA TOURS</span>
              <p className="brand-copy">Private, tailor-made luxury journeys across Asia, designed by local travel experts.</p>
            </div>
            <div className="copyright">
              <p>&copy; {new Date().getFullYear()} Absolute Asia Tours. All rights reserved.</p>
            </div>
          </div>
        )}
      </footer>
    </>
  );
}
