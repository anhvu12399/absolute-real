<?php
/**
 * Plugin Name: Absolute Asia
 * Description: Single plugin for the headless site - content model, read-only bridge API for the Next.js frontend, importer for the legacy absoluteasiatours.com install, and signed revalidation.
 * Version: 3.11.5
 * Author: Absolute Asia
 *
 * Replaces the earlier split into absolute-asia-core / absolute-asia-headless /
 * absolute-asia-headless-extras / absolute-asia-fields. Deactivate and delete
 * those before activating this one - they register the same post types and REST
 * routes, and running both at once fatals on duplicate function names.
 */

if (!defined('ABSPATH')) exit;

define('AAT_VERSION', '3.11.5');
define('AAT_PATH', plugin_dir_path(__FILE__));
define('AAT_URL', plugin_dir_url(__FILE__));

/** Post types the bridge is allowed to expose. */
function aat_public_types() {
    return ['page', 'post', 'tour', 'trip', 'destination', 'hotel', 'travel_guide', 'place_to_go', 'thing_to_do', 'blog'];
}

/** Types that must never be publicly queryable or exposed over REST. */
function aat_private_types() {
    return ['order', 'orders', 'booking', 'homepage'];
}

/** Site-specific editorial seeds are opt-in and never travel silently to a clone. */
function aat_content_profile() {
    $profile = sanitize_key((string) get_option('aat_content_profile', 'generic'));
    return in_array($profile, ['generic', 'absolute'], true) ? $profile : 'generic';
}

function aat_require_absolute_profile() {
    return aat_content_profile() === 'absolute'
        ? true
        : new WP_Error('aat_profile', 'This action contains Absolute-specific editorial copy. Select the Absolute profile first.', ['status' => 409]);
}

/** Taxonomies the bridge is allowed to expose. */
function aat_public_taxonomies() {
    return ['category', 'post_tag', 'inspiration', 'country', 'hotel_service', 'city', 'blog-type'];
}

require_once AAT_PATH . 'includes/post-types.php';
require_once AAT_PATH . 'includes/contract.php';
require_once AAT_PATH . 'includes/field-map.php';
require_once AAT_PATH . 'includes/fields.php';
require_once AAT_PATH . 'includes/admin-repeaters.php';
require_once AAT_PATH . 'includes/rest-api.php';
require_once AAT_PATH . 'includes/importer.php';
require_once AAT_PATH . 'includes/backfill.php';
require_once AAT_PATH . 'includes/cleanup.php';
require_once AAT_PATH . 'includes/logo.php';
require_once AAT_PATH . 'includes/compat.php';
require_once AAT_PATH . 'includes/seed-copy.php';
require_once AAT_PATH . 'includes/seed-hotels.php';
require_once AAT_PATH . 'includes/seed-story.php';
require_once AAT_PATH . 'includes/seed-legal.php';
require_once AAT_PATH . 'includes/seed-defaults.php';
require_once AAT_PATH . 'includes/seed-cards.php';
require_once AAT_PATH . 'includes/audit.php';
require_once AAT_PATH . 'includes/revalidate.php';
require_once AAT_PATH . 'includes/admin-preview.php';
require_once AAT_PATH . 'includes/noindex.php';
require_once AAT_PATH . 'includes/visitors.php';
require_once AAT_PATH . 'includes/orders.php';

register_activation_hook(__FILE__, function () {
    aat_register_post_types();
    flush_rewrite_rules();
});

register_deactivation_hook(__FILE__, 'flush_rewrite_rules');

add_action('admin_notices', function () {
    if (!current_user_can('activate_plugins') || !function_exists('is_plugin_active')) return;
    $stale = array_filter([
        'absolute-asia-core/absolute-asia-core.php',
        'absolute-asia-headless/absolute-asia-headless.php',
    ], 'is_plugin_active');
    if (!$stale) return;
    echo '<div class="notice notice-error"><p><strong>Absolute Asia:</strong> deactivate the old plugins ('
        . esc_html(implode(', ', $stale)) . ') - they duplicate this plugin\'s post types and REST routes.</p></div>';
});
