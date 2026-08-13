<?php
/**
 * The legacy → new field map: one table, every field.
 *
 * This is the single source of truth. The importer applies it, and the audit
 * screen reports against it, so the two can never drift apart. Anything the
 * legacy site holds must appear here — either mapped to a new field, or listed
 * under `skip` with the reason. A legacy field that is in neither shows up in
 * the audit as "CHƯA MAP" so it cannot be forgotten silently.
 *
 * `as` (how the value is transformed):
 *   text      plain string (default)
 *   strip     HTML stripped to plain text
 *   html      HTML kept as-is
 *   lines     an HTML list/paragraph block → one item per line
 *   image     URL → attachment ID (ACF image fields store an ID, not a URL)
 *   link      ACF link object/string → site-relative href
 *   link_text ACF link object → its title
 *   bool      truthiness
 *   gallery   list of legacy attachment ids → gallery repeater rows
 *   rel       relationship: legacy ids parked for the relink pass
 *   rel_one   same, but a single id
 *   rel_cards relationship rendered into homepage card rows
 *   term      taxonomy reference → its slug, stored as bookkeeping meta
 *   custom    handled by a named callback in importer.php; `to` lists the
 *             fields it writes so the audit still knows about them
 */

if (!defined('ABSPATH')) exit;

function aat_field_map() {
    /* Repeated on several post types under different names; the legacy site
       said the same thing four ways. */
    $specialist = [
        'thumb_meet' => ['to' => 'specialist_photo', 'as' => 'image'],
        'name_meet' => ['to' => 'specialist_title'],
        'desc_meet' => ['to' => 'specialist_text', 'as' => 'strip'],
        'button' => ['to' => 'specialist_button'],
        'phone_meet' => ['to' => 'specialist_phone'],
    ];

    $editorial = [
        'banner' => ['to' => 'hero_image', 'as' => 'image'],
        'min' => ['to' => 'read_minutes'],
        'cont_left' => ['to' => 'content_left', 'as' => 'html'],
        'cont_right' => ['to' => 'content_right_image', 'as' => 'image'],
        'title_further' => ['to' => 'further_title'],
        'guides' => ['to' => 'related_guides', 'as' => 'rel'],
        'more_tour' => ['to' => 'related_tours', 'as' => 'rel'],
        'plan' => ['to' => 'specialist_text', 'as' => 'strip'],
        'desc_plan' => ['to' => 'plan_description', 'as' => 'html'],
        'bottom_plan' => ['to' => 'plan_footer', 'as' => 'html'],
        'view_more' => ['to' => 'view_more_label', 'as' => 'link_text'],
        'button_plan_txt' => ['to' => 'specialist_button'],
        'phone_number' => ['to' => 'specialist_phone'],
        'link_make_an_inquiry' => ['to' => 'specialist_link', 'as' => 'link'],
    ];

    return [
        /* ─────────────────────────── TOURS ─────────────────────────── */
        'posts' => [
            'type' => 'tour',
            'fields' => [
                'banner' => ['to' => 'hero_image', 'as' => 'image'],
                'tour_price' => ['to' => ['duration_label', 'duration_days', 'tour_route', 'tour_level', 'tour_code'], 'as' => 'custom'],
                'travel_&_map' => ['to' => ['itinerary', 'destinations_count'], 'as' => 'custom'],
                'list_hightlight' => ['to' => 'experiences', 'as' => 'custom'],
                'list_option' => ['to' => 'accommodation_options', 'as' => 'custom'],
                'faqs' => ['to' => 'faqs', 'as' => 'custom'],
                'button_hightlight' => ['to' => ['cta_label', 'cta_link'], 'as' => 'custom'],
                'slider' => ['to' => 'gallery', 'as' => 'gallery'],
                'content_left' => ['to' => 'inclusions_list', 'as' => 'lines'],
                'content_right' => ['to' => 'exclusions_list', 'as' => 'lines'],
                'content_right_title' => ['to' => 'exclusions_title'],
                'title_intro' => ['to' => 'intro_title'],
                'desc_intro' => ['to' => 'intro_description'],
                'highlights_title' => ['to' => 'highlights_title'],
                'title_list' => ['to' => 'highlights_note'],
                'title_options' => ['to' => 'options_title'],
                'desc_options' => ['to' => 'options_note', 'as' => 'strip'],
                'booking_policy_title' => ['to' => 'booking_policy_title'],
                'other_tours_tittle' => ['to' => 'related_tours_title'],
                'is_feature' => ['to' => 'is_featured', 'as' => 'bool'],
                'where_is' => ['to' => ['hero_eyebrow', 'hero_eyebrow_link'], 'as' => 'custom'],
                'titlle_slide' => ['to' => 'gallery_title'],
                'link_classic_tour' => ['to' => 'classic_tour_link', 'as' => 'link'],
            ],
            'skip' => [
                'title_commit' => 'rỗng 100% bên cũ',
                'start_trip_booking' => 'rỗng 100% bên cũ',
                'end_trip_booking' => 'rỗng 100% bên cũ',
                'file_pdf' => 'rỗng 100% bên cũ',
                'slider_' => 'cờ bật/tắt slider, không phải nội dung',
                'title_slide' => 'nhãn slider',
            ],
        ],

        /* ────────────────────────── PLACES ────────────────────────── */
        'places-to-go' => [
            'type' => 'place_to_go',
            'fields' => array_merge($specialist, [
                'banner' => ['to' => 'hero_image', 'as' => 'image'],
                'location' => ['to' => ['location_map', 'latitude', 'longitude'], 'as' => 'custom'],
                'gallery' => ['to' => 'gallery', 'as' => 'gallery'],
                'places_on_the_map' => ['to' => 'map_headline'],
                'title_related' => ['to' => 'related_title'],
                'desc_related' => ['to' => 'related_description'],
                'travel-guide-title' => ['to' => 'destination_overview', 'as' => 'strip'],
                'choose_posts' => ['to' => 'featured_tours', 'as' => 'rel'],
                'choose_posts_place' => ['to' => 'related_places', 'as' => 'rel'],
            ]),
            'skip' => [],
        ],

        /* ────────────────────────── HOTELS ────────────────────────── */
        'hotels' => [
            'type' => 'hotel',
            'fields' => [
                'banner' => ['to' => 'hero_image', 'as' => 'image'],
                'places_img' => ['to' => 'hero_image', 'as' => 'image'],
                // The legacy field name is misspelled "locaition".
                'locaition' => ['to' => ['location_map', 'latitude', 'longitude'], 'as' => 'custom'],
                'list_img' => ['to' => 'gallery', 'as' => 'gallery'],
                'list_location_distance' => ['to' => 'nearby_places', 'as' => 'custom'],
                'places_title' => ['to' => 'hotel_location'],
                'title_img' => ['to' => 'gallery_title'],
                'title_tours' => ['to' => 'tours_title', 'as' => 'strip'],
                'title_hotel' => ['to' => 'hotels_title', 'as' => 'strip'],
                'title_things_to_do' => ['to' => 'things_title', 'as' => 'strip'],
                'location_title' => ['to' => 'location_title'],
                'location_content' => ['to' => 'location_subtitle'],
                'list_tours' => ['to' => 'related_tours', 'as' => 'rel'],
                'list_hotels' => ['to' => 'related_hotels', 'as' => 'rel'],
                'list_things_to_do' => ['to' => 'related_things', 'as' => 'rel'],
                'city' => ['to' => 'city', 'as' => 'rel_one'],
                // On hotels the specialist block uses yet another set of names.
                'title' => ['to' => 'specialist_title'],
                'content_contact' => ['to' => 'specialist_text', 'as' => 'strip'],
                'img_contact' => ['to' => 'specialist_photo', 'as' => 'image'],
                'btn_contact' => ['to' => 'specialist_button'],
                'number_contact' => ['to' => 'specialist_phone'],
            ],
            'skip' => ['min' => 'số phút đọc, không áp dụng cho khách sạn'],
        ],

        /* ───────────────────── GUIDES / THINGS TO DO ───────────────────── */
        'travel-guides' => [
            'type' => 'travel_guide',
            'fields' => array_merge($editorial, [
                'title_planning' => ['to' => ['plan_title', 'specialist_title'], 'as' => 'custom'],
                'link' => ['to' => 'view_more_link', 'as' => 'link'],
            ]),
            'skip' => [
                'find_something' => 'chỉ 1 ký tự, không mang nghĩa',
                'title_planing' => 'trùng title_planning (lỗi chính tả bên cũ)',
            ],
        ],
        'things-to-do' => [
            'type' => 'thing_to_do',
            'fields' => array_merge($editorial, [
                'title_planing' => ['to' => 'plan_title'],
                'explore_now_link' => ['to' => 'view_more_link', 'as' => 'link'],
            ]),
            'skip' => ['find_something' => 'chỉ 1 ký tự, không mang nghĩa'],
        ],

        /* ─────────────────────────── BLOGS ─────────────────────────── */
        'blogs' => [
            'type' => 'blog',
            'fields' => [
                'banner' => ['to' => 'hero_image', 'as' => 'image'],
                'minute_read' => ['to' => 'read_minutes'],
                'intro_ex' => ['to' => 'intro_html', 'as' => 'html'],
                'title_futher_reading' => ['to' => 'further_title'],
                'popular_posts_title' => ['to' => 'sidebar_popular_title'],
                'search_post_title' => ['to' => 'sidebar_search_title'],
                'text_like' => ['to' => 'sidebar_social_title'],
            ],
            'skip' => [],
        ],

        /* ─────────────────── COUNTRY / GUIDE PAGES ─────────────────── */
        'pages' => [
            'type' => 'page',
            'fields' => [
                'popular_places' => ['to' => 'popular_places_html', 'as' => 'html'],
                'ideas_for_experiencing' => ['to' => 'experiences_html', 'as' => 'html'],
                'trave_guide_ideas' => ['to' => 'trip_ideas_html', 'as' => 'html'],
                'tittle_trip_ideas' => ['to' => 'trip_ideas_title'],
                'title_more_ideas' => ['to' => 'trip_ideas_title'],
                'map_of_places_content' => ['to' => 'map_description', 'as' => 'strip'],
                'places_on_the_map' => ['to' => 'map_headline'],
                'title_the_month_by_month' => ['to' => 'month_guide_title'],
                'best_time' => ['to' => ['best_time_image', 'best_time_html'], 'as' => 'custom'],
                'tour-in-month' => ['to' => 'month_guide', 'as' => 'custom'],
                'tour_guide' => ['to' => ['specialist_title', 'specialist_text', 'specialist_photo', 'specialist_phone', 'specialist_link'], 'as' => 'custom'],
                'title_make' => ['to' => 'specialist_title'],
                'travel_guides' => ['to' => 'related_guides', 'as' => 'rel'],
                'post_top_cycling' => ['to' => 'featured_tours', 'as' => 'rel'],
                'country_category' => ['to' => 'source_country_category', 'as' => 'term'],
                'place_category' => ['to' => 'source_place_category', 'as' => 'term'],
                'hotel_category' => ['to' => 'source_hotel_category', 'as' => 'term'],
                'thing_category' => ['to' => 'source_thing_category', 'as' => 'term'],
                'trave_guide_category' => ['to' => 'source_trave_guide_category', 'as' => 'term'],
            ],
            'skip' => [
                'list_hot' => 'rỗng 100% bên cũ',
                'button' => 'rỗng 100% bên cũ',
                'link_button' => 'rỗng 100% bên cũ',
                'post_more_ideas' => 'rỗng 100% bên cũ',
            ],
        ],

        /* ───────────────────────── HOMEPAGE ───────────────────────── */
        'homepage' => [
            'type' => 'homepage',
            'fields' => [
                'slider_home' => ['to' => 'home_banner_slider', 'as' => 'custom'],
                'images_list' => ['to' => 'home_ways_to_explore', 'as' => 'custom'],
                'slide_review' => ['to' => 'testimonials', 'as' => 'custom'],
                'content_02' => ['to' => 'statement_text', 'as' => 'html'],
                'name_web_review' => ['to' => 'review_summary', 'as' => 'html'],
                'logo_web_review' => ['to' => 'review_logo', 'as' => 'image'],
                'link_web_review' => ['to' => 'review_link'],
                'text_review' => ['to' => 'review_text'],
                'text_phone' => ['to' => 'text_phone'],
                'phone' => ['to' => 'phone'],
                'link_email_icon' => ['to' => 'link_email_icon'],
                'post_03' => ['to' => 'home_tab_journeys', 'as' => 'rel_cards'],
                'post_05' => ['to' => 'home_tab_offers', 'as' => 'rel_cards'],
                'post11' => ['to' => 'home_tab_new', 'as' => 'rel_cards'],
                // Terms, not posts - handled by a callback, not the relink pass.
                'post_04' => ['to' => 'home_tab_destinations', 'as' => 'custom'],
            ],
            'skip' => [
                'bg_my_way' => 'ảnh nền của layout cũ, giao diện mới không dùng',
                'sec01_links' => 'menu phụ, đã thay bằng menu WordPress',
                'sec03_title' => 'tiêu đề section cũ, giao diện mới viết lại',
                'sec04_title' => 'tiêu đề section cũ, giao diện mới viết lại',
                'sec05_title' => 'tiêu đề section cũ, giao diện mới viết lại',
                'sec11_title' => 'tiêu đề section cũ, giao diện mới viết lại',
                'links_sec03' => 'link phụ của section cũ',
                'links_sec11' => 'link phụ của section cũ',
                'button_text_sec04' => 'nhãn nút của section cũ',
                'button_link_sec04' => 'link nút của section cũ',
                'categories' => 'danh mục, đã import qua bước taxonomy',
                'classic_tour' => 'link cũ, trùng tab journeys',
                'book_tour' => 'link cũ, trùng CTA đặt tour',
                'text_at_single' => 'nhãn trang chi tiết, không thuộc homepage',
            ],
        ],
    ];
}

/** Every new field the map can write, used to validate the ACF groups. */
function aat_mapped_targets() {
    $targets = [];
    foreach (aat_field_map() as $spec) {
        foreach ($spec['fields'] as $entry) {
            foreach ((array) $entry['to'] as $target) $targets[$target] = true;
        }
    }
    return array_keys($targets);
}

/* ─────────────────────────── transforms ─────────────────────────── */

/**
 * Applies one legacy value. Returns null when there is nothing to write, so an
 * absent legacy field never clobbers a value an editor set by hand.
 */
function aat_transform_value($value, $as, $post_id) {
    switch ($as) {
        case 'strip':
            return trim(wp_strip_all_tags(aat_str($value)));
        case 'html':
            return aat_str($value);
        case 'lines':
            return aat_html_to_lines($value);
        case 'image':
            $url = aat_str($value);
            return $url === '' ? null : aat_import_media_url_only($url, $post_id);
        case 'link':
            return aat_link_url($value);
        case 'link_text':
            return is_array($value) ? aat_link_title($value) : trim(wp_strip_all_tags(aat_str($value)));
        case 'bool':
            return !empty($value);
        case 'gallery':
            $rows = aat_import_gallery($value, $post_id);
            return $rows ?: null;
        case 'term':
            if (!is_array($value) || empty($value['slug'])) return null;
            return aat_str($value['slug']);
        case 'text':
        default:
            return aat_str($value);
    }
}

/**
 * Runs the declarative half of the map. Fields marked `custom` are left to the
 * callbacks in importer.php, which merge their result on top of this.
 */
function aat_apply_field_map($old_route, $acf, $post_id) {
    $map = aat_field_map();
    if (!isset($map[$old_route])) return ['acf' => [], 'relations' => []];

    $out = [];
    $relations = [];

    foreach ($map[$old_route]['fields'] as $legacy => $entry) {
        $as = $entry['as'] ?? 'text';
        if ($as === 'custom') continue;

        $value = $acf[$legacy] ?? null;

        if ($as === 'rel' || $as === 'rel_one' || $as === 'rel_cards') {
            $ids = aat_old_ids($value);
            if ($ids) $relations[$entry['to']] = $ids;
            continue;
        }

        $result = aat_transform_value($value, $as, $post_id);
        if ($result === null) continue;

        // Several legacy names can feed one new field (title_more_ideas and
        // tittle_trip_ideas both fill trip_ideas_title); first non-empty wins.
        foreach ((array) $entry['to'] as $target) {
            if (isset($out[$target]) && $out[$target] !== '' && ($result === '' || $result === false)) continue;
            if (isset($out[$target]) && $out[$target] !== '' && $result !== '') continue;
            $out[$target] = $result;
        }
    }

    return ['acf' => $out, 'relations' => $relations];
}
