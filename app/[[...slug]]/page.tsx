import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HomeTemplate from "@/components/home/HomeTemplate";
import { SingleTourTemplate } from "@/components/tour/SingleTourTemplate";
import { TourArchiveTemplate } from "@/components/tour/TourArchiveTemplate";
import { DestinationTemplate } from "@/components/destination/DestinationTemplate";
import { BlogTemplate } from "@/components/blog/BlogTemplate";
import { LeadForm } from "@/components/LeadForm";
import { getHomeData } from "@/lib/home";
import { getContentByPath, getSeo } from "@/lib/wp";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const path = !slug || slug.length === 0 ? "/" : `/${slug.join("/")}`;

  if (path === "/") {
    try {
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
        },
      };
    } catch {
      return { title: "Absolute Asia Tours" };
    }
  }

  const content = await getContentByPath(path);
  if (!content) return { title: "Page Not Found | Absolute Asia Tours" };

  const seo = await getSeo(path, content.seo);
  return {
    title: seo?.title || content.title,
    description: seo?.description || content.excerpt,
    alternates: { canonical: seo?.canonical || path },
    robots: { index: seo?.robots?.index !== false, follow: seo?.robots?.follow !== false },
    openGraph: {
      title: seo?.title || content.title,
      description: seo?.description || content.excerpt,
      url: seo?.canonical || path,
      type: "article",
      images: content.featuredMedia ? [{ url: content.featuredMedia.url }] : undefined,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const path = !slug || slug.length === 0 ? "/" : `/${slug.join("/")}`;

  // Homepage Dispatcher
  if (path === "/") {
    try {
      const data = await getHomeData();
      return (
        <div id="primary" className="content-area">
          <main id="main" className="site-main">
            <HomeTemplate data={data} />
          </main>
        </div>
      );
    } catch {
      notFound();
    }
  }

  // Fetch page content for all other paths
  const content = await getContentByPath(path);
  if (!content) notFound();

  // Template Dispatcher
  const type = content.type;
  const template = content.template || "";

  if (type === "trip" || type === "post" || template.includes("single.php")) {
    return <SingleTourTemplate content={content} />;
  }

  if (type === "places-to-go" || template.includes("destinations.php")) {
    return <DestinationTemplate content={content} />;
  }

  if (type === "blogs" || type === "travel-guides" || type === "things-to-do") {
    return <BlogTemplate content={content} />;
  }

  // Generic Native Page Layout
  return (
    <article className="generic-native-page">
      <section className="page-hero">
        <div className="container">
          <h1 className="page-title">{content.title}</h1>
        </div>
      </section>
      <div className="container content-shell">
        <main className="wp-content" dangerouslySetInnerHTML={{ __html: content.content }} />
        <aside className="page-sidebar">
          <div className="enquiry-card sticky-card">
            <h2>Plan Your Asia Trip</h2>
            <LeadForm />
          </div>
        </aside>
      </div>
    </article>
  );
}
