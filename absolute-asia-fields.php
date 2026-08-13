<?php
/**
 * Plugin Name: Absolute Asia Core
 * Description: Registers ACF fields and custom functionalities for the Absolute Asia Headless WP.
 * Version: 1.0
 * Author: Antigravity
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/* ==========================================================================
   1. DISABLE GUTENBERG (BLOCK EDITOR) FOR CUSTOM POST TYPES
   ========================================================================== */
add_filter('use_block_editor_for_post_type', 'absolute_asia_disable_gutenberg', 10, 2);
function absolute_asia_disable_gutenberg($current_status, $post_type) {
    $disabled_cpts = array('tour', 'destination', 'hotel', 'travel_guide', 'place_to_go', 'thing_to_do', 'blog', 'order', 'page');
    if (in_array($post_type, $disabled_cpts)) {
        return false;
    }
    return $current_status;
}

/* ==========================================================================
   2. REGISTER CUSTOM POST TYPES & TAXONOMIES
   ========================================================================== */
add_action('init', 'absolute_asia_register_cpts');
function absolute_asia_register_cpts() {
    register_nav_menus(array(
        'primary' => 'Primary Navigation',
    ));
    register_post_type('tour', array(
        'labels' => array('name' => 'Tours / Journeys', 'singular_name' => 'Tour', 'add_new_item' => 'Add New Tour', 'edit_item' => 'Edit Tour'),
        'public' => true, 'has_archive' => true, 'rewrite' => array('slug' => 'tours'),
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'show_in_rest' => true, 'menu_icon' => 'dashicons-palmtree',
    ));
    register_post_type('destination', array(
        'labels' => array('name' => 'Destinations', 'singular_name' => 'Destination', 'add_new_item' => 'Add New Destination', 'edit_item' => 'Edit Destination'),
        'public' => true, 'has_archive' => true, 'rewrite' => array('slug' => 'destinations'),
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'show_in_rest' => true, 'menu_icon' => 'dashicons-location-alt',
    ));
    register_post_type('hotel', array(
        'labels' => array('name' => 'Hotels', 'singular_name' => 'Hotel', 'add_new_item' => 'Add New Hotel', 'edit_item' => 'Edit Hotel'),
        'public' => true, 'has_archive' => false,
        'supports' => array('title', 'editor', 'thumbnail'),
        'show_in_rest' => true, 'menu_icon' => 'dashicons-building',
    ));
    
    // NEW CPTS FROM OLD WP
    register_post_type('travel_guide', array(
        'labels' => array('name' => 'Travel guides', 'singular_name' => 'Travel guide', 'add_new_item' => 'Add New Travel guide', 'edit_item' => 'Edit Travel guide'),
        'public' => true, 'has_archive' => true, 'rewrite' => array('slug' => 'travel-guides'),
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'show_in_rest' => true, 'menu_icon' => 'dashicons-megaphone',
    ));
    register_post_type('place_to_go', array(
        'labels' => array('name' => 'Places to go', 'singular_name' => 'Place to go', 'add_new_item' => 'Add New Place', 'edit_item' => 'Edit Place'),
        'public' => true, 'has_archive' => true, 'rewrite' => array('slug' => 'places-to-go'),
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'show_in_rest' => true, 'menu_icon' => 'dashicons-airplane',
    ));
    register_post_type('thing_to_do', array(
        'labels' => array('name' => 'Things to do', 'singular_name' => 'Thing to do', 'add_new_item' => 'Add New Thing to do', 'edit_item' => 'Edit Thing to do'),
        'public' => true, 'has_archive' => true, 'rewrite' => array('slug' => 'things-to-do'),
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'show_in_rest' => true, 'menu_icon' => 'dashicons-location',
    ));
    register_post_type('blog', array(
        'labels' => array('name' => 'Blogs', 'singular_name' => 'Blog', 'add_new_item' => 'Add New Blog', 'edit_item' => 'Edit Blog'),
        'public' => true, 'has_archive' => true, 'rewrite' => array('slug' => 'blogs'),
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'show_in_rest' => true, 'menu_icon' => 'dashicons-media-text',
    ));
    register_post_type('order', array(
        'labels' => array('name' => 'Orders', 'singular_name' => 'Order', 'add_new_item' => 'Add New Order', 'edit_item' => 'Edit Order'),
        'public' => true, 'has_archive' => false,
        'supports' => array('title', 'editor'),
        'show_in_rest' => true, 'menu_icon' => 'dashicons-tickets-alt',
    ));
}

/* ==========================================================================
   3. REGISTER ACF FIELD GROUPS
   ========================================================================== */
add_action('acf/init', 'absolute_asia_register_acf_fields');
function absolute_asia_register_acf_fields() {
    if (!function_exists('acf_add_local_field_group')) return;

    /* TOUR DETAILS */
    acf_add_local_field_group(array(
        'key' => 'group_tour_single_details',
        'title' => 'Tour Settings & Details',
        'fields' => array(
            array('key' => 'field_tour_duration_days', 'label' => 'Duration (Days)', 'name' => 'duration_days', 'type' => 'number', 'default_value' => 12),
            array('key' => 'field_tour_destinations_count', 'label' => 'Destinations Count', 'name' => 'destinations_count', 'type' => 'number', 'default_value' => 5),
            array('key' => 'field_tour_min_guests', 'label' => 'Minimum Guests', 'name' => 'min_guests', 'type' => 'number', 'default_value' => 2),
            array('key' => 'field_tour_starting_price', 'label' => 'Starting Price ($ USD)', 'name' => 'starting_price', 'type' => 'text'),
            array('key' => 'field_tour_overview_text', 'label' => 'Overview Description', 'name' => 'overview_text', 'type' => 'textarea', 'rows' => 4),
            array('key' => 'field_tour_highlights', 'label' => 'Highlights (One per line)', 'name' => 'highlights_list', 'type' => 'textarea', 'rows' => 5),
            array('key' => 'field_tour_pdf', 'label' => 'Brochure PDF Download', 'name' => 'pdf_download', 'type' => 'file', 'return_format' => 'url'),
            array(
                'key' => 'field_tour_itinerary',
                'label' => 'Itinerary (Day by Day) [Custom Repeater]',
                'name' => 'itinerary',
                'type' => 'textarea',
                'wrapper' => array('class' => 'custom-free-repeater repeater-type-itinerary'),
            ),
            array(
                'key' => 'field_tour_stays',
                'label' => 'Hand-Selected Stays',
                'name' => 'featured_stays',
                'type' => 'post_object',
                'post_type' => array('hotel'),
                'multiple' => 1,
                'return_format' => 'id',
            ),
            array(
                'key' => 'field_tour_departure_dates',
                'label' => 'Departure Dates & Pricing [Custom Repeater]',
                'name' => 'departure_dates',
                'type' => 'textarea',
                'wrapper' => array('class' => 'custom-free-repeater repeater-type-dates'),
            ),
            array('key' => 'field_tour_inclusions', 'label' => 'Inclusions (One per line)', 'name' => 'inclusions_list', 'type' => 'textarea', 'rows' => 6),
            array('key' => 'field_tour_special_offer', 'label' => 'Special Offer Callout', 'name' => 'special_offer_text', 'type' => 'text'),
        ),
        'location' => array(array(array('param' => 'post_type', 'operator' => '==', 'value' => 'tour'))),
        'show_in_rest' => true,
    ));

    /* DESTINATION DETAILS */
    acf_add_local_field_group(array(
        'key' => 'group_destination_details',
        'title' => 'Destination Settings',
        'fields' => array(
            array('key' => 'field_dest_hero_tagline', 'label' => 'Hero Tagline', 'name' => 'hero_tagline', 'type' => 'text'),
            array('key' => 'field_dest_overview', 'label' => 'Destination Overview', 'name' => 'destination_overview', 'type' => 'textarea', 'rows' => 4),
            array('key' => 'field_dest_best_time', 'label' => 'Best Time to Visit', 'name' => 'best_time_to_visit', 'type' => 'text'),
            array('key' => 'field_dest_map_headline', 'label' => 'Map Headline', 'name' => 'map_headline', 'type' => 'text'),
            array('key' => 'field_dest_map_description', 'label' => 'Map Description', 'name' => 'map_description', 'type' => 'textarea', 'rows' => 3),
            array('key' => 'field_dest_map_stops', 'label' => 'Map Stops / Cities (Comma-separated)', 'name' => 'map_stops', 'type' => 'text', 'placeholder' => 'Hanoi, Halong Bay, Hue, Hoi An, Ho Chi Minh City, Mekong Delta'),
            array('key' => 'field_dest_featured_tours', 'label' => 'Featured Tours', 'name' => 'featured_tours', 'type' => 'post_object', 'post_type' => array('tour'), 'multiple' => 1, 'return_format' => 'id'),
        ),
        'location' => array(array(array('param' => 'post_type', 'operator' => '==', 'value' => 'destination'))),
        'show_in_rest' => true,
    ));

    /* HOTEL DETAILS */
    acf_add_local_field_group(array(
        'key' => 'group_hotel_details',
        'title' => 'Hotel / Stay Settings',
        'fields' => array(
            array('key' => 'field_hotel_location', 'label' => 'Location / Subtitle', 'name' => 'hotel_location', 'type' => 'text'),
            array('key' => 'field_hotel_highlights', 'label' => 'Hotel Highlights', 'name' => 'hotel_highlights', 'type' => 'text'),
        ),
        'location' => array(array(array('param' => 'post_type', 'operator' => '==', 'value' => 'hotel'))),
        'show_in_rest' => true,
    ));

    /* HOMEPAGE DETAILS */
    acf_add_local_field_group(array(
        'key' => 'group_homepage_details',
        'title' => 'Homepage Layout & Content',
        'fields' => array(
            array('key' => 'tab_home_intro', 'label' => 'Intro Statement & Stats', 'type' => 'tab'),
            array('key' => 'field_home_statement_text', 'label' => 'Statement Text', 'name' => 'statement_text', 'type' => 'textarea', 'rows' => 3),
            array('key' => 'field_home_stat_1_num', 'label' => 'Stat 1 Number', 'name' => 'stat_1_num', 'type' => 'text'),
            array('key' => 'field_home_stat_1_label', 'label' => 'Stat 1 Label', 'name' => 'stat_1_label', 'type' => 'text'),
            array('key' => 'field_home_stat_2_num', 'label' => 'Stat 2 Number', 'name' => 'stat_2_num', 'type' => 'text'),
            array('key' => 'field_home_stat_2_label', 'label' => 'Stat 2 Label', 'name' => 'stat_2_label', 'type' => 'text'),
            array('key' => 'field_home_stat_3_num', 'label' => 'Stat 3 Number', 'name' => 'stat_3_num', 'type' => 'text'),
            array('key' => 'field_home_stat_3_label', 'label' => 'Stat 3 Label', 'name' => 'stat_3_label', 'type' => 'text'),

            array('key' => 'tab_home_destinations', 'label' => 'Destinations & Journeys', 'type' => 'tab'),
            array('key' => 'field_home_tab_destinations', 'label' => 'Tab: Destinations [Cards Repeater]', 'name' => 'home_tab_destinations', 'type' => 'textarea', 'wrapper' => array('class' => 'custom-free-repeater repeater-type-home-cards')),
            array('key' => 'field_home_tab_journeys', 'label' => 'Tab: Journeys [Cards Repeater]', 'name' => 'home_tab_journeys', 'type' => 'textarea', 'wrapper' => array('class' => 'custom-free-repeater repeater-type-home-cards')),
            array('key' => 'field_home_tab_offers', 'label' => 'Tab: Offers [Cards Repeater]', 'name' => 'home_tab_offers', 'type' => 'textarea', 'wrapper' => array('class' => 'custom-free-repeater repeater-type-home-cards')),
            array('key' => 'field_home_tab_new', 'label' => 'Tab: New & Noteworthy [Cards Repeater]', 'name' => 'home_tab_new', 'type' => 'textarea', 'wrapper' => array('class' => 'custom-free-repeater repeater-type-home-cards')),
            
            array('key' => 'tab_home_explore', 'label' => 'Ways to Explore & Travel', 'type' => 'tab'),
            array('key' => 'field_home_ways_to_explore', 'label' => 'Ways to Explore [Cards Repeater]', 'name' => 'home_ways_to_explore', 'type' => 'textarea', 'wrapper' => array('class' => 'custom-free-repeater repeater-type-home-cards')),
            array('key' => 'field_home_stay_with', 'label' => 'Stay With Absolute Asia [Cards Repeater]', 'name' => 'home_stay_with', 'type' => 'textarea', 'wrapper' => array('class' => 'custom-free-repeater repeater-type-home-cards')),
            
            array('key' => 'tab_home_map_values', 'label' => 'Map & Core Values', 'type' => 'tab'),
            array('key' => 'field_home_map_headline', 'label' => 'Map Headline', 'name' => 'map_headline', 'type' => 'text'),
            array('key' => 'field_home_map_description', 'label' => 'Map Description', 'name' => 'map_description', 'type' => 'textarea', 'rows' => 4),

            array('key' => 'field_home_ways_to_travel', 'label' => 'Ways to Travel [Cards Repeater]', 'name' => 'home_ways_to_travel', 'type' => 'textarea', 'wrapper' => array('class' => 'custom-free-repeater repeater-type-home-cards')),
            
            array('key' => 'field_home_quote_text', 'label' => 'Quote Text', 'name' => 'quote_text', 'type' => 'textarea', 'rows' => 3),
            array('key' => 'field_home_quote_citation', 'label' => 'Quote Citation', 'name' => 'quote_citation', 'type' => 'text'),
            
            array('key' => 'field_home_responsibly_headline', 'label' => 'Travel Responsibly Headline', 'name' => 'responsibly_headline', 'type' => 'text'),
            array('key' => 'field_home_responsibly_text', 'label' => 'Travel Responsibly Text', 'name' => 'responsibly_text', 'type' => 'textarea', 'rows' => 4),
            
            array('key' => 'field_home_values', 'label' => 'Core Values [Repeater]', 'name' => 'home_values', 'type' => 'textarea', 'wrapper' => array('class' => 'custom-free-repeater repeater-type-home-values')),
        ),
        'location' => array(
            array(array('param' => 'page_type', 'operator' => '==', 'value' => 'front_page')),
            array(array('param' => 'post_type', 'operator' => '==', 'value' => 'page')),
        ),
        'show_in_rest' => true,
    ));

    /* HOMEPAGE BANNER */
    acf_add_local_field_group(array(
        'key' => 'group_homepage_banner',
        'title' => 'Banner home',
        'fields' => array(
            array('key' => 'field_home_banner_slider', 'label' => 'Slider home', 'name' => 'home_banner_slider', 'type' => 'textarea', 'wrapper' => array('class' => 'custom-free-repeater repeater-type-home-banner')),
        ),
        'location' => array(
            array(array('param' => 'page_type', 'operator' => '==', 'value' => 'front_page')),
            array(array('param' => 'post_type', 'operator' => '==', 'value' => 'page')),
        ),
        'menu_order' => 0,
        'style' => 'seamless',
        'show_in_rest' => true,
    ));

    /* PAGE GENERAL SETTINGS (Journeys, Cruises, Inspiration, Why Us, Plan Trip, All Destinations) */
    acf_add_local_field_group(array(
        'key' => 'group_general_page_settings',
        'title' => 'Page Hero & Intro Settings',
        'fields' => array(
            array('key' => 'field_page_eyebrow', 'label' => 'Eyebrow / Subtitle', 'name' => 'eyebrow', 'type' => 'text'),
            array('key' => 'field_page_hero_tagline', 'label' => 'Hero Tagline / Headline', 'name' => 'hero_tagline', 'type' => 'text'),
            array('key' => 'field_page_description', 'label' => 'Page Description / Excerpt', 'name' => 'page_description', 'type' => 'textarea', 'rows' => 3),
        ),
        'location' => array(
            array(array('param' => 'post_type', 'operator' => '==', 'value' => 'page')),
        ),
        'menu_order' => 10,
        'show_in_rest' => true,
    ));
}

/* ==========================================================================
   4. FORMAT JSON STRINGS INTO ARRAYS FOR THE REST API
   ========================================================================== */
add_filter('rest_prepare_tour', 'absolute_asia_parse_repeater_json', 10, 3);
add_filter('rest_prepare_page', 'absolute_asia_parse_repeater_json', 10, 3); // For Homepage
function absolute_asia_parse_repeater_json($response, $post, $request) {
    if (isset($response->data['acf'])) {
        $fields_to_parse = array(
            'itinerary', 'departure_dates', 
            'home_tab_destinations', 'home_tab_journeys', 'home_tab_offers', 'home_tab_new', 
            'home_ways_to_explore', 'home_stay_with', 'home_ways_to_travel', 'home_values', 'home_banner_slider'
        );
        foreach ($fields_to_parse as $field) {
            if (!empty($response->data['acf'][$field])) {
                if (is_string($response->data['acf'][$field])) {
                    $parsed = json_decode($response->data['acf'][$field], true);
                    if (is_array($parsed)) {
                        $response->data['acf'][$field] = $parsed;
                    }
                }
            }
        }
    }
    return $response;
}

/* ==========================================================================
   5. ENSURE ACF TEXTAREA DOES NOT CRASH IF DB HAS ARRAY
   ========================================================================== */
add_filter('acf/load_value', 'absolute_asia_format_repeater_for_textarea', 10, 3);
function absolute_asia_format_repeater_for_textarea($value, $post_id, $field) {
    $repeater_fields = array(
        'itinerary', 'departure_dates', 
        'home_tab_destinations', 'home_tab_journeys', 'home_tab_offers', 'home_tab_new', 
        'home_ways_to_explore', 'home_stay_with', 'home_ways_to_travel', 'home_values'
    );
    if (in_array($field['name'], $repeater_fields)) {
        if (is_array($value)) {
            return wp_json_encode($value);
        }
    }
    return $value;
}

/* ==========================================================================
   6. ADMIN JS & CSS FOR CUSTOM REPEATER UI
   ========================================================================== */
add_action('admin_enqueue_scripts', 'absolute_asia_enqueue_media');
function absolute_asia_enqueue_media() {
    wp_enqueue_media();
}

add_action('admin_footer', 'absolute_asia_custom_repeater_js');
function absolute_asia_custom_repeater_js() {
    $screen = get_current_screen();
    ?>
    <style>
        .custom-free-repeater > .acf-input > textarea, .custom-free-repeater > textarea { display: none !important; }
        .cfr-ui textarea { display: block !important; }
        .cfr-ui { border: 1px solid #ccd0d4; padding: 10px; background: #fff; margin-top: 10px; }
        .cfr-row { border: 1px solid #e2e4e7; padding: 10px 15px; margin-bottom: 10px; background: #f9f9f9; position: relative; }
        .cfr-row-header { font-weight: bold; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; }
        .cfr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .cfr-field { margin-bottom: 5px; }
        .cfr-field.full { grid-column: 1 / -1; }
        .cfr-field label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #555; }
        .cfr-field input[type="text"], .cfr-field textarea, .cfr-field select { width: 100%; max-width: 100%; padding: 4px 8px; font-size: 13px; }
        .cfr-remove-btn { color: #a00; text-decoration: none; font-size: 12px; }
        .cfr-remove-btn:hover { color: #f00; }
        .cfr-add-btn { display: inline-block; padding: 6px 12px; background: #2271b1; color: #fff; border-radius: 3px; text-decoration: none; margin-top: 10px; cursor: pointer; }
        .cfr-add-btn:hover { background: #135e96; color: #fff; }
        .cfr-img-wrap { display: flex; gap: 5px; }
        .cfr-img-wrap input { flex: 1; min-width: 0; }
        .upload-img-btn { white-space: nowrap; padding: 0 10px; }
        
        /* Table Layout Styles */
        .cfr-table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #ccd0d4; margin-top: 10px; }
        .cfr-table th, .cfr-table td { border-bottom: 1px solid #e2e4e7; border-right: 1px solid #e2e4e7; padding: 10px; vertical-align: top; }
        .cfr-table th { background: #f9f9f9; font-weight: 600; color: #3c434a; text-align: left; font-size: 13px; }
        .cfr-table td { position: relative; }
        .cfr-table input[type="text"], .cfr-table textarea { width: 100%; font-size: 13px; padding: 4px 8px; margin-bottom: 5px; box-sizing: border-box; }
        .cfr-preview { width: 100%; height: 80px; background-color: #f0f0f1; background-size: cover; background-position: center; border: 1px solid #dcdcde; margin-bottom: 5px; display: flex; align-items: center; justify-content: center; color: #a7aaad; font-size: 12px; cursor: pointer; }
        .cfr-preview:hover { border-color: #2271b1; }
        .cfr-table-actions { width: 40px; text-align: center; vertical-align: middle; }
        .cfr-btn-circle { width: 24px; height: 24px; border-radius: 50%; border: 1px solid #8c8f94; background: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; color: #8c8f94; margin-bottom: 5px; text-decoration: none; }
        .cfr-btn-circle:hover { border-color: #d63638; color: #d63638; }
        .cfr-field-group { margin-bottom: 10px; }
        .cfr-field-group label { display: block; font-size: 11px; font-weight: 600; color: #646970; margin-bottom: 3px; text-transform: uppercase; }
    </style>
    <script>
    jQuery(document).ready(function($) {
        
        var wpMediaFrame;

        function initRepeater($wrapper, type) {
            var $textarea = $wrapper.find('textarea').first();
            if (!$textarea.length) return;
            
            var rawVal = $textarea.val();
            var data = [];
            try { if (rawVal) data = JSON.parse(rawVal); } catch(e) { data = []; }
            if (!Array.isArray(data)) data = [];

            var $ui = $('<div class="cfr-ui"></div>');
            $wrapper.append($ui);
            
            function renderRow(item, index) {
                var html = '<div class="cfr-row" data-index="'+index+'">';
                html += '<div class="cfr-row-header"><span>Row '+(index+1)+'</span> <a href="#" class="cfr-remove-btn">Remove</a></div>';
                html += '<div class="cfr-grid">';
                
                if (type === 'itinerary') {
                    html += '<div class="cfr-field"><label>Day #</label><input type="text" data-key="day_num" value="'+(item.day_num||'')+'" /></div>';
                    html += '<div class="cfr-field"><label>Location</label><input type="text" data-key="group_tag" value="'+(item.group_tag||'')+'" /></div>';
                    html += '<div class="cfr-field full"><label>Title</label><input type="text" data-key="title" value="'+(item.title||'')+'" /></div>';
                    html += '<div class="cfr-field full"><label>Description</label><textarea data-key="description" rows="2">'+(item.description||'')+'</textarea></div>';
                } else if (type === 'dates') {
                    html += '<div class="cfr-field"><label>Date Range</label><input type="text" data-key="date_range" value="'+(item.date_range||'')+'" /></div>';
                    html += '<div class="cfr-field"><label>Price Info</label><input type="text" data-key="price_info" value="'+(item.price_info||'')+'" /></div>';
                    var stat = item.availability_status || 'Available';
                    html += '<div class="cfr-field"><label>Status</label><select data-key="availability_status">';
                    html += '<option value="Available" '+(stat==='Available'?'selected':'')+'>Available</option>';
                    html += '<option value="Call for Availability" '+(stat==='Call for Availability'?'selected':'')+'>Call</option>';
                    html += '<option value="Sold Out" '+(stat==='Sold Out'?'selected':'')+'>Sold Out</option>';
                    html += '</select></div>';
                } else if (type === 'home-values') {
                    html += '<div class="cfr-field full"><label>Title</label><input type="text" data-key="title" value="'+(item.title||'')+'" /></div>';
                    html += '<div class="cfr-field full"><label>Description</label><textarea data-key="description" rows="2">'+(item.description||'')+'</textarea></div>';
                }
                
                html += '</div></div>';
                return $(html);
            }

            function renderTableAll() {
                var html = '<table class="cfr-table"><thead><tr>';
                
                if (type === 'home-banner') {
                    html += '<th style="width: 25%">Background & Small Image</th>';
                    html += '<th style="width: 25%">Title banner</th>';
                    html += '<th style="width: 25%">Content banner</th>';
                    html += '<th style="width: 20%">Link button</th>';
                } else {
                    html += '<th style="width: 25%">Background banner</th>';
                    html += '<th style="width: 25%">Title banner & Meta</th>';
                    html += '<th style="width: 25%">Content banner</th>';
                    html += '<th style="width: 20%">Link button</th>';
                }
                
                html += '<th class="cfr-table-actions"></th>';
                html += '</tr></thead><tbody>';
                
                data.forEach(function(item, i) {
                    html += '<tr class="cfr-row" data-index="'+i+'">';
                    
                    if (type === 'home-banner') {
                        // Image column with TWO images
                        var bg1 = item.image_url ? 'background-image: url('+item.image_url+');' : '';
                        html += '<td><div class="cfr-field-group"><label>Large Image</label><div class="cfr-preview upload-img-btn" style="'+bg1+'">'+(!item.image_url?'Click to Upload':'')+'</div>';
                        html += '<input type="hidden" data-key="image_url" value="'+(item.image_url||'')+'" /></div>';
                        
                        var bg2 = item.image_url_2 ? 'background-image: url('+item.image_url_2+');' : '';
                        html += '<div class="cfr-field-group" style="margin-top:10px;"><label>Small Image</label><div class="cfr-preview upload-img-btn" style="'+bg2+'">'+(!item.image_url_2?'Click to Upload':'')+'</div>';
                        html += '<input type="hidden" data-key="image_url_2" value="'+(item.image_url_2||'')+'" /></div></td>';
                        
                        // Title
                        html += '<td><div class="cfr-field-group"><label>Title (Line 1)</label><input type="text" data-key="tagline" value="'+(item.tagline||'')+'" /></div>';
                        html += '<div class="cfr-field-group"><label>Title (Line 2)</label><input type="text" data-key="title" value="'+(item.title||'')+'" /></div></td>';
                        
                        // Content
                        html += '<td><div class="cfr-field-group"><label>Description</label><textarea data-key="description" rows="5">'+(item.description||'')+'</textarea></div></td>';
                        
                        // Link
                        html += '<td><div class="cfr-field-group"><label>Link URL</label><input type="text" data-key="link" value="'+(item.link||'')+'" /></div>';
                        html += '<div class="cfr-field-group"><label>Link Text</label><input type="text" data-key="link_text" value="'+(item.link_text||'')+'" /></div>';
                        html += '<div class="cfr-field-group"><label>Small Image Caption</label><input type="text" data-key="meta" value="'+(item.meta||'')+'" /></div></td>';
                        
                    } else {
                        // Normal Home Cards
                        var bg = item.image_url ? 'background-image: url('+item.image_url+');' : '';
                        html += '<td><div class="cfr-preview upload-img-btn" style="'+bg+'">'+(!item.image_url?'Click to Upload':'')+'</div>';
                        html += '<input type="hidden" data-key="image_url" value="'+(item.image_url||'')+'" /></td>';
                        
                        html += '<td><div class="cfr-field-group"><label>Title banner</label><input type="text" data-key="title" value="'+(item.title||'')+'" /></div>';
                        html += '<div class="cfr-field-group"><label>Badge / Tag</label><input type="text" data-key="badge" value="'+(item.badge||'')+'" /></div>';
                        html += '<div class="cfr-field-group"><label>Meta</label><input type="text" data-key="meta" value="'+(item.meta||'')+'" /></div></td>';
                        
                        html += '<td><div class="cfr-field-group"><label>Content banner</label><textarea data-key="description" rows="5">'+(item.description||'')+'</textarea></div></td>';
                        
                        html += '<td><div class="cfr-field-group"><label>Link URL</label><input type="text" data-key="link" value="'+(item.link||'')+'" /></div>';
                        html += '<div class="cfr-field-group"><label>Link Text</label><input type="text" data-key="link_text" value="'+(item.link_text||'')+'" /></div>';
                        html += '<div class="cfr-field-group"><label>Image Class (Old)</label><input type="text" data-key="ph" value="'+(item.ph||'')+'" /></div></td>';
                    }
                    
                    html += '<td class="cfr-table-actions"><a href="#" class="cfr-btn-circle cfr-remove-btn" title="Remove Row">-</a></td>';
                    html += '</tr>';
                });
                
                html += '</tbody></table>';
                html += '<div style="text-align: right; margin-top: 10px;"><a class="cfr-add-btn">Add Row</a></div>';
                
                $ui.html(html);
            }

            function renderAll() {
                if (type === 'home-cards' || type === 'home-banner') {
                    renderTableAll();
                } else {
                    $ui.empty();
                    data.forEach(function(item, i) {
                        $ui.append(renderRow(item, i));
                    });
                    $ui.append('<a class="cfr-add-btn">Add Row</a>');
                }
            }
            
            function saveData() {
                var newData = [];
                $ui.find('.cfr-row').each(function() {
                    var obj = {};
                    $(this).find('input, textarea, select').each(function() {
                        var k = $(this).attr('data-key');
                        if (k) obj[k] = $(this).val();
                    });
                    newData.push(obj);
                });
                data = newData;
                $textarea.val(JSON.stringify(data));
            }

            $ui.on('click', '.cfr-add-btn', function(e) {
                e.preventDefault();
                data.push({});
                renderAll();
                saveData();
            });

            $ui.on('click', '.cfr-remove-btn', function(e) {
                e.preventDefault();
                if(confirm('Remove this row?')) {
                    $(this).closest('.cfr-row').remove();
                    saveData();
                }
            });

            $ui.on('click', '.upload-img-btn', function(e) {
                e.preventDefault();
                var $input = $(this).siblings('input');
                if (wpMediaFrame) { wpMediaFrame.open(); } else {
                    wpMediaFrame = wp.media({ title: "Select Image", button: { text: "Use Image" }, multiple: false });
                }
                wpMediaFrame.off("select").on("select", function() {
                    var attachment = wpMediaFrame.state().get("selection").first().toJSON();
                    $input.val(attachment.url).trigger("change");
                });
                wpMediaFrame.open();
            });

            $ui.on('change keyup', 'input, textarea, select', function() {
                saveData();
            });

            renderAll();
        }

        // Initialize our custom repeaters
        $('.custom-free-repeater').each(function() {
            var $this = $(this);
            if ($this.hasClass('repeater-type-itinerary')) {
                initRepeater($this, 'itinerary');
            } else if ($this.hasClass('repeater-type-dates')) {
                initRepeater($this, 'dates');
            } else if ($this.hasClass('repeater-type-home-cards')) {
                initRepeater($this, 'home-cards');
            } else if ($this.hasClass('repeater-type-home-values')) {
                initRepeater($this, 'home-values');
            } else if ($this.hasClass('repeater-type-home-banner')) {
                initRepeater($this, 'home-banner');
            }
        });
    });
    </script>
    <?php
}
