<?php
/**
 * Write the front end's own defaults into the fields that hold them.
 *
 * Most section headings on this site are not stored anywhere. The template
 * reads its ACF field, finds it empty, and renders a string compiled into the
 * bundle instead — so the page looks finished while the WordPress field beside
 * it sits blank, and editing it does nothing until somebody first types the
 * exact words back in. An audit of all 643 records found this on 38 fields
 * across five post types.
 *
 * The values below were extracted from the templates rather than retyped, so
 * seeding changes nothing on screen. What it changes is that the words are now
 * in the database, visible in the editor, and editable.
 *
 * Never overwrites: a field with anything in it is left alone.
 */

if (!defined('ABSPATH')) exit;

/**
 * field => default, grouped by the post type whose template renders it.
 *
 * Keep in step with the templates. If a default changes there and not here,
 * seeding writes the old wording into the database and it becomes the live
 * one, which is worse than leaving the field empty.
 */
function aat_frontend_defaults() {
    return [
        'homepage' => [
            'tabs_headline'         => 'Where will Asia take you?',
            'tab_dest_label'        => 'Explore destinations',
            'tab_journeys_label'    => 'Private journeys',
            'tab_inspiration_label' => 'Travel inspiration',
            'featured_eyebrow'      => '<em>Private</em> Journeys',
            'featured_headline'     => 'Private journeys to begin with',
            'stay_headline'         => 'Cruises and stays worth the detour',
            'inspiration_headline'  => 'Reading before you go',
            'intro_headline'        => 'Asia is not one journey',
            'intro_cta_link'        => '/about-us/',
            'map_headline'          => 'Your journey, <em>charted</em> by hand',
            'specialists_headline'  => 'The people who plan it',
            'story_bar_tagline'     => 'Private Journeys, Composed for You',
            'story_bar_link_text'   => 'Read Our Story',
            'plan_eyebrow'          => '<em>Start</em> Planning',
            'plan_headline'         => 'Your Asia journey starts with a conversation',
            'plan_btn'              => 'Begin Planning My Journey',
            'plan_desc'             => 'Share a few details and a private travel designer will reach out within one business day — no obligation, no call center.',
        ],
        'tour' => [
            'highlights_title'    => '<em>Trip</em> Highlights',
            'itinerary_title'     => 'Itinerary',
            'inclusions_title'    => "What's Included",
            'exclusions_title'    => "What's Not Included",
            'inclusions_btn_text' => 'View Inclusions',
            'inquiry_btn_text'    => 'Request This Itinerary',
            'dates_title'         => 'Departure Dates',
            'gallery_title'       => 'Scenes from the Journey',
            'faq_title'           => 'Frequently Asked Questions',
            'options_title'       => 'Accommodation Options',
            'related_tours_title' => 'Related Private Journeys',
            'group_cta_title'     => 'Interested in this itinerary but want to join a small group instead?',
            'group_cta_desc'      => 'Our small group departures follow a similar route at a lower per-person cost.',
            'group_cta_btn'       => 'Learn More',
        ],
        'hotel' => [
            'in_brief_title' => 'In Brief',
            'location_title' => 'Location & Places Nearby',
        ],
        'editorial' => [
            'further_title'   => 'Further Reading',
            'gallery_title'   => 'From the journey',
            'view_more_label' => 'Start Planning',
            'view_more_link'  => '/plan-my-trip/',
        ],
    ];
}

/**
 * The "Speak to a specialist" panel, which renders on five different post
 * types from one shared component and so has one set of defaults.
 */
function aat_specialist_defaults() {
    return [
        'specialist_title'  => 'Speak to a Travel Specialist',
        'specialist_text'   => 'Every journey is private, tailor-made, and planned around your pace, interests, and preferred style of travel. Connect with a destination specialist to begin designing your itinerary.',
        'specialist_button' => 'Plan Your Trip',
        'specialist_link'   => '/plan-my-trip/#form',
    ];
}

/** WordPress post types behind each contract type name. */
function aat_defaults_post_types() {
    return [
        'tour'      => ['tour'],
        'hotel'     => ['hotel'],
        'editorial' => ['post', 'blog', 'travel_guide', 'thing_to_do'],
    ];
}

/** Post types that render the specialist panel. */
function aat_specialist_post_types() {
    return ['tour', 'hotel', 'place_to_go', 'travel_guide', 'thing_to_do', 'trip'];
}

function aat_seed_frontend_defaults() {
    if (!function_exists('get_field')) return new WP_Error('aat_no_acf', 'ACF chưa bật');

    $written = 0;
    $details = [];

    $blank = function ($value) {
        return $value === null || $value === false || $value === ''
            || (is_string($value) && trim($value) === '');
    };

    $apply = function ($post_id, array $pairs) use (&$written, $blank) {
        $n = 0;
        foreach ($pairs as $field => $value) {
            if (!$blank(get_field($field, $post_id))) continue;
            aat_store_field($field, $value, $post_id);
            $n++;
        }
        $written += $n;
        return $n;
    };

    $defaults = aat_frontend_defaults();

    /* The homepage is a single page, found the way the REST layer finds it. */
    $front = (int) get_option('page_on_front');
    if ($front) {
        $n = $apply($front, $defaults['homepage']);
        $details[] = sprintf('trang chủ: %d field', $n);
    } else {
        $details[] = 'trang chủ: chưa đặt Trang tĩnh ở Settings → Reading, bỏ qua';
    }

    foreach (aat_defaults_post_types() as $key => $types) {
        $posts = get_posts([
            'post_type'      => $types,
            'post_status'    => 'any',
            'posts_per_page' => -1,
            'fields'         => 'ids',
        ]);
        $touched = 0;
        foreach ($posts as $id) if ($apply($id, $defaults[$key])) $touched++;
        $details[] = sprintf('%s: %d/%d bản ghi', $key, $touched, count($posts));
    }

    $specialist = aat_specialist_defaults();
    $posts = get_posts([
        'post_type'      => aat_specialist_post_types(),
        'post_status'    => 'any',
        'posts_per_page' => -1,
        'fields'         => 'ids',
    ]);
    $touched = 0;
    foreach ($posts as $id) if ($apply($id, $specialist)) $touched++;
    $details[] = sprintf('khối "Speak to a specialist": %d/%d bản ghi', $touched, count($posts));

    return [
        'imported' => $written,
        'done'     => true,
        'details'  => array_merge(
            [sprintf('Đã ghi %d ô đang trống. Không ô nào có sẵn nội dung bị đè.', $written)],
            $details
        ),
    ];
}
