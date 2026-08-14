<?php
/**
 * Post types and taxonomies.
 *
 * Rewrite slugs match the legacy absoluteasiatours.com URLs so imported content
 * keeps its permalinks (and its search rankings). The legacy install used
 * hyphenated type names (places-to-go, travel-guides); here the type keys are
 * underscored WordPress-style and only the rewrite slug carries the old URL.
 */

if (!defined('ABSPATH')) exit;

add_action('init', 'aat_register_post_types');

function aat_register_post_types() {
    register_nav_menus([
        'primary' => 'Primary Navigation',
        'footer' => 'Footer Navigation',
    ]);

    $taxonomies = ['category', 'post_tag'];

    $types = [
        'tour' => ['Tours / Journeys', 'Tour', 'tours', 'dashicons-palmtree', true],
        'hotel' => ['Hotels', 'Hotel', 'collection', 'dashicons-building', true],
        'travel_guide' => ['Travel Guides', 'Travel Guide', 'travel-guides', 'dashicons-megaphone', true],
        'place_to_go' => ['Places to Go', 'Place to Go', 'places-to-go', 'dashicons-airplane', true],
        'thing_to_do' => ['Things to Do', 'Thing to Do', 'things-to-do', 'dashicons-location', true],
        'blog' => ['Blogs', 'Blog', 'blogs', 'dashicons-media-text', true],
    ];

    /* `destination` was dropped too. Nothing on the legacy site mapped to it,
       so it could only ever be an empty menu item: every destination is a
       `place_to_go` (224 of them), and a country page is assembled from the
       `country` taxonomy rather than a post. An empty admin screen with a
       proud icon is worse than no screen.

       `trip` (5 vessel records) and `cruises` (empty) were dropped: neither has
       an indexed URL, and cruise content lives in the `asia-cruises` category
       alongside the tours it belongs to. The rows stay in the database, so
       re-registering the type would bring them back. */

    foreach ($types as $key => $spec) {
        list($plural, $singular, $slug, $icon, $has_archive) = $spec;
        register_post_type($key, [
            'labels' => [
                'name' => $plural,
                'singular_name' => $singular,
                'add_new' => 'Add New',
                'add_new_item' => "Add New $singular",
                'edit_item' => "Edit $singular",
                'search_items' => "Search $plural",
            ],
            'public' => true,
            'has_archive' => $has_archive,
            'rewrite' => ['slug' => $slug, 'with_front' => false],
            'supports' => ['title', 'editor', 'thumbnail', 'excerpt', 'revisions', 'custom-fields'],
            'taxonomies' => [], /* Clean sidebar — no sub-items */
            'show_in_rest' => true,
            'menu_icon' => $icon,
        ]);
    }

    // Private: booking records must never reach the bridge.
    register_post_type('order', [
        'labels' => ['name' => 'Orders', 'singular_name' => 'Order'],
        'public' => false,
        'show_ui' => true,
        'has_archive' => false,
        'supports' => ['title', 'editor'],
        'show_in_rest' => false,
        'menu_icon' => 'dashicons-tickets-alt',
    ]);

    /**
     * The front page. ACF free cannot attach field groups to an options page, so
     * homepage content lives in a single private post of this type; the bridge
     * serves it at "/".
     */
    register_post_type('homepage', [
        'labels' => [
            'name' => 'Homepage',
            'singular_name' => 'Homepage',
            'menu_name' => 'Homepage',
            'add_new' => 'Edit Homepage',
            'add_new_item' => 'Homepage Content',
        ],
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => true,
        'menu_position' => 2,
        'menu_icon' => 'dashicons-admin-home',
        'supports' => ['title', 'revisions'],
        'show_in_rest' => true,
        'capability_type' => 'page',
    ]);

    register_taxonomy('inspiration', ['tour', 'post', 'blog', 'travel_guide'], [
        'labels' => ['name' => 'Inspirations', 'singular_name' => 'Inspiration'],
        'hierarchical' => true,
        'public' => true,
        'show_in_rest' => true,
        'show_in_menu' => false,
        'show_in_quick_edit' => true,
        'meta_box_cb' => 'post_categories_meta_box',
        'rewrite' => ['slug' => 'inspiration', 'with_front' => false],
    ]);

    register_taxonomy('country', ['tour', 'hotel', 'place_to_go', 'thing_to_do', 'travel_guide'], [
        'labels' => ['name' => 'Countries', 'singular_name' => 'Country'],
        'hierarchical' => true,
        'public' => true,
        'show_in_rest' => true,
        'show_in_menu' => false,
        'show_in_quick_edit' => true,
        'meta_box_cb' => 'post_categories_meta_box',
        'rewrite' => ['slug' => 'country', 'with_front' => false],
    ]);

    /* Taxonomies Google already indexes on the legacy site. Their archive URLs
       are live search results, so the slugs must match exactly. */
    register_taxonomy('hotel_service', ['hotel'], [
        'labels' => ['name' => 'Hotel Services', 'singular_name' => 'Hotel Service'],
        'hierarchical' => true,
        'public' => true,
        'show_in_rest' => true,
        'show_in_menu' => false,
        'show_in_quick_edit' => true,
        'meta_box_cb' => 'post_categories_meta_box',
        'rewrite' => ['slug' => 'hotel_service', 'with_front' => false],
    ]);

    register_taxonomy('city', ['hotel', 'place_to_go', 'thing_to_do'], [
        'labels' => ['name' => 'Cities', 'singular_name' => 'City'],
        'hierarchical' => true,
        'public' => true,
        'show_in_rest' => true,
        'show_in_menu' => false,
        'show_in_quick_edit' => true,
        'meta_box_cb' => 'post_categories_meta_box',
        'rewrite' => ['slug' => 'city', 'with_front' => false],
    ]);

    register_taxonomy('blog-type', ['blog'], [
        'labels' => ['name' => 'Blog Types', 'singular_name' => 'Blog Type'],
        'hierarchical' => true,
        'public' => true,
        'show_in_rest' => true,
        'show_in_menu' => false,
        'show_in_quick_edit' => true,
        'meta_box_cb' => 'post_categories_meta_box',
        'rewrite' => ['slug' => 'blog-type', 'with_front' => false],
    ]);
}

/** Belt and braces: keep private types out of REST and public queries. */
add_filter('register_post_type_args', function ($args, $type) {
    if (in_array($type, aat_private_types(), true)) {
        $args['publicly_queryable'] = false;
        $args['show_in_rest'] = $type === 'homepage' ? $args['show_in_rest'] : false;
        $args['exclude_from_search'] = true;
    }
    return $args;
}, 100, 2);

/** The block editor fights the JSON repeaters, so classic editor everywhere. */
add_filter('use_block_editor_for_post_type', function ($enabled, $post_type) {
    $classic = array_merge(aat_public_types(), ['homepage', 'order']);
    return in_array($post_type, $classic, true) ? false : $enabled;
}, 10, 2);
