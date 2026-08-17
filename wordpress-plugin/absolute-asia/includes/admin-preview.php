<?php
/**
 * Admin live preview panel — with real-time editing.
 *
 * Shows a sidebar iframe of the frontend page. When the editor types in an
 * ACF field, the change is sent to the iframe via postMessage and the
 * frontend script updates the DOM element immediately — no page reload.
 *
 * Two halves make this work:
 *   1. This file (WP admin) — captures keystrokes and posts them to the iframe
 *   2. /public/admin-preview-bridge.js (frontend) — receives messages and
 *      patches the DOM with CSS selectors mapped from field names
 */

if (!defined('ABSPATH')) exit;

add_action('admin_footer', 'aat_admin_preview_panel');

function aat_admin_preview_panel() {
    $screen = get_current_screen();
    if (!$screen || !in_array($screen->base, ['post', 'term'], true)) return;

    $frontend = get_option('aat_frontend_url', '');
    if (!$frontend) $frontend = rtrim(home_url(), '/');
    $frontend = rtrim($frontend, '/');

    $preview_type = '';
    $preview_slug = '';
    $permalink_path = '/';

    if ($screen->base === 'post') {
        global $post;
        if ($post) {
            $preview_type = (string) $post->post_type;
            $preview_slug = (string) $post->post_name;
            $full = get_permalink($post->ID);
            $parsed = $full ? wp_parse_url($full) : [];
            $permalink_path = isset($parsed['path']) ? $parsed['path'] : '/';
        }
    } else {
        $taxonomy = isset($_GET['taxonomy']) ? sanitize_key(wp_unslash($_GET['taxonomy'])) : '';
        $term_id = isset($_GET['tag_ID']) ? absint($_GET['tag_ID']) : 0;
        $term = $term_id && $taxonomy ? get_term($term_id, $taxonomy) : null;
        if ($term && !is_wp_error($term)) {
            $preview_type = (string) $taxonomy;
            $preview_slug = (string) $term->slug;
            $full = get_term_link($term);
            $parsed = !is_wp_error($full) ? wp_parse_url($full) : [];
            $permalink_path = isset($parsed['path']) ? $parsed['path'] : '/';
        }
    }

    ?>
    <style>
        #aat-preview-panel {
            position: fixed;
            top: 32px;
            right: -460px;
            width: 440px;
            height: calc(100vh - 32px);
            background: #fff;
            border-left: 1px solid #c3c4c7;
            box-shadow: -4px 0 16px rgba(0,0,0,.08);
            z-index: 99999;
            transition: right .3s ease;
            display: flex;
            flex-direction: column;
        }
        #aat-preview-panel.is-open { right: 0; }
        #aat-preview-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: #1d2327;
            border-bottom: 1px solid #c3c4c7;
            font-size: 12px;
            font-weight: 600;
            color: #fff;
            flex-shrink: 0;
        }
        #aat-preview-header .aat-section-label {
            color: #72aee6;
            font-weight: 400;
            margin-left: 8px;
            font-size: 11px;
        }
        #aat-preview-header .aat-live-dot {
            display: inline-block;
            width: 6px; height: 6px;
            border-radius: 50%;
            background: #00ba37;
            margin-right: 6px;
            animation: aat-pulse 2s infinite;
        }
        @keyframes aat-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
        #aat-preview-close {
            background: none; border: none; cursor: pointer;
            font-size: 18px; color: #c3c4c7; padding: 0 4px;
        }
        #aat-preview-close:hover { color: #d63638; }
        #aat-preview-iframe {
            flex: 1;
            border: none;
            width: 100%;
        }
        #aat-preview-toggle {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 100000;
            background: #2271b1;
            color: #fff;
            border: none;
            border-radius: 50%;
            width: 48px;
            height: 48px;
            font-size: 20px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,.2);
            transition: background .15s, transform .15s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #aat-preview-toggle:hover {
            background: #135e96;
            transform: scale(1.05);
        }
        #aat-preview-toggle.is-active { background: #00ba37; }
        #aat-preview-status {
            padding: 4px 12px;
            background: #f6f7f7;
            border-bottom: 1px solid #e2e4e7;
            font-size: 11px;
            color: #646970;
            flex-shrink: 0;
        }
    </style>

    <div id="aat-preview-panel">
        <div id="aat-preview-header">
            <span><span class="aat-live-dot"></span>Live Preview <span class="aat-section-label" id="aat-preview-section"></span></span>
            <button id="aat-preview-close" title="Close preview">&times;</button>
        </div>
        <div id="aat-preview-status">Type into any field to see real-time updates below</div>
        <iframe id="aat-preview-iframe" src="about:blank"></iframe>
    </div>

    <button id="aat-preview-toggle" title="Toggle live preview">👁</button>

    <script>
    jQuery(function($) {
        var frontendUrl = <?php echo wp_json_encode($frontend); ?>;
        var postSlug = <?php echo wp_json_encode($preview_slug); ?> || $('#post_name').val() || '';
        var postType = <?php echo wp_json_encode($preview_type); ?> || $('#post_type').val() || '';

        /* Use the real permalink path so Hotels (/collection/…), Tours (/tours/…)
           and every other post type land on the correct frontend URL. */
        var wpPermalink = <?php echo wp_json_encode($permalink_path); ?>;

        var previewPath = '/';
        if (postType === 'homepage') previewPath = '/';
        else if (wpPermalink && wpPermalink !== '/') previewPath = wpPermalink;
        else if (postSlug) previewPath = '/' + postSlug + '/';

        /* Append ?_aat_preview=1 so the frontend knows to load the bridge script. */
        var baseUrl = frontendUrl + previewPath + (previewPath.indexOf('?') > -1 ? '&' : '?') + '_aat_preview=1';

        /**
         * FIELD_SELECTOR maps a WP field name to a CSS selector on the frontend.
         * The bridge script uses this to find the DOM element to update.
         *
         * Types:
         *   'text'  — replace textContent
         *   'html'  — replace innerHTML (for fields that allow HTML)
         *   'image' — replace backgroundImage or src
         *   'attr'  — replace a specific attribute
         */
        var FIELD_MAP = {
            /* ── Homepage ── */
            'home_banner_slider': { sel: '#hero', section: 'hero' },
            'trust_items':        { sel: '.trustbar', section: 'hero' },
            'intro_headline':     { sel: '#statement .intro-headline', type: 'text', section: 'statement' },
            'statement_text':     { sel: '#statement .intro-copy', type: 'html', section: 'statement' },
            'intro_cta_label':    { sel: '#statement .intro-cta', type: 'text', section: 'statement' },
            'tabs_headline':      { sel: '#journeys h2', type: 'html', section: 'journeys' },
            'tab_dest_label':     { sel: '.tabs-row button:nth-child(1)', type: 'text', section: 'journeys' },
            'tab_journeys_label': { sel: '.tabs-row button:nth-child(2)', type: 'text', section: 'journeys' },
            'tab_inspiration_label': { sel: '.tabs-row button:nth-child(3)', type: 'text', section: 'journeys' },
            'home_tab_destinations': { sel: '#journeys', section: 'journeys' },
            'home_tab_journeys':     { sel: '#journeys', section: 'journeys' },
            'home_tab_inspiration':  { sel: '#journeys', section: 'journeys' },
            'home_editorial':        { sel: '.editorial-grid', section: 'inspiration' },
            'featured_eyebrow':   { sel: '#featured .eyebrow', type: 'html', section: 'featured' },
            'featured_headline':  { sel: '#featured h2', type: 'html', section: 'featured' },
            'stay_eyebrow':       { sel: '#stay .eyebrow', type: 'html', section: 'stay' },
            'stay_headline':      { sel: '#stay h2', type: 'html', section: 'stay' },
            'inspiration_headline': { sel: '#inspiration h2', type: 'html', section: 'inspiration' },
            'map_headline':       { sel: '#map h2', type: 'html', section: 'map' },
            'map_description':    { sel: '#map p:last-of-type', type: 'text', section: 'map' },
            'quote_text':         { sel: '#quote q', type: 'text', section: 'quote' },
            'quote_citation':     { sel: '#quote cite', type: 'text', section: 'quote' },
            'quote_image':        { sel: '#quote', type: 'image', section: 'quote' },
            'responsibly_headline': { sel: '#responsibly h2', type: 'html', section: 'responsibly' },
            'responsibly_text':     { sel: '#responsibly p:not(.eyebrow)', type: 'text', section: 'responsibly' },
            'responsibly_image':    { sel: '#responsibly .split-photo', type: 'image', section: 'responsibly' },
            'story_bar_tagline':  { sel: '#values .story-tag', type: 'text', section: 'values' },
            'story_bar_headline': { sel: '#values h2', type: 'html', section: 'values' },
            'story_bar_link_text': { sel: '#values .btn', type: 'text', section: 'values' },
            'story_bar_image':    { sel: '#values', type: 'image', section: 'values' },
            'home_values':        { sel: '#why, #values', section: 'why' },
            'plan_eyebrow':       { sel: '#plan .eyebrow', type: 'html', section: 'plan' },
            'plan_headline':      { sel: '#plan h2', type: 'html', section: 'plan' },
            'plan_desc':          { sel: '#plan p:not(.eyebrow)', type: 'text', section: 'plan' },
            'plan_btn':           { sel: '#plan a.btn', type: 'text', section: 'plan' },
            'specialists_headline': { sel: '#specialists h2', type: 'html', section: 'specialists' },
            'team':               { sel: '#specialists', section: 'specialists' },
            'testimonials':       { sel: '#reviews, #testimonials', section: 'reviews' },
            'review_summary':     { sel: '.review-summary', type: 'html', section: 'reviews' },
            'review_logo':        { sel: '#reviews .review-logo', type: 'image', section: 'reviews' },
            'review_text':        { sel: '#reviews .link-arrow', type: 'text', section: 'reviews' },
            'phone':              { sel: '.utility-left strong, footer strong', type: 'text', section: 'hero' },
            'text_phone':         { sel: '.utility-left span', type: 'text', section: 'hero' },

            /* ── Tour ── */
            'hero_image':         { sel: '#hero, .hotel-hero-plate', type: 'image', section: 'hero' },
            'hero_eyebrow':       { sel: '.hero-eyebrow, .crumb', type: 'text', section: 'hero' },
            'duration_days':      { sel: '[data-preview="duration_days"] .num', type: 'text', section: 'hero' },
            'duration_label':     { sel: '[data-preview="duration_label"] .num', type: 'text', section: 'hero' },
            'destinations_count': { sel: '[data-preview="destinations_count"] .num', type: 'text', section: 'hero' },
            'min_guests':         { sel: '[data-preview="min_guests"] .num', type: 'text', section: 'hero' },
            'tour_route':         { sel: '.tour-route, .breadcrumb-route', type: 'text', section: 'hero' },
            'tour_level':         { sel: '.tour-level, .activity-level', type: 'text', section: 'overview' },
            'tour_code':          { sel: '.tour-code', type: 'text', section: 'overview' },
            'intro_title':        { sel: '#overview .eyebrow, #overview h2', type: 'html', section: 'overview' },
            'intro_description':  { sel: '#overview .wordpress-content, .overview-lede p', type: 'text', section: 'overview' },
            'highlights_title':   { sel: '#overview .headline, #overview h3', type: 'html', section: 'overview' },
            'highlights_list':    { sel: '#overview .inclusion-list', section: 'overview' },
            'highlights_note':    { sel: '#overview .tour-note', type: 'text', section: 'overview' },
            'why_reasons':        { sel: '.why-grid', section: 'overview' },
            'related_tours_title': { sel: '#related-tours h2', type: 'text', section: 'related-tours' },
            'itinerary':          { sel: '#itinerary', section: 'itinerary' },
            'itinerary_eyebrow':  { sel: '#itinerary .eyebrow', type: 'html', section: 'itinerary' },
            'itinerary_title':    { sel: '#itinerary h2', type: 'text', section: 'itinerary' },
            'featured_stays':     { sel: '#stays', section: 'stays' },
            'hotels_eyebrow':     { sel: '#stays .eyebrow', type: 'html', section: 'stays' },
            'hotels_title':       { sel: '#stays h2', type: 'text', section: 'stays' },
            'accommodation_options': { sel: '#stays', section: 'stays' },
            'inclusions_list':    { sel: '#inclusions', section: 'inclusions' },
            'exclusions_list':    { sel: '#inclusions', section: 'inclusions' },
            'inclusions_eyebrow': { sel: '#inclusions .eyebrow', type: 'html', section: 'inclusions' },
            'inclusions_title':   { sel: '#inclusions h2', type: 'text', section: 'inclusions' },
            'special_offer_text': { sel: '.offer-callout', type: 'text', section: 'inclusions' },
            'departure_dates':    { sel: '#dates, #inclusions', section: 'inclusions' },
            'gallery':            { sel: '#gallery, #plates', section: 'gallery' },
            'gallery_title':      { sel: '#gallery h2, #plates h2', type: 'text', section: 'gallery' },
            'experiences':        { sel: '#experiences', section: 'experiences' },
            'faqs':               { sel: '#faqs', section: 'faqs' },
            'faq_eyebrow':        { sel: '#faqs .eyebrow', type: 'html', section: 'faqs' },
            'faq_title':          { sel: '#faqs h2', type: 'text', section: 'faqs' },
            'gallery_eyebrow':    { sel: '#gallery .eyebrow', type: 'html', section: 'gallery' },
            'group_cta_title':    { sel: '[data-preview="group_cta_title"]', type: 'text', section: 'overview' },
            'group_cta_desc':     { sel: '[data-preview="group_cta_desc"]', type: 'text', section: 'overview' },
            'group_cta_btn':      { sel: '[data-preview="group_cta_btn"]', type: 'text', section: 'overview' },
            'options_title':      { sel: '[data-preview="options_title"]', type: 'text', section: 'stays' },
            'options_note':       { sel: '[data-preview="options_note"]', type: 'text', section: 'stays' },
            'exclusions_title':   { sel: '[data-preview="exclusions_title"]', type: 'text', section: 'inclusions' },
            'dates_title':        { sel: '[data-preview="dates_title"]', type: 'text', section: 'inclusions' },
            'inclusions_btn_text': { sel: '[data-preview="inclusions_btn_text"]', type: 'text', section: 'overview' },
            'inquiry_btn_text':   { sel: '[data-preview="inquiry_btn_text"]', type: 'text', section: 'inclusions' },
            'cta_label':          { sel: '[data-preview="inquiry_btn_text"]', type: 'text', section: 'inclusions' },

            /* ── Hotel ── */
            'hotel_location':     { sel: '.hotel-hero-loc', type: 'text', section: 'hero' },
            'hotel_highlights':   { sel: '#facts .hotel-spec', section: 'facts' },
            'location_map':       { sel: '.map-location-label', type: 'text', section: 'location' },
            'latitude':           { sel: '#facts, .hotel-coords', type: 'text', section: 'facts' },
            'longitude':          { sel: '#facts, .hotel-coords', type: 'text', section: 'facts' },
            'city':               { sel: '#nearby', section: 'nearby' },
            'nearby_places':      { sel: '#nearby', section: 'nearby' },
            'related_tours':      { sel: '#journeys', section: 'journeys' },
            'related_hotels':     { sel: '#nearby', section: 'nearby' },
            'related_things':     { sel: '#nearby', section: 'nearby' },
            'tours_title':        { sel: '#journeys h2', type: 'text', section: 'journeys' },
            'hotels_title':       { sel: '#nearby h2', type: 'text', section: 'nearby' },
            'in_brief_title':     { sel: '#facts h2', type: 'text', section: 'facts' },
            'things_title':       { sel: '#nearby h2', type: 'text', section: 'nearby' },
            'location_title':     { sel: '#location h2', type: 'text', section: 'location' },
            'location_subtitle':  { sel: '.hotel-brief-sub', type: 'text', section: 'location' },

            /* ── Articles (Guides / Things to Do / Blog) ── */
            'read_minutes':       { sel: '.read-minutes', type: 'text', section: 'hero' },
            'intro_html':         { sel: '#overview .wordpress-content, .article-intro', type: 'html', section: 'overview' },
            'content_left':       { sel: '.secondary-column', type: 'html', section: 'content' },
            'content_right_image': { sel: '.secondary-image', type: 'image', section: 'content' },
            'further_title':      { sel: '#further h2', type: 'text', section: 'further' },
            'related_guides':     { sel: '#further', section: 'further' },
            'plan_title':         { sel: '#plan h2', type: 'text', section: 'plan' },
            'plan_description':   { sel: '#plan p', type: 'html', section: 'plan' },
            'plan_html':          { sel: '#plan .plan-block', type: 'html', section: 'plan' },
            'plan_footer':        { sel: '#plan .plan-footer', type: 'html', section: 'plan' },
            'view_more_label':    { sel: '#plan .btn, #plan .link-arrow', type: 'text', section: 'plan' },

            /* ── Destination (Places to Go) ── */
            'hero_tagline':       { sel: '.hero-copy h1, .hero-tagline', type: 'text', section: 'hero' },
            'destination_overview': { sel: '#overview .serif-block, #overview', type: 'html', section: 'overview' },
            'post_content':       { sel: '.wordpress-content, #overview .wordpress-content, .dispatch-column', type: 'html', section: 'overview' },
            'map_stops':          { sel: '#map', section: 'map' },
            'related_title':      { sel: '#journeys h2', type: 'text', section: 'journeys' },
            'related_description': { sel: '#journeys .center p', type: 'text', section: 'journeys' },
            'featured_tours':     { sel: '#journeys', section: 'journeys' },
            'related_places':     { sel: '#nearby', section: 'nearby' },
            'testimonials_eyebrow': { sel: '#testimonials .eyebrow, #reviews .eyebrow', type: 'html', section: 'testimonials' },
            'testimonials_heading': { sel: '#testimonials h2, #reviews h2', type: 'text', section: 'testimonials' },
            'experiences_eyebrow': { sel: '#experiences .eyebrow', type: 'html', section: 'experiences' },
            'experiences_heading': { sel: '#experiences h2', type: 'text', section: 'experiences' },
            'stays_eyebrow':      { sel: '#hotels .eyebrow', type: 'html', section: 'hotels' },
            'stays_heading':      { sel: '#hotels h2', type: 'text', section: 'hotels' },
            'route_eyebrow':      { sel: '#map .eyebrow', type: 'html', section: 'map' },
            'guides_eyebrow':     { sel: '#explore .eyebrow', type: 'html', section: 'explore' },
            'guides_heading':     { sel: '#explore h2', type: 'text', section: 'explore' },
            'planning_eyebrow':   { sel: '#plan .eyebrow', type: 'html', section: 'plan' },
            'planning_heading':   { sel: '#plan h2', type: 'text', section: 'plan' },

            /* ── Destination guide sections ── */
            'best_time_html':     { sel: '#best-time .wordpress-content', type: 'html', section: 'best-time' },
            'best_time_image':    { sel: '#best-time .split-photo, #best-time img', type: 'image', section: 'best-time' },
            'month_guide_title':  { sel: '#months h2', type: 'text', section: 'months' },
            'month_guide':        { sel: '#months', section: 'months' },
            'trip_ideas_title':   { sel: '#trip-ideas h2', type: 'text', section: 'trip-ideas' },
            'popular_places_html': { sel: '#popular .wordpress-content', type: 'html', section: 'popular' },
            'experiences_html':   { sel: '#ideas .wordpress-content', type: 'html', section: 'ideas' },
            'trip_ideas_html':    { sel: '#trip-ideas .wordpress-content', type: 'html', section: 'trip-ideas' },

            /* ── Pages (About Us / Story) ── */
            'eyebrow':            { sel: '.hero-copy .eyebrow, [class*="eyebrow"]', type: 'text', section: 'hero' },
            'page_description':   { sel: '.hero-copy p:not(.eyebrow)', type: 'text', section: 'hero' },
            'story_eyebrow':      { sel: '#story .eyebrow', type: 'html', section: 'story' },
            'story_headline':     { sel: '#story h2:first-of-type', type: 'text', section: 'story' },
            'story_lede':         { sel: '#story .story-open p', type: 'text', section: 'story' },
            'story_milestones':   { sel: '#story .story-rail', section: 'story' },
            'story_now_title':    { sel: '.story-now h3', type: 'text', section: 'story' },
            'story_now_text':     { sel: '.story-now p', type: 'text', section: 'story' },
            'story_founder_name': { sel: '.founder-name', type: 'text', section: 'story' },
            'story_founder_role': { sel: '.founder-role', type: 'text', section: 'story' },
            'story_founder_quote': { sel: '.founder-card q', type: 'text', section: 'story' },
            'story_founder_photo': { sel: '.founder-photo', type: 'image', section: 'story' },
            'pillars_title':      { sel: '#pillars h2', type: 'text', section: 'pillars' },
            'team_title':         { sel: '#team h2', type: 'text', section: 'team' },
            'directory_eyebrow':  { sel: '#featured .eyebrow, #cruises .eyebrow, #hotels .eyebrow, #journeys .eyebrow, #articles .eyebrow', type: 'html', section: 'featured' },
            'directory_headline': { sel: '#featured h2, #cruises h2, #hotels h2, #journeys h2, #articles h2', type: 'text', section: 'featured' },
            'directory_description': { sel: '#featured .center p, #cruises .center p, #hotels .center p', type: 'text', section: 'featured' },
            'cta_eyebrow':        { sel: '.on-ink .eyebrow', type: 'html', section: 'explore' },
            'cta_headline':       { sel: '.on-ink h2', type: 'text', section: 'explore' },
            'cta_description':    { sel: '.on-ink .center > p', type: 'text', section: 'explore' },
            'cta_button':         { sel: '.on-ink .btn', type: 'text', section: 'explore' },
            'journeys':           { sel: '#journeys', section: 'journeys' },
            'cruises':            { sel: '#cruises', section: 'cruises' },
            'articles':           { sel: '#articles', section: 'articles' },
            'pillars':            { sel: '#pillars', section: 'pillars' },


            /* Deliberately absent: hero_eyebrow_link, intro_cta_link, cta_link,
               classic_tour_link, review_link, view_more_link and is_featured.
               A URL and a boolean have no text of their own on the page, so
               there is nothing for a live preview to repaint - the change only
               shows after a save, when the link actually points somewhere new. */
            /* ── Shared Specialist ── */
            'specialist_title':   { sel: '#specialist h2, .specialist-block h2', type: 'text', section: 'specialist' },
            'specialist_text':    { sel: '#specialist p, .specialist-block p', type: 'text', section: 'specialist' },
            'specialist_photo':   { sel: '#specialist img, .specialist-block img', type: 'image', section: 'specialist' },
            'specialist_phone':   { sel: '#specialist .phone, .specialist-block .phone', type: 'text', section: 'specialist' },
            'specialist_button':  { sel: '#specialist .btn, .specialist-block .btn', type: 'text', section: 'specialist' },
            'specialist_link':    { sel: '#specialist .btn, .specialist-block .btn', section: 'specialist' },
            'why_title':          { sel: '#why h2, #overview h2', type: 'html', section: 'overview' },
            'image':              { sel: '#hero, .all-destinations-hero', type: 'image', section: 'hero' },
            'intro':              { sel: '#overview .serif-block, #overview', type: 'text', section: 'overview' },
        };

        var FIELD_SECTION = {
            'home_banner_slider': 'hero',
            'home_tab_destinations': 'journeys', 'home_tab_journeys': 'journeys',
            'home_tab_inspiration': 'journeys',
            'home_editorial': 'inspiration', 'guides_cards': 'explore',
            'home_values': 'values',
            'testimonials': 'reviews', 'review_summary': 'reviews',
            'review_logo': 'reviews', 'review_link': 'reviews', 'review_text': 'reviews',
            'responsibly_image': 'responsibly',
            'story_milestones': 'story',
            'itinerary': 'itinerary',
            'inclusions_list': 'inclusions', 'exclusions_list': 'inclusions',
            'gallery': 'gallery', 'gallery_title': 'gallery',
            'faqs': 'faqs', 'experiences': 'experiences',
            'specialist_title': 'specialist', 'specialist_text': 'specialist',
            'specialist_photo': 'specialist', 'specialist_phone': 'specialist',
            'hotel_highlights': 'facts', 'hotel_location': 'hero',
            'nearby_places': 'nearby',
            'month_guide': 'when-to-go',
            'hero_image': 'hero',
            'pillars': 'pillars', 'team': 'team',
            'journeys': 'listing', 'cruises': 'listing', 'articles': 'listing',
            /* Tour fields which share a rendered section but do not need a
               destructive live DOM patch. */
            'hero_eyebrow_link': 'hero', 'is_featured': 'hero',
            'highlights_note': 'overview',
            'group_cta_title': 'overview', 'group_cta_desc': 'overview',
            'group_cta_btn': 'overview', 'classic_tour_link': 'overview',
            'options_title': 'stays', 'options_note': 'stays',
            'booking_policy_title': 'inclusions', 'cta_label': 'inclusions',
            'cta_link': 'inclusions', 'dates_title': 'inclusions',
            'inclusions_btn_text': 'inclusions', 'exclusions_title': 'inclusions',
            'inquiry_btn_text': 'inclusions', 'gallery_eyebrow': 'gallery',
            'faq_eyebrow': 'faqs', 'faq_title': 'faqs',
            'related_tours_title': 'stays',

            /* Destination and guide fields. */
            'map_headline': 'map', 'map_description': 'map',
            'latitude': 'map', 'longitude': 'map', 'location_map': 'map',
            'testimonials_eyebrow': 'testimonials', 'testimonials_heading': 'testimonials',
            'experiences_eyebrow': 'experiences', 'experiences_heading': 'experiences',
            'stays_eyebrow': 'hotels', 'stays_heading': 'hotels',
            'route_eyebrow': 'journeys', 'guides_eyebrow': 'explore',
            'guides_heading': 'explore', 'planning_eyebrow': 'explore',
            'planning_heading': 'explore', 'related_title': 'explore',
            'related_description': 'explore',
            'month_guide_title': 'months', 'best_time_image': 'best-time',
            'best_time_html': 'best-time', 'popular_places_html': 'popular',
            'experiences_html': 'ideas', 'trip_ideas_html': 'trip-ideas',
            'trip_ideas_title': 'trip-ideas',

            /* Editorial, hotel, homepage and directory-only controls. */
            'plan_footer': 'plan', 'view_more_label': 'further',
            'view_more_link': 'further', 'location_subtitle': 'nearby',
            'specialist_button': 'specialist', 'specialist_link': 'specialist',
            'ticker_link': 'hero', 'intro_cta_link': 'statement',
            'review_link': 'reviews', 'review_text': 'reviews',
            'text_phone': 'plan', 'phone': 'plan', 'link_email_icon': 'plan',
            'why_reasons': 'why',
        };

        var TAB_SECTIONS = {
            'Hero Banner & Trust': 'hero',
            'Brand Statement & Intro': 'statement',
            'Destinations & Journeys Tabs': 'journeys',
            'Featured Journeys & Stays': 'featured',
            'Map & Core Values': 'map',
            'Story & Standards': 'values',
            'Plan Your Trip Form': 'plan',
            'Specialists & Reviews': 'reviews',
            'Key Facts': 'hero',
            'Overview': 'overview',
            'Itinerary': 'itinerary',
            'Stays & Accommodations': 'stays',
            'Stays & Options': 'stays',
            'Inclusions & Dates': 'inclusions',
            'Gallery, Experiences & FAQs': 'gallery',
            'Speak to a Specialist': 'specialist',
            'Hero & Overview': 'hero',
            'Location & Map': 'facts',
            'Gallery': 'plates',
            'Related Content': 'journeys',
            'Section Headings': 'overview',
            'Hero & Content': 'hero',
            'Sidebar & Further Reading': 'further',
            'Sidebar': 'overview',
            'Gallery & Related Tours': 'gallery',
            'Gallery & Related': 'gallery',
            'Plan Your Trip': 'plan',
            'Map': 'map',
            'Related & Gallery': 'explore',
            '📜 Câu chuyện — Our Story': 'story',
            'Team': 'team',
            'Country Page': 'overview',
            'Travel Specialist': 'specialist',
            'Directory Cards': 'listing'
        };

        var POST_TYPE_FALLBACK = {
            'homepage': { section: 'hero', selector: '#hero' },
            'tour': { section: 'overview', selector: '#overview' },
            'hotel': { section: 'story', selector: '#story' },
            'place_to_go': { section: 'overview', selector: '#overview' },
            'page': { section: 'hero', selector: '#hero, main, article' },
            'travel_guide': { selector: '.dispatch-masthead, article' },
            'thing_to_do': { selector: '.dispatch-masthead, article' },
            'blog': { selector: '.dispatch-masthead, article' },
            'trip': { selector: '.dispatch-masthead, article' },
            'country': { section: 'hero', selector: '#hero, .all-destinations-hero, #overview' }
        };

        var $panel = $('#aat-preview-panel');
        var $iframe = $('#aat-preview-iframe');
        var $toggle = $('#aat-preview-toggle');
        var $sectionLabel = $('#aat-preview-section');
        var $status = $('#aat-preview-status');
        var isOpen = false;
        var iframeReady = false;
        var pendingMessages = [];
        var debounceTimer = null;

        $status.text('Preview URL: ' + baseUrl);

        function openPanel() {
            if (!isOpen) {
                $panel.addClass('is-open');
                $toggle.addClass('is-active');
                isOpen = true;
                if ($iframe.attr('src') === 'about:blank') {
                    $status.text('Loading: ' + baseUrl);
                    iframeReady = false;
                    $iframe.attr('src', baseUrl);
                }
            }
        }

        function postToPreview(message) {
            if (!iframeReady) {
                /* Keep only the newest scroll command, but retain live field
                   updates. This fixes the first click being lost while the
                   preview iframe is still loading. */
                if (message.type === 'aat-scroll-to') {
                    pendingMessages = pendingMessages.filter(function(item) {
                        return item.type !== 'aat-scroll-to';
                    });
                }
                pendingMessages.push(message);
                return;
            }
            $iframe[0].contentWindow.postMessage(message, '*');
        }

        $iframe.on('load', function() {
            iframeReady = true;
            pendingMessages.forEach(function(message) {
                $iframe[0].contentWindow.postMessage(message, '*');
            });
            pendingMessages = [];
            $status.text('✓ Preview đã sẵn sàng — bấm vào một field để xem đúng phần').css('color', '#00a32a');
        });

        function closePanel() {
            $panel.removeClass('is-open');
            $toggle.removeClass('is-active');
            isOpen = false;
        }

        /**
         * Send a live update to the iframe via postMessage.
         */
        function sendLiveUpdate(fieldName, value) {
            if (!isOpen) return;

            var mapping = FIELD_MAP[fieldName];
            if (!mapping) return;

            try {
                postToPreview({
                    type: 'aat-live-update',
                    field: fieldName,
                    value: value,
                    selector: mapping.sel,
                    updateType: mapping.type,
                    section: mapping.section
                });

                $sectionLabel.text('→ #' + mapping.section + ' (' + fieldName + ')');
                $status.text('✏️ Đang cập nhật: ' + fieldName).css('color', '#2271b1');
            } catch (e) {
                $status.text('⚠ Không gửi được — kiểm tra URL frontend').css('color', '#d63638');
            }
        }

        /**
         * Scroll the iframe to a section or specific selector.
         */
        function scrollToTarget(section, selector, fieldName) {
            if (!section && !selector) return;
            $sectionLabel.text('→ #' + (section || 'element') + (fieldName ? ' (' + fieldName + ')' : ''));

            try {
                postToPreview({
                    type: 'aat-scroll-to',
                    section: section,
                    selector: selector,
                    field: fieldName
                });
            } catch (e) {
                if (section) {
                    var url = baseUrl + '#' + section;
                    $iframe.attr('src', url);
                }
            }
        }

        /* ── Toggle button ── */
        $toggle.on('click', function() {
            if (isOpen) closePanel(); else openPanel();
        });
        $('#aat-preview-close').on('click', closePanel);

        /* ── Listen for field input events and send live updates ── */
        $(document).on('input keyup change', '.acf-field input[type="text"], .acf-field input[type="number"], .acf-field input[type="url"], .acf-field input[type="email"], .acf-field textarea, .acf-field select', function() {
            var $field = $(this).closest('.acf-field');
            var fieldName = $field.attr('data-name') || '';
            if (!fieldName) return;

            var value = $(this).val();

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
                sendLiveUpdate(fieldName, value);
            }, 150);
        });

        /* ── The main editor, which is not an ACF field ── */
        /* Typing in the body did nothing to the preview, so an edit there
           looked like the preview was ignoring it — or worse, like the text
           was hardcoded. It is `post_content`, not a field, so it needs its
           own listener: TinyMCE fires its own events, and the Text tab is a
           plain textarea. */
        function sendBody(html) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                sendLiveUpdate('post_content', html);
            }, 200);
        }

        $(document).on('input keyup change', '#content', function () {
            sendBody($(this).val());
        });

        if (window.tinymce) {
            /* `init` fires once the visual editor exists; binding straight
               away misses it because ACF and TinyMCE both load after this. */
            tinymce.on('AddEditor', function (e) {
                if (e.editor.id !== 'content') return;
                e.editor.on('KeyUp Change SetContent', function () {
                    sendBody(e.editor.getContent());
                });
            });
        }

        /* ── Focus or click on ANY field/element → instantly scroll preview to target ── */
        $(document).on('focus click', '.acf-field, .acf-field *, .custom-free-repeater, .custom-free-repeater *', function(e) {
            var $field = $(this).closest('.acf-field');
            var fieldName = $field.attr('data-name') || '';

            if (!fieldName) {
                var $repeater = $(this).closest('.custom-free-repeater');
                if ($repeater.length) {
                    var match = ($repeater.attr('class') || '').match(/repeater-type-([a-z0-9-]+)/);
                    if (match) fieldName = match[1];
                }
            }

            if (!fieldName) return;

            var mapping = FIELD_MAP[fieldName];
            var section = mapping ? mapping.section : FIELD_SECTION[fieldName];
            var selector = mapping ? mapping.sel : null;

            /* A field without an explicit map inherits the nearest ACF tab.
               This is what makes newly added fields previewable immediately
               instead of silently doing nothing until FIELD_MAP is updated. */
            if (!section && !selector) {
                var tabLabel = $field.prevAll('.acf-field-tab').first().find('.acf-tab-button, a').first().text().trim();
                if (!tabLabel) {
                    tabLabel = $field.closest('.acf-fields').find('.acf-tab-button.active, .acf-tab-group .active a').first().text().trim();
                }
                if (tabLabel && TAB_SECTIONS[tabLabel]) section = TAB_SECTIONS[tabLabel];
            }

            if (!section && !selector && POST_TYPE_FALLBACK[postType]) {
                section = POST_TYPE_FALLBACK[postType].section || null;
                selector = POST_TYPE_FALLBACK[postType].selector || null;
            }

            openPanel();
            scrollToTarget(section, selector, fieldName);
        });

        /* ── ACF tab clicks ── */
        $(document).on('click', '.acf-tab-button, .acf-tab-group a', function() {
            var label = $(this).text().trim();
            if (TAB_SECTIONS[label]) {
                openPanel();
                scrollToTarget(TAB_SECTIONS[label], null, label);
            }
        });
    });
    </script>
    <?php
}

/**
 * Open the field the front end asked for.
 *
 * The edit bar on the public site links to `post.php?…&aat_field=<name>`. A
 * plain `#anchor` is not enough here: ACF puts most fields inside tabs, and a
 * field in a closed tab is display:none, so the browser scrolls to nothing.
 * This opens the containing tab first, then scrolls, then marks the field for
 * a few seconds so the editor can see which one was meant.
 *
 * `data-name` is ACF's own attribute on every field wrapper, so no map between
 * field names and keys has to be kept in sync.
 */
add_action('admin_footer', 'aat_admin_focus_field');

function aat_admin_focus_field() {
    $screen = get_current_screen();
    if (!$screen || !in_array($screen->base, ['post', 'term'], true)) return;

    $field = isset($_GET['aat_field']) ? sanitize_key(wp_unslash($_GET['aat_field'])) : '';
    if ($field === '') return;
    ?>
    <style>
        .aat-focus-field {
            box-shadow: 0 0 0 2px #2271b1, 0 0 0 6px rgba(34,113,177,.18) !important;
            border-radius: 3px;
            transition: box-shadow .4s ease;
        }
    </style>
    <script>
    jQuery(function ($) {
        var name = <?php echo wp_json_encode($field); ?>;

        function reveal() {
            var $field = $('.acf-field[data-name="' + name + '"]').first();
            if (!$field.length) return false;

            /* Fields live inside a tab panel; ACF marks the open one. Clicking
               the matching tab button is what actually switches panels. */
            var $tab = $field.prevAll('.acf-field-tab').first();
            if ($tab.length) {
                var key = $tab.data('key');
                $('.acf-tab-button[data-key="' + key + '"], .acf-tab-group li a').each(function () {
                    if ($(this).data('key') === key || $(this).attr('data-key') === key) $(this).trigger('click');
                });
            }

            var top = $field.offset().top - 120;
            $('html, body').animate({ scrollTop: top < 0 ? 0 : top }, 300);
            $field.addClass('aat-focus-field');
            window.setTimeout(function () { $field.removeClass('aat-focus-field'); }, 5000);
            return true;
        }

        /* ACF renders tabs after its own ready pass, so one retry covers the
           case where this runs first. */
        if (!reveal()) window.setTimeout(reveal, 600);
    });
    </script>
    <?php
}
