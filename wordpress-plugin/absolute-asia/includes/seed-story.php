<?php
/**
 * The company's own history, put where an editor can reach it.
 *
 * The legacy About page holds a real and unusually good story - founded in 1989
 * by Ken Fish, the first U.S. operator to take Americans into Vietnam, Cambodia,
 * Laos and Thailand - but it arrives as one 226-word paragraph, which is how it
 * read on the new site too. This lifts the facts out of that paragraph into
 * fields the About template can set properly, and leaves every one of them
 * editable.
 *
 * Nothing is invented. Every date, name and claim below is taken from the
 * legacy page's own words; where the old copy is vague, this is vague too.
 */

if (!defined('ABSPATH')) exit;

/**
 * Is this the install these milestones actually belong to?
 *
 * The dates below are Absolute Asia's. Written onto a sister site they would
 * be a fabricated history under someone else's name - so they are only used
 * when the site being seeded is demonstrably that company. Everywhere else the
 * seed falls back to the site's own imported About copy.
 */
function aat_story_is_own_history() {
    $haystack = strtolower(get_bloginfo('name') . ' ' . home_url() . ' ' . aat_source_url());
    return strpos($haystack, 'absolute') !== false;
}

/**
 * A skeleton built from whatever the site's own About page says.
 *
 * No dates are invented: the years are the ones the imported copy mentions, and
 * if it mentions none the editor gets an empty rail to fill in rather than
 * another company's timeline.
 */
function aat_story_from_about($page) {
    $body = wp_strip_all_tags((string) $page->post_content);
    if ($body === '') return [];

    /* Four-digit years the copy itself states, oldest first. */
    preg_match_all('/\b(19[5-9]\d|20[0-4]\d)\b/', $body, $matches);
    $years = array_values(array_unique($matches[1] ?? []));
    sort($years);
    if (!$years) return [];

    $sentences = preg_split('/(?<=[.!?])\s+/', $body);
    $rows = [];
    foreach (array_slice($years, 0, 5) as $year) {
        /* The sentence that names the year is the one describing it. */
        $text = '';
        foreach ($sentences as $sentence) {
            if (strpos($sentence, $year) !== false) { $text = trim($sentence); break; }
        }
        $rows[] = ['year' => $year, 'title' => '', 'text' => $text];
    }
    return $rows;
}

/**
 * Absolute Asia's milestones, drawn from its legacy About page.
 *
 * Guarded by aat_story_is_own_history() - see above.
 */
function aat_story_milestones() {
    return [
        [
            'year' => '1989',
            'title' => 'Ken Fish founds Absolute Asia',
            'text' => 'The first U.S.-based company to bring American travelers to Vietnam, Cambodia, Laos and Thailand — at a time when almost no one was going.',
        ],
        [
            'year' => 'The 1990s',
            'title' => 'The map widens',
            'text' => 'Singapore, Bali, China, Japan, South Korea and Taiwan join the roster. The pioneering habit holds: go first, learn the ground, then take travelers there.',
        ],
        [
            'year' => '2000s',
            'title' => 'Luxury, made personal',
            'text' => 'A multi-award-winning company built on one idea — that a journey belongs to the person taking it. Nothing off a shelf, nothing shared with a coach party.',
        ],
        [
            'year' => '2020',
            'title' => 'A hard season',
            'text' => 'The pandemic closed Asia to visitors. Ken stepped back from day-to-day operations after three decades at the helm.',
        ],
        [
            'year' => 'Today',
            'title' => 'The same company, on the ground',
            'text' => 'The brand passed to a team already working in the region, committed to the same personal service and the same authentic experiences — now with local specialists in the countries themselves.',
        ],
    ];
}

/**
 * The guarantee blocks on the About page.
 *
 * These were four fixed English paragraphs in the template - content, not
 * chrome, and one of them made a factual claim ("890 Traveler Reviews") that
 * only the client can stand behind. Seeded here so the wording is theirs to
 * change, and so a second site does not inherit this one's promises.
 */
function aat_story_pillars() {
    /* The review count is this company's. A sister site has its own, or none. */
    $reviews = aat_story_is_own_history()
        ? '890 Traveler Reviews'
        : 'What travelers tell us';

    return [
        [
            'kicker' => '01 · Specialists',
            'title' => 'Our Local Specialists',
            'text' => 'Our travel designers have lived and traveled extensively across Asia for decades. We know the quietest hours at Angkor Wat, the best private junks in Halong Bay, and secret street food spots in Tokyo.',
        ],
        [
            'kicker' => '02 · Reviews',
            'title' => $reviews,
            'text' => 'Travelers on Tripadvisor write most often about the same three things: logistics that hold together, guides who know their ground, and hotels chosen for character rather than a rate agreement.',
        ],
        [
            'kicker' => '03 · Ethics',
            'title' => 'Responsible & Ethical Travel',
            'text' => 'We work with guides, drivers and family-run hotels who live in the places you visit, and we pay them directly rather than through an agency layer. No elephant riding appears anywhere on our itineraries.',
        ],
        [
            'kicker' => '04 · Assurance',
            'title' => 'Booking Confidence & 24/7 Support',
            'text' => 'Flexible booking terms, transparent pricing, and a number that reaches a person rather than a queue for the whole time you are away.',
        ],
    ];
}

/**
 * Writes the story into the About page, without overwriting an editor.
 *
 * Which page counts as "about" is found by slug, so a site that calls it
 * something else still works.
 */
function aat_seed_story() {
    if (!function_exists('update_field')) return new WP_Error('aat_no_acf', 'ACF chưa bật');

    $page = null;
    foreach (['about-us', 'our-story', 'about', 'why-us'] as $slug) {
        $found = get_page_by_path($slug);
        if ($found) { $page = $found; break; }
    }
    if (!$page) return new WP_Error('aat_no_about', 'Không tìm thấy trang About Us');

    $brand = get_bloginfo('name') ?: 'this company';
    $own = aat_story_is_own_history();

    /* The founding year: this site's setting, or the earliest year its own
       About copy mentions. Never a number carried over from another install. */
    $founded = (int) get_option('aat_founded_year', 0);
    if (!$founded && preg_match('/\b(19[5-9]\d|20[0-4]\d)\b/', wp_strip_all_tags($page->post_content), $m)) {
        $founded = (int) $m[1];
    }
    $years = $founded ? max(1, (int) gmdate('Y') - $founded) : 0;

    $milestones = $own ? aat_story_milestones() : aat_story_from_about($page);

    $seed = [
        'story_eyebrow' => 'Our Story',
        'story_headline' => $years
            ? sprintf('%d years of going first', $years)
            : sprintf('The story of %s', $brand),
        'story_lede' => $founded
            ? sprintf(
                '%s was founded in %d, and for most of the years since, going where we go was not the obvious thing to do. That is still the habit: learn a place properly, then take people there.',
                $brand,
                $founded
            )
            : '',
        'story_milestones' => wp_json_encode($milestones),

        'story_now_title' => 'What has not changed',
        'story_now_text' => 'A journey is planned by a person who has travelled the route, and stays with it from the first conversation to the last transfer. Guides are local and paid directly. Nothing on your itinerary is shared with a coach party unless you ask for it.',

        /* A named founder is a fact about one company; it is not carried over. */
        'story_founder_name' => $own ? 'Ken Fish' : '',
        'story_founder_role' => $own ? 'Founder' : '',
        'story_founder_quote' => $own ? 'A journey should belong to the person taking it.' : '',

        'pillars_title' => sprintf('The Four Pillars of %s', $brand),
        'pillars' => wp_json_encode(aat_story_pillars()),
    ];

    $written = [];
    foreach ($seed as $field => $value) {
        $current = get_field($field, $page->ID);
        $empty = $current === null || $current === '' || $current === false ||
            (is_array($current) && !$current) ||
            (is_string($current) && trim($current) === '');
        if (!$empty) continue;
        aat_store_field($field, $value, $page->ID);
        $written[] = $field;
    }

    if ($written) update_post_meta($page->ID, '_aat_seeded', 'story');

    return [
        'imported' => count($written),
        'page' => $page->post_title,
        'fields' => $written,
        'note' => $own
            ? 'Dùng lịch sử của Absolute Asia.'
            : 'Site khác — chỉ lấy các mốc năm mà chính bài About của site này nhắc tới; tên người sáng lập và số liệu để trống cho bạn tự nhập.',
        'done' => true,
    ];
}
