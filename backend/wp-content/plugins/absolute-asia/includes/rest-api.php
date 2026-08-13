<?php
/**
 * Read-only bridge API consumed by the Next.js frontend.
 *
 * Route shapes are part of the frontend contract (see lib/wp.ts):
 *   /absolute-asia/v1/content?path=…      one page/post with ACF + SEO
 *   /absolute-asia/v1/content-batch?include=1,2
 *   /absolute-asia/v1/site                menu, logo, contact, front page
 *   /absolute-asia/v1/search?q=…
 *   /absolute-asia/v1/archive?type=…      paginated listings
 *   /absolute-asia/v1/terms?taxonomy=…
 *   /absolute-asia/v1/images?urls=…       url -> attachment metadata
 *   /absolute-asia/v1/posts?include=…     ordered cards for relationship fields
 */

if (!defined('ABSPATH')) exit;

add_action('rest_api_init', function () {
    $public = ['methods' => 'GET', 'permission_callback' => '__return_true'];

    register_rest_route('absolute-asia/v1', '/content', $public + [
        'callback' => 'aat_rest_content',
        'args' => ['path' => ['required' => true, 'sanitize_callback' => 'sanitize_text_field']],
    ]);
    register_rest_route('absolute-asia/v1', '/content-batch', $public + [
        'callback' => 'aat_rest_content_batch',
        'args' => ['include' => ['required' => true, 'sanitize_callback' => 'sanitize_text_field']],
    ]);
    register_rest_route('absolute-asia/v1', '/site', $public + ['callback' => 'aat_rest_site']);
    register_rest_route('absolute-asia/v1', '/search', $public + [
        'callback' => 'aat_rest_search',
        'args' => ['q' => ['required' => true, 'sanitize_callback' => 'sanitize_text_field']],
    ]);
    register_rest_route('absolute-asia/v1', '/archive', $public + ['callback' => 'aat_rest_archive']);
    register_rest_route('absolute-asia/v1', '/terms', $public + ['callback' => 'aat_rest_terms']);
    register_rest_route('absolute-asia/v1', '/images', $public + [
        'callback' => 'aat_rest_images',
        'args' => ['urls' => ['required' => true]],
    ]);
    register_rest_route('absolute-asia/v1', '/posts', $public + [
        'callback' => 'aat_rest_posts',
        'args' => ['include' => ['required' => true, 'sanitize_callback' => 'sanitize_text_field']],
    ]);
});

/* ───────────────────────────── helpers ───────────────────────────── */

/**
 * The front page lives in the private `homepage` CPT; page_on_front is the
 * fallback for installs that still use a normal page.
 */
function aat_front_page_post() {
    $posts = get_posts(['post_type' => 'homepage', 'posts_per_page' => 1, 'post_status' => 'publish']);
    if ($posts) return $posts[0];
    $front_id = (int) get_option('page_on_front');
    return $front_id ? get_post($front_id) : null;
}

/**
 * Repeaters are stored as a JSON string in an ACF textarea, so decode them here
 * rather than making every consumer re-implement the parse.
 */
function aat_decode_repeaters($value) {
    if (is_string($value)) {
        $trimmed = trim($value);
        if ($trimmed !== '' && $trimmed[0] === '[' && substr($trimmed, -1) === ']') {
            $decoded = json_decode($trimmed, true);
            if (is_array($decoded)) return $decoded;
        }
        return $value;
    }
    if (is_array($value)) {
        foreach ($value as $key => $item) $value[$key] = aat_decode_repeaters($item);
    }
    return $value;
}

function aat_acf_payload($post_id) {
    if (!function_exists('get_fields')) return (object) [];
    $fields = get_fields($post_id);
    if (!is_array($fields) || !$fields) return (object) [];
    return aat_decode_repeaters($fields);
}

function aat_media_payload($attachment_id) {
    if (!$attachment_id) return null;
    $src = wp_get_attachment_image_src($attachment_id, 'full');
    if (!$src) return null;
    return [
        'id' => (int) $attachment_id,
        'url' => $src[0],
        'width' => (int) $src[1],
        'height' => (int) $src[2],
        'alt' => (string) get_post_meta($attachment_id, '_wp_attachment_image_alt', true),
    ];
}

function aat_term_list($post_id) {
    $out = [];
    foreach (aat_public_taxonomies() as $taxonomy) {
        $terms = get_the_terms($post_id, $taxonomy);
        if (!$terms || is_wp_error($terms)) continue;
        foreach ($terms as $term) {
            $link = get_term_link($term);
            $out[] = [
                'id' => (int) $term->term_id,
                'taxonomy' => $term->taxonomy,
                'name' => html_entity_decode($term->name, ENT_QUOTES, 'UTF-8'),
                'slug' => $term->slug,
                'path' => is_wp_error($link) ? null : wp_parse_url($link, PHP_URL_PATH),
            ];
        }
    }
    return $out;
}

/** Compact shape used for cards and relationship fields. */
function aat_card_payload($post) {
    if (is_numeric($post)) $post = get_post((int) $post);
    if (!$post || $post->post_status !== 'publish') return null;

    $acf = function_exists('get_fields') ? (get_fields($post->ID) ?: []) : [];
    $thumb = get_post_thumbnail_id($post->ID);
    $hero = !empty($acf['hero_image']) && is_string($acf['hero_image']) ? $acf['hero_image'] : null;
    $media = aat_media_payload($thumb);
    if (!$media && $hero) $media = ['id' => 0, 'url' => $hero, 'width' => 0, 'height' => 0, 'alt' => get_the_title($post->ID)];

    return [
        'id' => $post->ID,
        'type' => $post->post_type,
        'slug' => $post->post_name,
        'path' => wp_parse_url(get_permalink($post->ID), PHP_URL_PATH),
        'title' => html_entity_decode(get_the_title($post->ID), ENT_QUOTES, 'UTF-8'),
        'excerpt' => wp_strip_all_tags(get_the_excerpt($post->ID)),
        'featuredMedia' => $media,
        'duration' => (string) ($acf['duration_label'] ?? ($acf['duration_days'] ? $acf['duration_days'] . ' Days' : '')),
        'price' => (string) ($acf['starting_price'] ?? ''),
        'categories' => aat_term_list($post->ID),
    ];
}

/** Turns relationship id lists into ready-to-render cards, order preserved. */
function aat_resolve_related($acf) {
    $keys = [
        'featured_stays', 'featured_tours', 'related_tours', 'related_places',
        'related_guides', 'related_hotels', 'related_things', 'city',
    ];
    $out = [];
    foreach ($keys as $key) {
        if (empty($acf[$key])) continue;
        $ids = is_array($acf[$key]) ? $acf[$key] : [$acf[$key]];
        $cards = [];
        foreach ($ids as $id) {
            if (!is_numeric($id)) continue;
            $card = aat_card_payload((int) $id);
            if ($card) $cards[] = $card;
        }
        if ($cards) $out[$key] = $cards;
    }
    return $out;
}

function aat_content_payload($post, $path_override = null) {
    $id = $post->ID;
    $thumb_id = get_post_thumbnail_id($id);
    $rank_title = get_post_meta($id, 'rank_math_title', true);
    $rank_description = get_post_meta($id, 'rank_math_description', true);
    $acf = aat_acf_payload($id);
    $acf_array = is_array($acf) ? $acf : [];

    return [
        'id' => $id,
        'type' => $post->post_type,
        'slug' => $post->post_name,
        'path' => $path_override ?: wp_parse_url(get_permalink($id), PHP_URL_PATH),
        'status' => $post->post_status,
        'title' => html_entity_decode(get_the_title($id), ENT_QUOTES, 'UTF-8'),
        'excerpt' => apply_filters('the_excerpt', get_the_excerpt($id)),
        'content' => apply_filters('the_content', $post->post_content),
        'date' => get_post_time(DATE_W3C, true, $id),
        'modified' => get_post_modified_time(DATE_W3C, true, $id),
        'template' => get_page_template_slug($id),
        'featuredMedia' => aat_media_payload($thumb_id),
        'terms' => aat_term_list($id),
        'acf' => $acf,
        'related' => (object) aat_resolve_related($acf_array),
        'seo' => [
            'title' => $rank_title ? do_shortcode($rank_title) : get_the_title($id),
            'description' => $rank_description ?: wp_strip_all_tags(get_the_excerpt($id)),
            'canonical' => get_post_meta($id, 'rank_math_canonical_url', true) ?: get_permalink($id),
            'robots' => [
                'index' => get_post_meta($id, 'rank_math_robots', true) !== 'noindex',
                'follow' => true,
            ],
        ],
    ];
}

/* ───────────────────────────── routes ───────────────────────────── */

function aat_rest_content(WP_REST_Request $request) {
    $path = '/' . trim($request['path'], '/') . '/';
    if ($path === '//') $path = '/';

    if ($path === '/') {
        $front = aat_front_page_post();
        // The homepage CPT is not publicly queryable, so its permalink is a
        // query string - the frontend keys off "/" for the front page.
        if ($front) return rest_ensure_response(aat_content_payload($front, '/'));
    }

    $id = url_to_postid(home_url($path));
    $post = $id ? get_post($id) : null;

    // Legacy URLs that changed shape during the import still resolve by slug.
    if (!$post) {
        $slug = basename(untrailingslashit($path));
        $matches = $slug ? get_posts([
            'name' => $slug,
            'post_type' => aat_public_types(),
            'post_status' => 'publish',
            'posts_per_page' => 1,
        ]) : [];
        $post = $matches ? $matches[0] : null;
    }

    if (!$post || $post->post_status !== 'publish' || !in_array($post->post_type, aat_public_types(), true)) {
        return new WP_Error('aat_not_found', 'Content not found', ['status' => 404]);
    }
    return rest_ensure_response(aat_content_payload($post));
}

function aat_rest_content_batch(WP_REST_Request $request) {
    $ids = array_values(array_filter(array_map('absint', explode(',', $request['include']))));
    if (!$ids) return rest_ensure_response([]);
    $posts = get_posts([
        'post_type' => aat_public_types(),
        'post_status' => 'publish',
        'post__in' => $ids,
        'orderby' => 'post__in',
        'posts_per_page' => min(count($ids), 100),
    ]);
    return rest_ensure_response(array_map('aat_content_payload', $posts));
}

function aat_rest_search(WP_REST_Request $request) {
    $query = new WP_Query([
        's' => $request['q'],
        'post_type' => aat_public_types(),
        'post_status' => 'publish',
        'posts_per_page' => 20,
    ]);
    return rest_ensure_response(array_map('aat_content_payload', $query->posts));
}

function aat_menu_payload($location = 'primary') {
    $locations = get_nav_menu_locations();
    if (empty($locations[$location])) return [];
    $items = wp_get_nav_menu_items($locations[$location]) ?: [];
    return array_map(function ($item) {
        $url = $item->url;
        $path = wp_parse_url($url, PHP_URL_PATH);
        $host = wp_parse_url($url, PHP_URL_HOST);
        $internal = !$host || $host === wp_parse_url(home_url(), PHP_URL_HOST);
        return [
            'id' => (int) $item->ID,
            'parent' => (int) $item->menu_item_parent,
            'title' => html_entity_decode($item->title, ENT_QUOTES, 'UTF-8'),
            'url' => $internal && $path ? $path : $url,
            'target' => $item->target ?: '',
            'classes' => array_values(array_filter($item->classes ?: [])),
            'order' => (int) $item->menu_order,
        ];
    }, $items);
}

function aat_rest_site() {
    $front = aat_front_page_post();
    $front_id = $front ? $front->ID : 0;
    $field = function ($name) use ($front_id) {
        if (!$front_id || !function_exists('get_field')) return '';
        return (string) (get_field($name, $front_id) ?: '');
    };

    return rest_ensure_response([
        'name' => get_bloginfo('name'),
        'description' => get_bloginfo('description'),
        'url' => home_url('/'),
        'logo' => aat_site_logo(),
        'phoneLabel' => $field('text_phone'),
        'phone' => $field('phone'),
        'email' => $field('link_email_icon'),
        /* Promises the whole site makes, held once on the homepage rather than
           repeated as fixed text in every template that shows them. */
        'whyTitle' => $field('why_title'),
        'whyReasons' => aat_decode_repeaters($field('why_reasons')),
        'menu' => aat_menu_payload('primary'),
        'footerMenu' => aat_menu_payload('footer'),
        'frontPage' => $front ? aat_content_payload($front, '/') : null,
    ]);
}

function aat_rest_archive(WP_REST_Request $request) {
    $types = array_values(array_intersect(
        array_map('sanitize_key', explode(',', (string) ($request['type'] ?: 'post'))),
        aat_public_types()
    ));
    if (!$types) return new WP_Error('aat_bad_type', 'Unknown post type', ['status' => 400]);

    $per_page = min(max((int) ($request['per_page'] ?: 12), 1), 100);
    $args = [
        'post_type' => $types,
        'post_status' => 'publish',
        'posts_per_page' => $per_page,
        'paged' => max((int) ($request['page'] ?: 1), 1),
        'ignore_sticky_posts' => true,
    ];

    if ($request['category']) $args['category_name'] = sanitize_text_field($request['category']);
    if ($request['taxonomy'] && $request['term'] && in_array($request['taxonomy'], aat_public_taxonomies(), true)) {
        $args['tax_query'] = [[
            'taxonomy' => sanitize_key($request['taxonomy']),
            'field' => 'slug',
            'terms' => array_map('sanitize_title', explode(',', $request['term'])),
        ]];
    }
    if ($request['search']) $args['s'] = sanitize_text_field($request['search']);

    $query = new WP_Query($args);
    $items = [];
    foreach ($query->posts as $post) {
        $card = aat_card_payload($post);
        if (!$card) continue;
        $card['date'] = get_post_time(DATE_W3C, true, $post->ID);
        $card['acf'] = aat_acf_payload($post->ID);
        $items[] = $card;
    }

    return rest_ensure_response([
        'items' => $items,
        'total' => (int) $query->found_posts,
        'totalPages' => (int) $query->max_num_pages,
        'page' => (int) $args['paged'],
        'perPage' => $per_page,
    ]);
}

function aat_term_payload($term) {
    if (is_numeric($term)) $term = get_term((int) $term);
    if (!$term || is_wp_error($term)) return null;
    $link = get_term_link($term);
    $acf = [];
    if (function_exists('get_fields')) {
        $acf = get_fields($term->taxonomy . '_' . $term->term_id) ?: (get_fields('term_' . $term->term_id) ?: []);
        $acf = aat_decode_repeaters($acf);
    }
    return [
        'id' => (int) $term->term_id,
        'taxonomy' => $term->taxonomy,
        'slug' => $term->slug,
        'name' => html_entity_decode($term->name, ENT_QUOTES, 'UTF-8'),
        'description' => $term->description,
        'count' => (int) $term->count,
        'parent' => (int) $term->parent,
        'path' => is_wp_error($link) ? null : wp_parse_url($link, PHP_URL_PATH),
        // Drives the destination directory's region filter.
        'region' => (string) get_term_meta($term->term_id, 'region', true),
        /* Legacy categories mirrored into `country` that are not countries -
           "Asia Cruises", "Bali (Indonesia)". The archive URL still resolves;
           the country grids skip them. See aat_fix_country_terms(). */
        'notACountry' => (bool) get_term_meta($term->term_id, 'not_a_country', true),
        'image' => (string) get_term_meta($term->term_id, 'image', true),
        /* Set on the country term itself, so a country with no page of its own
           still has an editable opening line. See group_aat_country. */
        'intro' => (string) get_term_meta($term->term_id, 'intro', true),
        'acf' => $acf ?: (object) [],
    ];
}

function aat_rest_terms(WP_REST_Request $request) {
    if ($request['include']) {
        $ids = array_filter(array_map('absint', explode(',', $request['include'])));
        $out = [];
        foreach ($ids as $id) {
            // Caller order is meaningful (it mirrors the ACF field order).
            $payload = aat_term_payload($id);
            if ($payload) $out[] = $payload;
        }
        return rest_ensure_response($out);
    }

    $taxonomy = sanitize_key((string) $request['taxonomy']);
    if (!$taxonomy || !in_array($taxonomy, aat_public_taxonomies(), true)) {
        return new WP_Error('aat_bad_taxonomy', 'Unknown or missing taxonomy', ['status' => 400]);
    }
    $terms = get_terms(['taxonomy' => $taxonomy, 'hide_empty' => false]);
    if (is_wp_error($terms)) return $terms;
    return rest_ensure_response(array_values(array_filter(array_map('aat_term_payload', $terms))));
}

function aat_rest_posts(WP_REST_Request $request) {
    $ids = array_slice(array_filter(array_map('absint', explode(',', $request['include']))), 0, 60);
    if (!$ids) return rest_ensure_response([]);
    $by_id = [];
    foreach ($ids as $id) {
        $card = aat_card_payload($id);
        if ($card) $by_id[$id] = $card;
    }
    return rest_ensure_response(array_values($by_id));
}

/**
 * ACF image fields return bare URLs, so the frontend cannot know their
 * dimensions or alt text. Resize suffixes (foo-1024x603.jpg) are not
 * attachments themselves and are stripped before lookup.
 */
function aat_image_meta($url) {
    if (!is_string($url) || $url === '') return null;
    $clean = strtok($url, '?');
    $uploads = wp_get_upload_dir();
    if (strpos($clean, $uploads['baseurl']) === false) return null;

    $cache_key = 'aat_img_' . md5($clean);
    $cached = wp_cache_get($cache_key, 'aat');
    if (is_array($cached)) return $cached;

    $id = attachment_url_to_postid($clean);
    if (!$id) {
        $full = preg_replace('/-\d+x\d+(\.[a-z0-9]+)$/i', '$1', $clean);
        if ($full !== $clean) $id = attachment_url_to_postid($full);
    }
    if (!$id) return null;

    $meta = aat_media_payload($id);
    if (!$meta) return null;
    $meta['mime'] = get_post_mime_type($id);
    wp_cache_set($cache_key, $meta, 'aat', 3600);
    return $meta;
}

function aat_rest_images(WP_REST_Request $request) {
    $raw = $request['urls'];
    $urls = is_array($raw) ? $raw : explode(',', (string) $raw);
    $urls = array_slice(array_filter(array_map('trim', $urls)), 0, 60);
    $map = [];
    foreach ($urls as $url) {
        $meta = aat_image_meta($url);
        if ($meta) $map[$url] = $meta;
    }
    return rest_ensure_response($map ?: (object) []);
}
