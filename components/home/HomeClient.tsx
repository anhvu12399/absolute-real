"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import WpImage from "@/components/WpImage";
import { toLocalHref, type HomeAcf, type ImageMap } from "@/lib/home";

/**
 * Hero slider. The WordPress template used Swiper with effect:"fade" and a 10s
 * autoplay. That is ~150KB of JavaScript for a crossfade, so it is reimplemented
 * here: slides stack absolutely and opacity is driven by React state. Class names
 * match the original markup so the theme stylesheet still applies; the fade
 * layout itself lives in app/native.css since Swiper's CSS is no longer loaded.
 */
export function HomeBanner({
  slides,
  links,
  images,
}: {
  slides: NonNullable<HomeAcf["slider_home"]>;
  links: NonNullable<HomeAcf["sec01_links"]>;
  images: ImageMap;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % count), 10000);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (!count) return null;

  return (
    <section className="home-banner">
      <div
        className="swiper mySwiper aat-fade"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="swiper-wrapper">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`swiper-slide${index === active ? " swiper-slide-active" : ""}`}
              aria-hidden={index !== active}
            >
              <div
                className="overlay"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(31, 29, 29, 0.00) 12.2%, #2C2A2A 100%), linear-gradient(0deg, rgba(26, 26, 26, 0.05) 0%, rgba(26, 26, 26, 0.10) 100%)",
                }}
              />
              <WpImage
                src={slide.bg_banner}
                images={images}
                className="img-banner"
                priority={index === 0}
                sizes="100vw"
              />
              <div className="title">
                <h1 className="title-banner">{slide.title_banner?.trim()}</h1>
                <p className="content-banner">{slide.content_banner}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="swiper-pagination" role="tablist" aria-label="Banner slides">
          {slides.map((slide, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={slide.title_banner?.trim() || `Slide ${index + 1}`}
              className={`swiper-pagination-bullet${index === active ? " swiper-pagination-bullet-active" : ""}`}
              onClick={() => setActive(index)}
            />
          ))}
        </div>
      </div>
      <div className="box-list">
        {links.map((link, index) => (
          <div className="item" key={index}>
            <a href={toLocalHref(link.link)}>
              <span>{link.name_links}</span>
              <i className="fas fa-plus" aria-hidden="true" />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Horizontal carousel used for the tour and review rows. The theme loaded Owl
 * Carousel, Slick and jQuery for these; CSS scroll-snap gives the same behaviour
 * natively, keeps keyboard and touch scrolling for free, and works before
 * hydration. The arrow buttons are progressive enhancement only.
 */
export function SnapCarousel({
  className,
  children,
  label,
}: {
  className?: string;
  children: React.ReactNode;
  label: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const sync = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setEdges({ start: track.scrollLeft <= 4, end: track.scrollLeft >= max - 4 });
  }, []);

  useEffect(() => {
    sync();
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(sync);
    observer.observe(track);
    return () => observer.disconnect();
  }, [sync]);

  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const first = track.firstElementChild as HTMLElement | null;
    const step = first ? first.getBoundingClientRect().width + 20 : track.clientWidth * 0.8;
    track.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  return (
    <div className="aat-carousel">
      <div
        className={`aat-track${className ? ` ${className}` : ""}`}
        ref={trackRef}
        onScroll={sync}
        role="group"
        aria-label={label}
        tabIndex={0}
      >
        {children}
      </div>
      <button
        type="button"
        className="aat-nav aat-prev"
        aria-label="Previous"
        onClick={() => scrollBy(-1)}
        disabled={edges.start}
      >
        <i className="fas fa-arrow-left" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="aat-nav aat-next"
        aria-label="Next"
        onClick={() => scrollBy(1)}
        disabled={edges.end}
      >
        <i className="fas fa-arrow-right" aria-hidden="true" />
      </button>
    </div>
  );
}
