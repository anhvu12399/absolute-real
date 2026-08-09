import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HomeTemplate from "@/components/home/HomeTemplate";
import { getHomeData } from "@/lib/home";

export const revalidate = 300;

/**
 * Native templates are dispatched on the WordPress template slug, mirroring the
 * template hierarchy the theme already uses. Anything not listed here never
 * reaches this page: middleware.ts rewrites unmigrated paths to /legacy, where
 * the WordPress-rendered HTML is proxied as before. Migrating a template means
 * adding a case here and its path to NATIVE_PATHS in middleware.ts.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { content } = await getHomeData();
  const seo = content.seo;
  return {
    title: seo?.title ?? content.title,
    description: seo?.description,
    alternates: { canonical: seo?.canonical ?? "/" },
    robots: { index: seo?.robots?.index !== false, follow: seo?.robots?.follow !== false },
    openGraph: {
      title: seo?.title ?? content.title,
      description: seo?.description,
      url: seo?.canonical ?? "/",
      type: "website",
      images: content.featuredMedia ? [{ url: content.featuredMedia.url }] : undefined,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  if (slug?.length) notFound();

  const data = await getHomeData();
  if (data.content.template !== "Content-home.php") notFound();

  return (
    <div id="primary" className="content-area">
      <main id="main" className="site-main">
        <HomeTemplate data={data} />
      </main>
    </div>
  );
}
