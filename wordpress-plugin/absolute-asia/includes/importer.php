<?php
/**
 * Importer for a legacy WordPress install (set on the import screen).
 *
 * The source is read over its public REST API - no database dump or SQL access
 * needed. Run the compatibility check first: it reports which post types,
 * taxonomies and ACF fields the source actually carries.
 * Each imported post keeps `_aat_source_id`, which makes re-runs update in place
 * instead of creating the "-2" duplicates the earlier one-off script produced.
 *
 * Images: every legacy image URL is sideloaded once and cached by
 * `_aat_source_url` on the attachment, then referenced by the new URL - including
 * the ones embedded in post content.
 */

if (!defined('ABSPATH')) exit;

define('AAT_SOURCE_DEFAULT', 'https://www.absoluteasiatours.com');

/* AJAX handler: save the frontend URL for the live preview panel. */
add_action('wp_ajax_aat_save_frontend_url', function () {
    check_ajax_referer('aat_save_frontend_url');
    if (!current_user_can('manage_options')) wp_send_json_error('Forbidden');
    $url = esc_url_raw(wp_unslash($_POST['url'] ?? ''));
    update_option('aat_frontend_url', $url);
    wp_send_json_success(['url' => $url]);
});

/** old REST base => new taxonomy */
function aat_import_taxonomy_map() {
    return [
        'categories' => 'category',
        'tags' => 'post_tag',
        'inspiration' => 'inspiration',
        'hotel_service' => 'hotel_service',
        'city' => 'city',
        'blog-type' => 'blog-type',
    ];
}

/**
 * Region each country belongs to, used by the destinations directory filter.
 * The legacy site had no region field - it grouped countries by hand in the
 * page templates - so the grouping lives here.
 */
function aat_country_regions() {
    return [
        'vietnam' => 'southeast', 'thailand' => 'southeast', 'cambodia' => 'southeast',
        'laos' => 'southeast', 'malaysia' => 'southeast', 'singapore' => 'southeast',
        'myanmar' => 'southeast', 'philippines' => 'isles', 'indonesia' => 'isles',
        'bali' => 'isles', 'maldives' => 'isles',
        'japan' => 'east', 'china' => 'east', 'south-korea' => 'east',
        'taiwan' => 'east', 'north-korea' => 'east',
        'india' => 'south', 'sri-lanka' => 'south',
        'bhutan' => 'himalaya', 'nepal' => 'himalaya',
        'asia-cruises' => 'cruises',
    ];
}

/** old REST base => new post type */
function aat_import_type_map() {
    return [
        'posts' => 'tour',
        'trip' => 'trip',
        'places-to-go' => 'place_to_go',
        'hotels' => 'hotel',
        'travel-guides' => 'travel_guide',
        'things-to-do' => 'thing_to_do',
        'blogs' => 'blog',
        'pages' => 'page',
    ];
}

function aat_source_url() {
    return untrailingslashit(get_option('aat_source_url', AAT_SOURCE_DEFAULT));
}

function aat_import_get($path) {
    $url = aat_source_url() . '/wp-json' . $path;
    $response = wp_remote_get($url, ['timeout' => 45, 'headers' => ['Accept' => 'application/json']]);
    if (is_wp_error($response)) return $response;
    $code = wp_remote_retrieve_response_code($response);
    if ($code !== 200) return new WP_Error('aat_source_http', "Source returned $code for $path");
    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (!is_array($body)) return new WP_Error('aat_source_json', "Bad JSON from $path");
    return $body;
}

/* ─────────────────────────── media ─────────────────────────── */

function aat_find_imported_attachment($source_url) {
    $found = get_posts([
        'post_type' => 'attachment',
        'post_status' => 'inherit',
        'posts_per_page' => 1,
        'fields' => 'ids',
        'meta_key' => '_aat_source_url',
        'meta_value' => $source_url,
    ]);
    return $found ? (int) $found[0] : 0;
}

/** Sideloads a legacy image once; returns the new attachment id. */
function aat_import_media_url($url, $post_id = 0) {
    if (!is_string($url) || !preg_match('#^https?://#', $url)) return 0;
    $url = strtok($url, '?');

    $existing = aat_find_imported_attachment($url);
    if ($existing) return $existing;

    // A resized filename is not an attachment on the source either - take the original.
    $full = preg_replace('/-\d+x\d+(\.[a-z0-9]+)$/i', '$1', $url);

    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';

    $id = media_sideload_image($full, $post_id, null, 'id');
    if (is_wp_error($id)) {
        $id = media_sideload_image($url, $post_id, null, 'id');
        if (is_wp_error($id)) return 0;
    }
    update_post_meta($id, '_aat_source_url', $url);
    if ($full !== $url) update_post_meta($id, '_aat_source_url_full', $full);
    return (int) $id;
}

function aat_import_media_id($old_id, $post_id = 0) {
    $old_id = (int) $old_id;
    if (!$old_id) return 0;
    $media = aat_import_get("/wp/v2/media/$old_id?_fields=source_url,alt_text");
    if (is_wp_error($media) || empty($media['source_url'])) return 0;
    $new_id = aat_import_media_url($media['source_url'], $post_id);
    if ($new_id && !empty($media['alt_text'])) {
        update_post_meta($new_id, '_wp_attachment_image_alt', sanitize_text_field($media['alt_text']));
    }
    return $new_id;
}

function aat_import_media_url_only($url, $post_id = 0) {
    $id = aat_import_media_url($url, $post_id);
    return $id ? wp_get_attachment_url($id) : '';
}

/**
 * ACF image fields store an attachment ID, not a URL - writing a URL makes
 * get_field() return nothing, which is why heroes and specialist portraits came
 * back empty even though the files had been sideloaded.
 */
function aat_image_field_names() {
    return ['hero_image', 'specialist_photo', 'best_time_image', 'content_right_image', 'review_logo'];
}

function aat_import_media_attachment($url, $post_id = 0) {
    return aat_import_media_url($url, $post_id);
}

/** Turns a list of legacy attachment ids into gallery rows. */
function aat_import_gallery($ids, $post_id = 0) {
    if (!is_array($ids)) return [];
    $rows = [];
    foreach (array_slice($ids, 0, 30) as $old_id) {
        if (is_array($old_id)) {
            $url = aat_str($old_id['url'] ?? $old_id['image_url'] ?? '');
            $legacy_id = $old_id['ID'] ?? $old_id['id'] ?? 0;
            if (!$url && is_array($old_id['image'] ?? null)) {
                $url = aat_str($old_id['image']['url'] ?? '');
                $legacy_id = $legacy_id ?: ($old_id['image']['ID'] ?? $old_id['image']['id'] ?? 0);
            }
            $new_id = $url
                ? aat_import_media_url($url, $post_id)
                : ($legacy_id ? aat_import_media_id($legacy_id, $post_id) : 0);
        } else {
            $new_id = is_numeric($old_id)
                ? aat_import_media_id($old_id, $post_id)
                : aat_import_media_url($old_id, $post_id);
        }
        if (!$new_id) continue;
        $rows[] = [
            'image_url' => wp_get_attachment_url($new_id),
            'caption' => (string) get_post_meta($new_id, '_wp_attachment_image_alt', true),
        ];
    }
    return $rows;
}

/**
 * Rewrites legacy URLs inside post content: uploads point at the freshly
 * imported attachments, and page links become site-relative.
 */
function aat_import_rewrite_content($html, $post_id = 0) {
    if (!is_string($html) || $html === '') return $html;
    $host = preg_quote(wp_parse_url(aat_source_url(), PHP_URL_HOST), '#');

    if (preg_match_all('#https?://(?:www\.)?' . $host . '/wp-content/uploads/[^\s"\'<>()]+#i', $html, $matches)) {
        foreach (array_unique($matches[0]) as $old_url) {
            $new_url = aat_import_media_url_only($old_url, $post_id);
            if ($new_url) $html = str_replace($old_url, $new_url, $html);
        }
    }

    // href only - image src must keep pointing at the WordPress host.
    $html = preg_replace_callback(
        '#href=(["\'])(https?://(?:www\.)?' . $host . ')([^"\']*)\1#i',
        function ($m) { return 'href=' . $m[1] . ($m[3] ?: '/') . $m[1]; },
        $html
    );

    // The legacy install traded as My Way Travel; that name and its outbound
    // links must not survive the import. See cleanup.php.
    return aat_rebrand_text($html);
}

/* ─────────────────────────── helpers ─────────────────────────── */

function aat_str($value) {
    if (is_string($value)) return $value;
    if (is_numeric($value)) return (string) $value;
    return '';
}

/**
 * Turns a legacy absolute URL into a site-relative path.
 *
 * Everything imported points at absoluteasiatours.com, so left alone every card
 * and banner button would send visitors back to the old site.
 */
function aat_local_href($url) {
    $url = aat_str($url);
    if ($url === '' || $url[0] === '/' || $url[0] === '#') return $url;
    if (strpos($url, 'mailto:') === 0 || strpos($url, 'tel:') === 0) return $url;

    $host = wp_parse_url($url, PHP_URL_HOST);
    if (!$host) return $url;
    $source_host = wp_parse_url(aat_source_url(), PHP_URL_HOST);
    $extra_hosts = array_filter(array_map('trim', explode(',', (string) get_option('aat_legacy_hosts', ''))));
    $allowed = array_values(array_unique(array_filter(array_merge([$source_host], $extra_hosts))));
    $internal = false;
    foreach ($allowed as $allowed_host) {
        $allowed_host = preg_replace('/^www\./i', '', strtolower($allowed_host));
        $candidate = preg_replace('/^www\./i', '', strtolower($host));
        if ($candidate === $allowed_host) { $internal = true; break; }
    }
    if (!$internal) return $url;

    $path = (string) wp_parse_url($url, PHP_URL_PATH);
    $query = wp_parse_url($url, PHP_URL_QUERY);
    $fragment = wp_parse_url($url, PHP_URL_FRAGMENT);
    return ($path ?: '/') . ($query ? "?$query" : '') . ($fragment ? "#$fragment" : '');
}

/** ACF link fields arrive as {title,url,target}. */
function aat_link_url($value) {
    $url = is_array($value) ? aat_str($value['url'] ?? '') : aat_str($value);
    return aat_local_href($url);
}

function aat_link_title($value) {
    if (is_array($value)) return aat_str($value['title'] ?? '');
    return '';
}

/** "10 Days / 9 Nights" -> 10 */
function aat_first_number($text) {
    return preg_match('/\d+/', aat_str($text), $m) ? (int) $m[0] : 0;
}

/** Turns an HTML list/paragraph block into one item per line. */
function aat_html_to_lines($html) {
    $html = aat_str($html);
    if ($html === '') return '';
    $html = preg_replace('#</(li|p|div|h[1-6])>#i', "\n", $html);
    $html = preg_replace('#<br\s*/?>#i', "\n", $html);
    $lines = array_filter(array_map(function ($line) {
        return trim(html_entity_decode(wp_strip_all_tags($line), ENT_QUOTES, 'UTF-8'));
    }, explode("\n", $html)), function ($line) { return $line !== ''; });
    return implode("\n", $lines);
}

/** Legacy post_object fields come back as full post rows or bare ids. */
function aat_old_ids($value) {
    if (empty($value)) return [];
    $items = is_array($value) && isset($value['ID']) ? [$value] : (array) $value;
    $ids = [];
    foreach ($items as $item) {
        if (is_numeric($item)) $ids[] = (int) $item;
        elseif (is_array($item) && isset($item['ID'])) $ids[] = (int) $item['ID'];
    }
    return array_values(array_filter($ids));
}

/* ─────────────────────── field mapping ─────────────────────── */

/**
 * The legacy site repeated one "speak to a specialist" block per post type under
 * different field names. They all mean the same thing, so they collapse into the
 * shared specialist_* fields.
 */
function aat_map_specialist($acf, $post_id, $map) {
    $out = [];
    $title = aat_str($acf[$map['title']] ?? '');
    $text = aat_str($acf[$map['text']] ?? '');
    $photo = aat_str($acf[$map['photo']] ?? '');
    $button = aat_str($acf[$map['button']] ?? '');
    $phone = aat_str($acf[$map['phone']] ?? '');

    if ($title) $out['specialist_title'] = $title;
    if ($text) $out['specialist_text'] = trim(wp_strip_all_tags($text));
    if ($photo) $out['specialist_photo'] = aat_import_media_url_only($photo, $post_id);
    if ($button) $out['specialist_button'] = $button;
    if ($phone) $out['specialist_phone'] = $phone;
    if (!empty($map['link']) && !empty($acf[$map['link']])) {
        $out['specialist_link'] = aat_link_url($acf[$map['link']]);
    }
    return $out;
}

/** new post type => legacy REST route, for looking up its map entry. */
function aat_route_for_type($new_type) {
    foreach (aat_field_map() as $route => $spec) {
        if ($spec['type'] === $new_type) return $route;
    }
    // destinations share the places map.
    return null;
}

/**
 * Maps one legacy payload onto the new schema.
 *
 * The declarative table in field-map.php does the bulk of it; only shapes that
 * need real logic - repeaters, grouped objects, one legacy field feeding
 * several new ones - are handled here.
 *
 * Returns ['acf' => [...], 'relations' => ['field' => [old ids]]].
 */
function aat_map_fields($old, $new_type, $post_id) {
    $acf = is_array($old['acf'] ?? null) ? $old['acf'] : [];

    $route = aat_route_for_type($new_type);
    $base = $route ? aat_apply_field_map($route, $acf, $post_id) : ['acf' => [], 'relations' => []];
    $out = $base['acf'];
    $relations = $base['relations'];

    switch ($new_type) {
        case 'tour':
            $price = is_array($acf['tour_price'] ?? null) ? $acf['tour_price'] : [];
            $out['duration_label'] = aat_str($price['duration'] ?? '');
            $out['duration_days'] = aat_first_number($price['duration'] ?? '');
            $out['tour_route'] = aat_str($price['route'] ?? '');
            $out['tour_level'] = aat_str($price['level'] ?? '');
            $out['tour_code'] = aat_str($price['tour_code'] ?? '');

            $itinerary = [];
            foreach ((array) ($acf['travel_&_map'] ?? []) as $day) {
                if (!is_array($day)) continue;
                $gallery = $day['gallery_travel'] ?? [];
                $image = '';
                if (is_array($gallery) && $gallery) {
                    $first = reset($gallery);
                    $image = is_numeric($first)
                        ? (string) wp_get_attachment_url(aat_import_media_id($first, $post_id))
                        : aat_import_media_url_only(aat_str($first), $post_id);
                }
                $itinerary[] = [
                    'day_num' => aat_str($day['day_number'] ?? ''),
                    'group_tag' => aat_str($day['location_map'] ?? ''),
                    'title' => aat_str($day['day_title'] ?? ''),
                    'description' => trim(wp_strip_all_tags(aat_str($day['day_content'] ?? ''))),
                    'image_url' => $image,
                    'latitude' => aat_str($day['latitude'] ?? ''),
                    'longitude' => aat_str($day['longitude'] ?? ''),
                ];
            }
            if ($itinerary) {
                $out['itinerary'] = $itinerary;
                $out['destinations_count'] = count(array_unique(array_filter(array_column($itinerary, 'group_tag'))));
            }

            // list_hightlight carries a thumbnail per row - richer than a text list.
            $experiences = [];
            foreach ((array) ($acf['list_hightlight'] ?? []) as $row) {
                if (!is_array($row)) continue;
                $experiences[] = [
                    'image_url' => aat_import_media_url_only(aat_str($row['thumb_hightlight'] ?? ''), $post_id),
                    'title' => aat_str($row['title_hightlight'] ?? ''),
                    'description' => trim(wp_strip_all_tags(aat_str($row['desc_hightlight'] ?? ''))),
                    'link' => '',
                ];
            }
            if ($experiences) $out['experiences'] = $experiences;

            $highlights = [];
            foreach ((array) ($acf['list_hightlight'] ?? []) as $row) {
                if (!is_array($row)) continue;
                $title = trim(aat_str($row['title_hightlight'] ?? ''));
                $desc = trim(wp_strip_all_tags(aat_str($row['desc_hightlight'] ?? '')));
                $line = trim($title . ($title && $desc ? ' — ' : '') . $desc);
                if ($line !== '') $highlights[] = $line;
            }
            if ($highlights) $out['highlights_list'] = implode("\n", $highlights);

            $options = [];
            foreach ((array) ($acf['list_option'] ?? []) as $opt) {
                if (!is_array($opt)) continue;
                $options[] = [
                    'title' => aat_str($opt['title_place'] ?? ''),
                    'nights' => aat_str($opt['total_day'] ?? ''),
                    'description' => trim(wp_strip_all_tags(aat_str($opt['desc_place'] ?? ''))),
                    'link' => aat_link_url($opt['link_browse'] ?? ''),
                ];
            }
            if ($options) $out['accommodation_options'] = $options;

            $faqs = [];
            foreach ((array) ($acf['faqs'] ?? []) as $faq) {
                if (!is_array($faq)) continue;
                // The legacy field is misspelled "anwser".
                $faqs[] = [
                    'question' => aat_str($faq['question'] ?? ''),
                    'answer' => trim(wp_strip_all_tags(aat_str($faq['anwser'] ?? $faq['answer'] ?? ''))),
                ];
            }
            if ($faqs) $out['faqs'] = $faqs;

            // where_is is the banner eyebrow plus its link, in one object.
            $where = is_array($acf['where_is'] ?? null) ? $acf['where_is'] : [];
            if ($where) {
                $out['hero_eyebrow'] = trim(wp_strip_all_tags(aat_str($where['big_title_banner'] ?? '')));
                $out['hero_eyebrow_link'] = aat_link_url($where['title_and_link_banner'] ?? '');
            }

            $cta = $acf['button_hightlight'] ?? [];
            if (is_array($cta) && $cta) {
                $first = reset($cta);
                if (is_array($first)) {
                    $out['cta_label'] = aat_str($first['title_button'] ?? '');
                    $out['cta_link'] = aat_local_href(aat_str($first['url_button'] ?? ''));
                }
            }
            break;

        case 'place_to_go':
            $location = is_array($acf['location'] ?? null) ? $acf['location'] : [];
            $out['location_map'] = aat_str($location['location_map'] ?? '');
            $out['latitude'] = aat_str($location['latitude'] ?? '');
            $out['longitude'] = aat_str($location['longitude'] ?? '');
            break;

        case 'hotel':
            // The legacy field name is misspelled "locaition".
            $location = is_array($acf['locaition'] ?? null) ? $acf['locaition'] : [];
            $out['location_map'] = aat_str($location['location_map'] ?? '');
            $out['latitude'] = aat_str($location['latitude'] ?? '');
            $out['longitude'] = aat_str($location['longitude'] ?? '');

            $nearby = [];
            foreach ((array) ($acf['list_location_distance'] ?? []) as $row) {
                if (!is_array($row)) continue;
                $nearby[] = [
                    'name' => aat_str($row['name_location'] ?? ''),
                    'location_map' => aat_str($row['location_map'] ?? ''),
                    'latitude' => aat_str($row['latitude'] ?? ''),
                    'longitude' => aat_str($row['longitude'] ?? ''),
                ];
            }
            if ($nearby) $out['nearby_places'] = $nearby;
            break;

        case 'travel_guide':
            // One legacy heading feeds both the plan block and the specialist card.
            $planning = aat_str($acf['title_planning'] ?? $acf['title_planing'] ?? '');
            $out['plan_title'] = $planning;
            if ($planning && empty($out['specialist_title'])) $out['specialist_title'] = $planning;
            break;

        case 'page':
            // Keep a mapped legacy introduction when present; otherwise clear
            // the stale value written by the pre-contract importer.
            if (empty($out['hero_tagline'])) $out['hero_tagline'] = '';

            $best = is_array($acf['best_time'] ?? null) ? $acf['best_time'] : [];
            if (!empty($best['image_left'])) {
                $out['best_time_image'] = aat_import_media_url_only(aat_str($best['image_left']), $post_id);
            }
            $out['best_time_html'] = aat_str($best['content_right'] ?? '');

            $months = [];
            foreach ((array) ($acf['tour-in-month'] ?? []) as $row) {
                if (!is_array($row)) continue;
                $months[] = [
                    'month' => aat_str($row['month'] ?? ''),
                    'image_url' => aat_import_media_url_only(aat_str($row['thumb'] ?? ''), $post_id),
                    'description' => trim(wp_strip_all_tags(aat_str($row['content'] ?? ''))),
                    'places_title' => aat_str($row['title_best_places_to_visit'] ?? ''),
                ];
            }
            if ($months) $out['month_guide'] = $months;

            // tour_guide is the specialist block on country pages.
            $guide = is_array($acf['tour_guide'] ?? null) ? $acf['tour_guide'] : [];
            if ($guide) {
                $title = aat_str($guide['title'] ?? '');
                if ($title) $out['specialist_title'] = $title;
                $text = trim(wp_strip_all_tags(aat_str($guide['introduction_tour_guide'] ?? '')));
                if ($text) $out['specialist_text'] = $text;
                $photo = aat_str($guide['avatar_tour_guide'] ?? '');
                if ($photo) $out['specialist_photo'] = aat_import_media_url_only($photo, $post_id);
                $phone = aat_str($guide['number_phone'] ?? '');
                if ($phone) $out['specialist_phone'] = $phone;
                if (!empty($guide['link_button'])) $out['specialist_link'] = aat_link_url($guide['link_button']);
            }

            $plan_button = $acf['button_plan_trip'] ?? [];
            if (is_array($plan_button) && $plan_button) {
                $out['specialist_button'] = aat_link_title($plan_button) ?: 'Start planning';
                $out['specialist_link'] = aat_link_url($plan_button);
            }

            $team = [];
            foreach ((array) ($acf['member'] ?? []) as $member) {
                if (!is_array($member)) continue;
                $bio = trim(wp_strip_all_tags(aat_str($member['mem_desc'] ?? '')));
                $name = '';
                if (preg_match('/^([A-Z][A-Za-z\x{2019}\x{27}-]+)/u', $bio, $match)) {
                    $name = (string) preg_replace('/[\x{2019}\x{27}]s$/u', '', $match[1]);
                }
                $team[] = [
                    'photo' => aat_import_media_url_only(aat_str($member['mem_thumb'] ?? ''), $post_id),
                    'name' => $name,
                    'role' => '',
                    'bio' => $bio,
                ];
            }
            if ($team) $out['team'] = $team;
            break;
    }

    /* Keys the mapping touched are written even when empty, so a value the old
       site no longer has is cleared instead of lingering from an earlier run.
       Keys the mapping never sets are left alone. */
    $out = array_filter($out, function ($v) { return $v !== null && $v !== []; });

    return ['acf' => $out, 'relations' => array_filter($relations)];
}

/** The legacy home page maps onto the homepage CPT. */
function aat_map_homepage($old, $post_id) {
    $acf = is_array($old['acf'] ?? null) ? $old['acf'] : [];
    $out = [];
    $relations = [];

    $slides = [];
    foreach ((array) ($acf['slider_home'] ?? []) as $slide) {
        if (!is_array($slide)) continue;
        // title_banner is the headline, content_banner the standfirst under it.
        $slides[] = [
            'image_url' => aat_import_media_url_only(aat_str($slide['bg_banner'] ?? ''), $post_id),
            'image_url_2' => '',
            'tagline' => 'Travel',
            'title' => 'Inspiration',
            'description' => trim(aat_str($slide['title_banner'] ?? '')),
            'subtitle' => trim(wp_strip_all_tags(aat_str($slide['content_banner'] ?? ''))),
            'meta' => '',
            'link' => aat_link_url($slide['link_button'] ?? ''),
            'link_text' => aat_link_title($slide['link_button'] ?? '') ?: 'Learn More',
        ];
    }
    if ($slides) $out['home_banner_slider'] = $slides;

    $reviews = [];
    foreach ((array) ($acf['slide_review'] ?? []) as $row) {
        if (!is_array($row)) continue;
        $reviews[] = [
            'avatar' => aat_import_media_url_only(aat_str($row['avatar'] ?? ''), $post_id),
            'user_name' => aat_str($row['user_name'] ?? ''),
            'date' => aat_str($row['date'] ?? ''),
            'vote' => aat_str($row['vote'] ?? ''),
            'content' => trim(wp_strip_all_tags(aat_str($row['content'] ?? ''))),
        ];
    }
    if ($reviews) $out['testimonials'] = $reviews;

    $out['statement_text'] = aat_str($acf['content_02'] ?? '');
    $out['review_summary'] = aat_str($acf['name_web_review'] ?? '');
    $out['review_logo'] = aat_import_media_url_only(aat_str($acf['logo_web_review'] ?? ''), $post_id);
    $out['review_link'] = aat_str($acf['link_web_review'] ?? '');
    $out['review_text'] = aat_str($acf['text_review'] ?? '');
    $out['text_phone'] = aat_str($acf['text_phone'] ?? '');
    $out['phone'] = aat_str($acf['phone'] ?? '');

    // Legacy tour id lists become the card tabs; resolved once tours exist.
    $relations['home_tab_journeys'] = aat_old_ids($acf['post_03'] ?? []);

    /* post_04 is a list of taxonomy terms, not posts, so it becomes one card per
       term - each illustrated by the newest post filed under it. */
    $tabs = [];
    foreach ((array) ($acf['post_04'] ?? []) as $term) {
        if (!is_array($term) || empty($term['name'])) continue;
        $slug = sanitize_title($term['slug'] ?? $term['name']);
        $taxonomy = sanitize_key($term['taxonomy'] ?? 'category');
        $local = get_term_by('slug', $slug, $taxonomy);

        $image = '';
        $path = '';
        if ($local) {
            $link = get_term_link($local);
            if (!is_wp_error($link)) $path = (string) wp_parse_url($link, PHP_URL_PATH);

            /* Scan several posts rather than one - the newest entry in a term
               is often the one without a photograph. */
            $posts = get_posts([
                'post_type' => aat_public_types(),
                'post_status' => 'publish',
                'posts_per_page' => 10,
                'fields' => 'ids',
                'tax_query' => [['taxonomy' => $taxonomy, 'field' => 'term_id', 'terms' => $local->term_id]],
            ]);
            foreach ($posts as $candidate) {
                $thumb = get_post_thumbnail_id($candidate);
                if ($thumb) { $image = (string) wp_get_attachment_url($thumb); break; }
            }
        }

        // Term with no illustrated post yet: match its name against the library.
        if (!$image) {
            $found = get_posts([
                'post_type' => 'attachment',
                'post_status' => 'inherit',
                'posts_per_page' => 1,
                'fields' => 'ids',
                's' => $term['name'],
            ]);
            if ($found) $image = (string) wp_get_attachment_url($found[0]);
        }

        $tabs[] = [
            'image_url' => $image,
            'badge' => '',
            'title' => html_entity_decode((string) $term['name'], ENT_QUOTES, 'UTF-8'),
            'meta' => $local ? sprintf('%d journeys', (int) $local->count) : '',
            'description' => trim(wp_strip_all_tags((string) ($term['description'] ?? ''))),
            'link' => $path,
            'link_text' => 'Explore',
        ];
    }
    if ($tabs) $out['home_tab_destinations'] = $tabs;

    return ['acf' => array_filter($out, function ($v) { return $v !== '' && $v !== []; }), 'relations' => array_filter($relations)];
}

/* ─────────────────────── taxonomies ─────────────────────── */

/** old term id => new term id, kept in an option so batches can share it. */
function aat_term_map($taxonomy = null) {
    $map = get_option('aat_term_map', []);
    if (!is_array($map)) $map = [];
    return $taxonomy === null ? $map : ($map[$taxonomy] ?? []);
}

function aat_term_map_set($taxonomy, $old_id, $new_id) {
    $map = aat_term_map();
    $map[$taxonomy][(string) $old_id] = (int) $new_id;
    update_option('aat_term_map', $map, false);
}

/**
 * Imports one page of a legacy taxonomy.
 *
 * The old bridge never returned terms with a post, which is why the first
 * imports produced posts with no categories at all. Terms are created first,
 * then posts reference them through the id map.
 */
function aat_import_taxonomy($route, $page = 1) {
    $taxonomies = aat_import_taxonomy_map();
    if (!isset($taxonomies[$route])) return new WP_Error('aat_bad_tax', "Unknown taxonomy $route");
    $taxonomy = $taxonomies[$route];

    $items = aat_import_get("/wp/v2/$route?per_page=100&page=$page&_fields=id,name,slug,parent,description");
    if (is_wp_error($items)) return $items;
    if (!$items) return ['imported' => 0, 'done' => true, 'page' => $page];

    $regions = aat_country_regions();
    $imported = 0;

    foreach ($items as $item) {
        $slug = sanitize_title($item['slug'] ?? '');
        $name = wp_strip_all_tags((string) ($item['name'] ?? ''));
        if (!$slug || !$name) continue;

        $existing = get_term_by('slug', $slug, $taxonomy);
        if ($existing) {
            $term_id = (int) $existing->term_id;
        } else {
            $created = wp_insert_term($name, $taxonomy, [
                'slug' => $slug,
                'description' => (string) ($item['description'] ?? ''),
            ]);
            if (is_wp_error($created)) continue;
            $term_id = (int) $created['term_id'];
        }

        update_term_meta($term_id, '_aat_source_id', (int) $item['id']);
        aat_term_map_set($taxonomy, $item['id'], $term_id);
        $imported++;

        /* The legacy categories are countries, so mirror them into the country
           taxonomy the destination directory filters on. */
        if ($taxonomy === 'category') {
            $country = get_term_by('slug', $slug, 'country');
            if (!$country) {
                $created = wp_insert_term($name, 'country', ['slug' => $slug]);
                $country_id = is_wp_error($created) ? 0 : (int) $created['term_id'];
            } else {
                $country_id = (int) $country->term_id;
            }
            if ($country_id) {
                update_term_meta($country_id, '_aat_source_id', (int) $item['id']);
                update_term_meta($country_id, 'region', $regions[$slug] ?? 'all');
                aat_term_map_set('country', $item['id'], $country_id);
            }
        }
    }

    // Parents resolve on a second pass once every term of the page exists.
    foreach ($items as $item) {
        $parent = (int) ($item['parent'] ?? 0);
        if (!$parent) continue;
        $map = aat_term_map($taxonomy);
        $child = $map[(string) $item['id']] ?? 0;
        $new_parent = $map[(string) $parent] ?? 0;
        if ($child && $new_parent) wp_update_term($child, $taxonomy, ['parent' => $new_parent]);
    }

    return ['imported' => $imported, 'done' => count($items) < 100, 'page' => $page + 1];
}

/**
 * Resolves one legacy term id, creating the term here if the map has no entry.
 *
 * Without this the assignment depended on the taxonomy step having run first:
 * a post imported before its terms existed lost them permanently and a re-run
 * could not tell. Now any order works, and a missing term is fetched by id.
 */
function aat_resolve_term($old_id, $taxonomy, $route) {
    $map = aat_term_map($taxonomy);
    if (!empty($map[(string) $old_id])) return (int) $map[(string) $old_id];

    $term = aat_import_get("/wp/v2/$route/$old_id?_fields=id,name,slug,description");
    if (is_wp_error($term) || empty($term['slug'])) return 0;

    $slug = sanitize_title($term['slug']);
    $existing = get_term_by('slug', $slug, $taxonomy);
    if ($existing) {
        $term_id = (int) $existing->term_id;
    } else {
        $created = wp_insert_term(wp_strip_all_tags((string) $term['name']), $taxonomy, [
            'slug' => $slug,
            'description' => (string) ($term['description'] ?? ''),
        ]);
        if (is_wp_error($created)) return 0;
        $term_id = (int) $created['term_id'];
    }

    update_term_meta($term_id, '_aat_source_id', (int) $old_id);
    if ($taxonomy === 'country') {
        $regions = aat_country_regions();
        update_term_meta($term_id, 'region', $regions[$slug] ?? 'all');
    }
    aat_term_map_set($taxonomy, $old_id, $term_id);
    return $term_id;
}

/** Assigns a post's legacy terms, mirroring categories into `country` too. */
function aat_assign_terms($post_id, $legacy) {
    /* Every taxonomy the legacy REST response carries, not just the two core
       ones - inspiration, city and hotel_service were being dropped, which is
       why their archives and term cards came back empty. */
    $pairs = [
        ['categories', 'category', 'categories'],
        ['tags', 'post_tag', 'tags'],
        ['inspiration', 'inspiration', 'inspiration'],
        ['city', 'city', 'city'],
        ['hotel_service', 'hotel_service', 'hotel_service'],
        ['blog-type', 'blog-type', 'blog-type'],
    ];
    foreach ($pairs as [$key, $taxonomy, $route]) {
        $ids = array_filter(array_map('absint', (array) ($legacy[$key] ?? [])));
        if (!$ids) continue;

        $new_ids = [];
        foreach ($ids as $old_id) {
            $resolved = aat_resolve_term($old_id, $taxonomy, $route);
            if ($resolved) $new_ids[] = $resolved;
        }
        if ($new_ids) wp_set_object_terms($post_id, $new_ids, $taxonomy, false);

        // The legacy categories are countries; mirror them so the destination
        // pages and the directory filter have something to query.
        if ($taxonomy === 'category') {
            $countries = [];
            foreach ($ids as $old_id) {
                $resolved = aat_resolve_term($old_id, 'country', 'categories');
                if ($resolved) $countries[] = $resolved;
            }
            if ($countries) wp_set_object_terms($post_id, $countries, 'country', false);
        }
    }
}

/* ─────────────────────── navigation menu ─────────────────────── */

/** Rebuilds the primary menu from the legacy site's /site payload. */
function aat_import_menu() {
    $site = aat_import_get('/absolute-asia/v1/site');
    if (is_wp_error($site)) return $site;
    $items = $site['menu'] ?? [];
    if (!$items) return ['imported' => 0, 'done' => true];

    $name = 'Primary (imported)';
    $menu = wp_get_nav_menu_object($name);
    $menu_id = $menu ? (int) $menu->term_id : (int) wp_create_nav_menu($name);
    if (!$menu_id) return new WP_Error('aat_menu', 'Could not create the menu');

    foreach (wp_get_nav_menu_items($menu_id) ?: [] as $existing) {
        wp_delete_post($existing->ID, true);
    }

    usort($items, function ($a, $b) { return ((int) $a['order']) <=> ((int) $b['order']); });

    $id_map = [];
    foreach ($items as $item) {
        $parent = (int) ($item['parent'] ?? 0);
        $new_id = wp_update_nav_menu_item($menu_id, 0, [
            'menu-item-title' => wp_strip_all_tags((string) $item['title']),
            'menu-item-url' => aat_local_href((string) $item['url']),
            'menu-item-status' => 'publish',
            'menu-item-parent-id' => $parent && !empty($id_map[$parent]) ? $id_map[$parent] : 0,
        ]);
        if (!is_wp_error($new_id)) $id_map[(int) $item['id']] = (int) $new_id;
    }

    $locations = get_theme_mod('nav_menu_locations', []);
    $locations['primary'] = $menu_id;
    set_theme_mod('nav_menu_locations', $locations);

    return ['imported' => count($id_map), 'done' => true];
}

/* ─────────────────────── import one item ─────────────────────── */

/**
 * Writes a field the way WordPress expects.
 *
 * update_post_meta() (and therefore update_field()) runs wp_unslash() on the
 * value, which strips the backslashes out of JSON - a review containing "A+"
 * came back as broken JSON and the frontend saw a string instead of an array.
 * Slashing on the way in survives that unslash.
 */
function aat_find_field_key_in_rows($name, $fields) {
    foreach ((array) $fields as $field) {
        if (!is_array($field)) continue;
        if (($field['name'] ?? '') === $name && !empty($field['key'])) return (string) $field['key'];
        if (!empty($field['sub_fields'])) {
            $nested = aat_find_field_key_in_rows($name, $field['sub_fields']);
            if ($nested) return $nested;
        }
    }
    return '';
}

/** Resolve a local ACF field even when the post has no `_field_name` reference yet. */
function aat_field_key_for_post($name, $post_id) {
    if (!function_exists('get_field_object')) return '';
    $post_type = get_post_type($post_id);
    $registered = $GLOBALS['aat_field_key_registry'][$post_type][$name] ?? '';
    if ($registered) return (string) $registered;

    $direct = get_field_object($name, $post_id, false, false);
    if (is_array($direct) && !empty($direct['key'])) return (string) $direct['key'];

    if (!function_exists('acf_get_field_groups') || !function_exists('acf_get_fields')) return '';
    foreach ((array) acf_get_field_groups(['post_id' => $post_id]) as $group) {
        $key = aat_find_field_key_in_rows($name, acf_get_fields($group));
        if ($key) return $key;
    }
    return '';
}

function aat_store_field($name, $value, $post_id) {
    // Field values carry the old trading name too, not just post bodies.
    if (is_string($value) && strpos($name, 'source_') !== 0) $value = aat_rebrand_text($value);
    $value = is_string($value) ? wp_slash($value) : $value;
    // source_* keys are bookkeeping, not ACF fields - update_field would drop them.
    if (strpos($name, 'source_') === 0 || !function_exists('update_field')) {
        update_post_meta($post_id, $name, $value);
        return;
    }
    // Use the field key when possible. Existing sites can contain the raw meta
    // value without ACF's companion `_field_name` reference; updating by key
    // repairs that reference so get_fields() and the REST API expose it.
    $field_key = aat_field_key_for_post($name, $post_id);
    if ($field_key) {
        // ACF stores the value plus a private reference containing the field
        // key. update_field() can refuse to create that pair when legacy raw
        // meta already exists, so write the canonical pair explicitly.
        update_post_meta($post_id, '_' . $name, $field_key);
        update_post_meta($post_id, $name, $value);
        return;
    }
    update_field($name, $value, $post_id);
}

function aat_find_by_source($source_id, $post_type) {
    $found = get_posts([
        'post_type' => $post_type,
        'post_status' => 'any',
        'posts_per_page' => 1,
        'fields' => 'ids',
        'meta_key' => '_aat_source_id',
        'meta_value' => (int) $source_id,
    ]);
    return $found ? (int) $found[0] : 0;
}

function aat_import_values_equal($left, $right) {
    return wp_json_encode($left, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
        === wp_json_encode($right, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

function aat_import_is_empty($value) {
    if ($value === false || $value === null || $value === '') return true;
    return is_array($value) && count($value) === 0;
}

/** Only source-managed or empty values may be refreshed on a re-run. */
function aat_import_can_write($existing, $current, $managed_before, $field) {
    if (!$existing || aat_import_is_empty($current)) return true;
    return array_key_exists($field, $managed_before) && aat_import_values_equal($current, $managed_before[$field]);
}

function aat_import_item($old, $new_type, $legacy_terms = null) {
    $source_id = (int) ($old['id'] ?? 0);
    if (!$source_id) return new WP_Error('aat_no_id', 'Legacy payload has no id');

    $is_home = $new_type === 'homepage';
    $existing = $is_home ? 0 : aat_find_by_source($source_id, $new_type);
    if ($is_home) {
        $homes = get_posts(['post_type' => 'homepage', 'posts_per_page' => 1, 'post_status' => 'any', 'fields' => 'ids']);
        $existing = $homes ? (int) $homes[0] : 0;
    }
    // Slug collisions are what produced the "-2" duplicates, so reuse the row.
    if (!$existing && !$is_home && !empty($old['slug'])) {
        $by_slug = get_posts([
            'name' => sanitize_title($old['slug']),
            'post_type' => $new_type,
            'post_status' => 'any',
            'posts_per_page' => 1,
            'fields' => 'ids',
        ]);
        $existing = $by_slug ? (int) $by_slug[0] : 0;
    }

    $managed_post_before = $existing
        ? (json_decode((string) get_post_meta($existing, '_aat_imported_post_json', true), true) ?: [])
        : [];
    $current_post = $existing ? get_post($existing) : null;
    $next_title = aat_rebrand_text(wp_strip_all_tags((string) ($old['title'] ?? 'Untitled')));
    $next_content = (string) ($old['content'] ?? '');
    $next_excerpt = aat_rebrand_text(wp_strip_all_tags((string) ($old['excerpt'] ?? '')));
    $postarr = [
        'post_type' => $new_type,
        'post_status' => 'publish',
    ];
    if (!$existing) $postarr['post_name'] = sanitize_title((string) ($old['slug'] ?? ''));
    if (aat_import_can_write($existing, $current_post ? $current_post->post_title : '', $managed_post_before, 'post_title')) {
        $postarr['post_title'] = $next_title;
    }
    if (!$is_home) {
        if (aat_import_can_write($existing, $current_post ? $current_post->post_content : '', $managed_post_before, 'post_content')) {
            $postarr['post_content'] = $next_content;
        }
        if (aat_import_can_write($existing, $current_post ? $current_post->post_excerpt : '', $managed_post_before, 'post_excerpt')) {
            $postarr['post_excerpt'] = $next_excerpt;
        }
        if (!empty($old['date'])) $postarr['post_date_gmt'] = get_gmt_from_date($old['date']);
    }
    if ($existing) $postarr['ID'] = $existing;

    // wp_insert_post() unslashes too, so slash the whole array for the same reason.
    $postarr = wp_slash($postarr);
    $post_id = $existing ? wp_update_post($postarr, true) : wp_insert_post($postarr, true);
    if (is_wp_error($post_id)) return $post_id;

    update_post_meta($post_id, '_aat_source_id', $source_id);
    update_post_meta($post_id, '_aat_source_type', (string) ($old['type'] ?? ''));
    update_post_meta($post_id, '_aat_source_schema_version', aat_contract_version());
    /* Lossless source snapshot: a future contract can remap fields that this
       version did not yet understand. This fixes the previous behaviour where
       compatibility reported unknown fields but the importer discarded them. */
    update_post_meta(
        $post_id,
        '_aat_source_acf_json',
        wp_slash(wp_json_encode(is_array($old['acf'] ?? null) ? $old['acf'] : [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE))
    );
    if (!empty($old['path'])) update_post_meta($post_id, '_aat_source_path', esc_url_raw($old['path']));

    if (!$is_home && !empty($old['content']) && array_key_exists('post_content', $postarr)) {
        $rewritten = aat_import_rewrite_content((string) $old['content'], $post_id);
        if ($rewritten !== $old['content']) {
            wp_update_post(wp_slash(['ID' => $post_id, 'post_content' => $rewritten]));
        }
    }

    if (!empty($old['featuredMedia']['url'])) {
        $thumb = aat_import_media_url($old['featuredMedia']['url'], $post_id);
        if ($thumb) set_post_thumbnail($post_id, $thumb);
    }

    $mapped = $is_home ? aat_map_homepage($old, $post_id) : aat_map_fields($old, $new_type, $post_id);
    $managed_acf_before = json_decode((string) get_post_meta($post_id, '_aat_imported_acf_json', true), true) ?: [];
    $managed_acf_after = $managed_acf_before;

    if (!get_post_thumbnail_id($post_id) && !empty($mapped['acf']['hero_image'])) {
        $thumb = aat_find_imported_attachment(strtok($mapped['acf']['hero_image'], '?'));
        if ($thumb) set_post_thumbnail($post_id, $thumb);
    }

    foreach ($mapped['acf'] as $name => $value) {
        // Repeaters live in a textarea as JSON.
        $stored = is_array($value) && in_array($name, aat_repeater_fields(), true) ? wp_json_encode($value) : $value;

        // Image fields need the attachment id; the mapping produced a URL.
        if (in_array($name, aat_image_field_names(), true) && is_string($stored) && $stored !== '') {
            $attachment = aat_find_imported_attachment(strtok($stored, '?')) ?: attachment_url_to_postid($stored);
            $stored = $attachment ?: '';
        }

        $current = function_exists('get_field') ? get_field($name, $post_id, false) : get_post_meta($post_id, $name, true);
        if (!aat_import_can_write($existing, $current, $managed_acf_before, $name)) {
            // A legacy/imported value may already exist as plain post meta but
            // have no ACF reference. Preserve its value while attaching the
            // reference; this is exposure repair, not an editorial overwrite.
            $reference = (string) get_post_meta($post_id, '_' . $name, true);
            $field_key = aat_field_key_for_post($name, $post_id);
            if ($reference === '' && $field_key !== '') {
                aat_store_field($name, $current, $post_id);
                $managed_acf_after[$name] = function_exists('get_field') ? get_field($name, $post_id, false) : get_post_meta($post_id, $name, true);
            }
            continue;
        }

        aat_store_field($name, $stored, $post_id);
        $managed_acf_after[$name] = function_exists('get_field') ? get_field($name, $post_id, false) : get_post_meta($post_id, $name, true);
    }
    update_post_meta($post_id, '_aat_imported_acf_json', wp_slash(wp_json_encode($managed_acf_after, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)));

    $saved_post = get_post($post_id);
    $managed_post_after = $managed_post_before;
    foreach (['post_title', 'post_content', 'post_excerpt'] as $field) {
        if (array_key_exists($field, $postarr) && $saved_post) $managed_post_after[$field] = $saved_post->{$field};
    }
    update_post_meta($post_id, '_aat_imported_post_json', wp_slash(wp_json_encode($managed_post_after, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)));

    if ($mapped['relations']) {
        update_post_meta($post_id, '_aat_pending_relations', wp_json_encode($mapped['relations']));
    }

    /* Categories carry the country structure the frontend filters and
       breadcrumbs on. The legacy bridge omits them from its payload, so the
       batch driver passes them in from /wp/v2 alongside. */
    if (is_array($legacy_terms)) {
        aat_assign_terms($post_id, $legacy_terms);
    } elseif (!empty($old['terms']) && is_array($old['terms'])) {
        $by_tax = [];
        foreach ($old['terms'] as $term) {
            if (empty($term['taxonomy']) || empty($term['name'])) continue;
            if (!in_array($term['taxonomy'], aat_public_taxonomies(), true)) continue;
            $by_tax[$term['taxonomy']][] = $term['name'];
        }
        foreach ($by_tax as $taxonomy => $names) {
            wp_set_object_terms($post_id, $names, $taxonomy, false);
        }
    }

    return $post_id;
}

/* ─────────────────────── relationship pass ─────────────────────── */

/**
 * Legacy ids only resolve once every type has been imported, so relationships
 * are parked on the post and linked in a final pass.
 */
function aat_import_relink($limit = 40) {
    $pending = get_posts([
        'post_type' => array_merge(aat_public_types(), ['homepage']),
        'post_status' => 'any',
        'posts_per_page' => $limit,
        'fields' => 'ids',
        'meta_key' => '_aat_pending_relations',
    ]);

    $done = 0;
    foreach ($pending as $post_id) {
        $relations = json_decode((string) get_post_meta($post_id, '_aat_pending_relations', true), true);
        if (is_array($relations)) {
            foreach ($relations as $field => $old_ids) {
                $new_ids = [];
                foreach ((array) $old_ids as $old_id) {
                    $match = aat_lookup_by_source((int) $old_id);
                    if ($match) $new_ids[] = $match;
                }
                if (!$new_ids) continue;

                if (strpos($field, 'home_tab_') === 0) {
                    $cards = [];
                    foreach ($new_ids as $id) {
                        $card = aat_card_payload($id);
                        if (!$card) continue;
                        $cards[] = [
                            'image_url' => $card['featuredMedia']['url'] ?? '',
                            'badge' => $card['categories'][0]['name'] ?? '',
                            'title' => $card['title'],
                            'meta' => $card['duration'],
                            'description' => $card['excerpt'],
                            'link' => $card['path'],
                            'link_text' => 'Explore',
                        ];
                    }
                    if ($cards) aat_store_field($field, wp_json_encode($cards), $post_id);
                } else {
                    aat_store_field($field, $field === 'city' ? $new_ids[0] : $new_ids, $post_id);
                }
            }
        }
        delete_post_meta($post_id, '_aat_pending_relations');
        $done++;
    }

    // `imported`/`done` keep this compatible with the batch driver in the admin
    // screen, which loops until a step reports done.
    return [
        'imported' => $done,
        'linked' => $done,
        'offset' => 0,
        'done' => $done === 0,
    ];
}

function aat_lookup_by_source($source_id) {
    if (!$source_id) return 0;
    $found = get_posts([
        'post_type' => aat_public_types(),
        'post_status' => 'publish',
        'posts_per_page' => 1,
        'fields' => 'ids',
        'meta_key' => '_aat_source_id',
        'meta_value' => (int) $source_id,
    ]);
    return $found ? (int) $found[0] : 0;
}

/* ─────────────────────── batch driver ─────────────────────── */

function aat_import_batch($old_type, $offset, $limit) {
    $map = aat_import_type_map();
    if (!isset($map[$old_type])) return new WP_Error('aat_bad_type', "Unknown source type $old_type");
    $new_type = $map[$old_type];

    /* Terms come from core REST - the bridge payload has none. Ask for every
       taxonomy the legacy site exposes; a type that lacks one simply omits it. */
    $term_fields = ['categories', 'tags', 'inspiration', 'city', 'hotel_service', 'blog-type'];
    $fields = 'id,' . implode(',', $term_fields);
    $list = aat_import_get("/wp/v2/$old_type?per_page=$limit&offset=$offset&_fields=$fields&orderby=id&order=asc");
    if (is_wp_error($list)) return $list;
    if (!$list) return ['imported' => 0, 'done' => true, 'offset' => $offset];

    $terms_by_id = [];
    foreach ($list as $row) {
        $carried = [];
        foreach ($term_fields as $field) {
            if (!empty($row[$field])) $carried[$field] = $row[$field];
        }
        $terms_by_id[(int) $row['id']] = $carried;
    }

    $ids = array_keys($terms_by_id);
    $items = aat_import_get('/absolute-asia/v1/content-batch?include=' . implode(',', $ids));
    if (is_wp_error($items)) return $items;

    $imported = 0;
    $errors = [];
    foreach ($items as $item) {
        $legacy_terms = $terms_by_id[(int) ($item['id'] ?? 0)] ?? null;
        $result = aat_import_item($item, $new_type, $legacy_terms);
        if (is_wp_error($result)) $errors[] = $result->get_error_message();
        else $imported++;
    }

    return [
        'imported' => $imported,
        'errors' => $errors,
        'offset' => $offset + count($list),
        'done' => count($list) < $limit,
    ];
}

function aat_import_homepage() {
    $home = aat_import_get('/absolute-asia/v1/content?path=/');
    if (is_wp_error($home)) return $home;
    $result = aat_import_item($home, 'homepage');
    if (is_wp_error($result)) return $result;
    return ['imported' => 1, 'post_id' => $result, 'done' => true];
}

/**
 * Trashes one page of posts per call and reports what is left, so the admin
 * screen can keep calling until a type is clear without hitting PHP timeouts.
 */
function aat_import_reset($types, $force = false) {
    $removed = 0;
    $remaining = 0;

    foreach ($types as $type) {
        $query = new WP_Query([
            'post_type' => $type,
            'post_status' => ['publish', 'draft', 'pending', 'private', 'future'],
            'posts_per_page' => 100,
            'fields' => 'ids',
            'no_found_rows' => false,
        ]);
        foreach ($query->posts as $id) {
            // Trash by default so a mistaken reset stays recoverable.
            if (wp_delete_post($id, (bool) $force)) $removed++;
        }
        $remaining += max(0, (int) $query->found_posts - count($query->posts));
    }

    return ['removed' => $removed, 'remaining' => $remaining, 'done' => $remaining === 0];
}

/* ─────────────────────── admin screen + routes ─────────────────────── */

add_action('admin_menu', function () {
    add_submenu_page(
        'tools.php',
        'Absolute Asia Import',
        'Absolute Asia Import',
        'manage_options',
        'aat-import',
        'aat_import_screen'
    );
});

add_action('rest_api_init', function () {
    $admin = [
        'methods' => 'POST',
        'permission_callback' => function () { return current_user_can('manage_options'); },
    ];
    register_rest_route('absolute-asia/v1', '/import/run', $admin + ['callback' => function (WP_REST_Request $r) {
        $type = sanitize_text_field((string) $r['type']);
        if (in_array($type, ['seed-copy', 'hotel-copy', 'story', 'hub-pages'], true)) {
            $allowed = aat_require_absolute_profile();
            if (is_wp_error($allowed)) return $allowed;
        }
        if ($type === 'homepage') return rest_ensure_response(aat_import_homepage());
        if ($type === 'relink') return rest_ensure_response(aat_import_relink());
        if ($type === 'menu') return rest_ensure_response(aat_import_menu());
        if ($type === 'seed-copy') return rest_ensure_response(aat_seed_homepage_copy());
        if ($type === 'hotel-copy') return rest_ensure_response(aat_seed_hotel_copy());
        if ($type === 'fill-itineraries') return rest_ensure_response(aat_backfill_itineraries(25));
        if ($type === 'hotel-images') return rest_ensure_response(aat_seed_hotel_images());
        if ($type === 'fill-images') return rest_ensure_response(aat_backfill_images(20));
        if ($type === 'fill-excerpts') return rest_ensure_response(aat_backfill_excerpts(30));
        if ($type === 'enrich-tours') {
            $offset = max(0, (int) ($r['offset'] ?: 0));
            return rest_ensure_response(aat_enrich_tours($offset, 20));
        }
        if ($type === 'enrich-hotels') {
            $offset = max(0, (int) ($r['offset'] ?: 0));
            return rest_ensure_response(aat_enrich_hotels($offset, 20));
        }
        if ($type === 'enrich-places') {
            $offset = max(0, (int) ($r['offset'] ?: 0));
            return rest_ensure_response(aat_enrich_places($offset, 20));
        }
        if ($type === 'enrich-articles') {
            $offset = max(0, (int) ($r['offset'] ?: 0));
            return rest_ensure_response(aat_enrich_articles($offset, 20));
        }
        if ($type === 'story') return rest_ensure_response(aat_seed_story());
        if ($type === 'hub-pages') return rest_ensure_response(aat_seed_hub_pages());
        if ($type === 'rebrand') return rest_ensure_response(aat_rebrand_run(40));
        if ($type === 'fix-records') return rest_ensure_response(aat_cleanup_records());
        if ($type === 'fill-reset') return rest_ensure_response(aat_backfill_reset() + ['imported' => 0, 'done' => true]);

        // Taxonomies paginate rather than offset, so they get their own branch.
        if (isset(aat_import_taxonomy_map()[$type])) {
            $page = max(1, (int) ($r['offset'] ?: 0) ?: 1);
            $result = aat_import_taxonomy($type, $page);
            if (is_wp_error($result)) return $result;
            return rest_ensure_response([
                'imported' => $result['imported'],
                'done' => $result['done'],
                'offset' => $result['page'],
            ]);
        }

        $result = aat_import_batch($type, max(0, (int) $r['offset']), min(max((int) $r['limit'] ?: 5, 1), 20));
        return is_wp_error($result) ? $result : rest_ensure_response($result);
    }]);
    register_rest_route('absolute-asia/v1', '/import/reset', $admin + ['callback' => function (WP_REST_Request $r) {
        $types = array_values(array_intersect((array) $r['types'], array_merge(aat_public_types(), ['homepage'])));
        if (!$types) return new WP_Error('aat_no_types', 'No post types given', ['status' => 400]);
        if ((string) $r['confirm'] !== 'DELETE') {
            return new WP_Error('aat_confirm', 'Type DELETE to confirm', ['status' => 400]);
        }
        return rest_ensure_response(aat_import_reset($types, !empty($r['force'])));
    }]);
});

function aat_import_screen() {
    if (!current_user_can('manage_options')) return;
    if (isset($_POST['aat_source_url']) && check_admin_referer('aat_source')) {
        update_option('aat_source_url', esc_url_raw(wp_unslash($_POST['aat_source_url'])));
        update_option('aat_content_profile', sanitize_key((string) ($_POST['aat_content_profile'] ?? 'generic')));
        $legacy_hosts = array_filter(array_map(function ($host) {
            return sanitize_text_field(trim($host));
        }, explode(',', (string) wp_unslash($_POST['aat_legacy_hosts'] ?? ''))));
        update_option('aat_legacy_hosts', implode(',', $legacy_hosts));
    }
    $types = aat_import_type_map();
    ?>
    <div class="wrap">
        <h1>Absolute Asia — Import from legacy site</h1>

        <form method="post" style="margin:1rem 0">
            <?php wp_nonce_field('aat_source'); ?>
            <label><strong>Source site</strong>
                <input type="url" name="aat_source_url" value="<?php echo esc_attr(aat_source_url()); ?>" class="regular-text">
            </label>
            <br><label><strong>Content profile</strong>
                <select name="aat_content_profile">
                    <option value="generic" <?php selected(aat_content_profile(), 'generic'); ?>>Generic / Vietnam / Thailand</option>
                    <option value="absolute" <?php selected(aat_content_profile(), 'absolute'); ?>>Absolute Asia (enables branded seeds)</option>
                </select>
            </label>
            <br><label><strong>Legacy hosts</strong>
                <input type="text" name="aat_legacy_hosts" value="<?php echo esc_attr((string) get_option('aat_legacy_hosts', '')); ?>" class="regular-text" placeholder="old.example.com,www.old.example.com">
            </label>
            <button class="button">Save</button>
            <p class="description">The legacy site must have this plugin (or the old bridge) active so <code>/absolute-asia/v1/content-batch</code> answers.</p>
        </form>

        <h2>Import</h2>
        <p>Runs in batches and is safe to re-run: rows are matched by legacy id, then by slug, and updated in place.</p>
        <p>
            <?php foreach (aat_import_taxonomy_map() as $old => $new) : ?>
                <button class="button aat-run" data-type="<?php echo esc_attr($old); ?>"><?php echo esc_html("$old → $new"); ?></button>
            <?php endforeach; ?>
            <button class="button aat-run" data-type="menu">menu</button>
        </p>
        <p>
            <?php foreach ($types as $old => $new) : ?>
                <button class="button aat-run" data-type="<?php echo esc_attr($old); ?>"><?php echo esc_html("$old → $new"); ?></button>
            <?php endforeach; ?>
            <button class="button aat-run" data-type="homepage">homepage</button>
        </p>
        <p>
            <button class="button button-primary button-hero" id="aat-run-all">Import everything</button>
            <button class="button" data-type="relink" id="aat-relink">Resolve relationships</button>
        </p>
        <div id="aat-progress" style="display:none;background:#f0f6fc;border-left:4px solid #2271b1;padding:10px 14px;margin:10px 0"></div>

        <h2>Lấp chỗ trống</h2>
        <p>Web cũ có bài không ảnh, không mô tả — không có gì để import. Hai nút này gán ảnh
           phù hợp nhất đã có trong thư viện và viết mô tả từ chính dữ liệu của bài.
           Không ghi đè thứ bạn đã tự nhập.</p>
        <p>
            <button class="button aat-run" data-type="fill-images">Gán ảnh còn thiếu</button>
            <button class="button aat-run" data-type="fill-excerpts">Viết mô tả còn thiếu</button>
            <button class="button aat-run" data-type="fill-itineraries">Tách lịch trình theo ngày</button>
            <button class="button aat-run" data-type="hotel-images">Gán ảnh khách sạn đã chọn</button>
            <button class="button aat-run" data-type="seed-copy">Soạn nội dung trang chủ</button>
            <button class="button aat-run" data-type="hotel-copy">Viết mô tả khách sạn</button>
            <button class="button aat-run" data-type="story">Soạn trang Our Story</button>
            <button class="button aat-run" data-type="hub-pages">Bơm dữ liệu trang hub</button>
            <button class="button" data-type="fill-reset" id="aat-fill-reset">Xét lại từ đầu</button>
        </p>

        <?php aat_source_field(); ?>

        <?php aat_compat_field(); ?>

        <?php aat_logo_field(); ?>

        <h2>🌐 Frontend URL (cho Live Preview)</h2>
        <p>URL của trang Next.js frontend — dùng cho nút <strong>👁 Live Preview</strong> khi sửa bài.
           Nếu để trống, preview sẽ trỏ về WordPress (không đúng cho headless site).</p>
        <p><strong>Ô này còn quyết định nút Sửa hiện trên web.</strong> Trình duyệt chỉ gửi
           cookie đăng nhập WordPress sang đây khi địa chỉ khớp <em>chính xác</em> (kể cả
           <code>www</code> và <code>https</code>). Sai một ký tự thì nút Sửa sẽ không bao giờ
           hiện, dù bạn đã đăng nhập.</p>

        <?php
        $rv = function_exists('aat_revalidate_status') ? aat_revalidate_status() : ['configured' => false, 'last' => null];
        if (!$rv['configured']) : ?>
            <p style="padding:10px 12px;background:#fcf9e8;border-left:4px solid #dba617">
                <strong>Đăng bài xong web chưa tự cập nhật.</strong> Thêm hai dòng này vào
                <code>wp-config.php</code> thì mỗi lần Lưu sẽ đẩy thẳng lên web:<br>
                <code>define('AAT_REVALIDATE_URL', '<?php echo esc_html(rtrim((string) get_option('aat_frontend_url', 'https://vi-du.com'), '/')); ?>/api/revalidate');</code><br>
                <code>define('AAT_REVALIDATE_SECRET', 'một-chuỗi-bí-mật');</code><br>
                Chuỗi bí mật phải trùng biến <code>WORDPRESS_REVALIDATE_SECRET</code> bên frontend.
            </p>
        <?php else :
            $last = is_array($rv['last']) ? $rv['last'] : null; ?>
            <p style="padding:10px 12px;background:#edfaef;border-left:4px solid #00a32a">
                <strong>Đăng phát lên ngay: đang bật.</strong>
                <?php if ($last) : ?>
                    Lần gần nhất <?php echo esc_html(human_time_diff((int) $last['at'])); ?> trước
                    — <?php echo $last['ok'] ? 'thành công' : 'THẤT BẠI'; ?>
                    (<code><?php echo esc_html($last['path'] ?: '/'); ?></code>,
                    <?php echo esc_html((string) $last['detail']); ?>)
                <?php else : ?>
                    Chưa có lần đẩy nào — lưu thử một bài để kiểm tra.
                <?php endif; ?>
            </p>
        <?php endif; ?>
        <p>
            <input type="url" id="aat-frontend-url"
                   value="<?php echo esc_attr(get_option('aat_frontend_url', '')); ?>"
                   placeholder="https://your-frontend.vercel.app"
                   style="width:400px;font-size:14px;padding:6px 10px" />
            <button class="button button-primary" id="aat-save-frontend-url">Lưu</button>
            <span id="aat-frontend-url-status" style="margin-left:8px;color:#00ba37;font-size:12px"></span>
        </p>
        <script>
        jQuery(function($) {
            $('#aat-save-frontend-url').on('click', function(e) {
                e.preventDefault();
                var url = $('#aat-frontend-url').val().replace(/\/+$/, '');
                $.post(ajaxurl, {
                    action: 'aat_save_frontend_url',
                    url: url,
                    _wpnonce: '<?php echo wp_create_nonce("aat_save_frontend_url"); ?>'
                }, function(res) {
                    if (res.success) {
                        $('#aat-frontend-url-status').text('✅ Đã lưu!').show();
                        setTimeout(function() { $('#aat-frontend-url-status').fadeOut(); }, 3000);
                    }
                });
            });
        });
        </script>

        <h2>Dọn dữ liệu cũ</h2>
        <p><strong>Link sang <code>mywaytravel.com</code> đã tự động đổi về link nội bộ</strong>
           mỗi lần import — người đọc không bị đẩy sang site khác giữa bài.</p>
        <p>Nút <em>Đổi tên My Way Travel</em> thì <strong>không</strong> tự chạy: tên này còn
           nằm trong <em>đánh giá của khách</em> (khách viết “sister-agency My Way Travel”).
           Sửa lời khách là sai sự thật, nên nút này bỏ qua các trường đánh giá và chỉ đổi ở
           phần nội dung do mình viết. Chỉ bấm nếu bạn muốn bỏ tên đó khỏi bài viết.</p>
        <?php aat_foreign_field(); ?>
        <?php aat_founded_field(); ?>
        <p>Nút <em>Sửa nước, bản trùng &amp; ảnh gán sai</em>: bài bị gán hai nước, bản trùng rỗng,
           mục không phải quốc gia trong lưới điểm đến — và soát lại toàn bộ ảnh mà plugin
           từng mượn giúp. Ảnh mượn sai nước (ví dụ ảnh Phuket nằm trên một điểm ở Myanmar)
           sẽ bị gỡ hoặc thay bằng ảnh cùng nước.</p>
            <button class="button aat-run" data-type="rebrand">Đổi tên My Way Travel → Absolute Asia</button>
            <button class="button aat-run" data-type="fix-records">Sửa nước, bản trùng &amp; ảnh gán sai</button>
            <button class="button aat-run button-primary" data-type="enrich-tours">⚡ Tự động điền dữ liệu Tours (Lịch trình, Số ngày, Điểm đến, Inclusions)</button>
            <button class="button aat-run" data-type="enrich-hotels">🏨 Tự động điền Khách sạn (Địa điểm, Highlights, Ảnh)</button>
            <button class="button aat-run" data-type="enrich-places">🗺 Tự động điền Điểm đến (Tagline, Bản đồ)</button>
            <button class="button aat-run" data-type="enrich-articles">📝 Tự động điền Cẩm nang &amp; Blog (Thời gian đọc, Intro)</button>
        <pre id="aat-log" style="background:#1d2327;color:#c3c4c7;padding:12px;height:320px;overflow:auto"></pre>

        <h2>Đối chiếu từng trường</h2>
        <p>So sánh dữ liệu bên web cũ với bên này, theo đúng bảng ánh xạ mà importer đang chạy.
           Trường nào bên cũ có dữ liệu mà chưa được map sẽ hiện <strong>CHƯA MAP</strong>.</p>
        <p>
            <?php foreach (array_keys(aat_field_map()) as $route) : ?>
                <button class="button aat-audit" data-route="<?php echo esc_attr($route); ?>"><?php echo esc_html($route); ?></button>
            <?php endforeach; ?>
        </p>
        <div id="aat-audit-out"></div>

        <h2 style="color:#b32d2e">Danger zone — reset imported content</h2>
        <p>Moves every post of the selected types to Trash so the import can start from a clean slate.</p>
        <p>
            <?php foreach (array_unique(array_values($types)) as $new) : ?>
                <label style="margin-right:12px"><input type="checkbox" class="aat-reset-type" value="<?php echo esc_attr($new); ?>"> <?php echo esc_html($new); ?></label>
            <?php endforeach; ?>
        </p>
        <p>
            <input type="text" id="aat-confirm" placeholder="Type DELETE to confirm" class="regular-text">
            <button class="button" id="aat-reset" style="border-color:#b32d2e;color:#b32d2e">Reset selected</button>
        </p>
    </div>
    <script>
    jQuery(function($) {
        var nonce = '<?php echo esc_js(wp_create_nonce('wp_rest')); ?>';
        var root = '<?php echo esc_js(esc_url_raw(rest_url('absolute-asia/v1/'))); ?>';
        var $log = $('#aat-log');

        function log(line) {
            $log.append(line + '\n');
            $log.scrollTop($log[0].scrollHeight);
        }

        function post(path, body) {
            return $.ajax({
                url: root + path,
                method: 'POST',
                data: JSON.stringify(body),
                contentType: 'application/json',
                beforeSend: function(xhr) { xhr.setRequestHeader('X-WP-Nonce', nonce); }
            });
        }

        function runType(type) {
            var offset = 0;
            var guard = 0;
            function step() {
                return post('import/run', { type: type, offset: offset, limit: 5 }).then(function(res) {
                    var moved = res.offset != null && res.offset !== offset;
                    offset = res.offset != null ? res.offset : offset;
                    log('  ' + type + ': +' + (res.imported || 0) + ' (offset ' + offset + ')');
                    (res.errors || []).forEach(function(e) { log('    ! ' + e); });

                    if (res.done) { log('  ' + type + ': done'); return; }
                    // Stop rather than spin when a step reports no progress.
                    if (!moved && !res.imported) { log('  ' + type + ': done (no further work)'); return; }
                    if (++guard > 400) { log('  ' + type + ': stopped after 400 batches'); return; }
                    return step();
                }).catch(function(xhr) {
                    log('  ' + type + ': ERROR ' + (xhr.responseJSON ? xhr.responseJSON.message : xhr.status));
                });
            }
            log('▶ ' + type);
            return step();
        }

        $('.aat-run, #aat-run-home, #aat-relink, #aat-fill-reset').on('click', function(e) {
            e.preventDefault();
            runType($(this).data('type'));
        });

        $('#aat-run-all').on('click', function(e) {
            e.preventDefault();
            // Taxonomies first: posts reference terms through the id map.
            var queue = <?php echo wp_json_encode(array_merge(
                array_keys(aat_import_taxonomy_map()),
                ['homepage'],
                array_keys($types),
                /* `rebrand` is deliberately absent: renaming the sister agency
                   is a business decision, and it touches wording customers
                   wrote. It stays a separate button. */
                ['menu', 'relink', 'fix-records', 'fill-images', 'fill-excerpts', 'fill-itineraries', 'hotel-images', 'seed-copy', 'hotel-copy', 'story', 'hub-pages']
            )); ?>;

            var $btn = $(this).prop('disabled', true).text('Đang chạy…');
            var $bar = $('#aat-progress').show();
            var started = Date.now();

            /* The run takes a while and reloading loses the queue position, so
               the browser warns before leaving and the step is remembered. */
            function guardUnload(e) { e.preventDefault(); e.returnValue = ''; }
            window.addEventListener('beforeunload', guardUnload);

            (function next(i) {
                if (i >= queue.length) {
                    window.removeEventListener('beforeunload', guardUnload);
                    try { window.localStorage.removeItem('aatResume'); } catch (err) {}
                    var mins = ((Date.now() - started) / 60000).toFixed(1);
                    $bar.text('✔ Xong tất cả — ' + mins + ' phút. Giờ bấm từng nút ở mục "Đối chiếu từng trường" để kiểm tra.');
                    $btn.prop('disabled', false).text('Import everything');
                    return log('✔ all done (' + mins + ' phút)');
                }
                try { window.localStorage.setItem('aatResume', queue[i]); } catch (err) {}
                $bar.text('Bước ' + (i + 1) + '/' + queue.length + ': ' + queue[i] + ' — đừng đóng tab này');
                runType(queue[i]).then(function() { next(i + 1); });
            })(0);
        });

        /* Offer to pick up where a previous run stopped. */
        (function () {
            var last;
            try { last = window.localStorage.getItem('aatResume'); } catch (err) { return; }
            if (!last) return;
            $('#aat-progress').show().html(
                'Lần chạy trước dừng ở bước <strong>' + esc(last) + '</strong>. ' +
                '<a href="#" id="aat-resume">Chạy tiếp từ đó</a> · ' +
                '<a href="#" id="aat-resume-clear">Bỏ qua</a>'
            );
            $('#aat-resume').on('click', function (e) { e.preventDefault(); runType(last); });
            $('#aat-resume-clear').on('click', function (e) {
                e.preventDefault();
                try { window.localStorage.removeItem('aatResume'); } catch (err) {}
                $('#aat-progress').hide();
            });
        })();

        $('.aat-audit').on('click', function(e) {
            e.preventDefault();
            var route = $(this).data('route');
            var $out = $('#aat-audit-out');
            $out.html('<p>Đang đối chiếu <strong>' + route + '</strong>…</p>');

            post('import/audit', { route: route, limit: 0 })
                .then(function(res) {
                    var badge = {
                        unmapped: '<span style="color:#b32d2e;font-weight:700">CHƯA MAP</span>',
                        missing: '<span style="color:#b32d2e">✗ chưa vào</span>',
                        ok: '<span style="color:#1a7f37">✓</span>',
                        skip: '<span style="color:#8c8f94">bỏ qua</span>'
                    };
                    var html = '<p><strong>' + res.route + ' → ' + res.type + '</strong>' +
                        ' &nbsp;(đã quét toàn bộ ' + res.oldTotal + ' bài cũ / ' + res.newTotal + ' bài mới; contract v' + res.contractVersion + ')</p>';
                    html += '<table class="widefat striped"><thead><tr>' +
                        '<th>Trường bên WP cũ</th><th style="width:70px">Có</th>' +
                        '<th>Vào trường nào bên mới</th><th style="width:80px">Đã vào</th>' +
                        '<th style="width:110px"></th></tr></thead><tbody>';

                    res.rows.forEach(function(row) {
                        var tone = row.status === 'unmapped' ? ' style="background:#fcf0f1"'
                                 : row.status === 'missing' ? ' style="background:#fff8e5"' : '';
                        html += '<tr' + tone + '>' +
                            '<td><code>' + row.legacy + '</code></td>' +
                            '<td>' + row.oldPct + '%</td>' +
                            '<td>' + (row.target ? esc(row.target) : '—') + '</td>' +
                            '<td>' + (row.newPct === null ? '—' : row.newPct + '%') + '</td>' +
                            '<td>' + badge[row.status] + '</td></tr>';
                    });

                    html += '</tbody></table>';
                    $out.html(html);
                })
                .catch(function(xhr) {
                    $out.html('<p style="color:#b32d2e">Lỗi: ' +
                        (xhr.responseJSON ? xhr.responseJSON.message : xhr.status) + '</p>');
                });
        });

        function esc(v) { return $('<div>').text(v == null ? '' : v).html(); }

        $('#aat-reset').on('click', function(e) {
            e.preventDefault();
            var types = $('.aat-reset-type:checked').map(function() { return this.value; }).get();
            if (!types.length) return log('reset: pick at least one type');
            if (!window.confirm('Move all ' + types.join(', ') + ' posts to Trash?')) return;

            var total = 0;
            log('▶ reset ' + types.join(', '));
            // One page per request; keep going until nothing is left.
            (function step() {
                post('import/reset', { types: types, confirm: $('#aat-confirm').val() })
                    .then(function(res) {
                        total += res.removed || 0;
                        log('  trashed ' + total + ' (remaining ' + (res.remaining || 0) + ')');
                        if (!res.done && res.removed > 0) return step();
                        log('  reset: done');
                    })
                    .catch(function(xhr) {
                        log('  reset: ERROR ' + (xhr.responseJSON ? xhr.responseJSON.message : xhr.status));
                    });
            })();
        });
    });
    </script>
    <?php
}
