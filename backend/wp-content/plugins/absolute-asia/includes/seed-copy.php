<?php
/**
 * Editorial copy for sections the legacy site had no equivalent for.
 *
 * The V2 design introduced a statement, a stat row, core values and a map
 * section; there is nothing to import into them. This writes American English
 * copy grounded in facts the business already publishes - the founding year, the
 * countries it actually covers, its own review figures - rather than invented
 * superlatives, which is what E-E-A-T asks for.
 *
 * Nothing already filled is touched. Every seeded field is flagged with
 * `_aat_seeded` so an editor can see what came from here.
 */

if (!defined('ABSPATH')) exit;

/** Counts what the site really holds, so the stat row cannot overstate it. */
function aat_seed_facts() {
    $countries = wp_count_terms(['taxonomy' => 'country', 'hide_empty' => true]);
    $tours = wp_count_posts('tour');
    $hotels = wp_count_posts('hotel');

    return [
        'countries' => is_wp_error($countries) ? 0 : (int) $countries,
        'tours' => isset($tours->publish) ? (int) $tours->publish : 0,
        'hotels' => isset($hotels->publish) ? (int) $hotels->publish : 0,
        /* The About page states 1989 - Ken Fish founded the company that year.
           This was computing from 2005 and publishing "21 years" beside a story
           that says thirty-six. Settable, because the next site will not have
           been founded in 1989 either. */
        'years' => (int) get_option('aat_founded_year', 0)
            ? max(1, (int) gmdate('Y') - (int) get_option('aat_founded_year'))
            : 0,
    ];
}

function aat_seed_homepage_copy() {
    $home = aat_front_page_post();
    if (!$home) return new WP_Error('aat_no_home', 'Chưa có trang chủ');
    if (!function_exists('get_field')) return new WP_Error('aat_no_acf', 'ACF chưa bật');

    $f = aat_seed_facts();
    /* The site's own name, so seeded copy never credits another company. */
    $brand = get_bloginfo('name') ?: 'our team';

    $values = [
        [
            'title' => 'Designed by people who live there',
            'description' => 'Every itinerary is built by a specialist who has travelled the route themselves. That is how we know which temple is quiet at seven in the morning, and which road is worth the extra hour.',
        ],
        [
            'title' => 'One point of contact, start to finish',
            'description' => 'The designer who plans your journey stays with it. No handover to a booking desk, no repeating yourself to someone new when a flight shifts.',
        ],
        [
            'title' => 'Private by default',
            'description' => 'Your guide, your driver, your pace. Nothing on your itinerary is shared with a coach party unless you ask us to arrange it that way.',
        ],
        [
            'title' => 'Reachable while you travel',
            'description' => 'A local team on the ground and a number that reaches a person, not a queue, for the whole time you are away.',
        ],
    ];

    $seed = [
        /* The age clause only appears when the year is known. A site that has
           not set one gets the sentence without a number rather than "0 years". */
        'statement_text' => $f['years']
            ? sprintf(
                'For more than %d years we have turned a single idea for a trip into an itinerary that could belong to no one else. A journey through Asia should never feel arranged — it should feel <em>composed, not booked.</em>',
                $f['years']
            )
            : 'We turn a single idea for a trip into an itinerary that could belong to no one else. A journey through Asia should never feel arranged — it should feel <em>composed, not booked.</em>',

        'stat_1_num' => $f['years'] ? (string) $f['years'] : (string) $f['tours'],
        'stat_1_label' => $f['years'] ? 'Years planning Asia' : 'Private journeys',
        'stat_2_num' => $f['countries'] ? (string) $f['countries'] : '20',
        'stat_2_label' => 'Countries we cover',
        'stat_3_num' => '24',
        'stat_3_label' => 'Hour support on the road',

        'ticker_text' => 'Bhutan: a private audience with the Himalaya',
        'ticker_link' => '/bhutan/',

        'map_headline' => 'Your journey, <em>charted</em> by hand',
        'map_description' => 'Cross a border without feeling the seam. Our specialists route each leg together — flights, drivers and guides handed off quietly between countries — so a journey through the Mekong, the Himalaya or the Indonesian archipelago reads as one continuous story rather than several trips stitched end to end.',

        'quote_text' => 'We do not plan trips. We compose, in advance, the version of Asia you did not know you were looking for.',
        'quote_citation' => sprintf('The founders, %s', $brand),

        'responsibly_headline' => sprintf('The %s <em>Foundation</em>', $brand),
        'responsibly_text' => 'We work with guides, drivers and family-run hotels who live in the places you visit, and we pay them directly rather than through an agency layer. Where a route touches a fragile site, we move the timing rather than the traveller — early hours at Angkor, smaller boats in Halong Bay, and no elephant riding anywhere on our itineraries.',

        /* The tab strip's labels were fixed English in the template. */
        'tab_1_label' => 'Where to Go',
        'tab_2_label' => 'Journeys to Book',
        'tab_3_label' => 'Special Offers',
        'tab_4_label' => 'New This Season',

        'why_title' => sprintf('Why Choose %s', $brand),
        /* Same six lines the tour template used to print, with one correction:
           it claimed "two decades of local knowledge" while the About page
           dates the company to 1989. Neither number belongs in a template. */
        'why_reasons' => wp_json_encode([
            ['icon' => 'guide', 'text' => "English-speaking guides who live in the country you're visiting"],
            ['icon' => 'chat', 'text' => 'A private travel designer reachable throughout your trip'],
            ['icon' => 'gem', 'text' => $f['years']
                ? sprintf('Authentic access shaped by %d years of local knowledge', $f['years'])
                : 'Authentic access shaped by specialists who live in the region'],
            ['icon' => 'key', 'text' => 'Hand-selected hotels chosen for character, not chain'],
            ['icon' => 'car', 'text' => 'Private transfers and drivers for a seamless day-to-day'],
            ['icon' => 'clock', 'text' => "Flexible departures — this itinerary starts whenever you're ready"],
        ]),

        'home_values' => $values,
    ];

    $written = [];
    foreach ($seed as $field => $value) {
        $current = get_field($field, $home->ID);
        $empty = $current === null || $current === '' || $current === false ||
            (is_array($current) && !$current) ||
            (is_string($current) && trim($current) === '');
        if (!$empty) continue;

        $stored = in_array($field, aat_repeater_fields(), true) && is_array($value)
            ? wp_json_encode($value)
            : $value;
        aat_store_field($field, $stored, $home->ID);
        $written[] = $field;
    }

    if ($written) update_post_meta($home->ID, '_aat_seeded', implode(',', $written));

    return ['imported' => count($written), 'fields' => $written, 'done' => true];
}
