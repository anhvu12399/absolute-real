<?php
/**
 * Turn the auto-filled card strips into rows you can actually edit.
 *
 * Every card table on this site says "auto-filled if empty", and it means it:
 * leave the table blank and the page picks the newest matching records itself.
 * That is a sensible default and a poor editing experience — the page shows six
 * cards, the table shows nothing, and there is no way to change one of them
 * without first working out what all six were and typing them in.
 *
 * This writes out exactly what the page is already showing, as rows. Nothing
 * changes on screen; what changes is that the choice is now visible and
 * editable. Tables that already have rows are left alone.
 */

if (!defined('ABSPATH')) exit;

/** One card row, in the shape the repeater UI and the templates agree on. */
function aat_card_row($post_id, $badge = null) {
    $card = aat_card_payload($post_id);
    if (!$card) return null;

    return [
        'image_url'   => $card['featuredMedia']['url'] ?? '',
        'badge'       => $badge !== null ? $badge : ($card['categories'][0]['name'] ?? ''),
        'title'       => $card['title'],
        'meta'        => $card['duration'],
        'description' => aat_card_description($post_id, $card),
        'link'        => $card['path'],
        'link_text'   => 'Explore',
    ];
}

/** Newest published records of the given types, as card rows. */
function aat_card_rows_of($types, $limit, $badge = null, $extra = []) {
    $ids = get_posts(array_merge([
        'post_type'      => $types,
        'post_status'    => 'publish',
        'posts_per_page' => $limit,
        'fields'         => 'ids',
        'orderby'        => 'date',
        'order'          => 'DESC',
    ], $extra));

    $rows = [];
    foreach ($ids as $id) {
        $row = aat_card_row($id, $badge === 'auto' ? (get_post_type($id) === 'blog' ? 'Story' : 'Guide') : $badge);
        if ($row) $rows[] = $row;
    }
    return $rows;
}

/**
 * The destinations tab, which is built from countries rather than from posts.
 *
 * A country's photograph lives on the term; where one was never chosen, the
 * newest illustrated post filed under it lends its own.
 */
function aat_country_card_rows($limit = 6) {
    $terms = get_terms(['taxonomy' => 'country', 'hide_empty' => true, 'number' => $limit, 'orderby' => 'count', 'order' => 'DESC']);
    if (is_wp_error($terms)) return [];

    $rows = [];
    foreach ($terms as $term) {
        $image = (string) get_term_meta($term->term_id, 'image', true);

        if ($image === '') {
            $posts = get_posts([
                'post_type'      => aat_public_types(),
                'post_status'    => 'publish',
                'posts_per_page' => 8,
                'fields'         => 'ids',
                'tax_query'      => [['taxonomy' => 'country', 'field' => 'term_id', 'terms' => $term->term_id]],
            ]);
            foreach ($posts as $id) {
                $thumb = get_post_thumbnail_id($id);
                if ($thumb) { $image = (string) wp_get_attachment_url($thumb); break; }
            }
        }

        /* The front end addresses a country as /vietnam/, not by WordPress's
           own term archive at /country/vietnam/. Writing the archive URL here
           produced six rows the homepage filtered straight back out, so the
           tab kept showing the auto-filled list and editing the table did
           nothing visible. */
        $link = '/' . $term->slug . '/';

        $rows[] = [
            'image_url'   => $image,
            'badge'       => '',
            'title'       => html_entity_decode($term->name, ENT_QUOTES, 'UTF-8'),
            'meta'        => sprintf('%d journeys & places', (int) $term->count),
            'description' => trim(wp_strip_all_tags((string) $term->description)),
            'link'        => (string) wp_parse_url($link, PHP_URL_PATH),
            'link_text'   => 'Explore',
        ];
    }
    return $rows;
}

/** True when a repeater holds no usable rows. */
function aat_table_is_empty($field, $post_id) {
    $raw = get_field($field, $post_id);
    if (is_array($raw)) return count($raw) === 0;
    if (!is_string($raw) || trim($raw) === '') return true;
    $rows = json_decode($raw, true);
    return !is_array($rows) || count($rows) === 0;
}

/**
 * Repair rows whose description is a bare URL.
 *
 * Several legacy posts carry their own permalink in the excerpt field, and the
 * card builder published that as the card's description. Rewrites only those
 * cells, leaving every other value in the row untouched.
 */
function aat_repair_card_urls($field, $post_id) {
    $raw = get_field($field, $post_id);
    if (!is_string($raw) || trim($raw) === '') return 0;

    $rows = json_decode($raw, true);
    if (!is_array($rows)) return 0;

    $fixed = 0;
    foreach ($rows as $i => $row) {
        if (!is_array($row)) continue;

        /* Country rows written with WordPress's term archive path. */
        $link = (string) ($row['link'] ?? '');
        if (preg_match('#^/country/([a-z0-9-]+)/?$#i', $link, $m)) {
            $rows[$i]['link'] = '/' . strtolower($m[1]) . '/';
            $fixed++;
        }

        $desc = trim((string) ($row['description'] ?? ''));
        if ($desc === '' || strpos($desc, ' ') !== false) continue;
        if (!preg_match('#^(https?://|www\.)\S+$#i', $desc)) continue;

        /* Recover the post the card points at and use its opening instead. */
        $path = (string) ($row['link'] ?? '');
        $id = $path !== '' ? url_to_postid(home_url($path)) : 0;
        $replacement = '';
        if ($id) {
            $card = aat_card_payload($id);
            if ($card) $replacement = aat_card_description($id, $card);
        }

        $rows[$i]['description'] = $replacement;
        $fixed++;
    }

    if ($fixed) aat_store_field($field, wp_json_encode($rows), $post_id);
    return $fixed;
}

function aat_seed_card_tables() {
    if (!function_exists('get_field')) return new WP_Error('aat_no_acf', 'ACF chưa bật');

    $written = 0;
    $repaired = 0;
    $details = [];

    /* The front page is a record in the private `homepage` CPT, not the page
       named in Settings → Reading. Reading the option instead finds nothing on
       this install and the whole homepage section is skipped in silence. */
    $home_post = aat_front_page_post();
    $front = $home_post ? (int) $home_post->ID : 0;
    if (!$front) {
        $details[] = 'Không tìm thấy bản ghi trang chủ, bỏ qua phần trang chủ.';
    } else {
        $home = [
            'home_tab_destinations' => ['rows' => aat_country_card_rows(6),                        'label' => 'Destinations Tab Cards'],
            'home_tab_journeys'     => ['rows' => aat_card_rows_of(['tour'], 6),                   'label' => 'Journeys Tab Cards'],
            'home_tab_inspiration'  => ['rows' => aat_card_rows_of(['travel_guide', 'blog', 'post'], 6, 'auto'), 'label' => 'Inspiration Tab Cards'],
            'home_editorial'        => ['rows' => aat_card_rows_of(['travel_guide', 'blog', 'post'], 3, 'auto'), 'label' => 'Inspiration Strip Cards'],
        ];

        foreach ($home as $field => $spec) {
            if (!aat_table_is_empty($field, $front)) {
                $n = aat_repair_card_urls($field, $front);
                $repaired += $n;
                $details[] = sprintf('%s: đã có dòng, giữ nguyên%s', $spec['label'], $n ? " (sửa {$n} ô description là URL)" : '');
                continue;
            }
            if (!$spec['rows']) { $details[] = $spec['label'] . ': không tìm được bản ghi nào để ghi'; continue; }
            aat_store_field($field, wp_json_encode($spec['rows']), $front);
            $written += count($spec['rows']);
            $details[] = sprintf('%s: ghi %d dòng', $spec['label'], count($spec['rows']));
        }
    }

    /* Every destination page carries its own "Read Before You Go" strip. */
    $places = get_posts([
        'post_type'      => 'place_to_go',
        'post_status'    => 'publish',
        'posts_per_page' => -1,
        'fields'         => 'ids',
    ]);
    $touched = 0;
    foreach ($places as $place_id) {
        if (!aat_table_is_empty('guides_cards', $place_id)) {
            $repaired += aat_repair_card_urls('guides_cards', $place_id);
            continue;
        }

        /* Guides sharing this destination's country, newest first. */
        $countries = wp_get_post_terms($place_id, 'country', ['fields' => 'ids']);
        $args = [];
        if (!is_wp_error($countries) && $countries) {
            $args['tax_query'] = [['taxonomy' => 'country', 'field' => 'term_id', 'terms' => $countries]];
        }
        $rows = aat_card_rows_of(['travel_guide', 'blog', 'post'], 6, 'auto', $args);
        if (!$rows) $rows = aat_card_rows_of(['travel_guide', 'blog', 'post'], 6, 'auto');
        if (!$rows) continue;

        aat_store_field('guides_cards', wp_json_encode($rows), $place_id);
        $written += count($rows);
        $touched++;
    }
    $details[] = sprintf('Guides Cards trên trang điểm đến: ghi %d/%d trang', $touched, count($places));

    return [
        'imported' => $written,
        'done'     => true,
        'details'  => array_merge([
            sprintf('Ghi %d dòng thẻ, sửa %d ô description là URL. Bảng đã có dòng thì không đụng.', $written, $repaired),
        ], $details),
    ];
}
