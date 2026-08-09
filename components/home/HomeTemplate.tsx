import WpImage from "@/components/WpImage";
import { HomeBanner, SnapCarousel } from "./HomeClient";
import { toLocalHref, type HomeData, type PostCard, type TermCard } from "@/lib/home";

function Html({ html, className }: { html?: string; className?: string }) {
  if (!html) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Mirrors parts/tour-item.php: image, title, comma-joined categories, duration. */
function TourItem({ post }: { post: PostCard }) {
  return (
    <div className="item tour-item">
      <a href={post.path}>
        {post.featuredMedia ? (
          <WpImage
            src={post.featuredMedia.url}
            alt={post.featuredMedia.alt}
            images={{
              [post.featuredMedia.url]: {
                ...post.featuredMedia,
                width: post.featuredMedia.width ?? 0,
                height: post.featuredMedia.height ?? 0,
                id: post.id,
                mime: "",
              },
            }}
            sizes="(max-width: 768px) 90vw, 320px"
          />
        ) : null}
        <span>{post.title}</span>
        <i className="fas fa-arrow-right" aria-hidden="true" />
      </a>
      <p className="add">{post.categories.map((term) => term.name).join(", ")}</p>
      <div className="cate-post">
        <p className="time">{post.duration}</p>
      </div>
    </div>
  );
}

function CardLink({ post, as = "div" }: { post: PostCard; as?: "div" | "li" }) {
  const Tag = as;
  return (
    <Tag className="item">
      <a href={post.path}>
        {post.featuredMedia ? (
          <WpImage
            src={post.featuredMedia.url}
            alt={post.featuredMedia.alt}
            images={{
              [post.featuredMedia.url]: {
                ...post.featuredMedia,
                width: post.featuredMedia.width ?? 0,
                height: post.featuredMedia.height ?? 0,
                id: post.id,
                mime: "",
              },
            }}
            sizes="(max-width: 768px) 90vw, 400px"
          />
        ) : null}
        <span>{post.title}</span>
        <i className="fas fa-arrow-right" aria-hidden="true" />
      </a>
    </Tag>
  );
}

function TermTile({ term, images, field }: { term: TermCard; images: HomeData["images"]; field: "banner" | "featured" }) {
  const image = term.acf?.[field] as string | undefined;
  const title = (term.acf?.custom_title as string | undefined) || term.name;
  return (
    <li>
      <a href={term.path ?? "#"}>
        <span>{title}</span>
        <WpImage src={image} images={images} alt={term.name} sizes="(max-width: 768px) 45vw, 300px" />
        <i className="fas fa-arrow-right" aria-hidden="true" />
      </a>
    </li>
  );
}

export default function HomeTemplate({ data }: { data: HomeData }) {
  const { acf, blogs, tours, hotels, categories, inspirations, images } = data;

  return (
    <>
      <HomeBanner slides={acf.slider_home ?? []} links={acf.sec01_links ?? []} images={images} />

      <section className="home-intro">
        <div className="content container">
          <Html className="left" html={acf.content_02} />
          <div className="right">
            {(acf.images_list ?? []).map((item, index) => (
              <div className="item-content" key={index}>
                <div className="wrap aat-tile">
                  <WpImage
                    src={item.image_sec02}
                    images={images}
                    alt={item.text_img_sec02 ?? ""}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="aat-tile-bg"
                  />
                  <a href={toLocalHref(item.link_sec02)} className="overlay" aria-hidden="true" tabIndex={-1} />
                  <a href={toLocalHref(item.link_sec02)} className="icon-item" aria-hidden="true" tabIndex={-1}>
                    <i className="fas fa-arrow-right" />
                  </a>
                  <a href={toLocalHref(item.link_sec02)} className="img-title">
                    {item.text_img_sec02}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-travel">
        <div className="home-container">
          <Html className="home-title" html={acf.sec03_title} />
          <div className="list-posts">
            {blogs.map((post) => (
              <CardLink key={post.id} post={post} />
            ))}
          </div>
          <div className="cate-list">
            <ul>
              {categories.map((term) => (
                <TermTile key={term.id} term={term} images={images} field="banner" />
              ))}
            </ul>
          </div>
          <div className="btn-link">
            {(acf.links_sec03 ?? []).map((link, index) => (
              <a key={index} href={toLocalHref(link.url_sec03)}>
                <span>{link.text_links_sec03}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="home-suggest">
        <div className="home-container">
          <Html className="home-title" html={acf.sec05_title} />
          <SnapCarousel className="tours-slider tour-slider" label="Suggested tours">
            {tours.map((post) => (
              <TourItem key={post.id} post={post} />
            ))}
          </SnapCarousel>
        </div>
      </section>

      <section className="home-travel boxhotel">
        <div className="home-container">
          <Html className="home-title" html={acf.sec11_title} />
          <div className="cate-list">
            <ul>
              {hotels.map((post) => (
                <CardLink key={post.id} post={post} as="li" />
              ))}
            </ul>
          </div>
          <div className="btn-link">
            {(acf.links_sec11 ?? []).map((link, index) => (
              <a key={index} href={toLocalHref(link.url_sec11)}>
                <span>{link.text_links_sec11?.trim()}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="home-escape">
        <div className="home-container">
          <Html className="home-title" html={acf.sec04_title} />
          <div className="list-posts">
            {inspirations.map((term) => (
              <div className="item" key={term.id}>
                <a href={term.path ?? "#"}>
                  <WpImage
                    src={term.acf?.featured as string | undefined}
                    images={images}
                    alt={term.name}
                    sizes="(max-width: 768px) 90vw, 320px"
                  />
                  <span>{term.name}</span>
                  <i className="fas fa-arrow-right" aria-hidden="true" />
                </a>
              </div>
            ))}
          </div>
          <div className="btn-link">
            <a href={toLocalHref(acf.button_link_sec04)}>{acf.button_text_sec04}</a>
          </div>
        </div>
      </section>

      <section className="home-reviews">
        <div className="sec-rv">
          <div className="container">
            <h2 className="title">What our clients say about us</h2>
            <SnapCarousel className="reviews" label="Client reviews">
              {(acf.slide_review ?? []).map((review, index) => (
                <div className="box-rv" key={index}>
                  <div className="box-header">
                    <div className="avatar">
                      <WpImage src={review.avatar} images={images} alt="avatar" sizes="80px" />
                    </div>
                    <div className="profile">
                      <h4 className="user-name">{review.user_name}</h4>
                      <span className="date">{review.date}</span>
                      <span className="star" aria-label={`${review.vote} out of 5`}>
                        {"\u2605".repeat(Math.max(1, Math.min(5, Number(review.vote) || 1)))}
                      </span>
                    </div>
                  </div>
                  <div className="box-content">
                    <div style={{ height: 100, overflowY: "auto" }}>
                      <p>{review.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </SnapCarousel>
            <div className="ti-footer">
              <Html html={acf.name_web_review} />
              <WpImage src={acf.logo_web_review} images={images} alt="Tripadvisor" sizes="120px" />
              <a href={acf.link_web_review ?? "#"} target="_blank" rel="noopener noreferrer">
                <strong>{acf.text_review}</strong>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
