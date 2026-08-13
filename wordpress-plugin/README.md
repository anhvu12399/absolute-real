# Absolute Asia (WordPress plugin)

One plugin runs the whole headless backend. Copy `absolute-asia/` into
`wp-content/plugins/` and activate it.

It replaces the earlier split — `absolute-asia-core`, `absolute-asia-headless`,
`absolute-asia-headless-extras`, and the loose `absolute-asia-fields.php`.
**Deactivate and delete those first:** they declare the same post types and REST
routes, and running both at once fatals on duplicate function names. The plugin
shows an admin notice if it detects one of them still active.

```
absolute-asia/
  absolute-asia.php          bootstrap, public/private type lists
  includes/post-types.php    CPTs + taxonomies (rewrite slugs match legacy URLs)
  includes/fields.php        every ACF group the Next.js templates read
  includes/admin-repeaters.php  editing UI for the JSON repeaters
  includes/rest-api.php      the /absolute-asia/v1 bridge the frontend calls
  includes/importer.php      pulls content + images from the legacy site
  includes/revalidate.php    signed cache purge to the frontend
```

## wp-config.php

```php
define('AAT_REVALIDATE_URL', 'https://your-frontend.example.com/api/revalidate');
define('AAT_REVALIDATE_SECRET', 'same value as WORDPRESS_REVALIDATE_SECRET on the frontend');
```

## Bridge routes

| Route | Used for |
| --- | --- |
| `/wp-json/absolute-asia/v1/content?path=…` | one page/post with ACF, terms, resolved relations, SEO |
| `/wp-json/absolute-asia/v1/content-batch?include=1,2` | many at once |
| `/wp-json/absolute-asia/v1/site` | menus, logo, contact, front page |
| `/wp-json/absolute-asia/v1/archive?type=tour&page=1` | paginated listings |
| `/wp-json/absolute-asia/v1/terms?taxonomy=category` | taxonomy terms |
| `/wp-json/absolute-asia/v1/search?q=…` | search |
| `/wp-json/absolute-asia/v1/images?urls=…` | url → attachment metadata |
| `/wp-json/absolute-asia/v1/posts?include=…` | ordered cards for relationship fields |

Only published content from the public type allowlist is exposed. `order` and
`booking` are forced private; the `homepage` type is private and reachable only
as the front page at `/`.

## Field contract

ACF free has no repeater field, so every repeater is one textarea holding a JSON
array — `includes/admin-repeaters.php` renders the table UI, and the bridge
decodes the JSON back into real arrays before the frontend sees it. The keys in
`aat_repeater_specs()` are exactly the keys the templates read; renaming one
silently drops that section back to its placeholder content.

## Importing the legacy site

**Tools → Absolute Asia Import.** The legacy install runs the same bridge, so the
importer reads full ACF over HTTP — no database dump needed.

- Set the source site (default `https://www.absoluteasiatours.com`).
- "Import everything" walks every type in batches, then resolves relationships.
- Images are sideloaded once and cached by `_aat_source_url`, including the ones
  embedded in post content, which get rewritten to the new URLs.
- Re-runs update in place: rows are matched by `_aat_source_id`, then by slug.
  This is what prevents the `-2` duplicate slugs an earlier one-off script left
  behind.
- The danger zone resets a chosen type to Trash (not permanent) and requires
  typing `DELETE`.

Legacy → new field mapping lives in `aat_map_fields()` / `aat_map_homepage()`.
Highlights: `travel_&_map` → `itinerary` (with latitude/longitude for the map),
`tour_price` → duration/route/level/code, `content_left`/`content_right` →
inclusions/exclusions, `slider`/`gallery`/`list_img` → `gallery`,
`slide_review` → `testimonials`, `slider_home` → `home_banner_slider`.
