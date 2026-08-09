export function NativeFooter({ blocks }: { blocks: Record<string, string> }) {
  return <>
    <section className="native-difference"><div dangerouslySetInnerHTML={{ __html: blocks.difference || "" }} /><div className="native-difference__list" dangerouslySetInnerHTML={{ __html: blocks.differenceList || "" }} /></section>
    <section className="native-specialist" dangerouslySetInnerHTML={{ __html: blocks.connect || "" }} />
    <footer className="native-footer">
      <div dangerouslySetInnerHTML={{ __html: blocks.footer || "" }} />
      <div dangerouslySetInnerHTML={{ __html: blocks.footerMiddle || "" }} />
      <div dangerouslySetInnerHTML={{ __html: blocks.footerImage || "" }} />
      <div dangerouslySetInnerHTML={{ __html: blocks.copyright || "" }} />
    </footer>
  </>;
}
