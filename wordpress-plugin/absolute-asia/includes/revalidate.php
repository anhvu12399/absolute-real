<?php
/**
 * Signed revalidation ping to the Next.js frontend.
 *
 * Define in wp-config.php:
 *   define('AAT_REVALIDATE_URL', 'https://example.com/api/revalidate');
 *   define('AAT_REVALIDATE_SECRET', 'same secret as WORDPRESS_REVALIDATE_SECRET');
 */

if (!defined('ABSPATH')) exit;

add_action('save_post', 'aat_revalidate_post', 20, 2);
add_action('deleted_post', function ($post_id, $post) {
    if ($post instanceof WP_Post) aat_revalidate_post($post_id, $post);
}, 20, 2);

/* A country's photograph and opening line live on the term, not on a post, so
   editing them fired nothing and the destination pages kept the old picture
   until something else happened to be saved. */
add_action('edited_term', 'aat_revalidate_term', 20, 3);
add_action('created_term', 'aat_revalidate_term', 20, 3);

function aat_revalidate_term($term_id, $tt_id, $taxonomy) {
    if (!in_array($taxonomy, ['country', 'city', 'category'], true)) return;
    if (!defined('AAT_REVALIDATE_URL') || !defined('AAT_REVALIDATE_SECRET')) return;

    $link = get_term_link((int) $term_id, $taxonomy);
    $path = is_wp_error($link) ? null : wp_parse_url($link, PHP_URL_PATH);

    aat_revalidate_ping([
        'id' => (int) $term_id,
        'type' => 'term:' . $taxonomy,
        'path' => $path,
        'status' => 'publish',
    ]);
}

function aat_revalidate_post($post_id, $post) {
    if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) return;
    if (!$post instanceof WP_Post) return;

    $is_front = $post->post_type === 'homepage';
    if (!$is_front && !in_array($post->post_type, aat_public_types(), true)) return;
    if (!defined('AAT_REVALIDATE_URL') || !defined('AAT_REVALIDATE_SECRET')) return;

    $path = $is_front ? '/' : wp_parse_url(get_permalink($post_id), PHP_URL_PATH);
    aat_revalidate_ping([
        'id' => $post_id,
        'type' => $post->post_type,
        'path' => $path,
        'status' => $post->post_status,
    ]);
}

/**
 * Send one signed ping, and remember how it went.
 *
 * The result is stored because this fires non-blocking: without a record the
 * admin screen can only say "configured" or "not configured", never "the last
 * one failed", which is exactly the case someone needs to see.
 */
function aat_revalidate_ping(array $payload) {
    if (!defined('AAT_REVALIDATE_URL') || !defined('AAT_REVALIDATE_SECRET')) return;

    $body = wp_json_encode($payload);
    $response = wp_remote_post(AAT_REVALIDATE_URL, [
        'timeout' => 5,
        'headers' => [
            'Content-Type' => 'application/json',
            'X-Absolute-Asia-Signature' => hash_hmac('sha256', $body, AAT_REVALIDATE_SECRET),
        ],
        'body' => $body,
    ]);

    update_option('aat_revalidate_last', [
        'at' => time(),
        'path' => $payload['path'] ?? '',
        'ok' => !is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200,
        'detail' => is_wp_error($response)
            ? $response->get_error_message()
            : 'HTTP ' . wp_remote_retrieve_response_code($response),
    ], false);
}

/** Whether the revalidate webhook is wired up, and what happened last time. */
function aat_revalidate_status() {
    $configured = defined('AAT_REVALIDATE_URL') && defined('AAT_REVALIDATE_SECRET');
    return [
        'configured' => $configured,
        'url' => $configured ? AAT_REVALIDATE_URL : '',
        'last' => get_option('aat_revalidate_last', null),
    ];
}
