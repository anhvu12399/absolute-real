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
 *   /absolute-asia/v1/me                  is this visitor an editor? (credentialed)
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
    register_rest_route('absolute-asia/v1', '/paths', $public + ['callback' => 'aat_rest_paths']);
    register_rest_route('absolute-asia/v1', '/terms', $public + ['callback' => 'aat_rest_terms']);
    register_rest_route('absolute-asia/v1', '/images', $public + [
        'callback' => 'aat_rest_images',
        'args' => ['urls' => ['required' => true]],
    ]);
    register_rest_route('absolute-asia/v1', '/posts', $public + [
        'callback' => 'aat_rest_posts',
        'args' => ['include' => ['required' => true, 'sanitize_callback' => 'sanitize_text_field']],
    ]);
    /* Open to everyone on purpose: it answers "can you edit?", and for a
       visitor who is not signed in the honest answer is no. Gating the route
       itself with a permission_callback would return 401 to every reader and
       fill their console with errors. */
    register_rest_route('absolute-asia/v1', '/me', $public + ['callback' => 'aat_rest_me']);

    /* Page-view beacon. Public by necessity: it is called by every visitor's
       browser, and the frontend is served from the edge where WordPress never
       sees the request at all. */
    register_rest_route('absolute-asia/v1', '/beacon', [
        'methods'             => 'POST',
        'callback'            => 'aat_rest_beacon',
        'permission_callback' => '__return_true',
    ]);

    /* Public lead inquiry submission endpoint */
    register_rest_route('absolute-asia/v1', '/lead', [
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => 'aat_rest_submit_lead',
    ]);
});

/**
 * The frontend origin allowed to make credentialed requests.
 *
 * Reuses the Frontend URL already set for Live Preview rather than asking for
 * the same address twice - one wrong copy of it would silently break either
 * the preview button or the edit controls. Only the origin is kept; a path
 * would never match what a browser sends in `Origin`.
 */
function aat_frontend_origin() {
    $url = trim((string) get_option('aat_frontend_url', ''));
    if ($url === '') $url = (string) home_url();

    $parts = wp_parse_url($url);
    if (empty($parts['host'])) return untrailingslashit($url);

    $scheme = $parts['scheme'] ?? 'https';
    $port = isset($parts['port']) ? ':' . $parts['port'] : '';
    return $scheme . '://' . $parts['host'] . $port;
}

/**
 * Allow the frontend to send its WordPress login cookie.
 *
 * The frontend and this backend are different origins but the same site
 * (`absoluteasiatours.com`), so the auth cookie is sent on a same-site fetch -
 * but only if CORS names the origin exactly and allows credentials. A wildcard
 * is invalid with credentials, which is why the origin is echoed back rather
 * than starred.
 */
add_action('rest_api_init', function () {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function ($served) {
        $sent = isset($_SERVER['HTTP_ORIGIN']) ? untrailingslashit(esc_url_raw((string) $_SERVER['HTTP_ORIGIN'])) : '';
        $allowed = aat_frontend_origin();

        if ($sent !== '' && $sent === $allowed) {
            header('Access-Control-Allow-Origin: ' . $allowed);
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce');
        } else {
            /* Everything here is public read-only content, so other origins
               keep the open access they had - just without credentials. */
            header('Access-Control-Allow-Origin: *');
        }
        header('Vary: Origin');

        return $served;
    }, 15);
}, 15);

/** Preflight has to answer before WordPress routes anything. */
add_action('rest_api_init', function () {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'OPTIONS') return;
    $sent = isset($_SERVER['HTTP_ORIGIN']) ? untrailingslashit(esc_url_raw((string) $_SERVER['HTTP_ORIGIN'])) : '';
    if ($sent !== '' && $sent === aat_frontend_origin()) {
        header('Access-Control-Allow-Origin: ' . $sent);
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce');
        header('Access-Control-Max-Age: 600');
        header('Vary: Origin');
        status_header(204);
        exit;
    }
}, 5);

/**
 * Who is asking, and may they edit?
 *
 * The edit controls on the front end used to appear for anyone who added
 * `?asledit=1` to the URL. Nothing was exposed by that - the links point at
 * wp-admin, which does its own checking - but it put an editing UI in front of
 * readers. This is the real answer.
 */
function aat_rest_me() {
    $user = wp_get_current_user();
    $can = $user && $user->exists() && user_can($user, 'edit_posts');

    return [
        'canEdit' => (bool) $can,
        'name' => $can ? $user->display_name : '',
        'adminUrl' => $can ? admin_url() : '',
        /* Lets the "republish this page" button prove it was pressed by an
           editor. The frontend cannot check the WordPress cookie itself - that
           cookie belongs to this host, not to the public site - so it forwards
           this instead, and the Next.js route verifies it with the shared
           revalidate secret. Ten minutes is long enough for one visit. */
        'token' => $can ? aat_issue_edit_token(10 * MINUTE_IN_SECONDS) : '',
    ];
}

/** `<expiry>.<hmac>`, verifiable by anything holding AAT_REVALIDATE_SECRET. */
function aat_issue_edit_token($ttl) {
    if (!defined('AAT_REVALIDATE_SECRET')) return '';
    $expires = time() + (int) $ttl;
    return $expires . '.' . hash_hmac('sha256', 'aat-edit:' . $expires, AAT_REVALIDATE_SECRET);
}

/* ───────────────────────────── helpers ───────────────────────────── */

function aat_rest_cache_generation() {
    return max(1, (int) get_option('aat_rest_cache_generation', 1));
}

function aat_rest_cache_get($key) {
    $versioned = 'v' . aat_rest_cache_generation() . '_' . md5($key);
    $found = false;
    $value = wp_cache_get($versioned, 'aat_rest', false, $found);
    if ($found) return $value;
    $value = get_transient('aat_' . $versioned);
    return $value === false ? null : $value;
}

function aat_rest_cache_set($key, $value, $ttl = 300) {
    $versioned = 'v' . aat_rest_cache_generation() . '_' . md5($key);
    wp_cache_set($versioned, $value, 'aat_rest', $ttl);
    set_transient('aat_' . $versioned, $value, $ttl);
    return $value;
}

/** Cache invalidation is O(1): old generations expire naturally. */
function aat_rest_cache_bump() {
    update_option('aat_rest_cache_generation', aat_rest_cache_generation() + 1, false);
}
add_action('save_post', function ($post_id) {
    if (!wp_is_post_revision($post_id)) aat_rest_cache_bump();
});
add_action('deleted_post', 'aat_rest_cache_bump');
add_action('set_object_terms', 'aat_rest_cache_bump');
add_action('created_term', 'aat_rest_cache_bump');
add_action('edited_term', 'aat_rest_cache_bump');
add_action('delete_term', 'aat_rest_cache_bump');

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
    if (!$hero && !empty($acf['gallery'])) {
        $gallery = aat_decode_repeaters($acf['gallery']);
        if (is_array($gallery) && !empty($gallery[0]['image_url'])) $hero = (string) $gallery[0]['image_url'];
    }
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

/** Only fields cards and directory maps consume; full ACF belongs to /content. */
function aat_archive_acf_payload($post_id, $post_type) {
    $acf = aat_acf_payload($post_id);
    if (!is_array($acf)) return (object) [];
    $keys = ['hero_image', 'hero_tagline', 'hotel_highlights', 'hotel_location', 'location_map', 'latitude', 'longitude', 'read_minutes', 'duration_label'];
    $out = [];
    foreach ($keys as $key) {
        $value = $acf[$key] ?? null;
        $empty = $value === null || $value === '' || $value === [] || $value === false;
        if (array_key_exists($key, $acf) && !$empty) $out[$key] = $value;
    }
    if ($post_type === 'tour' && !empty($acf['itinerary'])) {
        $rows = aat_decode_repeaters($acf['itinerary']);
        if (is_array($rows)) {
            $out['itinerary'] = array_map(function ($row) {
                if (!is_array($row)) return [];
                return array_intersect_key($row, array_flip(['group_tag', 'title', 'latitude', 'longitude']));
            }, $rows);
        }
    }
    return $out ?: (object) [];
}

/** Turns relationship id lists into ready-to-render cards, order preserved. */
function aat_resolve_related($acf) {
    $keys = aat_contract_relationships();
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
    $cached = aat_rest_cache_get('content:' . $path);
    if (is_array($cached)) return rest_ensure_response($cached);

    if ($path === '/') {
        $front = aat_front_page_post();
        // The homepage CPT is not publicly queryable, so its permalink is a
        // query string - the frontend keys off "/" for the front page.
        if ($front) return rest_ensure_response(aat_rest_cache_set('content:' . $path, aat_content_payload($front, '/')));
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
    return rest_ensure_response(aat_rest_cache_set('content:' . $path, aat_content_payload($post)));
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
    $cached = aat_rest_cache_get('site');
    if (is_array($cached)) return rest_ensure_response($cached);
    $front = aat_front_page_post();
    $front_id = $front ? $front->ID : 0;
    $field = function ($name) use ($front_id) {
        if (!$front_id || !function_exists('get_field')) return '';
        return (string) (get_field($name, $front_id) ?: '');
    };

    $payload = [
        'name' => get_bloginfo('name'),
        'description' => get_bloginfo('description'),
        'url' => home_url('/'),
        'logo' => aat_site_logo(),
        'phoneLabel' => $field('text_phone'),
        'phone' => $field('phone'),
        /* Who the company legally is. It lived only in a build-time variable
           on the host, which meant the one line on the site that states who is
           liable could not be corrected without a redeploy. */
        /* Which build is answering. Published because the alternative is
           guessing: a fix can be shipped, installed and still not take effect,
           and without this there is no way to tell those cases apart from
           outside WordPress. */
        'pluginVersion' => defined('AAT_VERSION') ? AAT_VERSION : '',
        'legalEntity' => trim((string) get_option('aat_legal_entity', '')),
        'tagline' => trim((string) get_option('aat_tagline', '')),
        'whatsapp' => trim((string) get_option('aat_whatsapp', '')),
        'socials' => aat_social_links(),
        /* Promises the whole site makes, held once on the homepage rather than
           repeated as fixed text in every template that shows them. */
        'whyTitle' => $field('why_title'),
        'whyReasons' => aat_decode_repeaters($field('why_reasons')),
        'menu' => aat_menu_payload('primary'),
        'footerMenu' => aat_menu_payload('footer'),
        'frontPage' => $front ? aat_content_payload($front, '/') : null,
    ];
    return rest_ensure_response(aat_rest_cache_set('site', $payload));
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

    $cache_key = 'archive:' . wp_json_encode($args);
    $cached = aat_rest_cache_get($cache_key);
    if (is_array($cached)) return rest_ensure_response($cached);

    $query = new WP_Query($args);
    $items = [];
    foreach ($query->posts as $post) {
        $card = aat_card_payload($post);
        if (!$card) continue;
        $card['date'] = get_post_time(DATE_W3C, true, $post->ID);
        $card['acf'] = aat_archive_acf_payload($post->ID, $post->post_type);
        $items[] = $card;
    }

    $payload = [
        'items' => $items,
        'total' => (int) $query->found_posts,
        'totalPages' => (int) $query->max_num_pages,
        'page' => (int) $args['paged'],
        'perPage' => $per_page,
    ];
    return rest_ensure_response(aat_rest_cache_set($cache_key, $payload));
}

/** Exhaustive lightweight path manifest for sitemap and generateStaticParams. */
function aat_rest_paths(WP_REST_Request $request) {
    $per_page = min(max((int) ($request['per_page'] ?: 250), 1), 250);
    $page = max((int) ($request['page'] ?: 1), 1);
    $cache_key = "paths:$page:$per_page";
    $cached = aat_rest_cache_get($cache_key);
    if (is_array($cached)) return rest_ensure_response($cached);
    $query = new WP_Query([
        'post_type' => aat_public_types(),
        'post_status' => 'publish',
        'posts_per_page' => $per_page,
        'paged' => $page,
        'orderby' => 'ID',
        'order' => 'ASC',
        'ignore_sticky_posts' => true,
        'no_found_rows' => false,
    ]);
    $items = array_map(function ($post) {
        return [
            'id' => (int) $post->ID,
            'type' => $post->post_type,
            'path' => wp_parse_url(get_permalink($post->ID), PHP_URL_PATH),
            'modified' => get_post_modified_time(DATE_W3C, true, $post->ID),
        ];
    }, $query->posts);
    $payload = [
        'items' => $items,
        'total' => (int) $query->found_posts,
        'totalPages' => (int) $query->max_num_pages,
        'page' => $page,
        'perPage' => $per_page,
    ];
    return rest_ensure_response(aat_rest_cache_set($cache_key, $payload, 900));
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

/**
 * Handles incoming lead submissions, sends email to mywaytravelinc@gmail.com,
 * and records the enquiry in WordPress options.
 */
function aat_rest_submit_lead(WP_REST_Request $request) {
    $params = $request->get_json_params();
    if (!is_array($params)) {
        $params = $request->get_params();
    }

    // Honeypot check
    if (!empty($params['company'])) {
        return rest_ensure_response(['ok' => true, 'id' => 'hp_ok']);
    }

    $name = sanitize_text_field($params['name'] ?? '');
    $email = sanitize_email($params['email'] ?? '');
    $phone = sanitize_text_field($params['phone'] ?? '');
    $destination = sanitize_text_field($params['destination'] ?? '');
    $message = sanitize_textarea_field($params['message'] ?? '');
    $source_path = sanitize_text_field($params['sourcePath'] ?? '/');
    $details = is_array($params['details'] ?? null) ? $params['details'] : [];

    if (empty($name) || empty($email)) {
        return new WP_Error('invalid_lead', 'Name and valid email are required', ['status' => 400]);
    }

    $to_email = 'mywaytravelinc@gmail.com';
    $subject = '[New Enquiry] ' . ($destination ?: 'Asia Custom Tour') . ' — ' . $name;

    // Compose HTML Email Body
    $detail_rows = '';
    foreach ($details as $label => $val) {
        if (!empty($val)) {
            $detail_rows .= '<tr><td style="padding:10px 14px;border:1px solid #e8e2d8;font-weight:600;background:#fcfbf9;color:#333;width:180px;">' . esc_html($label) . '</td><td style="padding:10px 14px;border:1px solid #e8e2d8;color:#222;">' . esc_html((string)$val) . '</td></tr>';
        }
    }

    $html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:24px;background-color:#f6f4f0;font-family:Helvetica,Arial,sans-serif;color:#1e2a27;">'
        . '<div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5dfd5;box-shadow:0 4px 16px rgba(0,0,0,0.06);">'
        . '<div style="background:#1b2b27;padding:24px;text-align:center;border-bottom:3px solid #c5a880;">'
        . '<h1 style="color:#ffffff;margin:0;font-size:20px;letter-spacing:1px;font-weight:400;font-family:Georgia,serif;">ABSOLUTE ASIA TOURS</h1>'
        . '<p style="color:#c5a880;margin:6px 0 0 0;font-size:12px;letter-spacing:2px;text-transform:uppercase;">New Tailor-Made Enquiry</p>'
        . '</div>'
        . '<div style="padding:28px 24px;">'
        . '<h2 style="font-size:17px;margin-top:0;color:#1b2b27;border-bottom:1px solid #ede8e1;padding-bottom:8px;font-family:Georgia,serif;">Traveller Details</h2>'
        . '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px;">'
        . '<tr><td style="padding:10px 14px;border:1px solid #e8e2d8;font-weight:600;background:#fcfbf9;color:#333;width:180px;">Full Name</td><td style="padding:10px 14px;border:1px solid #e8e2d8;font-weight:bold;color:#1b2b27;font-size:15px;">' . esc_html($name) . '</td></tr>'
        . '<tr><td style="padding:10px 14px;border:1px solid #e8e2d8;font-weight:600;background:#fcfbf9;color:#333;">Email Address</td><td style="padding:10px 14px;border:1px solid #e8e2d8;"><a href="mailto:' . esc_attr($email) . '" style="color:#a85a3c;text-decoration:none;font-weight:600;">' . esc_html($email) . '</a></td></tr>'
        . ($phone ? '<tr><td style="padding:10px 14px;border:1px solid #e8e2d8;font-weight:600;background:#fcfbf9;color:#333;">Phone Number</td><td style="padding:10px 14px;border:1px solid #e8e2d8;"><a href="tel:' . esc_attr(preg_replace('/[^\d+]/', '', $phone)) . '" style="color:#1b2b27;text-decoration:none;font-weight:600;">' . esc_html($phone) . '</a></td></tr>' : '')
        . ($destination ? '<tr><td style="padding:10px 14px;border:1px solid #e8e2d8;font-weight:600;background:#fcfbf9;color:#333;">Destinations</td><td style="padding:10px 14px;border:1px solid #e8e2d8;font-weight:600;color:#1b2b27;">' . esc_html($destination) . '</td></tr>' : '')
        . '<tr><td style="padding:10px 14px;border:1px solid #e8e2d8;font-weight:600;background:#fcfbf9;color:#333;">Source Page</td><td style="padding:10px 14px;border:1px solid #e8e2d8;">' . esc_html($source_path) . '</td></tr>'
        . $detail_rows
        . '</table>';

    if ($message) {
        $html .= '<h2 style="font-size:17px;color:#1b2b27;margin-top:24px;border-bottom:1px solid #ede8e1;padding-bottom:8px;font-family:Georgia,serif;">Client Notes & Ideal Journey</h2>'
            . '<div style="background:#fcfbf9;border:1px solid #e8e2d8;padding:16px;border-radius:4px;font-size:14px;line-height:1.65;color:#333;white-space:pre-wrap;">'
            . nl2br(esc_html($message))
            . '</div>';
    }

    $html .= '<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#888;text-align:center;">'
        . 'Delivered to <strong>' . esc_html($to_email) . '</strong> at ' . gmdate('Y-m-d H:i:s') . ' UTC via Absolute Asia Tours.'
        . '</div></div></div></body></html>';

    $headers = [
        'Content-Type: text/html; charset=UTF-8',
        'From: Absolute Asia Tours <no-reply@absoluteasiatours.com>',
        'Reply-To: ' . $name . ' <' . $email . '>',
    ];

    $sent = wp_mail($to_email, $subject, $html, $headers);

    /* The enquiry becomes an Order, not a row in an option.
       It used to be appended to `aat_received_leads` and trimmed to the last
       300 — which meant the 301st enquiry silently deleted the first, and none
       of them were searchable, assignable or countable. An `order` post is a
       first-class record: it has a date, an author, a status, a comment thread
       for whoever follows it up, and it survives. */
    $order_id = aat_store_order([
        'name'        => $name,
        'email'       => $email,
        'phone'       => $phone,
        'destination' => $destination,
        'message'     => $message,
        'source_path' => $source_path,
        'details'     => $details,
        'email_sent'  => (bool) $sent,
    ]);

    return rest_ensure_response([
        'ok' => true,
        'email_sent' => (bool) $sent,
        'id' => $order_id ? (string) $order_id : wp_generate_uuid4(),
    ]);
}
