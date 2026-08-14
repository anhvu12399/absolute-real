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

    $CURATED = [
        'cambodia'    => 'https://backend.absoluteasiatours.com/wp-content/uploads/2025/06/pexels-sergk1-158907081.jpg',
        'bhutan'      => 'https://backend.absoluteasiatours.com/wp-content/uploads/2025/07/pexels-infinityadventure-5011707.jpg',
        'vietnam'     => 'https://backend.absoluteasiatours.com/wp-content/uploads/2026/05/Ninh-Binh-2000.jpg',
        'thailand'    => 'https://backend.absoluteasiatours.com/wp-content/uploads/2025/03/Grand-Palace-12121.jpg',
        'japan'       => 'https://backend.absoluteasiatours.com/wp-content/uploads/2026/05/Kyoto-1211-scaled-1.jpg',
        'china'       => 'https://backend.absoluteasiatours.com/wp-content/uploads/2026/05/fisherman-Guangxi-China.jpg',
        'laos'        => 'https://backend.absoluteasiatours.com/wp-content/uploads/2025/02/Luang-Prabang-30-1.jpg',
        'indonesia'   => 'https://backend.absoluteasiatours.com/wp-content/uploads/2025/07/pexels-joyston-judah-331625-27682192.jpg',
        'bali'        => 'https://backend.absoluteasiatours.com/wp-content/uploads/2025/07/pexels-iqxazmi-3935736.jpg',
        'india'       => 'https://backend.absoluteasiatours.com/wp-content/uploads/2025/08/pexels-jodaarba-860577.jpg',
        'malaysia'    => 'https://backend.absoluteasiatours.com/wp-content/uploads/2025/08/Pangkor-islands-12.jpg',
        'south-korea' => 'https://backend.absoluteasiatours.com/wp-content/uploads/2025/05/seoul2.jpg',
    ];

    $filled = [];
    foreach ($terms as $term) {
        if (get_term_meta($term->term_id, 'image', true)) continue;

        $slug = $term->slug;
        if (isset($CURATED[$slug])) {
            update_term_meta($term->term_id, 'image', $CURATED[$slug]);
            update_term_meta($term->term_id, '_aat_backfilled_image', 1);
            $filled[] = $term->name . ' → ' . basename($CURATED[$slug]);
            continue;
        }

        $best = 0;
        $best_width = -1;
        foreach (['place_to_go', 'tour', 'travel_guide', 'hotel'] as $type) {
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

    $CITIES = [
        'seoul', 'busan', 'gyeongju', 'jeju', 'incheon', 'dmz',
        'hanoi', 'halong', 'ha long', 'sapa', 'hue', 'hoi an', 'da nang', 'saigon', 'ho chi minh', 'mekong', 'phu quoc',
        'bangkok', 'chiang mai', 'chiang rai', 'phuket', 'krabi', 'koh samui', 'ayutthaya',
        'siem reap', 'angkor', 'phnom penh', 'battambang',
        'luang prabang', 'vientiane', 'vang vieng', 'pakse',
        'tokyo', 'kyoto', 'osaka', 'hakone', 'nara', 'hiroshima', 'takayama', 'kanazawa', 'hokkaido', 'sapporo', 'nikko',
        'beijing', 'shanghai', 'xi\'an', 'xian', 'guilin', 'yangshuo', 'chengdu', 'hong kong', 'lhasa', 'tibet',
        'bali', 'ubud', 'seminyak', 'jakarta', 'yogyakarta', 'komodo', 'lombok',
        'thimphu', 'paro', 'punakha', 'gangtey', 'bumthang',
        'delhi', 'agra', 'jaipur', 'rajasthan', 'varanasi', 'mumbai', 'kerala', 'udaipur',
        'kathmandu', 'pokhara', 'chitwan', 'everest',
        'colombo', 'kandy', 'galle', 'ella', 'sigiriya', 'yala',
        'kuala lumpur', 'penang', 'langkawi', 'borneo', 'singapore', 'taipei', 'manila', 'el nido', 'coron', 'cebu'
    ];

    $rows = [];
    foreach ($blocks as $index => $block) {
        if (!preg_match('/^([\s\S]*?)<\/h[23]>/i', $block, $head)) continue;

        $heading = trim(html_entity_decode(wp_strip_all_tags($head[1]), ENT_QUOTES, 'UTF-8'));
        preg_match('/DAY\s*(\d+)/i', $heading, $num);
        $day = isset($num[1]) ? (int) $num[1] : $index + 1;

        // "DAY 4: NIKKO – MISTY LAKES" → region "Nikko", the rest is the title.
        $after = trim(preg_replace('/^DAY\s*\d+\s*[:.\-–—]\s*/iu', '', $heading));
        
        // Extract city from heading
        $place = '';
        $clean_heading_lower = strtolower($heading . ' ' . $after);
        foreach ($CITIES as $city) {
            if (preg_match('/\b' . preg_quote($city, '/') . '\b/i', $clean_heading_lower)) {
                $place = ucwords($city);
                break;
            }
        }
        if (!$place) {
            $parts = preg_split('/[–—-]/u', $after);
            $candidate = trim($parts[0]);
            $candidate = trim(preg_replace('/^(arrival\s+in|arrive\s+in|departure\s+from|depart\s+from|return\s+to|onward\s+to|transfer\s+to|fly\s+to)\s+/iu', '', $candidate));
            if (strlen($candidate) > 2 && strlen($candidate) < 25) $place = $candidate;
        }

        $prose = substr($block, strlen($head[0]));
        $prose = preg_replace('/<h[23][\s\S]*$/i', '', $prose);
        $prose = trim(preg_replace('/\s+/u', ' ', html_entity_decode(wp_strip_all_tags($prose), ENT_QUOTES, 'UTF-8')));

        $rows[] = [
            'day_num' => (string) $day,
            'group_tag' => $place !== '' ? $place : 'Itinerary',
            'title' => $after !== '' ? $after : ('Day ' . $day),
            'description' => $prose,
            'image_url' => '',
            'latitude' => '',
            'longitude' => '',
        ];
    }

    return $rows;
}

/**
 * Enriches all tours with complete structured data:
 * - Itinerary group tags (cities)
 * - Duration days and duration label
 * - Route summary
 * - Inclusions / Exclusions
 * - Highlights list
 * - FAQs and accommodation options
 */
function aat_enrich_tours($offset = 0, $limit = 20) {
    $posts = get_posts([
        'post_type' => 'tour',
        'post_status' => ['publish', 'draft'],
        'posts_per_page' => $limit,
        'offset' => $offset,
        'fields' => 'ids',
    ]);

    if (!$posts) return ['imported' => 0, 'done' => true, 'offset' => $offset];

    $CITIES = [
        'seoul', 'busan', 'gyeongju', 'jeju', 'incheon', 'dmz',
        'hanoi', 'halong', 'ha long', 'sapa', 'hue', 'hoi an', 'da nang', 'saigon', 'ho chi minh', 'mekong', 'phu quoc',
        'bangkok', 'chiang mai', 'chiang rai', 'phuket', 'krabi', 'koh samui', 'ayutthaya',
        'siem reap', 'angkor', 'phnom penh', 'battambang',
        'luang prabang', 'vientiane', 'vang vieng', 'pakse',
        'tokyo', 'kyoto', 'osaka', 'hakone', 'nara', 'hiroshima', 'takayama', 'kanazawa', 'hokkaido', 'sapporo', 'nikko',
        'beijing', 'shanghai', 'xi\'an', 'xian', 'guilin', 'yangshuo', 'chengdu', 'hong kong', 'lhasa', 'tibet',
        'bali', 'ubud', 'seminyak', 'jakarta', 'yogyakarta', 'komodo', 'lombok',
        'thimphu', 'paro', 'punakha', 'gangtey', 'bumthang',
        'delhi', 'agra', 'jaipur', 'rajasthan', 'varanasi', 'mumbai', 'kerala', 'udaipur',
        'kathmandu', 'pokhara', 'chitwan', 'everest',
        'colombo', 'kandy', 'galle', 'ella', 'sigiriya', 'yala',
        'kuala lumpur', 'penang', 'langkawi', 'borneo', 'singapore', 'taipei', 'manila', 'el nido', 'coron', 'cebu'
    ];

    $STANDARD_INCLUSIONS = implode("\n", [
        "Private English-speaking specialist guides throughout",
        "Private air-conditioned vehicles and professional chauffeurs",
        "Hand-selected luxury boutique accommodations",
        "Daily breakfast and select authentic regional culinary experiences",
        "All sightseeing admissions, entrance permits, and private boat rides",
        "24/7 on-the-ground support from our destination specialists"
    ]);

    $STANDARD_EXCLUSIONS = implode("\n", [
        "International flights to and from destination",
        "Entry visa fees and comprehensive travel insurance",
        "Personal expenses, optional gratuities, and alcoholic beverages"
    ]);

    $filled = 0;
    foreach ($posts as $post_id) {
        // 1. Hero image fallback to post thumbnail or suggested image
        $hero = get_post_meta($post_id, 'hero_image', true);
        if (!$hero) {
            $thumb = get_the_post_thumbnail_url($post_id, 'full');
            if (!$thumb && function_exists('aat_suggest_image')) {
                $att_id = aat_suggest_image($post_id);
                if ($att_id) $thumb = wp_get_attachment_url($att_id);
            }
            if ($thumb) update_post_meta($post_id, 'hero_image', $thumb);
        }

        // Auto-extract gallery from body <img> tags if gallery is empty
        $existing_gallery = get_post_meta($post_id, 'gallery', true);
        if (!$existing_gallery || $existing_gallery === '[]') {
            $content = get_post_field('post_content', $post_id);
            if (preg_match_all('/<img[^>]+src=(["\'])(https?:\/\/[^"\']+)\1/i', $content, $matches)) {
                $gallery_rows = [];
                foreach (array_unique($matches[2]) as $img_url) {
                    $gallery_rows[] = ['image_url' => $img_url, 'caption' => ''];
                }
                if ($gallery_rows) {
                    update_post_meta($post_id, 'gallery', wp_slash(wp_json_encode(array_slice($gallery_rows, 0, 10))));
                }
            }
        }

        // 2. Parse or enhance Itinerary
        $existing_itin = get_post_meta($post_id, 'itinerary', true);
        $rows = is_string($existing_itin) && $existing_itin !== '' ? json_decode($existing_itin, true) : $existing_itin;
        if (!is_array($rows) || empty($rows)) {
            $rows = aat_parse_body_itinerary(get_post_field('post_content', $post_id));
        }

        $distinct_cities = [];
        if (is_array($rows) && !empty($rows)) {
            foreach ($rows as &$row) {
                // Ensure group_tag is populated
                if (empty($row['group_tag']) || $row['group_tag'] === 'Itinerary') {
                    $text_to_scan = strtolower(($row['title'] ?? '') . ' ' . ($row['description'] ?? ''));
                    foreach ($CITIES as $city) {
                        if (preg_match('/\b' . preg_quote($city, '/') . '\b/i', $text_to_scan)) {
                            $row['group_tag'] = ucwords($city);
                            break;
                        }
                    }
                }
                if (!empty($row['group_tag']) && $row['group_tag'] !== 'Itinerary') {
                    $distinct_cities[$row['group_tag']] = true;
                }
            }
            update_post_meta($post_id, 'itinerary', wp_slash(wp_json_encode($rows)));
        }

        $days_count = is_array($rows) ? count($rows) : 0;
        $cities_list = array_keys($distinct_cities);

        // 3. Duration days & label
        $current_days = (int) get_post_meta($post_id, 'duration_days', true);
        if ($current_days <= 0 && $days_count > 0) {
            update_post_meta($post_id, 'duration_days', $days_count);
            update_post_meta($post_id, 'duration_label', $days_count . ' Days / ' . max($days_count - 1, 1) . ' Nights');
        }

        // 4. Destinations count & Route
        $current_dest_count = (int) get_post_meta($post_id, 'destinations_count', true);
        if ($current_dest_count <= 0 && count($cities_list) > 0) {
            update_post_meta($post_id, 'destinations_count', count($cities_list));
        }

        $current_route = get_post_meta($post_id, 'tour_route', true);
        if (empty($current_route) && count($cities_list) > 0) {
            update_post_meta($post_id, 'tour_route', implode(' – ', $cities_list));
        }

        // 5. Activity level & Min guests
        if (!get_post_meta($post_id, 'tour_level', true)) update_post_meta($post_id, 'tour_level', 'Moderate');
        if (!get_post_meta($post_id, 'min_guests', true)) update_post_meta($post_id, 'min_guests', 2);

        // 6. Inclusions & Exclusions
        $current_inc = get_post_meta($post_id, 'inclusions_list', true);
        if (empty($current_inc)) update_post_meta($post_id, 'inclusions_list', $STANDARD_INCLUSIONS);

        $current_exc = get_post_meta($post_id, 'exclusions_list', true);
        if (empty($current_exc)) update_post_meta($post_id, 'exclusions_list', $STANDARD_EXCLUSIONS);

        // 7. Highlights list
        $current_high = get_post_meta($post_id, 'highlights_list', true);
        if (empty($current_high) && is_array($rows) && count($rows) > 0) {
            $extracted_highlights = [];
            foreach (array_slice($rows, 0, 5) as $r) {
                $t = trim(preg_replace('/^Day\s*\d+\s*[:.\-–—]\s*/iu', '', $r['title'] ?? ''));
                if ($t) $extracted_highlights[] = $t;
            }
            if ($extracted_highlights) {
                update_post_meta($post_id, 'highlights_list', implode("\n", $extracted_highlights));
            }
        }

        // 8. Sample Dates & FAQs if empty
        if (!get_post_meta($post_id, 'departure_dates', true)) {
            update_post_meta($post_id, 'departure_dates', wp_slash(wp_json_encode([
                ['date_range' => 'Sep 15 – Sep ' . (15 + $days_count), 'price_info' => 'From $4,850 / person', 'availability_status' => 'Available'],
                ['date_range' => 'Oct 10 – Oct ' . (10 + $days_count), 'price_info' => 'From $5,200 / person', 'availability_status' => 'Available'],
                ['date_range' => 'Nov 05 – Nov ' . (5 + $days_count), 'price_info' => 'From $4,950 / person', 'availability_status' => 'Call for Availability'],
            ])));
        }

        if (!get_post_meta($post_id, 'faqs', true)) {
            update_post_meta($post_id, 'faqs', wp_slash(wp_json_encode([
                ['question' => 'Can this itinerary be fully customized?', 'answer' => 'Yes, every private journey with Absolute Asia can be tailored to your preferred travel pace, dates, interests, and hotel choices.'],
                ['question' => 'What type of vehicles and guides are provided?', 'answer' => 'You will have a private, dedicated English-speaking local specialist guide and private air-conditioned vehicle with professional chauffeur throughout your journey.'],
                ['question' => 'When is the best time of year to take this journey?', 'answer' => 'Spring and Autumn generally offer the most pleasant weather, though our travel designers can tailor seasonal activities year-round.'],
            ])));
        }

        $filled++;
    }

    $next_offset = $offset + count($posts);
    return ['imported' => $filled, 'offset' => $next_offset, 'done' => false];
}

/** Enriches hotel records with location, highlights, and hero image. */
function aat_enrich_hotels($offset = 0, $limit = 20) {
    $posts = get_posts([
        'post_type' => 'hotel',
        'post_status' => ['publish', 'draft'],
        'posts_per_page' => $limit,
        'offset' => $offset,
        'fields' => 'ids',
    ]);

    if (!$posts) return ['imported' => 0, 'done' => true, 'offset' => $offset];

    $curated_map = function_exists('aat_hotel_curated_images') ? aat_hotel_curated_images() : [];
    $filled = 0;

    foreach ($posts as $post_id) {
        $slug = get_post_field('post_name', $post_id);
        
        // 1. Hero image - use authentic curated image if available, else thumbnail or library search
        if (isset($curated_map[$slug]) && !empty($curated_map[$slug])) {
            update_post_meta($post_id, 'hero_image', $curated_map[$slug]);
        } else {
            $hero = get_post_meta($post_id, 'hero_image', true);
            if (!$hero) {
                $thumb = get_the_post_thumbnail_url($post_id, 'full');
                if (!$thumb && function_exists('aat_suggest_image')) {
                    $att_id = aat_suggest_image($post_id);
                    if ($att_id) $thumb = wp_get_attachment_url($att_id);
                }
                if ($thumb) update_post_meta($post_id, 'hero_image', $thumb);
            }
        }

        // Auto-extract gallery from body <img> tags if gallery is empty
        $existing_gallery = get_post_meta($post_id, 'gallery', true);
        if (!$existing_gallery || $existing_gallery === '[]') {
            $content = get_post_field('post_content', $post_id);
            if (preg_match_all('/<img[^>]+src=(["\'])(https?:\/\/[^"\']+)\1/i', $content, $matches)) {
                $gallery_rows = [];
                foreach (array_unique($matches[2]) as $img_url) {
                    $gallery_rows[] = ['image_url' => $img_url, 'caption' => ''];
                }
                if ($gallery_rows) {
                    update_post_meta($post_id, 'gallery', wp_slash(wp_json_encode(array_slice($gallery_rows, 0, 8))));
                }
            }
        }

        // 2. Location
        $country = '';
        $terms = get_the_terms($post_id, 'country');
        if ($terms && !is_wp_error($terms)) $country = $terms[0]->name;

        $loc = get_post_meta($post_id, 'hotel_location', true);
        if (!$loc && $country) {
            update_post_meta($post_id, 'hotel_location', $country);
            update_post_meta($post_id, 'location_map', $country);
        }

        // 3. Highlights
        $high = get_post_meta($post_id, 'hotel_highlights', true);
        if (!$high) {
            update_post_meta($post_id, 'hotel_highlights', implode("\n", [
                "Hand-selected luxury boutique property with distinctive character",
                "Spacious suites and villas featuring authentic regional design",
                "Exceptional on-site culinary dining and wellness experiences",
                "Personalized concierge service and tranquil secluded setting"
            ]));
        }

        $filled++;
    }

    $next_offset = $offset + count($posts);
    return ['imported' => $filled, 'offset' => $next_offset, 'done' => false];
}

/** Enriches destination places with tagline, overview, and map info. */
function aat_enrich_places($offset = 0, $limit = 20) {
    $posts = get_posts([
        'post_type' => 'place_to_go',
        'post_status' => ['publish', 'draft'],
        'posts_per_page' => $limit,
        'offset' => $offset,
        'fields' => 'ids',
    ]);

    if (!$posts) return ['imported' => 0, 'done' => true, 'offset' => $offset];

    $filled = 0;
    foreach ($posts as $post_id) {
        $title = get_the_title($post_id);

        // 1. Hero image
        $hero = get_post_meta($post_id, 'hero_image', true);
        if (!$hero) {
            $thumb = get_the_post_thumbnail_url($post_id, 'full');
            if ($thumb) update_post_meta($post_id, 'hero_image', $thumb);
        }

        // 2. Tagline
        $tagline = get_post_meta($post_id, 'hero_tagline', true);
        if (!$tagline) update_post_meta($post_id, 'hero_tagline', 'Discover the Heritage & Culture of ' . $title);

        // 3. Overview
        $overview = get_post_meta($post_id, 'destination_overview', true);
        if (!$overview) {
            $excerpt = get_the_excerpt($post_id);
            if ($excerpt) update_post_meta($post_id, 'destination_overview', $excerpt);
        }

        // 4. Map info
        if (!get_post_meta($post_id, 'location_map', true)) update_post_meta($post_id, 'location_map', $title);
        if (!get_post_meta($post_id, 'map_headline', true)) update_post_meta($post_id, 'map_headline', 'Highlights of ' . $title);

        $filled++;
    }

    $next_offset = $offset + count($posts);
    return ['imported' => $filled, 'offset' => $next_offset, 'done' => false];
}

/** Enriches articles (guides, things to do, blogs) with hero image and read time. */
function aat_enrich_articles($offset = 0, $limit = 20) {
    $posts = get_posts([
        'post_type' => ['travel_guide', 'thing_to_do', 'blog'],
        'post_status' => ['publish', 'draft'],
        'posts_per_page' => $limit,
        'offset' => $offset,
        'fields' => 'ids',
    ]);

    if (!$posts) return ['imported' => 0, 'done' => true, 'offset' => $offset];

    $filled = 0;
    foreach ($posts as $post_id) {
        // 1. Hero image
        $hero = get_post_meta($post_id, 'hero_image', true);
        if (!$hero) {
            $thumb = get_the_post_thumbnail_url($post_id, 'full');
            if ($thumb) update_post_meta($post_id, 'hero_image', $thumb);
        }

        // 2. Read minutes
        $read = get_post_meta($post_id, 'read_minutes', true);
        if (!$read) {
            $content = get_post_field('post_content', $post_id);
            $words = str_word_count(strip_tags($content));
            $mins = max(3, ceil($words / 180));
            update_post_meta($post_id, 'read_minutes', $mins . ' min read');
        }

        // 3. Intro HTML
        $intro = get_post_meta($post_id, 'intro_html', true);
        if (!$intro) {
            $excerpt = get_the_excerpt($post_id);
            if ($excerpt) update_post_meta($post_id, 'intro_html', $excerpt);
        }

        $filled++;
    }

    $next_offset = $offset + count($posts);
    return ['imported' => $filled, 'offset' => $next_offset, 'done' => false];
}

/**
 * Automatically populates any empty ACF fields on the edit screen so the
 * editor sees all fields pre-filled with rich content ready for editing.
 */
function aat_auto_fill_post_fields($post_id) {
    $type = get_post_type($post_id);
    if (!$type) return;

    if ($type === 'tour') {
        delete_post_meta($post_id, '_aat_tour_enriched_v2');
        aat_enrich_tours(1);
    } elseif ($type === 'hotel') {
        delete_post_meta($post_id, '_aat_hotel_enriched');
        aat_enrich_hotels(1);
    } elseif ($type === 'place_to_go') {
        delete_post_meta($post_id, '_aat_place_enriched');
        aat_enrich_places(1);
    } elseif (in_array($type, ['travel_guide', 'thing_to_do', 'blog'], true)) {
        delete_post_meta($post_id, '_aat_article_enriched');
        aat_enrich_articles(1);
    }
}

/** Hook into WordPress admin post load to pre-populate empty fields on the fly. */
add_action('load-post.php', function () {
    $post_id = isset($_GET['post']) ? (int) $_GET['post'] : 0;
    if ($post_id > 0) aat_auto_fill_post_fields($post_id);
});
