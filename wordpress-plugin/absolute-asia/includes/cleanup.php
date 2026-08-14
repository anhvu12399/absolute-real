<?php
/**
 * Corrections the legacy database needs before it can be published.
 *
 * Two separate things, deliberately kept apart:
 *
 * 1. Links. Imported articles link out to a sister agency's domain with
 *    target="_blank", and those paths mirror this site's own. They are pulled
 *    back in-house on every import: the reader stays here and the link equity
 *    stays here. Which domains count is configured - see aat_foreign_brands().
 *
 * 2. The name itself. That agency is also named inside customer reviews, where
 *    it describes who the traveler dealt with. Rewriting a quote would falsify
 *    it, so the name is only ever changed by an explicit run of
 *    aat_rebrand_run(), and never in a field that holds quoted words.
 */

if (!defined('ABSPATH')) exit;

/**
 * Names and hosts belonging to another operator, as they appear in imported copy.
 *
 * Configured rather than fixed: a second site built on this plugin imports from
 * a different legacy install whose articles link somewhere else entirely, and
 * hunting for this brand's sister agency there would find nothing while missing
 * the one that matters. Set on the import screen; the defaults are what the
 * first install needed.
 */
function aat_foreign_brands() {
    $names = array_filter(array_map('trim', explode(',', (string) get_option('aat_foreign_names', 'My Way Travel'))));
    $hosts = array_filter(array_map('trim', explode(',', (string) get_option('aat_foreign_hosts', 'mywaytravel.com'))));

    /* Case and spacing vary in hand-written copy. */
    $variants = [];
    foreach ($names as $name) {
        $variants[] = $name;
        $variants[] = str_replace(' ', '', $name);
        $variants[] = strtoupper($name);
    }

    return ['names' => array_values(array_unique($variants)), 'hosts' => array_values($hosts)];
}

add_action('admin_post_aat_save_foreign', function () {
    if (!current_user_can('manage_options')) wp_die('Không đủ quyền');
    check_admin_referer('aat_save_foreign');
    update_option('aat_foreign_names', sanitize_text_field(wp_unslash($_POST['aat_foreign_names'] ?? '')), false);
    update_option('aat_foreign_hosts', sanitize_text_field(wp_unslash($_POST['aat_foreign_hosts'] ?? '')), false);
    wp_safe_redirect(add_query_arg('aat_foreign', 'saved', admin_url('admin.php?page=aat-import')));
    exit;
});

/** The two fields, rendered on the import screen. */
function aat_foreign_field() {
    ?>
    <p><strong>Tên và tên miền của công ty khác</strong> xuất hiện trong bài viết web cũ.
       Link tới các tên miền này được kéo về nội bộ mỗi lần import; tên thì chỉ đổi khi bạn
       bấm nút bên dưới. Cách nhau bằng dấu phẩy.</p>
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <input type="hidden" name="action" value="aat_save_foreign">
        <?php wp_nonce_field('aat_save_foreign'); ?>
        <p><label>Tên<br>
            <input type="text" name="aat_foreign_names" class="large-text"
                   value="<?php echo esc_attr(get_option('aat_foreign_names', 'My Way Travel')); ?>"></label></p>
        <p><label>Tên miền<br>
            <input type="text" name="aat_foreign_hosts" class="large-text"
                   value="<?php echo esc_attr(get_option('aat_foreign_hosts', 'mywaytravel.com')); ?>"></label></p>
        <p><button class="button">Lưu</button>
        <?php if (isset($_GET['aat_foreign'])) : ?><span style="color:#008a20;margin-left:8px">Đã lưu</span><?php endif; ?></p>
    </form>
    <?php
}

/**
 * Fields that carry somebody else's words.
 *
 * A review is a record of what a traveler wrote. It gets copied verbatim or not
 * at all.
 */
function aat_quoted_fields() {
    return ['testimonials', 'reviews', 'quote_text', 'quote_citation'];
}

/**
 * Brings off-site links home, and optionally renames the sister agency.
 *
 * Link handling always runs. The name is only replaced when `$rename` is true,
 * which is the explicit admin pass - never the import.
 */
function aat_rebrand_text($text, $rename = false) {
    if (!is_string($text) || $text === '') return $text;
    $brands = aat_foreign_brands();

    foreach ($brands['hosts'] as $host) {
        $quoted = preg_quote($host, '#');

        $text = preg_replace_callback(
            '#href=(["\'])https?://(?:www\.)?' . $quoted . '([^"\']*)\1#i',
            function ($m) { return 'href=' . $m[1] . ($m[2] !== '' ? $m[2] : '/') . $m[1]; },
            $text
        );

    }

    // An anchor that now points at a path of our own should not open a new tab.
    $text = preg_replace_callback(
        '#<a\b[^>]*>#i',
        function ($m) {
            $tag = $m[0];
            if (!preg_match('#href=(["\'])(/[^"\']*)\1#i', $tag)) return $tag;
            $tag = preg_replace('#\s+target=(["\'])_blank\1#i', '', $tag);
            $tag = preg_replace('#\s+rel=(["\'])[^"\']*noopener[^"\']*\1#i', '', $tag);
            return $tag;
        },
        $text
    );

    if ($rename) {
        /* This site's own name - the rename must not hard-code the first site
           this plugin was written for. */
        $replacement = get_bloginfo('name') ?: 'our team';
        foreach ($brands['names'] as $name) {
            $text = str_ireplace($name, $replacement, $text);
        }
    }

    return $text;
}

/** True when the string still carries anything belonging to the old brand. */
function aat_has_foreign_brand($text) {
    if (!is_string($text) || $text === '') return false;
    $brands = aat_foreign_brands();
    foreach (array_merge($brands['names'], $brands['hosts']) as $needle) {
        if (stripos($text, $needle) !== false) return true;
    }
    return false;
}

/**
 * Rewrites one post in place: title, body, excerpt and every meta value.
 *
 * Repeaters are stored as JSON strings, and the replacements introduce no
 * quotes or backslashes, so a plain string pass over the JSON stays valid.
 */
function aat_rebrand_post($post_id) {
    $post = get_post($post_id);
    if (!$post) return 0;
    $changed = 0;

    $update = ['ID' => $post_id];
    foreach (['post_title' => $post->post_title, 'post_content' => $post->post_content, 'post_excerpt' => $post->post_excerpt] as $field => $value) {
        $rewritten = aat_rebrand_text($value, true);
        if ($rewritten !== $value) {
            $update[$field] = wp_slash($rewritten);
            $changed++;
        }
    }
    if (count($update) > 1) wp_update_post($update);

    $quoted = aat_quoted_fields();
    foreach (get_post_meta($post_id) as $key => $values) {
        if ($key === '' || $key[0] === '_') continue;
        // Reviews keep the traveler's own words, including the agency they name.
        $rename = !in_array($key, $quoted, true);
        foreach ($values as $value) {
            if (!is_string($value)) continue;
            $rewritten = aat_rebrand_text($value, $rename);
            if ($rewritten === $value) continue;
            update_post_meta($post_id, $key, wp_slash($rewritten), $value);
            $changed++;
        }
    }

    update_post_meta($post_id, '_aat_rebranded', gmdate('c'));
    return $changed;
}

/** Batches the rewrite so a large library does not time out. */
function aat_rebrand_run($limit = 40) {
    $posts = get_posts([
        'post_type' => array_merge(aat_public_types(), ['page', 'post', 'homepage']),
        'post_status' => ['publish', 'draft'],
        'posts_per_page' => $limit,
        'fields' => 'ids',
        'meta_query' => [['key' => '_aat_rebranded', 'compare' => 'NOT EXISTS']],
    ]);

    $changed = 0;
    foreach ($posts as $post_id) $changed += aat_rebrand_post($post_id);

    // Term descriptions carry the same prose on archive pages.
    if (!$posts) {
        foreach (get_terms(['taxonomy' => aat_public_taxonomies(), 'hide_empty' => false]) as $term) {
            if (is_wp_error($term) || !aat_has_foreign_brand($term->description)) continue;
            wp_update_term($term->term_id, $term->taxonomy, ['description' => aat_rebrand_text($term->description, true)]);
            $changed++;
        }
    }

    /* A batch where nothing needed rewriting still made progress - the posts are
       marked. The cursor says so, or the admin runner reads it as stuck. */
    $done = count($posts) < $limit;
    $seen = (int) get_option('aat_rebrand_cursor', 0) + count($posts);
    if ($done) delete_option('aat_rebrand_cursor'); else update_option('aat_rebrand_cursor', $seen, false);

    return [
        'imported' => $changed,
        'done' => $done,
        'offset' => $seen,
    ];
}

/** Clears the marker so the pass can be run again after a fresh import. */
function aat_rebrand_reset() {
    global $wpdb;
    $wpdb->delete($wpdb->postmeta, ['meta_key' => '_aat_rebranded']);
    return ['reset' => true];
}

/* ───────────────────────── record corrections ───────────────────────── */

/**
 * A hotel sits in exactly one country.
 *
 * Legacy categories were mirrored into the country taxonomy verbatim, so a post
 * filed under two of them arrives with two countries. The one named in the
 * title wins; failing that the assignment is left alone rather than guessed.
 */
function aat_fix_single_country() {
    $fixed = [];

    foreach (get_posts(['post_type' => 'hotel', 'posts_per_page' => -1, 'fields' => 'ids']) as $post_id) {
        $terms = get_the_terms($post_id, 'country');
        if (!$terms || is_wp_error($terms) || count($terms) < 2) continue;

        $haystack = strtolower(get_the_title($post_id) . ' ' . get_post_field('post_content', $post_id));
        $keep = null;
        foreach ($terms as $term) {
            $name = strtolower(preg_replace('/\s*\(.*\)$/', '', $term->name));
            $name = trim(str_ireplace(' tours', '', $name));
            if ($name !== '' && strpos($haystack, $name) !== false) { $keep = $term; break; }
        }
        if (!$keep) continue;

        wp_set_object_terms($post_id, [(int) $keep->term_id], 'country', false);
        $fixed[] = get_the_title($post_id) . ' → ' . $keep->name;
    }

    return $fixed;
}

/**
 * Legacy categories that were never countries.
 *
 * The terms stay - their archive URLs are indexed - but the country grids and
 * menus skip anything flagged here so "Asia Cruises" stops appearing between
 * Cambodia and China.
 */
function aat_fix_country_terms() {
    $not_countries = ['asia-cruises', 'bali'];
    $renames = ['bhutan' => 'Bhutan'];
    $touched = [];

    foreach ($not_countries as $slug) {
        $term = get_term_by('slug', $slug, 'country');
        if (!$term) continue;
        update_term_meta($term->term_id, 'not_a_country', 1);
        $touched[] = $slug . ' (ẩn khỏi lưới quốc gia)';
    }

    foreach ($renames as $slug => $name) {
        $term = get_term_by('slug', $slug, 'country');
        if (!$term || $term->name === $name) continue;
        wp_update_term($term->term_id, 'country', ['name' => $name]);
        $touched[] = $slug . ' → ' . $name;
    }

    return $touched;
}

/**
 * Empty duplicates left by repeated legacy imports.
 *
 * A record with no body, no gallery and a numeric slug suffix beside a filled
 * twin is a duplicate. It goes to draft rather than the bin so nothing is lost,
 * and the canonical twin is recorded for the redirect.
 */
function aat_fix_duplicates() {
    $handled = [];

    foreach (aat_public_types() as $type) {
        $posts = get_posts(['post_type' => $type, 'posts_per_page' => -1, 'post_status' => 'publish']);
        $by_title = [];
        foreach ($posts as $post) {
            $key = strtolower(preg_replace('/[^a-z0-9]/i', '', $post->post_title));
            $by_title[$key][] = $post;
        }

        foreach ($by_title as $group) {
            if (count($group) < 2) continue;

            $score = function ($post) {
                $gallery = get_post_meta($post->ID, 'gallery', true);
                $rows = is_string($gallery) ? substr_count($gallery, 'image_url') : 0;
                return strlen($post->post_content) + $rows * 100 + (has_post_thumbnail($post->ID) ? 50 : 0);
            };
            usort($group, function ($a, $b) use ($score) { return $score($b) - $score($a); });

            $canonical = array_shift($group);
            foreach ($group as $duplicate) {
                if ($score($duplicate) > 0) continue; // Only the genuinely empty ones.
                wp_update_post(['ID' => $duplicate->ID, 'post_status' => 'draft']);
                update_post_meta($duplicate->ID, '_aat_duplicate_of', $canonical->post_name);
                $handled[] = $duplicate->post_name . ' → ' . $canonical->post_name;
            }
        }
    }

    return $handled;
}

/**
 * Bring seeded copy into line with the configured founding year.
 *
 * The founding year lives in one place - the Founded setting. Copy seeded
 * before that setting existed carries a year inside a sentence, so the
 * homepage published "Since 2005" beside an About page that says 1989.
 * Rewrites only the year, only where it disagrees, and only in fields the
 * seeder wrote; a sentence an editor typed by hand is left alone unless it
 * names a year that is simply wrong.
 */
function aat_fix_founding_year() {
    $year = (int) get_option('aat_founded_year', 0);
    if (!$year) return [];

    $home = function_exists('aat_front_page_post') ? aat_front_page_post() : null;
    if (!$home) return [];

    $fixed = [];
    foreach (['story_bar_tagline', 'statement_text', 'intro_text', 'quote_text'] as $field) {
        $text = get_post_meta($home->ID, $field, true);
        if (!is_string($text) || $text === '') continue;

        $updated = preg_replace_callback(
            '/\b(since|est\.?|founded in)\s+(19|20)\d{2}\b/i',
            function ($m) use ($year) { return $m[1] . ' ' . $year; },
            $text
        );

        if ($updated !== null && $updated !== $text) {
            update_post_meta($home->ID, $field, wp_slash($updated));
            $fixed[] = $field . ' → ' . $year;
        }
    }

    return $fixed;
}

function aat_cleanup_records() {
    $countries = aat_fix_single_country();
    $terms = aat_fix_country_terms();
    $duplicates = aat_fix_duplicates();
    $years = aat_fix_founding_year();
    /* Runs after the country fixes: the stricter image rules need the country
       assignments to be right before they can judge a borrowed photograph. */
    $images = aat_repair_borrowed_images();
    /* Every country term had an empty photograph, so the destination grids
       had nothing to show. Runs last: it reads each country's own posts, and
       the country assignments above have to be right first. */
    $flags = function_exists('aat_backfill_country_images') ? aat_backfill_country_images() : [];

    return [
        'imported' => count($countries) + count($terms) + count($duplicates)
            + count($images) + count($years) + count($flags),
        'done' => true,
        'details' => [
            'country' => $countries,
            'terms' => $terms,
            'duplicates' => $duplicates,
            'images' => $images,
            'years' => $years,
            'countryPhotos' => $flags,
        ],
    ];
}
