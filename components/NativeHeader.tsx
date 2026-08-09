import Image from "next/image";
import Link from "next/link";
import type { MenuItem } from "@/lib/wp";

function href(url: string) {
  try {
    const parsed = new URL(url);
    return /(^|\.)absoluteasiatours\.com$/i.test(parsed.hostname) ? `${parsed.pathname}${parsed.search}` : url;
  } catch { return url; }
}

export function NativeHeader({ logo, menu, phoneLabel, phone }: { logo: string; menu: MenuItem[]; phoneLabel: string; phone: string }) {
  const roots = menu.filter((item) => item.parent === 0);
  return <header className="native-header">
    <div className="native-header__inner">
      <Link href="/" className="native-logo" aria-label="Absolute Asia Tours home">
        {logo ? <Image src={logo} width={205} height={98} priority alt="Absolute Asia Tours" /> : <span>ABSOLUTE ASIA TOURS</span>}
      </Link>
      <nav className="native-nav" aria-label="Primary navigation">
        {roots.map((item) => {
          const children = menu.filter((child) => child.parent === item.id);
          return <div className="native-nav__item" key={item.id}>
            <Link href={href(item.url)} target={item.target || undefined}>{item.title}</Link>
            {children.length > 0 && <div className="native-submenu">
              {children.map((child) => <Link href={href(child.url)} key={child.id}>{child.title}</Link>)}
            </div>}
          </div>;
        })}
      </nav>
      <div className="native-phone"><small>{phoneLabel}</small><a href={`tel:${phone.replace(/[^+\d]/g, "")}`}>{phone}</a></div>
    </div>
  </header>;
}
