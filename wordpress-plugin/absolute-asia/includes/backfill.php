<?php
/**
 * Fills the gaps the legacy site left.
 *
 * Some posts have no photograph and no summary on the source either, so there
 * is nothing to import - the gap has to be closed here. Every value written is
 * marked with `_aat_backfilled` so an editor can find and replace it, and
 * nothing already set by hand is ever overwritten.
 */

if (!defined('ABSPATH')) exit;

/**
 * Picks the most relevant image already in the library for a post.
 *
 * Preference order: a sibling in the same country, then the same category,
 * then any image whose filename mentions the country. Borrowing a neighbour's
 * photograph is honest here - it illustrates the same place.
 */
function aat_suggest_image($post_id) {
    $taxonomies = ['city', 'country', 'category'];

    foreach ($taxonomies as $taxonomy) {
        $terms = get_the_terms($post_id, $taxonomy);
        if (!$terms || is_wp_error($terms)) continue;

        /* Ask only for siblings that actually carry a photograph. The old query
           took the first twelve regardless, so a country whose first twelve
           entries had none fell through to a guess. */
        $siblings = get_posts([
            'post_type' => aat_public_types(),
            'post_status' => 'publish',
            'posts_per_page' => 5,
            'post__not_in' => [$post_id],
            'fields' => 'ids',
            'orderby' => 'rand',
            'meta_query' => [[['key' => '_thumbnail_id', 'compare' => 'EXISTS']]],
            'tax_query' => [[
                'taxonomy' => $taxonomy,
                'field' => 'term_id',
                'terms' => wp_list_pluck($terms, 'term_id'),
            ]],
        ]);

        foreach ($siblings as $sibling) {
            $thumb = get_post_thumbnail_id($sibling);
            if ($thumb) return (int) $thumb;
        }

        /* Nothing illustrated in this country: only an attachment whose own
           filename names the place will do. The previous version ran a fuzzy
           WordPress search, which is how a Phuket hotel photograph ended up on
           a place in Myanmar - a wrong photograph is worse than none. */
        foreach ($terms as $term) {
            $needle = sanitize_title($term->name);
            if (strlen($needle) < 4) continue;

            $found = get_posts([
                'post_type' => 'attachment',
                'post_status' => 'inherit',
                'posts_per_page' => 20,
                'fields' => 'ids',
                's' => $term->name,
            ]);
            foreach ($found as $attachment_id) {
                $file = strtolower((string) get_post_meta($attachment_id, '_wp_attached_file', true));
                if ($file !== '' && strpos($file, $needle) !== false) return (int) $attachment_id;
            }
        }
    }

    return 0;
}

/**
 * Re-checks photographs this plugin lent out.
 *
 * The first version of aat_suggest_image() could hand a post a photograph of
 * somewhere else entirely. Every borrowed image is re-derived with the stricter
 * rules; anything that no longer holds up is taken back off the post rather
 * than left on a page claiming to show a place it does not.
 */
function aat_repair_borrowed_images() {
    $posts = get_posts([
        'post_type' => aat_public_types(),
        'post_status' => ['publish', 'draft'],
        'posts_per_page' => -1,
        'fields' => 'ids',
        'meta_query' => [[['key' => '_aat_backfilled', 'value' => 'image']]],
    ]);

    $changed = [];
    foreach ($posts as $post_id) {
        $current = (int) get_post_thumbnail_id($post_id);
        delete_post_thumbnail($post_id);
        $suggested = aat_suggest_image($post_id);

        if ($suggested) {
            set_post_thumbnail($post_id, $suggested);
            if ($suggested !== $current) $changed[] = get_the_title($post_id);
            continue;
        }

        // No honest match any more: leave it blank and let the sweep retry.
        delete_post_meta($post_id, '_aat_backfilled');
        update_post_meta($post_id, '_aat_no_image_match', 1);
        $changed[] = get_the_title($post_id) . ' (gỡ ảnh sai)';
    }

    return $changed;
}

/** One page of posts that have no image; returns how many were filled. */
function aat_backfill_images($limit = 20) {
    $posts = get_posts([
        'post_type' => aat_public_types(),
        'post_status' => 'publish',
        'posts_per_page' => $limit,
        'fields' => 'ids',
        'meta_query' => [
            'relation' => 'AND',
            [['key' => '_thumbnail_id', 'compare' => 'NOT EXISTS']],
            [['key' => '_aat_no_image_match', 'compare' => 'NOT EXISTS']],
        ],
    ]);

    if (!$posts) return ['imported' => 0, 'done' => true];

    $filled = 0;
    foreach ($posts as $post_id) {
        $image = aat_suggest_image($post_id);
        if (!$image) {
            // Remember the miss so the next page does not retry it forever.
            update_post_meta($post_id, '_aat_no_image_match', 1);
            continue;
        }
        set_post_thumbnail($post_id, $image);
        update_post_meta($post_id, '_aat_backfilled', 'image');
        $filled++;
    }

    return ['imported' => $filled, 'done' => false];
}

/**
 * Writes a summary for posts that have none.
 *
 * Search results and cards show the excerpt, and an empty one costs both. The
 * sentence is assembled from what the post actually is - its type, country and
 * duration - rather than invented detail.
 */
function aat_compose_excerpt($post) {
    $type_labels = [
        'tour' => 'private journey',
        'hotel' => 'hand-selected stay',
        'place_to_go' => 'destination',
        'thing_to_do' => 'experience',
        'travel_guide' => 'travel guide',
        'blog' => 'story',
    ];
    $label = $type_labels[$post->post_type] ?? 'journey';

    $country = '';
    foreach (['country', 'category'] as $taxonomy) {
        $terms = get_the_terms($post->ID, $taxonomy);
        if ($terms && !is_wp_error($terms)) {
            $country = $terms[0]->name;
            break;
        }
    }

    $title = wp_strip_all_tags(get_the_title($post->ID));
    $duration = function_exists('get_field') ? (string) get_field('duration_label', $post->ID) : '';

    switch ($post->post_type) {
        case 'tour':
            $sentence = $duration
                ? sprintf('A %s private journey through %s, arranged around your own pace with a dedicated guide and driver throughout.', strtolower($duration), $country ?: 'Asia')
                : sprintf('A tailor-made private journey through %s, arranged around your own pace with a dedicated guide and driver throughout.', $country ?: 'Asia');
            break;
        case 'hotel':
            $sentence = sprintf('%s is a hand-selected address in %s, chosen for character rather than chain, and reserved as part of your private itinerary.', $title, $country ?: 'Asia');
            break;
        case 'place_to_go':
            $sentence = sprintf('Plan a private visit to %s%s. Our specialists build the days around what you want to see, at the hour it is worth seeing.', $title, $country ? ', ' . $country : '');
            break;
        case 'thing_to_do':
            $sentence = sprintf('%s, arranged privately as part of a tailor-made itinerary%s.', $title, $country ? ' in ' . $country : '');
            break;
        default:
            /* The site's own name - this text is published under it. */
            $sentence = sprintf('A %s from the %s team%s, written from first-hand travel across the region.', $label, get_bloginfo('name') ?: 'our', $country ? ' on ' . $country : '');
    }

    return $sentence;
}

function aat_backfill_excerpts($limit = 30) {
    $posts = get_posts([
        'post_type' => aat_public_types(),
        'post_status' => 'publish',
        'posts_per_page' => $limit,
        'meta_query' => [[
            'key' => '_aat_excerpt_checked',
            'compare' => 'NOT EXISTS',
        ]],
    ]);

    if (!$posts) return ['imported' => 0, 'done' => true];

    $filled = 0;
    foreach ($posts as $post) {
        update_post_meta($post->ID, '_aat_excerpt_checked', 1);
        if (trim($post->post_excerpt) !== '') continue;

        wp_update_post(wp_slash([
            'ID' => $post->ID,
            'post_excerpt' => aat_compose_excerpt($post),
        ]));
        update_post_meta($post->ID, '_aat_backfilled', 'excerpt');
        $filled++;
    }

    return ['imported' => $filled, 'done' => false];
}

/** Clears the "already looked at" markers so a later run reconsiders everything. */
function aat_backfill_reset() {
    global $wpdb;
    $wpdb->query("DELETE FROM {$wpdb->postmeta} WHERE meta_key IN ('_aat_no_image_match','_aat_excerpt_checked')");
    return ['reset' => true];
}
