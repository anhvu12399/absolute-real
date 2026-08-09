"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type HeroSlide = { bg_banner: string; title_banner: string; content_banner: string; link_button?: string };

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [slides.length]);
  if (!slides.length) return null;
  return <section className="native-hero" aria-roledescription="carousel">
    {slides.map((slide, index) => <article className={`native-hero__slide ${index === active ? "is-active" : ""}`} aria-hidden={index !== active} key={`${slide.title_banner}-${index}`}>
      <Image src={slide.bg_banner.trim()} alt="" fill priority={index === 0} sizes="100vw" />
      <div className="native-hero__shade" />
      <div className="native-hero__copy"><h1>{slide.title_banner}</h1><p>{slide.content_banner}</p></div>
    </article>)}
    <div className="native-hero__dots">{slides.map((_, index) => <button aria-label={`Show slide ${index + 1}`} className={index === active ? "is-active" : ""} onClick={() => setActive(index)} key={index} />)}</div>
  </section>;
}
