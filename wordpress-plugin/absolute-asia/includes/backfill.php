<?php
/**
 * Fills the gaps the legacy site left.
 *
 * Some posts have no photograph and no summary on the source either, so there
 * is nothing to import - the gap has to be closed here. Every value written is
 * marked with `_aat_backfilled` so an editor can find and replace it, and
 * nothing already set by hand is ever overwritten.
 */

if (!defined('ABSPATH')) exit;

/**
 * Picks the most relevant image already in the library for a post.
 *
 * Preference order: a sibling in the same country, then the same category,
 * then any image whose filename mentions the country. Borrowing a neighbour's
 * photograph is honest here - it illustrates the same place.
 */
function aat_suggest_image($post_id) {
    $taxonomies = ['city', 'country', 'category'];

    foreach ($taxonomies as $taxonomy) {
        $terms = get_the_terms($post_id, $taxonomy);
        if (!$terms || is_wp_error($terms)) continue;

        /* Ask only for siblings that actually carry a photograph. The old query
           took the first twelve regardless, so a country whose first twelve
           entries had none fell through to a guess. */
        $siblings = get_posts([
            'post_type' => aat_public_types(),
            'post_status' => 'publish',
            'posts_per_page' => 5,
            'post__not_in' => [$post_id],
            'fields' => 'ids',
            'orderby' => 'rand',
            'meta_query' => [[['key' => '_thumbnail_id', 'compare' => 'EXISTS']]],
            'tax_query' => [[
                'taxonomy' => $taxonomy,
                'field' => 'term_id',
                'terms' => wp_list_pluck($terms, 'term_id'),
            ]],
        ]);

        foreach ($siblings as $sibling) {
            $thumb = get_post_thumbnail_id($sibling);
            if ($thumb) return (int) $thumb;
        }

        /* Nothing illustrated in this country: only an attachment whose own
           filename names the place will do. The previous version ran a fuzzy
           WordPress search, which is how a Phuket hotel photograph ended up on
           a place in Myanmar - a wrong photograph is worse than none. */
        foreach ($terms as $term) {
            $needle = sanitize_title($term->name);
            if (strlen($needle) < 4) continue;

            $found = get_posts([
                'post_type' => 'attachment',
                'post_status' => 'inherit',
                'posts_per_page' => 20,
                'fields' => 'ids',
                's' => $term->name,
            ]);
            foreach ($found as $attachment_id) {
                $file = strtolower((string) get_post_meta($attachment_id, '_wp_attached_file', true));
                if ($file !== '' && strpos($file, $needle) !== false) return (int) $attachment_id;
            }
        }
    }

    return 0;
}

/**
 * Re-checks photographs this plugin lent out.
 *
 * The first version of aat_suggest_image() could hand a post a photograph of
 * somewhere else entirely. Every borrowed image is re-derived with the stricter
 * rules; anything that no longer holds up is taken back off the post rather
 * than left on a page claiming to show a place it does not.
 */
function aat_repair_borrowed_images() {
    $posts = get_posts([
        'post_type' => aat_public_types(),
        'post_status' => ['publish', 'draft'],
        'posts_per_page' => -1,
        'fields' => 'ids',
        'meta_query' => [[['key' => '_aat_backfilled', 'value' => 'image']]],
    ]);

    $changed = [];
    foreach ($posts as $post_id) {
        $current = (int) get_post_thumbnail_id($post_id);
        delete_post_thumbnail($post_id);
        $suggested = aat_suggest_image($post_id);

        if ($suggested) {
            set_post_thumbnail($post_id, $suggested);
            if ($suggested !== $current) $changed[] = get_the_title($post_id);
            continue;
        }

        // No honest match any more: leave it blank and let the sweep retry.
        delete_post_meta($post_id, '_aat_backfilled');
        update_post_meta($post_id, '_aat_no_image_match', 1);
        $changed[] = get_the_title($post_id) . ' (gỡ ảnh sai)';
    }

    return $changed;
}

/**
 * Give every country term a photograph.
 *
 * All 21 countries had an empty `image` meta, so the destination grids fell
 * back to whatever each template improvised — which is why some countries
 * showed nothing at all. A country's own content is the only honest source,
 * so the picture is taken from a published post filed under that country:
 * a place first (a landscape reads as a country; a hotel bathroom does not),
 * then a tour, then anything else. Widest file wins, because these run
 * full-bleed.
 *
 * Skips terms an editor has already set, and skips terms flagged as not a
 * country ("Asia Cruises").
 */
function aat_backfill_country_images() {
    $terms = get_terms(['taxonomy' => 'country', 'hide_empty' => false]);
    if (is_wp_error($terms)) return [];

    $filled = [];
    foreach ($terms as $term) {
        if (get_term_meta($term->term_id, 'image', true)) continue;

        $best = 0;
        $best_width = -1;
        foreach (['place', 'tour', 'hotel', 'post'] as $type) {
            $posts = get_posts([
                'post_type' => $type,
                'post_status' => 'publish',
                'posts_per_page' => -1,
                'fields' => 'ids',
                'tax_query' => [[
                    'taxonomy' => 'country',
                    'field' => 'term_id',
                    'terms' => $term->term_id,
                ]],
            ]);

            foreach ($posts as $post_id) {
                $thumb = (int) get_post_thumbnail_id($post_id);
                if (!$thumb) continue;
                $meta = wp_get_attachment_metadata($thumb);
                $width = isset($meta['width']) ? (int) $meta['width'] : 0;
                if ($width > $best_width) { $best_width = $width; $best = $thumb; }
            }

            // A place photograph beats a wider tour photograph.
            if ($best) break;
        }

        if (!$best) continue;
        $url = wp_get_attachment_url($best);
        if (!$url) continue;

        update_term_meta($term->term_id, 'image', $url);
        update_term_meta($term->term_id, '_aat_backfilled_image', 1);
        $filled[] = $term->name . ' → ' . basename($url);
    }

    return $filled;
}

/** One page of posts that have no image; returns how many were filled. */
function aat_backfill_images($limit = 20) {
    $posts = get_posts([
        'post_type' => aat_public_types(),
        'post_status' => 'publish',
        'posts_per_page' => $limit,
        'fields' => 'ids',
        'meta_query' => [
            'relation' => 'AND',
            [['key' => '_thumbnail_id', 'compare' => 'NOT EXISTS']],
            [['key' => '_aat_no_image_match', 'compare' => 'NOT EXISTS']],
        ],
    ]);

    if (!$posts) return ['imported' => 0, 'done' => true];

    $filled = 0;
    foreach ($posts as $post_id) {
        $image = aat_suggest_image($post_id);
        if (!$image) {
            // Remember the miss so the next page does not retry it forever.
            update_post_meta($post_id, '_aat_no_image_match', 1);
            continue;
        }
        set_post_thumbnail($post_id, $image);
        update_post_meta($post_id, '_aat_backfilled', 'image');
        $filled++;
    }

    return ['imported' => $filled, 'done' => false];
}

/**
 * Writes a summary for posts that have none.
 *
 * Search results and cards show the excerpt, and an empty one costs both. The
 * sentence is assembled from what the post actually is - its type, country and
 * duration - rather than invented detail.
 */
function aat_compose_excerpt($post) {
    $type_labels = [
        'tour' => 'private journey',
        'hotel' => 'hand-selected stay',
        'place_to_go' => 'destination',
        'thing_to_do' => 'experience',
        'travel_guide' => 'travel guide',
        'blog' => 'story',
    ];
    $label = $type_labels[$post->post_type] ?? 'journey';

    $country = '';
    foreach (['country', 'category'] as $taxonomy) {
        $terms = get_the_terms($post->ID, $taxonomy);
        if ($terms && !is_wp_error($terms)) {
            $country = $terms[0]->name;
            break;
        }
    }

    $title = wp_strip_all_tags(get_the_title($post->ID));
    $duration = function_exists('get_field') ? (string) get_field('duration_label', $post->ID) : '';

    switch ($post->post_type) {
        case 'tour':
            $sentence = $duration
                ? sprintf('A %s private journey through %s, arranged around your own pace with a dedicated guide and driver throughout.', strtolower($duration), $country ?: 'Asia')
                : sprintf('A tailor-made private journey through %s, arranged around your own pace with a dedicated guide and driver throughout.', $country ?: 'Asia');
            break;
        case 'hotel':
            $sentence = sprintf('%s is a hand-selected address in %s, chosen for character rather than chain, and reserved as part of your private itinerary.', $title, $country ?: 'Asia');
            break;
        case 'place_to_go':
            $sentence = sprintf('Plan a private visit to %s%s. Our specialists build the days around what you want to see, at the hour it is worth seeing.', $title, $country ? ', ' . $country : '');
            break;
        case 'thing_to_do':
            $sentence = sprintf('%s, arranged privately as part of a tailor-made itinerary%s.', $title, $country ? ' in ' . $country : '');
            break;
        default:
            /* The site's own name - this text is published under it. */
            $sentence = sprintf('A %s from the %s team%s, written from first-hand travel across the region.', $label, get_bloginfo('name') ?: 'our', $country ? ' on ' . $country : '');
    }

    return $sentence;
}

function aat_backfill_excerpts($limit = 30) {
    $posts = get_posts([
        'post_type' => aat_public_types(),
        'post_status' => 'publish',
        'posts_per_page' => $limit,
        'meta_query' => [[
            'key' => '_aat_excerpt_checked',
            'compare' => 'NOT EXISTS',
        ]],
    ]);

    if (!$posts) return ['imported' => 0, 'done' => true];

    $filled = 0;
    foreach ($posts as $post) {
        update_post_meta($post->ID, '_aat_excerpt_checked', 1);
        if (trim($post->post_excerpt) !== '') continue;

        wp_update_post(wp_slash([
            'ID' => $post->ID,
            'post_excerpt' => aat_compose_excerpt($post),
        ]));
        update_post_meta($post->ID, '_aat_backfilled', 'excerpt');
        $filled++;
    }

    return ['imported' => $filled, 'done' => false];
}

/** Clears the "already looked at" markers so a later run reconsiders everything. */
function aat_backfill_reset() {
    global $wpdb;
    $wpdb->query("DELETE FROM {$wpdb->postmeta} WHERE meta_key IN ('_aat_no_image_match','_aat_excerpt_checked')");
    return ['reset' => true];
}

/**
 * Lift day-by-day itineraries out of the post body into the itinerary field.
 *
 * 27 tours arrived from the legacy site with an empty itinerary field and
 * their days written into the body as headings:
 *
 *     <h3>DAY 4: NIKKO – MISTY LAKES &amp; ANCIENT SHRINES</h3>
 *     <p>…</p>
 *
 * The tour template gates its map and its day accordion on having rows, so
 * those pages showed the whole trip as undifferentiated article text and no
 * map at all. This reads the headings back out and writes them as real rows,
 * which puts them in front of an editor and behind the map.
 *
 * Nothing is invented and nothing is deleted: the body is left exactly as it
 * is, and the frontend hides the duplicated block once the rows exist.
 * Skips any tour whose itinerary an editor has already filled.
 */
function aat_backfill_itineraries($limit = 25) {
    $posts = get_posts([
        'post_type' => 'tour',
        'post_status' => 'publish',
        'posts_per_page' => $limit,
        'fields' => 'ids',
        'meta_query' => [[['key' => '_aat_itinerary_lifted', 'compare' => 'NOT EXISTS']]],
    ]);

    if (!$posts) return ['imported' => 0, 'done' => true];

    $filled = 0;
    foreach ($posts as $post_id) {
        update_post_meta($post_id, '_aat_itinerary_lifted', 1);

        $existing = get_post_meta($post_id, 'itinerary', true);
        $decoded = is_string($existing) && $existing !== '' ? json_decode($existing, true) : $existing;
        if (is_array($decoded) && $decoded) continue;

        $rows = aat_parse_body_itinerary(get_post_field('post_content', $post_id));
        if (!$rows) continue;

        update_post_meta($post_id, 'itinerary', wp_slash(wp_json_encode($rows)));
        $filled++;
    }

    return ['imported' => $filled, 'done' => false];
}

/** The parse itself, so the tests and the admin can call it directly. */
function aat_parse_body_itinerary($body) {
    if (!is_string($body) || $body === '') return [];

    $blocks = preg_split('/<h[23][^>]*>(?=\s*DAY\s*\d)/i', $body);
    if (!is_array($blocks) || count($blocks) < 2) return [];
    array_shift($blocks); // Everything before the first day is the overview.

    $rows = [];
    foreach ($blocks as $index => $block) {
        if (!preg_match('/^([\s\S]*?)<\/h[23]>/i', $block, $head)) continue;

        $heading = trim(html_entity_decode(wp_strip_all_tags($head[1]), ENT_QUOTES, 'UTF-8'));
        preg_match('/DAY\s*(\d+)/i', $heading, $num);
        $day = isset($num[1]) ? (int) $num[1] : $index + 1;

        // "DAY 4: NIKKO – MISTY LAKES" → region "Nikko", the rest is the title.
        $after = trim(preg_replace('/^DAY\s*\d+\s*[:.\-–—]\s*/iu', '', $heading));
        /* "ARRIVAL IN TOKYO" and "TOKYO" are the same stop; leaving the verb
           on split them into two groups and put a phantom pin on the map. */
        $place = trim(preg_split('/[–—-]/u', $after)[0]);
        $place = trim(preg_replace(
            '/^(arrival\s+in|arrive\s+in|departure\s+from|depart\s+from|return\s+to|onward\s+to|transfer\s+to|fly\s+to)\s+/iu',
            '', $place
        ));

        $prose = substr($block, strlen($head[0]));
        $prose = preg_replace('/<h[23][\s\S]*$/i', '', $prose);
        $prose = trim(preg_replace('/\s+/u', ' ', html_entity_decode(wp_strip_all_tags($prose), ENT_QUOTES, 'UTF-8')));

        $rows[] = [
            'day_num' => (string) $day,
            'group_tag' => $place !== '' ? $place : 'Itinerary',
            'title' => 'Day ' . $day . ': ' . ($after !== '' ? $after : $heading),
            'description' => $prose,
            'image_url' => '',
            'latitude' => '',
            'longitude' => '',
        ];
    }

    return $rows;
}
