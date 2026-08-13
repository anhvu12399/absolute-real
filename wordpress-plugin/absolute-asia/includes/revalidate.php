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

function aat_revalidate_post($post_id, $post) {
    if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) return;
    if (!$post instanceof WP_Post) return;

    $is_front = $post->post_type === 'homepage';
    if (!$is_front && !in_array($post->post_type, aat_public_types(), true)) return;
    if (!defined('AAT_REVALIDATE_URL') || !defined('AAT_REVALIDATE_SECRET')) return;

    $path = $is_front ? '/' : wp_parse_url(get_permalink($post_id), PHP_URL_PATH);
    $body = wp_json_encode([
        'id' => $post_id,
        'type' => $post->post_type,
        'path' => $path,
        'status' => $post->post_status,
    ]);

    wp_remote_post(AAT_REVALIDATE_URL, [
        'timeout' => 10,
        'blocking' => false,
        'headers' => [
            'Content-Type' => 'application/json',
            'X-Absolute-Asia-Signature' => hash_hmac('sha256', $body, AAT_REVALIDATE_SECRET),
        ],
        'body' => $body,
    ]);
}
