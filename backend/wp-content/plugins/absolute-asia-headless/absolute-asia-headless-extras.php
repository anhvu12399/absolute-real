<?php
/**
 * Plugin Name: Absolute Asia Headless Bridge - Extras
 * Description: Adds taxonomy, archive and image-metadata routes needed by the Next.js frontend. Read-only. Safe to remove.
 * Version: 1.0.0
 *
 * Install: drop this file into wp-content/mu-plugins/ alongside absolute-asia-headless.php.
 * It is additive only - it registers new routes and does not modify existing ones.
 */

if (!defined('ABSPATH')) exit;

const AAT_X_TYPES = ['page', 'post', 'tour', 'destination', 'hotel', 'travel_guide', 'place_to_go', 'thing_to_do', 'blog', 'travel-guides', 'places-to-go', 'hotels', 'things-to-do', 'blogs', 'trip', 'cruises', 'travel-ideas'];
const AAT_X_TAXONOMIES = ['category', 'inspiration', 'post_tag'];

add_action('rest_api_init', function () {
    register_rest_route('absolute-asia/v1', '/terms', [
        'methods' => 'GET',
        'callback' => 'aat_x_get_terms',
        'permission_callback' => '__return_true',
        'args' => [
            'include' => ['sanitize_callback' => 'sanitize_text_field'],
            'taxonomy' => ['sanitize_callback' => 'sanitize_key'],
        ],
    ]);

    register_rest_route('absolute-asia/v1', '/archive', [
        'methods' => 'GET',
        'callback' => 'aat_x_get_archive',
        'permission_callback' => '__return_true',
        'args' => [
            'type' => ['sanitize_callback' => 'sanitize_text_field'],
            'category' => ['sanitize_callback' => 'sanitize_text_field'],
            'taxonomy' => ['sanitize_callback' => 'sanitize_key'],
            'term' => ['sanitize_callback' => 'sanitize_text_field'],
            'page' => ['sanitize_callback' => 'absint'],
            'per_page' => ['sanitize_callback' => 'absint'],
        ],
    ]);

    register_rest_route('absolute-asia/v1', '/images', [
        'methods' => 'GET',
        'callback' => 'aat_x_get_images',
        'permission_callback' => '__return_true',
        'args' => ['urls' => ['required' => true]],
    ]);

    register_rest_route('absolute-asia/v1', '/posts', [
        'methods' => 'GET',
        'callback' => 'aat_x_get_posts',
        'permission_callback' => '__return_true',
        'args' => ['include' => ['required' => true, 'sanitize_callback' => 'sanitize_text_field']],
    ]);
});

/**
 * ACF values with the core plugin's JSON repeaters decoded into real arrays.
 *
 * Mirrors aat_decode_repeaters() from the main bridge and degrades to the raw
 * values when this file is installed on its own.
 */
function aat_x_acf_array($post_id) {
    if (!function_exists('get_fields')) return [];
    $fields = get_fields($post_id);
    if (!is_array($fields) || !$fields) return [];
    return function_exists('aat_decode_repeaters') ? aat_decode_repeaters($fields) : $fields;
}

/**
 * Ordered post lookup for ACF post_object fields (post_03, post_05, post11).
 *
 * The existing /content-batch route returns full payloads but no category names,
 * which the tour card needs ("Cambodia, Vietnam"), and WP_Query does not preserve
 * the order of post__in - while the order of an ACF relationship field is exactly
 * what the editor arranged. So results are re-sorted to match the requested ids.
 */
function aat_x_get_posts(WP_REST_Request $request) {
    $ids = array_slice(array_filter(array_map('absint', explode(',', $request['include']))), 0, 60);
    if (!$ids) return rest_ensure_response([]);

    $posts = get_posts([
        'post__in' => $ids,
        'post_type' => 'any',
        'post_status' => 'publish',
        'posts_per_page' => count($ids),
        'orderby' => 'post__in',
        'ignore_sticky_posts' => true,
    ]);

    $by_id = [];
    foreach ($posts as $post) {
        $thumb_id = get_post_thumbnail_id($post->ID);
        $src = $thumb_id ? wp_get_attachment_image_src($thumb_id, 'full') : null;
        $acf = aat_x_acf_array($post->ID);

        // parts/tour-item.php reads duration from the last row of the tour_price repeater.
        $duration = '';
        $price = '';
        if (!empty($acf['tour_price']) && is_array($acf['tour_price'])) {
            $last = end($acf['tour_price']);
            if (is_array($last)) {
                $duration = (string) ($last['duration'] ?? '');
                $price = (string) ($last['price'] ?? '');
            }
        }

        $terms = get_the_category($post->ID) ?: [];
        $categories = [];
        foreach ($terms as $term) {
            $link = get_term_link($term);
            $categories[] = [
                'id' => (int) $term->term_id,
                'name' => html_entity_decode($term->name, ENT_QUOTES, 'UTF-8'),
                'slug' => $term->slug,
                'path' => is_wp_error($link) ? null : wp_parse_url($link, PHP_URL_PATH),
            ];
        }

        $by_id[$post->ID] = [
            'id' => $post->ID,
            'type' => $post->post_type,
            'slug' => $post->post_name,
            'path' => wp_parse_url(get_permalink($post->ID), PHP_URL_PATH),
            'title' => get_the_title($post->ID),
            'excerpt' => wp_strip_all_tags(get_the_excerpt($post->ID)),
            'featuredMedia' => $src ? [
                'url' => $src[0],
                'width' => (int) $src[1],
                'height' => (int) $src[2],
                'alt' => (string) get_post_meta($thumb_id, '_wp_attachment_image_alt', true),
            ] : null,
            'duration' => $duration,
            'price' => $price,
            'categories' => $categories,
        ];
    }

    $ordered = [];
    foreach ($ids as $id) {
        if (isset($by_id[$id])) $ordered[] = $by_id[$id];
    }
    return rest_ensure_response($ordered);
}

/**
 * Resolves an uploads URL to its attachment metadata.
 *
 * ACF fields on this site are configured with return_format=url, so the frontend
 * receives a bare string with no alt text or intrinsic dimensions. Rather than
 * changing the ACF setting - which would break every PHP template still calling
 * echo get_field(...) - we resolve the URL back to its attachment here.
 *
 * Resized filenames (foo-1024x603.jpg) are not attachments themselves, so the
 * size suffix is stripped before lookup.
 */
function aat_x_image_meta($url) {
    if (!is_string($url) || $url === '') return null;

    $clean = strtok($url, '?');
    $uploads = wp_get_upload_dir();
    if (strpos($clean, $uploads['baseurl']) === false) return null;

    $cache_key = 'aat_img_' . md5($clean);
    $cached = wp_cache_get($cache_key, 'aat_headless');
    if (is_array($cached)) return $cached;

    $id = attachment_url_to_postid($clean);
    if (!$id) {
        $full = preg_replace('/-\d+x\d+(\.[a-z0-9]+)$/i', '$1', $clean);
        if ($full !== $clean) $id = attachment_url_to_postid($full);
    }
    if (!$id) return null;

    $src = wp_get_attachment_image_src($id, 'full');
    if (!$src) return null;

    $meta = [
        'id' => $id,
        'url' => $src[0],
        'width' => (int) $src[1],
        'height' => (int) $src[2],
        'alt' => (string) get_post_meta($id, '_wp_attachment_image_alt', true),
        'mime' => get_post_mime_type($id),
    ];
    wp_cache_set($cache_key, $meta, 'aat_headless', 3600);
    return $meta;
}

function aat_x_term_payload($term) {
    if (is_numeric($term)) $term = get_term((int) $term);
    if (!$term || is_wp_error($term)) return null;

    $link = get_term_link($term);
    $acf = aat_x_acf_array($term->taxonomy . '_' . $term->term_id);
    if (!$acf) {
        $acf = aat_x_acf_array('term_' . $term->term_id);
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
        'acf' => $acf ?: (object) [],
    ];
}

function aat_x_get_terms(WP_REST_Request $request) {
    $include = $request['include'];
    $taxonomy = $request['taxonomy'];

    if ($include) {
        $ids = array_filter(array_map('absint', explode(',', $include)));
        if (!$ids) return rest_ensure_response([]);
        $out = [];
        foreach ($ids as $id) {
            $payload = aat_x_term_payload($id);
            // Preserve the caller's ordering - ACF field order is meaningful here.
            if ($payload) $out[] = $payload;
        }
        return rest_ensure_response($out);
    }

    if (!$taxonomy || !in_array($taxonomy, AAT_X_TAXONOMIES, true)) {
        return new WP_Error('aat_bad_taxonomy', 'Unknown or missing taxonomy', ['status' => 400]);
    }

    $terms = get_terms(['taxonomy' => $taxonomy, 'hide_empty' => false]);
    if (is_wp_error($terms)) return $terms;

    return rest_ensure_response(array_values(array_filter(array_map('aat_x_term_payload', $terms))));
}

function aat_x_get_archive(WP_REST_Request $request) {
    $type = $request['type'] ?: 'post';
    $types = array_values(array_intersect(array_map('sanitize_key', explode(',', $type)), AAT_X_TYPES));
    if (!$types) return new WP_Error('aat_bad_type', 'Unknown post type', ['status' => 400]);

    $per_page = min(max((int) ($request['per_page'] ?: 12), 1), 50);
    $args = [
        'post_type' => $types,
        'post_status' => 'publish',
        'posts_per_page' => $per_page,
        'paged' => max((int) ($request['page'] ?: 1), 1),
        'ignore_sticky_posts' => true,
    ];

    if ($request['category']) {
        $args['category_name'] = $request['category'];
    }
    if ($request['taxonomy'] && $request['term'] && in_array($request['taxonomy'], AAT_X_TAXONOMIES, true)) {
        $args['tax_query'] = [[
            'taxonomy' => $request['taxonomy'],
            'field' => 'slug',
            'terms' => array_map('sanitize_title', explode(',', $request['term'])),
        ]];
    }

    $query = new WP_Query($args);
    $items = [];
    foreach ($query->posts as $post) {
        $thumb_id = get_post_thumbnail_id($post->ID);
        $src = $thumb_id ? wp_get_attachment_image_src($thumb_id, 'full') : null;
        $items[] = [
            'id' => $post->ID,
            'type' => $post->post_type,
            'slug' => $post->post_name,
            'path' => wp_parse_url(get_permalink($post->ID), PHP_URL_PATH),
            'title' => get_the_title($post->ID),
            'excerpt' => wp_strip_all_tags(get_the_excerpt($post->ID)),
            'date' => get_post_time(DATE_W3C, true, $post->ID),
            'featuredMedia' => $src ? [
                'url' => $src[0],
                'width' => (int) $src[1],
                'height' => (int) $src[2],
                'alt' => (string) get_post_meta($thumb_id, '_wp_attachment_image_alt', true),
            ] : null,
            'acf' => aat_x_acf_array($post->ID) ?: (object) [],
        ];
    }

    return rest_ensure_response([
        'items' => $items,
        'total' => (int) $query->found_posts,
        'totalPages' => (int) $query->max_num_pages,
        'page' => (int) $args['paged'],
        'perPage' => $per_page,
    ]);
}

function aat_x_get_images(WP_REST_Request $request) {
    $raw = $request['urls'];
    $urls = is_array($raw) ? $raw : explode(',', (string) $raw);
    $urls = array_slice(array_filter(array_map('trim', $urls)), 0, 60);

    $map = [];
    foreach ($urls as $url) {
        $meta = aat_x_image_meta($url);
        if ($meta) $map[$url] = $meta;
    }
    return rest_ensure_response($map ?: (object) []);
}
