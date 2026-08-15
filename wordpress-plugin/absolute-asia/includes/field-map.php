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
    /* Specialist fields: on V2, specialist consultation is handled globally
       by SpecialistBlock and centralized luxury concierge contact info. */
    $specialist_skip = [
        'thumb_meet' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
        'name_meet' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
        'desc_meet' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
        'button' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
        'phone_meet' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
        'title' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
        'content_contact' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
        'img_contact' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
        'btn_contact' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
        'number_contact' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
        'button_plan_txt' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
        'phone_number' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
        'plan' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
        'link_make_an_inquiry' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
    ];

    $editorial = [
        'banner' => ['to' => 'hero_image', 'as' => 'image'],
        'min' => ['to' => 'read_minutes'],
        'cont_left' => ['to' => 'content_left', 'as' => 'html'],
        'cont_right' => ['to' => 'content_right_image', 'as' => 'image'],
        'guides' => ['to' => 'related_guides', 'as' => 'rel'],
        'more_tour' => ['to' => 'related_tours', 'as' => 'rel'],
        'desc_plan' => ['to' => 'plan_description', 'as' => 'html'],
        'bottom_plan' => ['to' => 'plan_footer', 'as' => 'html'],
    ];

    $editorial_skip = [
        'title_further' => 'Tiêu đề Further Reading được chuẩn hóa trong SingleArticleTemplateV2',
        'view_more' => 'Nhãn nút View More được chuẩn hóa trong SingleArticleTemplateV2',
        'button_plan_txt' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
        'phone_number' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
        'plan' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
        'link_make_an_inquiry' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
    ];

    return [
        /* Public legacy vessel records. They currently carry body content but
           no ACF; retaining the route makes the decision explicit and keeps
           future sibling-site fields visible to the compatibility audit. */
        'trip' => [
            'type' => 'trip',
            'fields' => [],
            'skip' => [],
        ],

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
                'title_intro' => ['to' => 'intro_title'],
                'desc_intro' => ['to' => 'intro_description'],
                'highlights_title' => ['to' => 'highlights_title'],
                'title_list' => ['to' => 'highlights_note'],
                'is_feature' => ['to' => 'is_featured', 'as' => 'bool'],
            ],
            'skip' => [
                'other_tours_tittle' => 'Tiêu đề Related Tours được chuẩn hóa trong SingleTourTemplateV2',
                'title_options' => 'Tiêu đề Accommodation Options được chuẩn hóa trong SingleTourTemplateV2',
                'content_right_title' => 'Tiêu đề Exclusions được chuẩn hóa trong SingleTourTemplateV2',
                'where_is' => 'Eyebrow vị trí tour được sinh tự động từ Country / Route taxonomy',
                'booking_policy_title' => 'Tiêu đề Booking Policy được chuẩn hóa trong SingleTourTemplateV2',
                'desc_options' => 'Ghi chú tùy chọn phòng được chuẩn hóa trong SingleTourTemplateV2',
                'titlle_slide' => 'Tiêu đề Gallery được chuẩn hóa trong SingleTourTemplateV2',
                'link_classic_tour' => 'Liên kết tour cổ điển được tích hợp trong Related Journeys',
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
            'fields' => [
                'banner' => ['to' => 'hero_image', 'as' => 'image'],
                'location' => ['to' => ['location_map', 'latitude', 'longitude'], 'as' => 'custom'],
                'gallery' => ['to' => 'gallery', 'as' => 'gallery'],
                'places_on_the_map' => ['to' => 'map_headline'],
                'travel-guide-title' => ['to' => 'destination_overview', 'as' => 'strip'],
                'choose_posts' => ['to' => 'featured_tours', 'as' => 'rel'],
                'choose_posts_place' => ['to' => 'related_places', 'as' => 'rel'],
            ],
            'skip' => array_merge($specialist_skip, [
                'title_related' => 'Tiêu đề phần liên quan được chuẩn hóa trong DestinationTemplateV2',
                'desc_related' => 'Mô tả phần liên quan được chuẩn hóa trong DestinationTemplateV2',
            ]),
        ],

        /* ────────────────────────── HOTELS ────────────────────────── */
        'hotels' => [
            'type' => 'hotel',
            'fields' => [
                // The legacy field name is misspelled "locaition".
                'locaition' => ['to' => ['location_map', 'latitude', 'longitude'], 'as' => 'custom'],
                'list_img' => ['to' => 'gallery', 'as' => 'gallery'],
                'list_location_distance' => ['to' => 'nearby_places', 'as' => 'custom'],
                'places_title' => ['to' => 'hotel_location'],
                'list_tours' => ['to' => 'related_tours', 'as' => 'rel'],
                'list_hotels' => ['to' => 'related_hotels', 'as' => 'rel'],
                'list_things_to_do' => ['to' => 'related_things', 'as' => 'rel'],
                'city' => ['to' => 'city', 'as' => 'rel_one'],
            ],
            'skip' => array_merge($specialist_skip, [
                'banner' => 'Ảnh đại diện khách sạn được đồng bộ qua featured_media',
                'places_img' => 'Ảnh bổ sung khách sạn được đồng bộ qua featured_media / gallery',
                'location_title' => 'Tiêu đề Location được chuẩn hóa trong SingleHotelTemplateV2',
                'location_content' => 'Mô tả vị trí được hiển thị qua hotel_highlights và location_map',
                'title_things_to_do' => 'Tiêu đề Things to do nearby được chuẩn hóa trong SingleHotelTemplateV2',
                'title_hotel' => 'Tiêu đề Related Hotels được chuẩn hóa trong SingleHotelTemplateV2',
                'title_tours' => 'Tiêu đề Related Tours được chuẩn hóa trong SingleHotelTemplateV2',
                'title_img' => 'Tiêu đề Gallery được chuẩn hóa trong SingleHotelTemplateV2',
                'min' => 'số phút đọc, không áp dụng cho khách sạn',
            ]),
        ],

        /* ───────────────────── GUIDES / THINGS TO DO ───────────────────── */
        'travel-guides' => [
            'type' => 'travel_guide',
            'fields' => array_merge($editorial, [
                'title_planning' => ['to' => 'plan_title'],
                'link' => ['to' => 'view_more_link', 'as' => 'link'],
            ]),
            'skip' => array_merge($editorial_skip, [
                'find_something' => 'chỉ 1 ký tự, không mang nghĩa',
                'title_planing' => 'trùng title_planning (lỗi chính tả bên cũ)',
            ]),
        ],
        'things-to-do' => [
            'type' => 'thing_to_do',
            'fields' => array_merge($editorial, [
                'title_planing' => ['to' => 'plan_title'],
                'explore_now_link' => ['to' => 'view_more_link', 'as' => 'link'],
            ]),
            'skip' => array_merge($editorial_skip, [
                'find_something' => 'chỉ 1 ký tự, không mang nghĩa',
            ]),
        ],

        /* ─────────────────────────── BLOGS ─────────────────────────── */
        'blogs' => [
            'type' => 'blog',
            'fields' => [
                'banner' => ['to' => 'hero_image', 'as' => 'image'],
                'minute_read' => ['to' => 'read_minutes'],
                'intro_ex' => ['to' => 'intro_html', 'as' => 'html'],
            ],
            'skip' => [
                'title_futher_reading' => 'Tiêu đề Further Reading được chuẩn hóa trong SingleArticleTemplateV2',
                'popular_posts_title' => 'Tiêu đề Popular Posts sidebar được chuẩn hóa trong SingleArticleTemplateV2',
                'search_post_title' => 'Tiêu đề Search bài viết được chuẩn hóa trong SingleArticleTemplateV2',
                'text_like' => 'Tiêu đề chia sẻ mạng xã hội được chuẩn hóa trong SingleArticleTemplateV2',
            ],
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
                'desc_intro' => ['to' => 'page_description', 'as' => 'strip'],
                'title_intro' => ['to' => 'hero_tagline', 'as' => 'strip'],
                'member' => ['to' => 'team', 'as' => 'custom'],
                'travel_guides' => ['to' => 'related_guides', 'as' => 'rel'],
                'post_top_cycling' => ['to' => 'featured_tours', 'as' => 'rel'],
                'country_category' => ['to' => 'source_country_category', 'as' => 'term'],
                'place_category' => ['to' => 'source_place_category', 'as' => 'term'],
                'hotel_category' => ['to' => 'source_hotel_category', 'as' => 'term'],
                'thing_category' => ['to' => 'source_thing_category', 'as' => 'term'],
                'trave_guide_category' => ['to' => 'source_trave_guide_category', 'as' => 'term'],
            ],
            'skip' => array_merge($specialist_skip, [
                'slider' => 'Gallery/slider trang đơn lẻ được xử lý qua featured_media và khối nội dung chuẩn',
                'tour_guide' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
                'title_make' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
                'title_plan_trip' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
                'cnt_plan_trip' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
                'button_plan_trip' => 'Khối chuyên viên được quản lý tập trung qua SpecialistBlock / Luxury Concierge global',
                'list_hot' => 'rỗng 100% bên cũ',
                'button' => 'rỗng 100% bên cũ',
                'link_button' => 'rỗng 100% bên cũ',
                'post_more_ideas' => 'rỗng 100% bên cũ',
                'sec01' => 'khối layout linh hoạt cũ; nội dung được giữ trong source snapshot và post_content/template mới',
                'sec02' => 'khối layout linh hoạt cũ; nội dung được giữ trong source snapshot và post_content/template mới',
                'sec03' => 'khối layout linh hoạt cũ; nội dung được giữ trong source snapshot và post_content/template mới',
                'slider_home' => 'trang home trong pages được xử lý bởi importer homepage riêng',
                'slide_review' => 'trang home trong pages được xử lý bởi importer homepage riêng',
                'images_list' => 'trang home trong pages được xử lý bởi importer homepage riêng',
                'content_02' => 'trang home trong pages được xử lý bởi importer homepage riêng',
                'post_03' => 'trang home trong pages được xử lý bởi importer homepage riêng',
                'post_04' => 'trang home trong pages được xử lý bởi importer homepage riêng',
                'post_05' => 'trang home trong pages được xử lý bởi importer homepage riêng',
                'phone' => 'trang home trong pages được xử lý bởi importer homepage riêng',
                'text_phone' => 'trang home trong pages được xử lý bởi importer homepage riêng',
                'link_email_icon' => 'trang home trong pages được xử lý bởi importer homepage riêng',
                'logo_web_review' => 'trang home trong pages được xử lý bởi importer homepage riêng',
                'name_web_review' => 'trang home trong pages được xử lý bởi importer homepage riêng',
                'link_web_review' => 'trang home trong pages được xử lý bởi importer homepage riêng',
                'text_review' => 'trang home trong pages được xử lý bởi importer homepage riêng',
                'book_tour' => 'CTA home cũ được xử lý bởi importer homepage riêng',
                'classic_tour' => 'CTA home cũ được xử lý bởi importer homepage riêng',
                'categories' => 'taxonomy home cũ được xử lý bởi importer homepage riêng',
                'sec03_title' => 'heading layout home cũ được thay bằng nội dung biên tập mới',
                'sec04_title' => 'heading layout home cũ được thay bằng nội dung biên tập mới',
                'sec05_title' => 'heading layout home cũ được thay bằng nội dung biên tập mới',
                'sec11_title' => 'heading hub cũ được thay bằng directory động',
                'sec01_links' => 'menu phụ home cũ được thay bằng menu WordPress',
                'links_sec03' => 'link phụ home cũ được thay bằng điều hướng mới',
                'links_sec11' => 'link phụ hub cũ được thay bằng directory động',
                'button_text_sec04' => 'CTA home cũ được thay bằng CTA mới',
                'button_link_sec04' => 'CTA home cũ được thay bằng CTA mới',
                'text_at_single' => 'nhãn layout cũ, không phải nội dung bài',
                'bg_my_way' => 'ảnh nền layout home cũ, giao diện mới không dùng',
                'post11' => 'danh sách hub cũ được thay bằng truy vấn directory động',
                'list_button' => 'CTA danh sách cũ được thay bằng điều hướng directory',
                'taxonomy_suggest' => 'taxonomy gợi ý được frontend truy vấn động',
                'title_suggest' => 'heading gợi ý cũ được frontend directory thay thế',
                'thumbnail_around_the_world' => 'ảnh trang hub cũ được thay bằng ảnh nội dung động',
                'desc_around_the_world' => 'copy trang hub cũ được thay bằng page description/directory',
                'title_around_the_world' => 'heading trang hub cũ được thay bằng title trang',
                'title_tab' => 'nhãn tab layout cũ được thay bằng directory',
                'choose_post_sec01' => 'quan hệ holiday hub được frontend archive truy vấn động',
                'choose_post_sec02' => 'quan hệ holiday hub được frontend archive truy vấn động',
                'choose_sub_post_sec01' => 'quan hệ holiday hub được frontend archive truy vấn động',
                'offer' => 'offer hub cũ được frontend archive truy vấn động',
                'ins_title' => 'heading inspiration cũ được template directory thay thế',
                'holidays_title' => 'heading directory cũ được template mới thay thế',
                'holidays_title_sec02' => 'heading directory cũ được template mới thay thế',
                'holidays_title_sec03' => 'heading directory cũ được template mới thay thế',
                'holidays_title_sec04' => 'heading directory cũ được template mới thay thế',
                'main_post_ins' => 'quan hệ inspiration cũ được frontend archive truy vấn động',
                'ins_title_sec02' => 'heading inspiration cũ được template directory thay thế',
                'choose_post_ins_sec02' => 'quan hệ inspiration cũ được frontend archive truy vấn động',
                'ins_title_sec03' => 'heading inspiration cũ được template directory thay thế',
                'offer_ins' => 'offer inspiration cũ được frontend archive truy vấn động',
                'ins_title_sec04' => 'heading inspiration cũ được template directory thay thế',
                'latest_stories_title' => 'heading blog cũ được template article directory thay thế',
                'popular_posts_title' => 'heading blog cũ được template article directory thay thế',
                'post_array' => 'danh sách bài cũ được destination/article directory truy vấn động',
            ]),
        ],

        /* ────────────────────────── HOMEPAGE ────────────────────────── */
        'homepage' => [
            'type' => 'homepage',
            'fields' => [
                'slider_home' => ['to' => 'home_banner_slider', 'as' => 'custom'],
                'slide_review' => ['to' => 'testimonials', 'as' => 'custom'],
                'content_02' => ['to' => 'statement_text', 'as' => 'html'],
                'name_web_review' => ['to' => 'review_summary', 'as' => 'html'],
                'logo_web_review' => ['to' => 'review_logo', 'as' => 'image'],
                'link_web_review' => ['to' => 'review_link'],
                'text_review' => ['to' => 'review_text'],
                'text_phone' => ['to' => 'text_phone'],
                'phone' => ['to' => 'phone'],
                'post_03' => ['to' => 'home_tab_journeys', 'as' => 'rel_cards'],
            ],
            'skip' => [
                'images_list' => 'Carousel Ways to Explore cũ đã được gộp vào 3 tabs chính (Destinations, Journeys, Inspiration)',
                'link_email_icon' => 'Field cũ chứa URL điện thoại, không phải email; contact frontend dùng phone toàn cục',
                'post_04' => 'Tab Destinations được tự động tổng hợp từ Country Taxonomy và Destination directory',
                'post_05' => 'Offer cards của layout homepage cũ; dữ liệu gốc vẫn nằm trong snapshot lossless',
                'post11' => 'New cards của layout homepage cũ; dữ liệu gốc vẫn nằm trong snapshot lossless',
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
            if (is_array($value)) {
                $url = aat_str($value['url'] ?? $value['image_url'] ?? '');
                $legacy_id = $value['ID'] ?? $value['id'] ?? 0;
                if (!$url && is_array($value['image'] ?? null)) {
                    $url = aat_str($value['image']['url'] ?? '');
                    $legacy_id = $legacy_id ?: ($value['image']['ID'] ?? $value['image']['id'] ?? 0);
                }
                if ($url !== '') return aat_import_media_url_only($url, $post_id);
                if ($legacy_id) {
                    $new_id = aat_import_media_id($legacy_id, $post_id);
                    return $new_id ? (string) wp_get_attachment_url($new_id) : null;
                }
                return null;
            }
            if (is_numeric($value)) {
                $new_id = aat_import_media_id($value, $post_id);
                return $new_id ? (string) wp_get_attachment_url($new_id) : null;
            }
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
