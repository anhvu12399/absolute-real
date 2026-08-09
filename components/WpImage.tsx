import Image from "next/image";
import type { ImageMap } from "@/lib/home";

type Props = {
  src?: string | null;
  images?: ImageMap;
  alt?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  /** Render as a background layer filling the parent (parent needs position). */
  fill?: boolean;
};

/**
 * ACF image fields here are configured with return_format=url, so the payload has
 * no dimensions and no alt text. The bridge resolves both from the attachment;
 * this component uses that metadata when available and falls back to a fill
 * layout when the URL could not be matched to an attachment (external images,
 * or files uploaded outside the media library).
 */
export default function WpImage({ src, images, alt, className, priority, sizes, fill }: Props) {
  if (!src?.trim()) return null;
  const url = src.trim();
  const meta = images?.[url];
  const resolvedAlt = alt ?? meta?.alt ?? "";

  // SVGs are not optimizable by Vercel and animated GIFs lose their animation.
  if (/\.(svg|gif)(?:[?#]|$)/i.test(url)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={resolvedAlt} className={className} loading="lazy" decoding="async" />;
  }

  if (fill || !meta) {
    return (
      <Image
        src={url}
        alt={resolvedAlt}
        className={className}
        fill
        sizes={sizes ?? "100vw"}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src={url}
      alt={resolvedAlt}
      className={className}
      width={meta.width}
      height={meta.height}
      sizes={sizes ?? "(max-width: 768px) 100vw, 1200px"}
      priority={priority}
    />
  );
}
