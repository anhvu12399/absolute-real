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
        /* Seven names were dropped here when the homepage was rebuilt around
           three tabs: home_tab_offers, home_tab_new, home_ways_to_explore,
           home_stay_with, home_ways_to_travel, plus milestones and
           related_links. No field declares them any more, so listing them only
           told the decoder to look for meta nothing writes. */
        // homepage
        /* Tab 3 had a label field and a tab on the page but no cards field, so
           the third tab was the only one an editor could not set by hand. */
        'home_banner_slider', 'trust_items', 'home_tab_destinations', 'home_tab_journeys',
        'home_tab_inspiration', 'home_editorial',
        'home_values', 'testimonials', 'team',
        // tour
        'itinerary', 'departure_dates', 'faqs', 'gallery', 'accommodation_options', 'experiences',
        // destination / hotel
        'nearby_places', 'month_guide', 'guides_cards',
        // page hubs
        'journeys', 'cruises', 'articles', 'story_milestones', 'pillars', 'why_reasons',
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
 * Index local field keys by the post types in a group's location rules.
 * ACF cannot resolve a selector by name when old raw meta has no companion
 * `_field_name` reference, so the importer uses this deterministic registry.
 */
function aat_index_local_fields($fields, $post_types) {
    foreach ((array) $fields as $field) {
        if (!is_array($field)) continue;
        if (!empty($field['name']) && !empty($field['key'])) {
            foreach ($post_types as $post_type) {
                $GLOBALS['aat_field_key_registry'][$post_type][$field['name']] = $field['key'];
            }
        }
        if (!empty($field['sub_fields'])) aat_index_local_fields($field['sub_fields'], $post_types);
    }
}

function aat_add_local_field_group($group) {
    $post_types = [];
    foreach ((array) ($group['location'] ?? []) as $rules) {
        foreach ((array) $rules as $rule) {
            if (($rule['param'] ?? '') === 'post_type' && ($rule['operator'] ?? '') === '==' && !empty($rule['value'])) {
                $post_types[] = (string) $rule['value'];
            }
        }
    }
    aat_index_local_fields($group['fields'] ?? [], array_values(array_unique($post_types)));
    acf_add_local_field_group($group);
}



add_action('acf/init', 'aat_register_fields');

function aat_register_fields() {
    if (!function_exists('acf_add_local_field_group')) return;

    /* ─────────────────────────── HOMEPAGE ─────────────────────────── */
    aat_add_local_field_group([
        'key' => 'group_aat_homepage',
        'title' => 'Homepage Content',
        'fields' => [
            aat_tab('tab_aat_home_hero', 'Hero Banner & Trust'),
            aat_repeater_field('field_aat_home_slider', 'Hero Slider', 'home_banner_slider', 'home-banner', aat_fills_itself('tour')),
            aat_repeater_field('field_aat_home_trust', 'Trust Bar (4 Badges)', 'trust_items', 'trust'),

            aat_tab('tab_aat_home_intro', 'Brand Statement & Intro'),
            aat_text('field_aat_home_intro_head', 'Intro Headline', 'intro_headline', ['default_value' => 'Asia is not one journey']),
            aat_textarea('field_aat_home_statement', 'Statement Copy (HTML allowed)', 'statement_text', 4),
            aat_text('field_aat_home_intro_cta_lbl', 'CTA Button Label', 'intro_cta_label', ['default_value' => 'Meet our travel specialists']),
            aat_text('field_aat_home_intro_cta_lnk', 'CTA Button Link', 'intro_cta_link', ['default_value' => '/about-us/']),

            aat_tab('tab_aat_home_tabs', 'Destinations & Journeys Tabs'),
            aat_text('field_aat_home_tabs_head', 'Section Headline', 'tabs_headline', ['default_value' => 'Where will Asia take you?']),
            aat_text('field_aat_home_tab_dest_label', 'Tab 1 Label (Destinations)', 'tab_dest_label', ['default_value' => 'Explore destinations']),
            aat_text('field_aat_home_tab_jour_label', 'Tab 2 Label (Journeys)', 'tab_journeys_label', ['default_value' => 'Private journeys']),
            aat_text('field_aat_home_tab_insp_label', 'Tab 3 Label (Inspiration)', 'tab_inspiration_label', ['default_value' => 'Travel inspiration']),
            aat_repeater_field('field_aat_home_tab_dest_cards', 'Destinations Tab Cards (Auto-filled if empty)', 'home_tab_destinations', 'home-cards', aat_fills_itself('destination')),
            aat_repeater_field('field_aat_home_tab_jour_cards', 'Journeys Tab Cards (Auto-filled if empty)', 'home_tab_journeys', 'home-cards', aat_fills_itself('tour')),
            aat_repeater_field('field_aat_home_tab_insp_cards', 'Inspiration Tab Cards (Auto-filled if empty)', 'home_tab_inspiration', 'home-cards', aat_fills_itself('bài cẩm nang')),

            aat_tab('tab_aat_home_featured', 'Featured Journeys, Stays & Inspiration'),
            aat_text('field_aat_home_feat_eye', 'Featured Journeys Eyebrow (HTML)', 'featured_eyebrow', ['default_value' => '<em>Private</em> Journeys']),
            aat_text('field_aat_home_feat_head', 'Featured Journeys Headline (HTML)', 'featured_headline', ['default_value' => 'Private journeys to begin with']),
            aat_text('field_aat_home_stay_eye', 'Stays & Cruises Eyebrow (HTML)', 'stay_eyebrow', ['default_value' => '<em>Stay</em> With Absolute Asia']),
            aat_text('field_aat_home_stay_head', 'Stays & Cruises Headline (HTML)', 'stay_headline', ['default_value' => 'Cruises and stays worth the detour']),
            aat_text('field_aat_home_insp_head', 'Inspiration Headline (HTML)', 'inspiration_headline', ['default_value' => 'Reading before you go']),
            aat_repeater_field('field_aat_home_editorial', 'Inspiration Strip Cards (Auto-filled if empty)', 'home_editorial', 'home-cards', aat_fills_itself('bài cẩm nang')),

            aat_tab('tab_aat_home_map', 'Map & Core Values'),
            aat_text('field_aat_home_map_head', 'Map Headline (HTML allowed)', 'map_headline', ['default_value' => 'Your journey, <em>charted</em> by hand']),
            aat_textarea('field_aat_home_map_desc', 'Map Description', 'map_description', 4),
            aat_textarea('field_aat_home_quote', 'Quote Text', 'quote_text', 3),
            aat_text('field_aat_home_quote_cite', 'Quote Citation', 'quote_citation'),
            aat_image('field_aat_home_quote_image', 'Quote Background Image', 'quote_image'),
            aat_text('field_aat_home_resp_head', 'Travel Responsibly Headline (HTML)', 'responsibly_headline'),
            aat_textarea('field_aat_home_resp_text', 'Travel Responsibly Text', 'responsibly_text', 4),
            aat_image('field_aat_home_resp_image', 'Travel Responsibly Image', 'responsibly_image'),
            aat_repeater_field('field_aat_home_values', 'Core Values Cards', 'home_values', 'home-values'),

            aat_tab('tab_aat_home_story', 'Story & Standards'),
            aat_text('field_aat_home_story_tag', 'Story Tagline', 'story_bar_tagline'),
            aat_text('field_aat_home_story_head', 'Story Headline (HTML)', 'story_bar_headline'),
            aat_text('field_aat_home_story_btn', 'Story Button Text', 'story_bar_link_text'),
            aat_image('field_aat_home_story_image', 'Story Background Image', 'story_bar_image'),

            aat_tab('tab_aat_home_plan', 'Plan Your Trip Form'),
            aat_text('field_aat_home_plan_eye', 'Form Eyebrow (HTML)', 'plan_eyebrow'),
            aat_text('field_aat_home_plan_head', 'Form Headline', 'plan_headline'),
            aat_textarea('field_aat_home_plan_desc', 'Form Description', 'plan_desc', 3),
            aat_text('field_aat_home_plan_btn', 'Submit Button Text', 'plan_btn'),

            aat_tab('tab_aat_home_social', 'Specialists & Reviews'),
            aat_text('field_aat_home_team_head', 'Specialists Section Headline', 'specialists_headline', ['default_value' => 'The people who plan it']),
            aat_repeater_field('field_aat_home_team', 'Specialists Team', 'team', 'team'),
            aat_repeater_field('field_aat_home_testimonials', 'Client Testimonials', 'testimonials', 'testimonials'),
            aat_textarea('field_aat_home_review_summary', 'Review Summary (HTML)', 'review_summary', 2),
            aat_image('field_aat_home_review_logo', 'Review Site Logo', 'review_logo'),
            aat_text('field_aat_home_review_link', 'Review Site Link', 'review_link'),
            aat_text('field_aat_home_review_text', 'Review Site Caption', 'review_text'),

            aat_tab('tab_aat_home_global', 'Site Contact & Tour Promises'),
            aat_text('field_aat_home_phone_label', 'Phone Label', 'text_phone'),
            aat_text('field_aat_home_phone', 'Phone Number', 'phone'),
            aat_text('field_aat_home_why_title', 'Tour Promises Heading', 'why_title'),
            aat_repeater_field('field_aat_home_why_reasons', 'Tour Promises (shown on tour pages)', 'why_reasons', 'reasons'),
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'homepage']]],
        'show_in_rest' => true,
    ]);

    /* ───────────────────────────── TOUR ───────────────────────────── */
    aat_add_local_field_group([
        'key' => 'group_aat_tour',
        'title' => 'Tour Details',
        'fields' => [
            aat_tab('tab_aat_tour_facts', 'Key Facts'),
            aat_image('field_aat_tour_hero', 'Hero Image (falls back to featured image)', 'hero_image'),
            aat_text('field_aat_tour_hero_eye', 'Hero Eyebrow (HTML)', 'hero_eyebrow'),
            ['key' => 'field_aat_tour_days', 'label' => 'Duration (Days)', 'name' => 'duration_days', 'type' => 'number'],
            ['key' => 'field_aat_tour_destcount', 'label' => 'Destinations Count', 'name' => 'destinations_count', 'type' => 'number'],
            ['key' => 'field_aat_tour_guests', 'label' => 'Minimum Guests', 'name' => 'min_guests', 'type' => 'number', 'default_value' => 2],
            aat_text('field_aat_tour_duration_label', 'Duration Label (e.g. "12 Days / 11 Nights")', 'duration_label'),
            aat_text('field_aat_tour_route', 'Route Summary', 'tour_route'),
            aat_text('field_aat_tour_level', 'Tour Level', 'tour_level'),
            aat_text('field_aat_tour_code', 'Tour Code', 'tour_code'),
            ['key' => 'field_aat_tour_featured', 'label' => 'Featured Tour', 'name' => 'is_featured', 'type' => 'true_false'],
            aat_text('field_aat_tour_hero_eye_link', 'Hero Eyebrow Link', 'hero_eyebrow_link'),

            aat_tab('tab_aat_tour_overview', 'Overview'),
            aat_text('field_aat_tour_intro_title', 'Intro Title', 'intro_title'),
            aat_textarea('field_aat_tour_intro_desc', 'Intro Description', 'intro_description', 3),
            aat_textarea('field_aat_tour_highlights', 'Highlights (one per line)', 'highlights_list', 6),
            aat_text('field_aat_tour_lbl_high', 'Highlights Heading', 'highlights_title', ['default_value' => '<em>Trip</em> Highlights']),
            aat_text('field_aat_tour_lbl_highdesc', 'Highlights Note', 'highlights_note'),
            aat_text('field_aat_tour_why_title', 'Why Choose Heading (HTML)', 'why_title'),
            aat_text('field_aat_tour_group_title', 'Group CTA Heading', 'group_cta_title'),
            aat_textarea('field_aat_tour_group_desc', 'Group CTA Description', 'group_cta_desc', 3),
            aat_text('field_aat_tour_group_btn', 'Group CTA Button', 'group_cta_btn'),
            aat_text('field_aat_tour_classic_link', 'Classic Tour Link', 'classic_tour_link'),
            aat_text('field_aat_tour_options_title', 'Accommodation Options Heading', 'options_title'),
            aat_textarea('field_aat_tour_options_note', 'Accommodation Options Note', 'options_note', 3),
            /* "Booking Policy Heading" stood here with nothing under it: no
               policy body field on this post type, no such section in the tour
               template, and field-map.php skips it on import. A heading for a
               section that does not exist only invites copy nothing prints. */
            aat_text('field_aat_tour_cta_label', 'Legacy CTA Label', 'cta_label'),
            aat_text('field_aat_tour_cta_link', 'Legacy CTA Link', 'cta_link'),

            aat_tab('tab_aat_tour_itinerary', 'Itinerary'),
            aat_repeater_field('field_aat_tour_itinerary', 'Day by Day', 'itinerary', 'itinerary'),
            aat_text('field_aat_tour_itin_eye', 'Itinerary Eyebrow (HTML)', 'itinerary_eyebrow'),
            aat_text('field_aat_tour_itin_title', 'Itinerary Heading', 'itinerary_title'),

            aat_tab('tab_aat_tour_stays', 'Stays & Accommodations'),
            aat_repeater_field(
                'field_aat_tour_accommodation_options',
                'Legacy Accommodation Options',
                'accommodation_options',
                'options',
                'Các lựa chọn chỗ ở đã import từ list_option của website cũ. Frontend hiển thị các dòng này bên dưới khách sạn được chọn.'
            ),
            [
                'key' => 'field_aat_tour_stays',
                'label' => 'Hand-Selected Stays',
                'name' => 'featured_stays',
                'type' => 'post_object',
                'post_type' => ['hotel'],
                'multiple' => 1,
                'return_format' => 'id',
            ],

            aat_tab('tab_aat_tour_inclusions', 'Inclusions & Dates'),
            aat_textarea('field_aat_tour_inclusions', 'Inclusions (one per line)', 'inclusions_list', 6),
            aat_textarea('field_aat_tour_exclusions', 'Exclusions (one per line)', 'exclusions_list', 6),
            aat_text('field_aat_tour_offer', 'Special Offer Callout', 'special_offer_text'),
            aat_repeater_field('field_aat_tour_dates', 'Departure Dates & Pricing', 'departure_dates', 'dates'),
            aat_text('field_aat_tour_dates_title', 'Departure Dates Heading', 'dates_title'),
            aat_text('field_aat_tour_inc_eye', 'Inclusions Eyebrow (HTML)', 'inclusions_eyebrow'),
            aat_text('field_aat_tour_inc_title', 'Inclusions Heading', 'inclusions_title'),
            aat_text('field_aat_tour_inc_btn', 'Inclusions Button', 'inclusions_btn_text'),
            aat_text('field_aat_tour_exc_title', 'Exclusions Heading', 'exclusions_title'),
            aat_text('field_aat_tour_inquiry_btn', 'Inquiry Button', 'inquiry_btn_text'),

            aat_tab('tab_aat_tour_extra', 'Gallery, Experiences & FAQs'),
            aat_repeater_field('field_aat_tour_gallery', 'Gallery', 'gallery', 'gallery'),
            aat_text('field_aat_tour_gallery_eye', 'Gallery Eyebrow (HTML)', 'gallery_eyebrow'),
            aat_text('field_aat_tour_gallery_title', 'Gallery Heading', 'gallery_title'),
            aat_repeater_field('field_aat_tour_experiences', 'Experience Cards', 'experiences', 'experiences'),
            aat_repeater_field('field_aat_tour_faqs', 'FAQs', 'faqs', 'faqs'),
            aat_text('field_aat_tour_faq_eye', 'FAQ Eyebrow (HTML)', 'faq_eyebrow'),
            aat_text('field_aat_tour_faq_title', 'FAQ Heading', 'faq_title'),
            aat_text('field_aat_tour_hotels_eye', 'Stays Eyebrow (HTML)', 'hotels_eyebrow'),
            aat_text('field_aat_tour_hotels_title', 'Stays Heading', 'hotels_title'),
            aat_text('field_aat_tour_related_title', 'Other Tours Heading', 'related_tours_title'),

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
    aat_add_local_field_group([
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
            aat_text('field_aat_place_test_eye', 'Testimonials Eyebrow (HTML)', 'testimonials_eyebrow'),
            aat_text('field_aat_place_test_head', 'Testimonials Heading', 'testimonials_heading'),
            aat_text('field_aat_place_exp_eye', 'Experiences Eyebrow (HTML)', 'experiences_eyebrow'),
            aat_text('field_aat_place_exp_head', 'Experiences Heading', 'experiences_heading'),
            aat_text('field_aat_place_stay_eye', 'Stays Eyebrow (HTML)', 'stays_eyebrow'),
            aat_text('field_aat_place_stay_head', 'Stays Heading', 'stays_heading'),
            aat_text('field_aat_place_route_eye', 'Route Eyebrow (HTML)', 'route_eyebrow'),
            aat_text('field_aat_place_guides_eye', 'Guides Eyebrow (HTML)', 'guides_eyebrow'),
            aat_text('field_aat_place_guides_head', 'Guides Heading', 'guides_heading'),
            aat_repeater_field('field_aat_place_guides_cards', 'Guides Cards (Auto-filled if empty)', 'guides_cards', 'home-cards', aat_fills_itself('bài cẩm nang')),
            aat_text('field_aat_place_plan_eye', 'Planning Eyebrow (HTML)', 'planning_eyebrow'),
            aat_text('field_aat_place_plan_head', 'Planning Heading', 'planning_heading'),
            /* Drives the Journeys section heading. "Related Content" named
               nothing an editor could point at on the page. */
            aat_text('field_aat_place_related_title', 'Journeys Section Heading', 'related_title'),
            aat_textarea('field_aat_place_related_desc', 'Journeys Section Description', 'related_description', 3),

            aat_tab('tab_aat_place_related', 'Related & Gallery'),
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
            /* The template already reads both of these and has since it was
               written - they were simply never declared, so the branches that
               use them could not run and the page always fell back to a list
               it worked out for itself. Left empty they still do. */
            [
                'key' => 'field_aat_place_related_tours',
                'label' => 'Related Journeys',
                'name' => 'related_tours',
                'type' => 'post_object',
                'post_type' => ['tour'],
                'multiple' => 1,
                'return_format' => 'id',
                'instructions' => 'Để trống thì trang tự lấy các hành trình cùng quốc gia.',
            ],
            [
                'key' => 'field_aat_place_related_hotels',
                'label' => 'Related Stays',
                'name' => 'related_hotels',
                'type' => 'post_object',
                'post_type' => ['hotel'],
                'multiple' => 1,
                'return_format' => 'id',
                'instructions' => 'Để trống thì trang tự lấy các khách sạn cùng quốc gia.',
            ],
            aat_repeater_field('field_aat_place_gallery', 'Gallery', 'gallery', 'gallery'),
            aat_repeater_field('field_aat_place_testimonials', 'Testimonials', 'testimonials', 'testimonials'),
            aat_repeater_field('field_aat_place_experiences', 'Experiences', 'experiences', 'experiences'),
            aat_text('field_aat_place_specialist_title', 'Specialist Heading', 'specialist_title'),
            aat_textarea('field_aat_place_specialist_text', 'Specialist Copy', 'specialist_text', 3),
            aat_image('field_aat_place_specialist_photo', 'Specialist Photo', 'specialist_photo'),
            aat_text('field_aat_place_specialist_phone', 'Specialist Phone', 'specialist_phone'),
            aat_text('field_aat_place_specialist_button', 'Specialist Button', 'specialist_button'),
            aat_text('field_aat_place_specialist_link', 'Specialist Link', 'specialist_link'),
        ],
        'location' => [
            [['param' => 'post_type', 'operator' => '==', 'value' => 'place_to_go']],
        ],
        'show_in_rest' => true,
    ]);

    /* ───────────── DESTINATION GUIDE SECTIONS ─────────────
       The legacy country pages (/vietnam/, /south-korea/…) are plain pages that
       carry a full guide, so these apply to pages as well as destinations. */
    aat_add_local_field_group([
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
        ]),
        'location' => [
            [['param' => 'post_type', 'operator' => '==', 'value' => 'place_to_go']],
            [['param' => 'post_type', 'operator' => '==', 'value' => 'page']],
        ],
        'menu_order' => 20,
        'show_in_rest' => true,
    ]);

    /* ───────────────────────────── HOTEL ───────────────────────────── */
    aat_add_local_field_group([
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
            aat_text('field_aat_hotel_gallery_title', 'Gallery Heading', 'gallery_title'),
            aat_text('field_aat_hotel_brief_title', 'In Brief Heading', 'in_brief_title'),
            aat_text('field_aat_hotel_tours_title', 'Related Tours Heading', 'tours_title'),
            aat_text('field_aat_hotel_things_title', 'Things To Do Heading', 'things_title'),
            aat_text('field_aat_hotel_location_title', 'Location Heading', 'location_title'),
            aat_textarea('field_aat_hotel_location_sub', 'Location Description', 'location_subtitle', 3),
            aat_text('field_aat_hotel_hotels_title', 'Nearby Hotels Heading', 'hotels_title'),

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

            aat_text('field_aat_hotel_specialist_title', 'Specialist Heading', 'specialist_title'),
            aat_textarea('field_aat_hotel_specialist_text', 'Specialist Copy', 'specialist_text', 3),
            aat_image('field_aat_hotel_specialist_photo', 'Specialist Photo', 'specialist_photo'),
            aat_text('field_aat_hotel_specialist_phone', 'Specialist Phone', 'specialist_phone'),
            aat_text('field_aat_hotel_specialist_button', 'Specialist Button', 'specialist_button'),
            aat_text('field_aat_hotel_specialist_link', 'Specialist Link', 'specialist_link'),

        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'hotel']]],
        'show_in_rest' => true,
    ]);

    /* ───────────────── GUIDES / THINGS TO DO / BLOG ───────────────── */
    aat_add_local_field_group([
        'key' => 'group_aat_editorial',
        'title' => 'Article Details',
        'fields' => [
            aat_tab('tab_aat_ed_hero', 'Hero & Content'),
            aat_image('field_aat_ed_hero', 'Hero Image', 'hero_image'),
            aat_text('field_aat_ed_minutes', 'Read Time (minutes)', 'read_minutes'),
            aat_textarea('field_aat_ed_intro', 'Intro / Excerpt (HTML)', 'intro_html', 3),
            aat_wysiwyg('field_aat_ed_left', 'Secondary Column', 'content_left'),
            aat_image('field_aat_ed_right_img', 'Secondary Image', 'content_right_image'),

            aat_tab('tab_aat_ed_sidebar', 'Sidebar & Further Reading'),
            [
                'key' => 'field_aat_ed_guides',
                'label' => 'Further Reading Articles (Chọn bài đọc thêm)',
                'name' => 'related_guides',
                'type' => 'post_object',
                'post_type' => ['travel_guide', 'thing_to_do', 'blog'],
                'multiple' => 1,
                'return_format' => 'id',
            ],

            aat_tab('tab_aat_ed_gallery', 'Gallery & Related Tours'),
            aat_repeater_field('field_aat_ed_gallery', 'Gallery', 'gallery', 'gallery'),
            aat_text('field_aat_ed_gallery_title', 'Gallery Heading', 'gallery_title'),
            [
                'key' => 'field_aat_ed_tours',
                'label' => 'Related Tours / Journeys',
                'name' => 'related_tours',
                'type' => 'post_object',
                'post_type' => ['tour'],
                'multiple' => 1,
                'return_format' => 'id',
            ],

            aat_tab('tab_aat_ed_plan', 'Plan Your Trip'),
            aat_wysiwyg('field_aat_ed_plan_desc', 'Plan Description', 'plan_description'),
            aat_wysiwyg('field_aat_ed_plan_html', 'Plan Block (HTML)', 'plan_html'),
            aat_wysiwyg('field_aat_ed_plan_bottom', 'Plan Footer', 'plan_footer'),
            aat_text('field_aat_ed_plan_title', 'Plan Heading', 'plan_title'),
            aat_text('field_aat_ed_further_title', 'Further Reading Heading', 'further_title'),
            /* The three sidebar headings that stood here - Popular Posts,
               Search, Social - belonged to a sidebar the article template no
               longer has. It carries a table of contents instead, so those
               three boxes asked an editor to write copy nothing would print. */
            aat_text('field_aat_ed_view_more_label', 'View More Label', 'view_more_label'),
            aat_text('field_aat_ed_view_more_link', 'View More Link', 'view_more_link'),
            aat_text('field_aat_ed_specialist_title', 'Specialist Heading', 'specialist_title'),
            aat_textarea('field_aat_ed_specialist_text', 'Specialist Copy', 'specialist_text', 3),
            aat_image('field_aat_ed_specialist_photo', 'Specialist Photo', 'specialist_photo'),
            aat_text('field_aat_ed_specialist_phone', 'Specialist Phone', 'specialist_phone'),
            aat_text('field_aat_ed_specialist_button', 'Specialist Button', 'specialist_button'),
            aat_text('field_aat_ed_specialist_link', 'Specialist Link', 'specialist_link'),
        ],
        'location' => [
            [['param' => 'post_type', 'operator' => '==', 'value' => 'travel_guide']],
            [['param' => 'post_type', 'operator' => '==', 'value' => 'thing_to_do']],
            [['param' => 'post_type', 'operator' => '==', 'value' => 'blog']],
            [['param' => 'post_type', 'operator' => '==', 'value' => 'trip']],
        ],
        'show_in_rest' => true,
    ]);

    /* ───────────────────────────── PAGES ───────────────────────────── */
    aat_add_local_field_group([
        'key' => 'group_aat_page',
        'title' => 'Page Hero & Directory',
        'fields' => [
            aat_image('field_aat_page_hero', 'Hero Image', 'hero_image'),
            aat_text('field_aat_page_eyebrow', 'Eyebrow / Subtitle', 'eyebrow'),
            aat_text('field_aat_page_tagline', 'Hero Tagline / Headline', 'hero_tagline'),
            aat_textarea('field_aat_page_desc', 'Page Description', 'page_description', 3),

            /* The five directory pages - All Destinations, Where to Stay,
               Cruises, Journeys, Travel Inspiration - are all `page` and share
               one shape: hero, a filtered list, a closing invitation. The list
               heading and the closing band were fixed English in five separate
               template files, so the same sentence appeared on pages an editor
               could not reach. One set of fields serves all five. */
            aat_tab('tab_aat_page_directory', 'Directory & CTA'),
            aat_text('field_aat_page_dir_eyebrow', 'Directory Eyebrow (HTML)', 'directory_eyebrow'),
            aat_text('field_aat_page_dir_head', 'Directory Headline', 'directory_headline'),
            aat_textarea('field_aat_page_dir_desc', 'Directory Description', 'directory_description', 3),
            aat_text('field_aat_page_cta_eyebrow', 'Closing CTA Eyebrow (HTML)', 'cta_eyebrow'),
            aat_text('field_aat_page_cta_head', 'Closing CTA Headline', 'cta_headline'),
            aat_textarea('field_aat_page_cta_desc', 'Closing CTA Description', 'cta_description', 3),
            aat_text('field_aat_page_cta_btn', 'Closing CTA Button', 'cta_button'),

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

            aat_tab('tab_aat_page_specialist', 'Travel Specialist'),
            aat_text('field_aat_page_specialist_title', 'Specialist Heading', 'specialist_title'),
            aat_textarea('field_aat_page_specialist_text', 'Specialist Text', 'specialist_text', 3),
            aat_image('field_aat_page_specialist_photo', 'Specialist Photo', 'specialist_photo'),
            aat_text('field_aat_page_specialist_phone', 'Specialist Phone', 'specialist_phone'),
            aat_text('field_aat_page_specialist_button', 'Specialist Button Label', 'specialist_button'),
            aat_text('field_aat_page_specialist_link', 'Specialist Button Link', 'specialist_link'),

            aat_tab('tab_aat_page_hubs', 'Directory Cards'),
            aat_repeater_field('field_aat_page_gallery', 'Page Gallery', 'gallery', 'gallery'),
            [
                'key' => 'field_aat_page_featured_tours',
                'label' => 'Featured Tours',
                'name' => 'featured_tours',
                'type' => 'post_object',
                'post_type' => ['tour'],
                'multiple' => 1,
                'return_format' => 'id',
            ],
            [
                'key' => 'field_aat_page_related_guides',
                'label' => 'Related Guides',
                'name' => 'related_guides',
                'type' => 'post_object',
                'post_type' => ['travel_guide', 'thing_to_do', 'blog'],
                'multiple' => 1,
                'return_format' => 'id',
            ],
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
    aat_add_local_field_group([
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
