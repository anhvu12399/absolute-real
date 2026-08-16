import type { Metadata } from "next";
import Link from "next/link";

/**
 * The page carried no metadata of its own, so a 404 published the site title
 * twice — "Absolute Asia Tours | Absolute Asia Tours" — and said nothing about
 * being a dead end. `noindex` matters more: without it a crawler that reaches
 * a broken link is invited to keep the URL.
 */
export const metadata: Metadata = {
  title: "Page not found",
  description: "That page is no longer here. Browse our destinations, journeys and stays instead.",
  robots: { index: false, follow: true },
};

/** Somewhere to go next, rather than one link back to the top. */
const WAYS_ON = [
  { href: "/destinations/", label: "Destinations" },
  { href: "/tours/", label: "Private journeys" },
  { href: "/where-to-stay/", label: "Where to stay" },
  { href: "/inspirations/", label: "Travel inspiration" },
];

export default function NotFound() {
  return (
    <section className="not-found">
      <p className="eyebrow">404</p>
      <h1>This journey has moved</h1>
      <p>
        The page you asked for is not here. It may have been renamed, or the link that
        brought you may be out of date.
      </p>

      <ul className="not-found-ways">
        {WAYS_ON.map((way) => (
          <li key={way.href}>
            <Link href={way.href}>{way.label}</Link>
          </li>
        ))}
      </ul>

      <Link href="/" className="btn btn-line-ink">
        Return home
      </Link>
    </section>
  );
}
