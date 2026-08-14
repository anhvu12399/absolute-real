<?php
/**
 * ACF field groups.
 *
 * Field names here are read verbatim by the Next.js templates - renaming one
 * drops that section back to its placeholder content. Repeaters are plain
 * textareas holding JSON (ACF free has no repeater field); admin-repeaters.php
 * renders the editing UI and rest-api.php decodes the JSON back into arrays.
 */

if (!defined('ABSPATH')) exit;

/** Names of every JSON-backed repeater, used by the REST decoder and the admin UI. */
function aat_repeater_fields() {
    return [
        // homepage
        'home_banner_slider', 'home_tab_destinations', 'home_tab_journeys', 'home_tab_offers',
        'home_tab_new', 'home_ways_to_explore', 'home_stay_with', 'home_ways_to_travel',
        'home_values', 'testimonials',
        // tour
        'itinerary', 'departure_dates', 'faqs', 'gallery', 'accommodation_options', 'experiences',
        // destination / hotel
        'nearby_places', 'related_links', 'month_guide',
        // page hubs
        'journeys', 'cruises', 'articles', 'team', 'story_milestones', 'milestones', 'pillars', 'why_reasons',
    ];
}

function aat_repeater_field($key, $label, $name, $ui, $note = '') {
    return [
        'key' => $key,
        'label' => $label,
        'name' => $name,
        'type' => 'textarea',
        /* Several of these fill themselves from live content when left empty,
           so the front end shows six cards where the table shows two. Without
           a note that reads as a bug. */
        'instructions' => $note,
        'wrapper' => ['class' => 'custom-free-repeater repeater-type-' . $ui],
    ];
}

/** Wording shared by every table that tops itself up from live content. */
function aat_fills_itself($what, $min = '') {
    return sprintf(
        'Để trống%s thì trang tự lấy thêm %s thật đang có trong WordPress cho đủ. Thêm dòng vào đây là trang dùng của bạn trước.',
        $min ? ' hoặc dưới ' . $min . ' dòng' : '',
        $what
    );
}

function aat_text($key, $label, $name, $extra = []) {
    return array_merge(['key' => $key, 'label' => $label, 'name' => $name, 'type' => 'text'], $extra);
}

function aat_textarea($key, $label, $name, $rows = 3) {
    return ['key' => $key, 'label' => $label, 'name' => $name, 'type' => 'textarea', 'rows' => $rows];
}

function aat_wysiwyg($key, $label, $name) {
    return ['key' => $key, 'label' => $label, 'name' => $name, 'type' => 'wysiwyg', 'media_upload' => 1, 'tabs' => 'all'];
}

function aat_image($key, $label, $name) {
    return ['key' => $key, 'label' => $label, 'name' => $name, 'type' => 'image', 'return_format' => 'url', 'preview_size' => 'medium'];
}

function aat_tab($key, $label) {
    return ['key' => $key, 'label' => $label, 'type' => 'tab'];
}

/**
 * The "speak to a specialist" block. The legacy site repeated it on every
 * destination, place and hotel under different field names (tour_guide /
 * name_meet / title+content_contact), so it is one shared set here.
 */
function aat_specialist_fields($prefix) {
    return [
        aat_tab("tab_aat_{$prefix}_specialist", 'Speak to a Specialist'),
        aat_text("field_aat_{$prefix}_sp_title", 'Block Title', 'specialist_title'),
        aat_textarea("field_aat_{$prefix}_sp_text", 'Block Text', 'specialist_text', 3),
        aat_image("field_aat_{$prefix}_sp_photo", 'Specialist Photo', 'specialist_photo'),
        aat_text("field_aat_{$prefix}_sp_btn", 'Button Label', 'specialist_button'),
        aat_text("field_aat_{$prefix}_sp_link", 'Button Link', 'specialist_link'),
        aat_text("field_aat_{$prefix}_sp_phone", 'Phone', 'specialist_phone'),
    ];
}

add_action('acf/init', 'aat_register_fields');

function aat_register_fields() {
    if (!function_exists('acf_add_local_field_group')) return;

    /* ─────────────────────────── HOMEPAGE ─────────────────────────── */
    acf_add_local_field_group([
        'key' => 'group_aat_homepage',
        'title' => 'Homepage Content',
        'fields' => [
            aat_tab('tab_aat_home_hero', '🖼 Banner đầu trang — Hero & Ticker'),
            aat_repeater_field('field_aat_home_slider', 'Hero Slider', 'home_banner_slider', 'home-banner', aat_fills_itself('tour')),
            aat_text('field_aat_home_ticker_text', 'Ticker Text', 'ticker_text'),
            aat_text('field_aat_home_ticker_link', 'Ticker Link', 'ticker_link'),

            aat_tab('tab_aat_home_intro', '📊 Câu mở đầu & Số liệu'),
            aat_textarea('field_aat_home_statement', 'Statement (HTML allowed)', 'statement_text', 3),
            aat_text('field_aat_home_stat1n', 'Stat 1 Number', 'stat_1_num'),
            aat_text('field_aat_home_stat1l', 'Stat 1 Label', 'stat_1_label'),
            aat_text('field_aat_home_stat2n', 'Stat 2 Number', 'stat_2_num'),
            aat_text('field_aat_home_stat2l', 'Stat 2 Label', 'stat_2_label'),
            aat_text('field_aat_home_stat3n', 'Stat 3 Number', 'stat_3_num'),
            aat_text('field_aat_home_stat3l', 'Stat 3 Label', 'stat_3_label'),

            aat_tab('tab_aat_home_tabs', '📍 Tab Hành trình — Các thẻ trên trang chủ'),
            aat_text('field_aat_home_tabs_head', 'Headline', 'tabs_headline'),
            /* Three tabs: where, what kind of journey, what to read. Named
               rather than numbered so a re-ordering does not silently move a
               label onto the wrong tab. */
            aat_text('field_aat_home_tab_dest', 'Tab: Destinations Label', 'tab_dest_label'),
            aat_text('field_aat_home_tab_jour', 'Tab: Journeys Label', 'tab_journeys_label'),
            aat_text('field_aat_home_tab_insp', 'Tab: Inspiration Label', 'tab_inspiration_label'),
            aat_repeater_field('field_aat_home_tab_dest', 'Tab: Destinations We Love', 'home_tab_destinations', 'home-cards', aat_fills_itself('điểm đến')),
            aat_repeater_field('field_aat_home_tab_jour', 'Tab: Journeys to Book Now', 'home_tab_journeys', 'home-cards', aat_fills_itself('tour')),
            aat_repeater_field('field_aat_home_tab_off', 'Tab: Limited-Time Offers', 'home_tab_offers', 'home-cards', aat_fills_itself('tour')),
            aat_repeater_field('field_aat_home_tab_new', 'Tab: New & Noteworthy', 'home_tab_new', 'home-cards', aat_fills_itself('tour')),

            aat_tab('tab_aat_home_explore', '🌏 Khám phá, Lưu trú & Du lịch'),
            aat_text('field_aat_home_exp_eye', 'Ways to Explore Eyebrow', 'explore_eyebrow'),
            aat_text('field_aat_home_exp_head', 'Ways to Explore Headline (HTML)', 'explore_headline'),
            aat_repeater_field('field_aat_home_explore', 'Ways to Explore', 'home_ways_to_explore', 'home-cards', aat_fills_itself('điểm đến', '4')),
            aat_text('field_aat_home_stay_eye', 'Stay Eyebrow', 'stay_eyebrow'),
            aat_text('field_aat_home_stay_head', 'Stay Headline (HTML)', 'stay_headline'),
            aat_repeater_field('field_aat_home_stay', 'Stay With Absolute Asia', 'home_stay_with', 'home-cards', aat_fills_itself('khách sạn')),
            aat_text('field_aat_home_trv_eye', 'Ways to Travel Eyebrow', 'travel_eyebrow'),
            aat_text('field_aat_home_trv_head', 'Ways to Travel Headline (HTML)', 'travel_headline'),
            aat_repeater_field('field_aat_home_travel', 'Ways to Travel', 'home_ways_to_travel', 'home-cards', aat_fills_itself('tour')),

            aat_tab('tab_aat_home_map', '🗺 Bản đồ & Giá trị cốt lõi'),
            aat_text('field_aat_home_map_head', 'Map Headline (HTML allowed)', 'map_headline'),
            aat_textarea('field_aat_home_map_desc', 'Map Description', 'map_description', 4),
            aat_textarea('field_aat_home_quote', 'Quote Text', 'quote_text', 3),
            aat_text('field_aat_home_quote_cite', 'Quote Citation', 'quote_citation'),
            aat_text('field_aat_home_resp_head', 'Travel Responsibly Headline', 'responsibly_headline'),
            aat_textarea('field_aat_home_resp_text', 'Travel Responsibly Text', 'responsibly_text', 4),
            /* The panel beside this copy was a flat gradient with nothing in it. */
            aat_image('field_aat_home_resp_image', 'Travel Responsibly Photo', 'responsibly_image'),
            aat_repeater_field('field_aat_home_values', 'Core Values', 'home_values', 'home-values'),

            aat_tab('tab_aat_home_story', '📜 Câu chuyện & Tiêu chuẩn'),
            aat_text('field_aat_home_story_tag', 'Story Tagline', 'story_bar_tagline'),
            aat_text('field_aat_home_story_head', 'Story Headline (HTML)', 'story_bar_headline'),
            aat_text('field_aat_home_story_btn', 'Button Text', 'story_bar_link_text'),

            aat_tab('tab_aat_home_plan', '📝 Form kế hoạch'),
            aat_text('field_aat_home_plan_eye', 'Eyebrow', 'plan_eyebrow'),
            aat_text('field_aat_home_plan_head', 'Headline (HTML)', 'plan_headline'),
            aat_textarea('field_aat_home_plan_desc', 'Description', 'plan_desc', 3),
            aat_text('field_aat_home_plan_btn', 'Button Text', 'plan_btn'),

            /* The six "why choose us" lines were fixed English on every tour
               page, and one of them stated an age for the company. */
            aat_tab('tab_aat_home_why', '⭐ Tại sao chọn chúng tôi'),
            aat_text('field_aat_home_why_title', 'Section Title', 'why_title'),
            aat_repeater_field('field_aat_home_why', 'Reasons', 'why_reasons', 'reasons'),

            aat_tab('tab_aat_home_social', '💬 Đánh giá & Liên hệ'),
            aat_repeater_field('field_aat_home_testimonials', 'Testimonials', 'testimonials', 'testimonials'),
            aat_textarea('field_aat_home_review_summary', 'Review Summary (HTML)', 'review_summary', 2),
            aat_image('field_aat_home_review_logo', 'Review Site Logo', 'review_logo'),
            aat_text('field_aat_home_review_link', 'Review Site Link', 'review_link'),
            aat_text('field_aat_home_review_text', 'Review Site Caption', 'review_text'),
            aat_text('field_aat_home_phone_label', 'Phone Label', 'text_phone'),
            aat_text('field_aat_home_phone', 'Phone Number', 'phone'),
            aat_text('field_aat_home_email', 'Email Link', 'link_email_icon'),
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'homepage']]],
        'show_in_rest' => true,
    ]);

    /* ───────────────────────────── TOUR ───────────────────────────── */
    acf_add_local_field_group([
        'key' => 'group_aat_tour',
        'title' => 'Tour Details',
        'fields' => [
            aat_tab('tab_aat_tour_facts', 'Key Facts'),
            aat_image('field_aat_tour_hero', 'Hero Image (falls back to featured image)', 'hero_image'),
            ['key' => 'field_aat_tour_days', 'label' => 'Duration (Days)', 'name' => 'duration_days', 'type' => 'number'],
            ['key' => 'field_aat_tour_destcount', 'label' => 'Destinations Count', 'name' => 'destinations_count', 'type' => 'number'],
            ['key' => 'field_aat_tour_guests', 'label' => 'Minimum Guests', 'name' => 'min_guests', 'type' => 'number', 'default_value' => 2],
            aat_text('field_aat_tour_price', 'Starting Price', 'starting_price'),
            aat_text('field_aat_tour_duration_label', 'Duration Label (e.g. "12 Days / 11 Nights")', 'duration_label'),
            aat_text('field_aat_tour_route', 'Route', 'tour_route'),
            aat_text('field_aat_tour_level', 'Activity Level', 'tour_level'),
            aat_text('field_aat_tour_code', 'Tour Code', 'tour_code'),
            ['key' => 'field_aat_tour_featured', 'label' => 'Feature on homepage', 'name' => 'is_featured', 'type' => 'true_false', 'ui' => 1],

            aat_tab('tab_aat_tour_overview', 'Overview'),
            aat_text('field_aat_tour_intro_title', 'Intro Title', 'intro_title'),
            aat_textarea('field_aat_tour_intro_desc', 'Intro Description', 'intro_description', 4),
            aat_textarea('field_aat_tour_highlights', 'Highlights (one per line)', 'highlights_list', 6),

            aat_tab('tab_aat_tour_itinerary', 'Itinerary'),
            aat_repeater_field('field_aat_tour_itinerary', 'Day by Day', 'itinerary', 'itinerary'),

            aat_tab('tab_aat_tour_stays', 'Stays & Options'),
            [
                'key' => 'field_aat_tour_stays',
                'label' => 'Hand-Selected Stays',
                'name' => 'featured_stays',
                'type' => 'post_object',
                'post_type' => ['hotel'],
                'multiple' => 1,
                'return_format' => 'id',
            ],
            aat_repeater_field('field_aat_tour_options', 'Accommodation Options', 'accommodation_options', 'options'),

            aat_tab('tab_aat_tour_inclusions', 'Inclusions & Dates'),
            aat_textarea('field_aat_tour_inclusions', 'Inclusions (one per line)', 'inclusions_list', 6),
            aat_textarea('field_aat_tour_exclusions', 'Exclusions (one per line)', 'exclusions_list', 6),
            aat_text('field_aat_tour_offer', 'Special Offer Callout', 'special_offer_text'),
            aat_repeater_field('field_aat_tour_dates', 'Departure Dates & Pricing', 'departure_dates', 'dates'),

            aat_tab('tab_aat_tour_extra', 'Gallery, Experiences & FAQs'),
            aat_repeater_field('field_aat_tour_gallery', 'Gallery', 'gallery', 'gallery'),
            aat_repeater_field('field_aat_tour_experiences', 'Experience Cards', 'experiences', 'experiences'),
            aat_repeater_field('field_aat_tour_faqs', 'FAQs', 'faqs', 'faqs'),

            aat_tab('tab_aat_tour_labels', 'Section Headings'),
            aat_text('field_aat_tour_eyebrow', 'Hero Eyebrow', 'hero_eyebrow'),
            aat_text('field_aat_tour_eyebrow_link', 'Hero Eyebrow Link', 'hero_eyebrow_link'),
            aat_text('field_aat_tour_gallery_title', 'Gallery Heading', 'gallery_title'),
            aat_text('field_aat_tour_classic', 'Classic Tour Link', 'classic_tour_link'),
            
            // Section Headings with default values
            aat_text('field_aat_tour_why_title', 'Why Us Heading', 'why_title', ['default_value' => '<em>Why Choose</em> Absolute Asia']),
            aat_text('field_aat_tour_itin_eye', 'Itinerary Eyebrow', 'itinerary_eyebrow', ['default_value' => '<em>Day</em> by Day']),
            aat_text('field_aat_tour_itin_head', 'Itinerary Heading', 'itinerary_title', ['default_value' => 'Itinerary']),
            aat_text('field_aat_tour_stays_eye', 'Stays Eyebrow', 'hotels_eyebrow', ['default_value' => "<em>Where</em> You'll Stay"]),
            aat_text('field_aat_tour_stays_head', 'Stays Heading', 'hotels_title', ['default_value' => 'Hand-Selected for an Unmatched Stay']),
            aat_text('field_aat_tour_incl_eye', 'Inclusions Eyebrow', 'inclusions_eyebrow', ['default_value' => '<em>Inclusions</em> & Offers']),
            aat_text('field_aat_tour_incl_head', 'Inclusions Heading', 'inclusions_title', ['default_value' => "What's Included"]),
            aat_text('field_aat_tour_dates_head', 'Departure Dates Heading', 'dates_title', ['default_value' => 'Departure Dates']),
            aat_text('field_aat_tour_gal_eye', 'Gallery Eyebrow', 'gallery_eyebrow', ['default_value' => '<em>Photo</em> Gallery']),
            aat_text('field_aat_tour_faq_eye', 'FAQ Eyebrow', 'faq_eyebrow', ['default_value' => '<em>Good</em> to Know']),
            aat_text('field_aat_tour_faq_head', 'FAQ Heading', 'faq_title', ['default_value' => 'Frequently Asked Questions']),

            aat_text('field_aat_tour_lbl_high', 'Highlights Heading', 'highlights_title', ['default_value' => '<em>Trip</em> Highlights']),
            aat_text('field_aat_tour_lbl_highdesc', 'Highlights Note', 'highlights_note'),
            aat_text('field_aat_tour_lbl_opt', 'Accommodation Heading', 'options_title', ['default_value' => 'Accommodation Options']),
            aat_textarea('field_aat_tour_lbl_optdesc', 'Accommodation Note', 'options_note', 2),
            aat_text('field_aat_tour_lbl_excl', 'Exclusions Heading', 'exclusions_title', ['default_value' => "What's Not Included"]),
            aat_text('field_aat_tour_lbl_policy', 'Booking Policy Heading', 'booking_policy_title', ['default_value' => 'Booking Policy']),
            aat_text('field_aat_tour_lbl_other', 'Related Tours Heading', 'related_tours_title', ['default_value' => 'Related Journeys']),
            aat_text('field_aat_tour_group_title', 'Small Group CTA Title', 'group_cta_title', ['default_value' => 'Interested in this itinerary but want to join a small group instead?']),
            aat_textarea('field_aat_tour_group_desc', 'Small Group CTA Description', 'group_cta_desc', 2),
            aat_text('field_aat_tour_group_btn', 'Small Group CTA Button', 'group_cta_btn', ['default_value' => 'Learn More']),
            aat_text('field_aat_tour_btn_incl', 'View Inclusions Button Text', 'inclusions_btn_text', ['default_value' => 'View Inclusions']),
            aat_text('field_aat_tour_btn_inquiry', 'Request Tour Button Text', 'inquiry_btn_text', ['default_value' => 'Request This Itinerary']),
            aat_text('field_aat_tour_cta_label', 'Highlight CTA Label', 'cta_label'),
            aat_text('field_aat_tour_cta_link', 'Highlight CTA Link', 'cta_link'),
            [
                'key' => 'field_aat_tour_related',
                'label' => 'Other Tours',
                'name' => 'related_tours',
                'type' => 'post_object',
                'post_type' => ['tour'],
                'multiple' => 1,
                'return_format' => 'id',
            ],
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'tour']]],
        'show_in_rest' => true,
    ]);

    /* ──────────────────── DESTINATION / PLACE TO GO ──────────────────── */
    acf_add_local_field_group([
        'key' => 'group_aat_place',
        'title' => 'Destination Details',
        'fields' => [
            aat_tab('tab_aat_place_hero', 'Hero & Overview'),
            aat_image('field_aat_place_hero', 'Hero Image', 'hero_image'),
            aat_text('field_aat_place_tagline', 'Hero Tagline', 'hero_tagline'),
            aat_textarea('field_aat_place_overview', 'Overview', 'destination_overview', 4),

            aat_tab('tab_aat_place_map', 'Map'),
            aat_text('field_aat_place_map_head', 'Map Headline', 'map_headline'),
            aat_textarea('field_aat_place_map_desc', 'Map Description', 'map_description', 3),
            aat_text('field_aat_place_map_stops', 'Map Stops (comma separated)', 'map_stops'),
            aat_text('field_aat_place_map_label', 'Map Location Label', 'location_map'),
            aat_text('field_aat_place_lat', 'Latitude', 'latitude'),
            aat_text('field_aat_place_lng', 'Longitude', 'longitude'),

            aat_tab('tab_aat_place_related', 'Related & Gallery'),
            aat_text('field_aat_place_rel_title', 'Related Section Title', 'related_title'),
            aat_textarea('field_aat_place_rel_desc', 'Related Section Description', 'related_description', 2),
            [
                'key' => 'field_aat_place_tours',
                'label' => 'Featured Tours',
                'name' => 'featured_tours',
                'type' => 'post_object',
                'post_type' => ['tour'],
                'multiple' => 1,
                'return_format' => 'id',
            ],
            [
                'key' => 'field_aat_place_places',
                'label' => 'Related Places',
                'name' => 'related_places',
                'type' => 'post_object',
                'post_type' => ['place_to_go', 'thing_to_do', 'destination'],
                'multiple' => 1,
                'return_format' => 'id',
            ],
            aat_repeater_field('field_aat_place_gallery', 'Gallery', 'gallery', 'gallery'),

            aat_tab('tab_aat_place_labels', 'Section Headings'),
            aat_text('field_aat_place_test_eye', 'Testimonials Eyebrow', 'testimonials_eyebrow'),
            aat_text('field_aat_place_test_head', 'Testimonials Heading', 'testimonials_heading'),
            aat_text('field_aat_place_exp_eye', 'Experiences Eyebrow', 'experiences_eyebrow'),
            aat_text('field_aat_place_exp_head', 'Experiences Heading', 'experiences_heading'),
            aat_text('field_aat_place_stay_eye', 'Stays Eyebrow', 'stays_eyebrow'),
            aat_text('field_aat_place_stay_head', 'Stays Heading', 'stays_heading'),
            aat_text('field_aat_place_route_eye', 'Route Eyebrow', 'route_eyebrow'),
            aat_text('field_aat_place_guide_eye', 'Guides Eyebrow', 'guides_eyebrow'),
            aat_text('field_aat_place_guide_head', 'Guides Heading', 'guides_heading'),
            aat_text('field_aat_place_plan_eye', 'Planning Eyebrow', 'planning_eyebrow'),
            aat_text('field_aat_place_plan_head', 'Planning Heading', 'planning_heading'),

        ],
        'location' => [
            [['param' => 'post_type', 'operator' => '==', 'value' => 'place_to_go']],
        ],
        'show_in_rest' => true,
    ]);

    /* ───────────── DESTINATION GUIDE SECTIONS ─────────────
       The legacy country pages (/vietnam/, /south-korea/…) are plain pages that
       carry a full guide, so these apply to pages as well as destinations. */
    acf_add_local_field_group([
        'key' => 'group_aat_guide',
        'title' => 'Destination Guide Sections',
        'fields' => array_merge([
            aat_text('field_aat_guide_month_title', 'Month-by-Month Heading', 'month_guide_title'),
            aat_repeater_field('field_aat_guide_month', 'Month-by-Month Guide', 'month_guide', 'months'),
            aat_image('field_aat_guide_best_img', 'Best Time Image', 'best_time_image'),
            aat_wysiwyg('field_aat_guide_best_html', 'Best Time Copy', 'best_time_html'),
            aat_wysiwyg('field_aat_guide_popular', 'Popular Places Copy', 'popular_places_html'),
            aat_wysiwyg('field_aat_guide_ideas', 'Experiences Copy', 'experiences_html'),
            aat_wysiwyg('field_aat_guide_trip_html', 'Trip Ideas Copy', 'trip_ideas_html'),
            aat_text('field_aat_guide_trip_title', 'Trip Ideas Heading', 'trip_ideas_title'),
        ], aat_specialist_fields('guide')),
        'location' => [
            [['param' => 'post_type', 'operator' => '==', 'value' => 'place_to_go']],
            [['param' => 'post_type', 'operator' => '==', 'value' => 'page']],
        ],
        'menu_order' => 20,
        'show_in_rest' => true,
    ]);

    /* ───────────────────────────── HOTEL ───────────────────────────── */
    acf_add_local_field_group([
        'key' => 'group_aat_hotel',
        'title' => 'Hotel Details',
        'fields' => [
            aat_tab('tab_aat_hotel_hero', 'Hero & Overview'),
            aat_image('field_aat_hotel_hero', 'Hero Image', 'hero_image'),
            aat_text('field_aat_hotel_location', 'Location / Subtitle', 'hotel_location'),
            aat_textarea('field_aat_hotel_highlights', 'Highlights (one per line)', 'hotel_highlights', 5),

            aat_tab('tab_aat_hotel_map', 'Location & Map'),
            aat_text('field_aat_hotel_map_label', 'Map Location Label', 'location_map'),
            aat_text('field_aat_hotel_lat', 'Latitude', 'latitude'),
            aat_text('field_aat_hotel_lng', 'Longitude', 'longitude'),
            [
                'key' => 'field_aat_hotel_city',
                'label' => 'City / Destination',
                'name' => 'city',
                'type' => 'post_object',
                'post_type' => ['place_to_go'],
                'return_format' => 'id',
            ],
            aat_repeater_field('field_aat_hotel_nearby', 'Nearby Places', 'nearby_places', 'nearby'),

            aat_tab('tab_aat_hotel_gallery', 'Gallery'),
            aat_repeater_field('field_aat_hotel_gallery', 'Gallery', 'gallery', 'gallery'),

            aat_tab('tab_aat_hotel_related', 'Related Content'),
            [
                'key' => 'field_aat_hotel_tours',
                'label' => 'Related Tours',
                'name' => 'related_tours',
                'type' => 'post_object',
                'post_type' => ['tour'],
                'multiple' => 1,
                'return_format' => 'id',
            ],
            [
                'key' => 'field_aat_hotel_nearby_hotels',
                'label' => 'Nearby Hotels',
                'name' => 'related_hotels',
                'type' => 'post_object',
                'post_type' => ['hotel'],
                'multiple' => 1,
                'return_format' => 'id',
            ],
            [
                'key' => 'field_aat_hotel_things',
                'label' => 'Things to Do Nearby',
                'name' => 'related_things',
                'type' => 'post_object',
                'post_type' => ['thing_to_do', 'place_to_go'],
                'multiple' => 1,
                'return_format' => 'id',
            ],

            aat_tab('tab_aat_hotel_labels', 'Section Headings'),
            aat_text('field_aat_hotel_lbl_gallery', 'Gallery Heading', 'gallery_title'),
            aat_text('field_aat_hotel_lbl_tours', 'Journeys Heading', 'tours_title'),
            aat_text('field_aat_hotel_lbl_hotels', 'Nearby Hotels Heading', 'hotels_title'),
            aat_text('field_aat_hotel_lbl_inbrief', 'In Brief Heading', 'in_brief_title'),
            aat_text('field_aat_hotel_lbl_things', 'Things to Do Heading', 'things_title'),
            aat_text('field_aat_hotel_lbl_loc', 'Location Heading', 'location_title'),
            aat_text('field_aat_hotel_lbl_locsub', 'Location Subheading', 'location_subtitle'),

            ...aat_specialist_fields('hotel'),
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'hotel']]],
        'show_in_rest' => true,
    ]);

    /* ───────────────── GUIDES / THINGS TO DO / BLOG ───────────────── */
    acf_add_local_field_group([
        'key' => 'group_aat_editorial',
        'title' => 'Article Details',
        'fields' => [
            aat_tab('tab_aat_ed_hero', 'Hero & Content'),
            aat_image('field_aat_ed_hero', 'Hero Image', 'hero_image'),
            aat_text('field_aat_ed_minutes', 'Read Time (minutes)', 'read_minutes'),
            aat_textarea('field_aat_ed_intro', 'Intro / Excerpt (HTML)', 'intro_html', 3),
            aat_wysiwyg('field_aat_ed_left', 'Secondary Column', 'content_left'),
            aat_image('field_aat_ed_right_img', 'Secondary Image', 'content_right_image'),

            aat_tab('tab_aat_ed_sidebar', 'Sidebar'),
            aat_text('field_aat_ed_sb_popular', 'Popular Heading', 'sidebar_popular_title'),
            aat_text('field_aat_ed_sb_search', 'Search Heading', 'sidebar_search_title'),
            aat_text('field_aat_ed_sb_social', 'Social Heading', 'sidebar_social_title'),
            aat_text('field_aat_ed_further', 'Further Reading Title', 'further_title'),
            aat_text('field_aat_ed_view_more', 'View More Label', 'view_more_label'),
            aat_text('field_aat_ed_view_more_link', 'View More Link', 'view_more_link'),

            aat_tab('tab_aat_ed_gallery', 'Gallery & Related'),
            aat_repeater_field('field_aat_ed_gallery', 'Gallery', 'gallery', 'gallery'),
            [
                'key' => 'field_aat_ed_guides',
                'label' => 'Related Guides',
                'name' => 'related_guides',
                'type' => 'post_object',
                'post_type' => ['travel_guide', 'thing_to_do', 'blog'],
                'multiple' => 1,
                'return_format' => 'id',
            ],
            [
                'key' => 'field_aat_ed_tours',
                'label' => 'Related Tours',
                'name' => 'related_tours',
                'type' => 'post_object',
                'post_type' => ['tour'],
                'multiple' => 1,
                'return_format' => 'id',
            ],

            aat_tab('tab_aat_ed_plan', 'Plan Your Trip'),
            aat_text('field_aat_ed_plan_title', 'Plan Heading', 'plan_title'),
            aat_wysiwyg('field_aat_ed_plan_desc', 'Plan Description', 'plan_description'),
            aat_wysiwyg('field_aat_ed_plan_html', 'Plan Block (HTML)', 'plan_html'),
            aat_wysiwyg('field_aat_ed_plan_bottom', 'Plan Footer', 'plan_footer'),

            ...aat_specialist_fields('ed'),
        ],
        'location' => [
            [['param' => 'post_type', 'operator' => '==', 'value' => 'travel_guide']],
            [['param' => 'post_type', 'operator' => '==', 'value' => 'thing_to_do']],
            [['param' => 'post_type', 'operator' => '==', 'value' => 'blog']],
        ],
        'show_in_rest' => true,
    ]);

    /* ───────────────────────────── PAGES ───────────────────────────── */
    acf_add_local_field_group([
        'key' => 'group_aat_page',
        'title' => 'Page Hero & Directory',
        'fields' => [
            aat_image('field_aat_page_hero', 'Hero Image', 'hero_image'),
            aat_text('field_aat_page_eyebrow', 'Eyebrow / Subtitle', 'eyebrow'),
            aat_text('field_aat_page_tagline', 'Hero Tagline / Headline', 'hero_tagline'),
            aat_textarea('field_aat_page_desc', 'Page Description', 'page_description', 3),

            /* Country landing pages (/china/, /thailand/) render from the page
               the legacy site called /{country}-tours/, using the destination
               template. Without these fields an editor could change the body
               but not the opening line or the map blurb the template shows. */
            aat_text('field_aat_page_pillars_t', 'Guarantees Section Title', 'pillars_title'),
            aat_repeater_field('field_aat_page_pillars', 'Guarantees / Pillars', 'pillars', 'pillars'),

            /* About Us / Why Us — the company's own story.
               Field names must match seed-story.php and WhyUsTemplateV2.tsx. */
            aat_tab('tab_aat_page_story', '📜 Câu chuyện — Our Story'),
            aat_text('field_aat_page_story_eyebrow', 'Eyebrow phía trên tiêu đề (ví dụ: "Our Story")', 'story_eyebrow'),
            aat_text('field_aat_page_story_headline', 'Tiêu đề lớn của phần story', 'story_headline'),
            aat_textarea('field_aat_page_story_lede', 'Mở đầu — câu đầu tiên dưới tiêu đề', 'story_lede', 3),
            aat_repeater_field('field_aat_page_milestones', 'Các mốc lịch sử (năm + sự kiện)', 'story_milestones', 'milestones'),
            aat_text('field_aat_page_now_title', 'Tiêu đề phần "Hiện tại"', 'story_now_title'),
            aat_textarea('field_aat_page_now_text', 'Nội dung phần "Hiện tại"', 'story_now_text', 3),
            aat_text('field_aat_page_founder', 'Tên người sáng lập', 'story_founder_name'),
            aat_text('field_aat_page_founder_role', 'Chức vụ người sáng lập', 'story_founder_role'),
            aat_image('field_aat_page_founder_photo', 'Ảnh người sáng lập', 'story_founder_photo'),
            aat_textarea('field_aat_page_founder_quote', 'Câu nói của người sáng lập', 'story_founder_quote', 2),

            aat_tab('tab_aat_page_team', 'Team'),
            aat_text('field_aat_page_team_title', 'Team Section Title', 'team_title'),
            aat_repeater_field('field_aat_page_team', 'Team Members', 'team', 'team'),

            aat_tab('tab_aat_page_country', 'Country Page'),
            aat_textarea('field_aat_page_overview', 'Opening Line (large serif)', 'destination_overview', 3),
            aat_text('field_aat_page_map_head', 'Map Headline', 'map_headline'),
            aat_textarea('field_aat_page_map_desc', 'Map Description', 'map_description', 3),

            aat_tab('tab_aat_page_hubs', 'Directory Cards'),
            aat_repeater_field('field_aat_page_journeys', 'Journeys Directory Cards', 'journeys', 'hub-journeys'),
            aat_repeater_field('field_aat_page_cruises', 'Cruises Directory Cards', 'cruises', 'hub-cruises'),
            aat_repeater_field('field_aat_page_articles', 'Travel Inspiration Cards', 'articles', 'hub-articles'),
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'page']]],
        'menu_order' => 10,
        'show_in_rest' => true,
    ]);

    /* ──────────────────────────── COUNTRIES ────────────────────────────
       Only four countries kept a page of their own on the legacy site, so
       /cambodia/, /laos/ and the rest are assembled from what is filed under
       them. These two fields are how an editor takes that page over: the
       country's own photograph and its own opening line, with no page to
       create first. The REST payload exposes both. */
    acf_add_local_field_group([
        'key' => 'group_aat_country',
        'title' => 'Country Landing Page',
        'fields' => [
            aat_image('field_aat_country_image', 'Hero Image', 'image'),
            aat_textarea('field_aat_country_intro', 'Opening Line (large serif)', 'intro', 3),
        ],
        'location' => [[['param' => 'taxonomy', 'operator' => '==', 'value' => 'country']]],
        'menu_order' => 0,
        'show_in_rest' => true,
    ]);
}

/**
 * ACF stores these as JSON text. If something writes a real array back (the
 * importer does), re-encode it so the textarea and the admin UI still load.
 */
add_filter('acf/load_value', function ($value, $post_id, $field) {
    if (is_array($value) && in_array($field['name'], aat_repeater_fields(), true)) {
        return wp_json_encode($value);
    }
    return $value;
}, 10, 3);
