export function NativeFooter({ blocks = {} }: { blocks?: Record<string, string> }) {
  const hasDifference = Boolean(blocks.difference || blocks.differenceList);
  const hasConnect = Boolean(blocks.connect);
  const hasFooterBlocks = Boolean(blocks.footer || blocks.footerMiddle || blocks.footerImage || blocks.copyright);

  return (
    <>
      {hasDifference && (
        <section className="sec-difference">
          <div className="overlay"></div>
          <div className="col-full">
            <div dangerouslySetInnerHTML={{ __html: blocks.difference || "" }} />
            <div className="box-icon" dangerouslySetInnerHTML={{ __html: blocks.differenceList || "" }} />
          </div>
        </section>
      )}

      {hasConnect && (
        <section className="sec-specialist">
          <div className="col-full" dangerouslySetInnerHTML={{ __html: blocks.connect || "" }} />
        </section>
      )}

      <footer>
        {hasFooterBlocks ? (
          <>
            {blocks.footer && (
              <div className="site-footer">
                <div className="col-full" dangerouslySetInnerHTML={{ __html: blocks.footer }} />
              </div>
            )}
            {blocks.footerMiddle && (
              <div className="footer-mid">
                <div className="col-full" dangerouslySetInnerHTML={{ __html: blocks.footerMiddle }} />
              </div>
            )}
            {blocks.footerImage && (
              <div className="footer-img">
                <div className="col-full" dangerouslySetInnerHTML={{ __html: blocks.footerImage }} />
              </div>
            )}
            {blocks.copyright && (
              <div className="copyright">
                <div className="col-full" dangerouslySetInnerHTML={{ __html: blocks.copyright }} />
              </div>
            )}
          </>
        ) : (
          <div className="copyright">
            <div className="col-full">
              <p>&copy; {new Date().getFullYear()} Absolute Asia Tours (division of My Way Luxury Travel LLC). All rights reserved.</p>
            </div>
          </div>
        )}
      </footer>
    </>
  );
}
