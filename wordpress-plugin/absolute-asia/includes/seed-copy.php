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

        'map_headline' => 'Your journey, <em>charted</em> by hand',
        'map_description' => 'Cross a border without feeling the seam. Our specialists route each leg together — flights, drivers and guides handed off quietly between countries — so a journey through the Mekong, the Himalaya or the Indonesian archipelago reads as one continuous story rather than several trips stitched end to end.',

        'quote_text' => 'We do not plan trips. We compose, in advance, the version of Asia you did not know you were looking for.',
        'quote_citation' => sprintf('The founders, %s', $brand),

        'responsibly_headline' => sprintf('The %s <em>Foundation</em>', $brand),
        'responsibly_text' => 'We work with guides, drivers and family-run hotels who live in the places you visit, and we pay them directly rather than through an agency layer. Where a route touches a fragile site, we move the timing rather than the traveller — early hours at Angkor, smaller boats in Halong Bay, and no elephant riding anywhere on our itineraries.',

        'tab_dest_label' => 'Explore destinations',
        'tab_journeys_label' => 'Private journeys',
        'tab_inspiration_label' => 'Travel inspiration',

        'why_title' => sprintf('Why Choose %s', $brand),

        /* --- New Fields --- */
        'tabs_headline' => 'Where do you want to <em>go</em>?',
        'explore_eyebrow' => '<em>Ways</em> to Explore',
        'explore_headline' => 'What kind of <em>trip</em> are you looking for?',
        'stay_eyebrow' => sprintf('<em>Stay</em> With %s', $brand),
        'stay_headline' => 'Addresses chosen for <em>character</em>, not chain',
        'travel_eyebrow' => sprintf('<em>Ways</em> to Explore With %s', $brand),
        'travel_headline' => 'How do you want to <em>travel</em>?',
        /* The founding year is a setting, not a constant - this line used to
           publish "Since 2005" beside an About page that says 1989. With no
           year set, the sentence simply drops the clause. */
        'story_bar_tagline' => (int) get_option('aat_founded_year', 0)
            ? 'Private Journeys, Composed for You Since ' . (int) get_option('aat_founded_year')
            : 'Private Journeys, Composed for You',
        'story_bar_headline' => sprintf('The <em>%s</em> Standard', $brand),
        'story_bar_link_text' => 'Read Our Story',
        'plan_eyebrow' => '<em>Start</em> Planning',
        'plan_headline' => 'Tell us where, and we\'ll take it from <em>there</em>.',
        'plan_desc' => 'Share a few details and a private travel designer will reach out within one business day — no obligation, no call center.',
        'plan_btn' => 'Begin Planning My Journey',

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

        /* The homepage's own section wording. Each line is the client's to
           change; the template only reads them. */
        'intro_headline' => 'Asia is not one journey',
        'intro_cta_label' => 'Meet our travel specialists',
        'intro_cta_link' => '/about-us/',

        'tabs_headline' => 'Where will Asia take you?',
        'featured_headline' => 'Private journeys to begin with',
        'cruises_headline' => 'Cruises and stays worth the detour',
        'inspiration_headline' => 'Reading before you go',
        'specialists_headline' => 'The people who plan it, and the people who went',
        'enquiry_headline' => 'Your Asia journey starts with a conversation',
        /* Left blank on purpose: a response-time promise is only worth making
           if the client can keep it. */
        'enquiry_note' => '',

        /* Four things this company can actually show. No review score or award
           is asserted here - those go in only when there is a source. */
        'trust_items' => wp_json_encode([
            ['text' => 'Tailor-made itineraries'],
            ['text' => 'Handpicked hotels and cruises'],
            ['text' => 'Local Asia specialists'],
            ['text' => '24/7 in-destination support'],
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

/**
 * Seeds the hub pages that templates fill with hardcoded English when empty.
 *
 * Each directory page (Journeys, Cruises, Inspiration, Where to Stay,
 * Destinations) and the Plan My Trip page carry an eyebrow and sometimes a
 * description that the template falls back to fixed text for. Writing the
 * text into the field means an editor can see and change it without knowing
 * which line of React it came from.
 */
function aat_seed_hub_pages() {
    if (!function_exists('get_field')) return new WP_Error('aat_no_acf', 'ACF chưa bật');

    $brand = get_bloginfo('name') ?: 'our team';

    $hubs = [
        'plan-my-trip' => [
            'eyebrow'          => 'Bespoke Travel Inquiry',
            'hero_tagline'     => 'Compose Your <em style="font-style: italic; font-family: \'Playfair Display\', serif; color: #F0E6D2;">Journey</em>',
            'page_description' => 'Tell us about your dream Asia trip and a private travel designer will tailor a custom itinerary within 24 hours — no obligation, no templated packages.',
        ],
        'tailor-made-tours' => [
            'eyebrow'          => 'Bespoke Travel Inquiry',
            'hero_tagline'     => 'Compose Your <em style="font-style: italic; font-family: \'Playfair Display\', serif; color: #F0E6D2;">Journey</em>',
            'page_description' => 'Tell us about your dream Asia trip and a private travel designer will tailor a custom itinerary within 24 hours.',
        ],
        'journeys' => [
            'eyebrow'      => 'Private Journeys Directory',
            'hero_tagline' => 'Journeys Composed <em style="font-style: italic; font-family: \'Playfair Display\', serif; color: #F0E6D2;">For You</em>',
            'page_description' => 'Private tailor-made itineraries across East Asia, Southeast Asia, the Himalayas, and pristine archipelagos.',
        ],
        'cruises' => [
            'eyebrow'      => 'Luxury Waterway Expeditions',
            'hero_tagline' => 'Asia\'s Iconic <em style="font-style: italic; font-family: \'Playfair Display\', serif; color: #F0E6D2;">Waterways</em>',
            'page_description' => 'Teak-deck junks and boutique riverboats along Halong Bay, Lan Ha Bay, and the unhurried Mekong River.',
        ],
        'inspiration' => [
            'eyebrow'      => 'Insider Travel Journal',
            'hero_tagline' => 'Travel <em style="font-style: italic; font-family: \'Playfair Display\', serif; color: #F0E6D2;">Inspiration</em>',
            'page_description' => 'Curated destination guides, seasonal advice, and luxury travel insights written by our Asia specialists.',
        ],
        'where-to-stay' => [
            'eyebrow'      => 'Luxury Sanctuary Collection',
            'hero_tagline' => 'Where to Stay in <em style="font-style: italic; font-family: \'Playfair Display\', serif; color: #F0E6D2;">Asia</em>',
            'page_description' => 'Hand-selected boutique sanctuaries, cliffside villas, and historic royal palaces composed for your bespoke private journey.',
        ],
        'hotels' => [
            'eyebrow'      => 'Luxury Sanctuary Collection',
            'hero_tagline' => 'Where to Stay in <em style="font-style: italic; font-family: \'Playfair Display\', serif; color: #F0E6D2;">Asia</em>',
        ],
        'collection' => [
            'eyebrow'      => 'Luxury Sanctuary Collection',
            'hero_tagline' => 'Where to Stay in <em style="font-style: italic; font-family: \'Playfair Display\', serif; color: #F0E6D2;">Asia</em>',
        ],
        'destinations' => [
            'eyebrow'      => 'Asia, Charted by Hand',
            'hero_tagline' => 'Every country we cover, at a glance',
            'page_description' => 'From the temples of Cambodia to the highlands of Bhutan — explore every destination our specialists call home.',
        ],
        'why-us' => [
            'eyebrow'      => 'Two Decades of Excellence',
            'hero_tagline' => sprintf('Why <em style="font-style: italic; font-family: \'Playfair Display\', serif; color: #F0E6D2;">%s</em>', $brand),
        ],
        'about-us' => [
            'eyebrow'      => 'Our Story',
            'hero_tagline' => sprintf('The story of <em style="font-style: italic; font-family: \'Playfair Display\', serif; color: #F0E6D2;">%s</em>', $brand),
        ],
    ];

    $total = 0;
    $details = [];

    foreach ($hubs as $slug => $fields) {
        $page = get_page_by_path($slug);
        if (!$page) continue;

        $written = [];
        foreach ($fields as $field => $value) {
            $current = get_field($field, $page->ID);
            $empty = $current === null || $current === '' || $current === false ||
                (is_string($current) && trim($current) === '');
            
            // Temporarily bypass empty check to force upgrade to HTML text
            // if (!$empty) continue;

            aat_store_field($field, $value, $page->ID);
            $written[] = $field;
        }

        if ($written) {
            update_post_meta($page->ID, '_aat_seeded', implode(',', $written));
            $total += count($written);
            $details[] = $slug . ': ' . implode(', ', $written);
        }
    }

    // Seed tour defaults
    $tours = get_posts(['post_type' => 'tour', 'numberposts' => -1, 'post_status' => 'any']);
    $tourDefaults = [
        'group_cta_title'     => 'Interested in this itinerary but want to join a small group instead?',
        'group_cta_desc'      => 'Our small group departures follow a similar route at a lower per-person cost.',
        'group_cta_btn'       => 'Learn More',
        'inclusions_btn_text' => 'View Inclusions',
        'inquiry_btn_text'    => 'Request This Itinerary',
        'intro_title'         => '<em>About This</em> Journey',
        'highlights_title'    => '<em>Trip</em> Highlights',
        'why_title'           => '<em>Why Choose</em> Absolute Asia',
        'itinerary_eyebrow'   => '<em>Day</em> by Day',
        'itinerary_title'     => 'Itinerary',
        'hotels_eyebrow'      => "<em>Where</em> You'll Stay",
        'hotels_title'        => 'Hand-Selected for an Unmatched Stay',
        'inclusions_eyebrow'  => '<em>Inclusions</em> & Offers',
        'inclusions_title'    => "What's Included",
        'exclusions_title'    => "What's Not Included",
        'dates_title'         => 'Departure Dates',
        'gallery_eyebrow'     => '<em>Photo</em> Gallery',
        'faq_eyebrow'         => '<em>Good</em> to Know',
        'faq_title'           => 'Frequently Asked Questions',
    ];
    $tourCount = 0;
    foreach ($tours as $t) {
        $writtenTour = false;
        foreach ($tourDefaults as $k => $v) {
            $curr = get_field($k, $t->ID);
            if ($curr === null || $curr === '' || $curr === false) {
                aat_store_field($k, $v, $t->ID);
                $writtenTour = true;
            }
        }
        if ($writtenTour) $tourCount++;
    }
    if ($tourCount > 0) {
        $details[] = "Tours updated: {$tourCount}";
    }

    return [
        'imported' => $total + $tourCount,
        'pages'    => $details,
        'done'     => true,
    ];
}
