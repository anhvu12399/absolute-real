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
    if (!$screen || $screen->base !== 'post') return;

    $frontend = get_option('aat_frontend_url', '');
    if (!$frontend) $frontend = rtrim(home_url(), '/');
    $frontend = rtrim($frontend, '/');

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
            <button id="aat-preview-close" title="Đóng preview">&times;</button>
        </div>
        <div id="aat-preview-status">Gõ vào bất kỳ field nào — thay đổi sẽ hiện ngay bên dưới</div>
        <iframe id="aat-preview-iframe" src="about:blank"></iframe>
    </div>

    <button id="aat-preview-toggle" title="Mở/đóng live preview">👁</button>

    <script>
    jQuery(function($) {
        var frontendUrl = <?php echo wp_json_encode($frontend); ?>;
        var postSlug = $('#post_name').val() || '';
        var postType = $('#post_type').val() || '';

        /* Use the real permalink path so Hotels (/collection/…), Tours (/tours/…)
           and every other post type land on the correct frontend URL. */
        var wpPermalink = <?php
            global $post;
            $permalink_path = '/';
            if ($post && $post->post_name) {
                $full = get_permalink($post->ID);
                $parsed = wp_parse_url($full);
                $permalink_path = isset($parsed['path']) ? $parsed['path'] : '/';
            }
            echo wp_json_encode($permalink_path);
        ?>;

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
            'ticker_text':     { sel: '.hero-ticker-text a', type: 'text', section: 'hero' },
            'statement_text':  { sel: '.statement', type: 'html', section: 'statement' },
            'stat_1_num':      { sel: '.stat-item:nth-child(1) .stat-num', type: 'text', section: 'statement' },
            'stat_1_label':    { sel: '.stat-item:nth-child(1) .stat-label', type: 'text', section: 'statement' },
            'stat_2_num':      { sel: '.stat-item:nth-child(2) .stat-num', type: 'text', section: 'statement' },
            'stat_2_label':    { sel: '.stat-item:nth-child(2) .stat-label', type: 'text', section: 'statement' },
            'stat_3_num':      { sel: '.stat-item:nth-child(3) .stat-num', type: 'text', section: 'statement' },
            'stat_3_label':    { sel: '.stat-item:nth-child(3) .stat-label', type: 'text', section: 'statement' },
            'map_headline':    { sel: '.map-copy h2', type: 'html', section: 'map' },
            'map_description': { sel: '.map-copy p:last-of-type', type: 'text', section: 'map' },
            'quote_text':      { sel: '#quote q', type: 'text', section: 'quote' },
            'quote_citation':  { sel: '#quote cite', type: 'text', section: 'quote' },
            'why_title':       { sel: '#why h2, [id="why"] h2', type: 'text', section: 'why' },
            'responsibly_headline': { sel: '#responsibly h2', type: 'html', section: 'responsibly' },
            'responsibly_text':     { sel: '#responsibly p:not(.eyebrow)', type: 'text', section: 'responsibly' },

            /* ── About / Why Us ── */
            'story_eyebrow':       { sel: '#story .eyebrow', type: 'html', section: 'story' },
            'story_headline':      { sel: '#story h2:first-of-type', type: 'text', section: 'story' },
            'story_lede':          { sel: '#story .story-open p:not(.eyebrow)', type: 'text', section: 'story' },
            'story_now_title':     { sel: '.story-now h3', type: 'text', section: 'story' },
            'story_now_text':      { sel: '.story-now p', type: 'text', section: 'story' },
            'story_founder_name':  { sel: '.founder-name', type: 'text', section: 'story' },
            'story_founder_role':  { sel: '.founder-role', type: 'text', section: 'story' },
            'story_founder_quote': { sel: '.founder-card q, .founder-card blockquote', type: 'text', section: 'story' },
            'story_founder_photo': { sel: '.founder-photo', type: 'image', section: 'story' },
            'pillars_title':       { sel: '#pillars h2', type: 'text', section: 'pillars' },
            'team_title':          { sel: '#team h2', type: 'text', section: 'team' },

            /* ── Tour ── */
            'hero_eyebrow':       { sel: '.hero-eyebrow, .crumb', type: 'text', section: 'hero' },
            'duration_days':      { sel: '[data-preview="duration_days"] .num', type: 'text', section: 'hero' },
            'duration_label':     { sel: '[data-preview="duration_label"] .num', type: 'text', section: 'hero' },
            'destinations_count': { sel: '[data-preview="destinations_count"] .num', type: 'text', section: 'hero' },
            'min_guests':         { sel: '[data-preview="min_guests"] .num', type: 'text', section: 'hero' },
            'starting_price':     { sel: '[data-preview="starting_price"]', type: 'text', section: 'hero' },
            'tour_route':         { sel: '.tour-route, .breadcrumb-route', type: 'text', section: 'hero' },
            'tour_level':         { sel: '.tour-level, .activity-level', type: 'text', section: 'overview' },
            'tour_code':          { sel: '.tour-code', type: 'text', section: 'overview' },
            'intro_title':        { sel: '#overview .eyebrow', type: 'html', section: 'overview' },
            'intro_description':  { sel: '#overview .wordpress-content, .overview-lede p', type: 'text', section: 'overview' },
            'highlights_title':   { sel: '#overview .headline', type: 'html', section: 'overview' },

            /* ── Pages ── */
            'eyebrow':          { sel: '.hero-copy .eyebrow, .hero-eyebrow, [class*="eyebrow"]', type: 'text', section: 'hero' },
            'hero_tagline':     { sel: '.hero-copy h1, .hero-title', type: 'text', section: 'hero' },
            'page_description': { sel: '.hero-copy p:not(.eyebrow), .hero-desc', type: 'text', section: 'hero' },

            /* ── Homepage Extras ── */
            'tabs_headline': { sel: '#journeys h2', type: 'html', section: 'journeys' },
            'explore_eyebrow': { sel: '#explore .eyebrow em', type: 'html', section: 'explore' },
            'explore_headline': { sel: '#explore h2', type: 'html', section: 'explore' },
            'stay_eyebrow': { sel: '#stay .eyebrow em', type: 'html', section: 'stay' },
            'stay_headline': { sel: '#stay h2', type: 'html', section: 'stay' },
            'travel_eyebrow': { sel: '#travel .eyebrow em', type: 'html', section: 'travel' },
            'travel_headline': { sel: '#travel h2', type: 'html', section: 'travel' },
            'story_bar_tagline': { sel: '#values .story-tag', type: 'text', section: 'values' },
            'story_bar_headline': { sel: '#values h2', type: 'html', section: 'values' },
            'story_bar_link_text': { sel: '#values .btn', type: 'text', section: 'values' },
            'plan_eyebrow': { sel: '#plan .eyebrow em', type: 'html', section: 'plan' },
            'plan_headline': { sel: '#plan h2', type: 'html', section: 'plan' },
            'plan_desc': { sel: '#plan .plan-copy p:last-child', type: 'text', section: 'plan' },
            'plan_btn': { sel: '#plan button[type="submit"]', type: 'text', section: 'plan' },

            /* ── Destination ── */
            'destination_overview': { sel: '#overview .serif-block, #overview .destination-intro', type: 'html', section: 'overview' },
        };

        /* Also keep a section-only map for fields that can't do live DOM edit
           (repeaters, images with complex rendering) — they just scroll. */
        var FIELD_SECTION = {
            'home_banner_slider': 'hero',
            'home_tab_destinations': 'journeys', 'home_tab_journeys': 'journeys',
            'home_tab_offers': 'journeys', 'home_tab_new': 'journeys',
            'tab_1_label': 'journeys', 'tab_2_label': 'journeys',
            'tab_3_label': 'journeys', 'tab_4_label': 'journeys',
            'home_ways_to_explore': 'explore', 'home_stay_with': 'explore',
            'home_ways_to_travel': 'explore',
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
            'hotel_highlights': 'overview', 'hotel_location': 'overview',
            'nearby_places': 'location',
            'month_guide': 'when-to-go',
            'hero_image': 'hero',
            'pillars': 'pillars', 'team': 'team',
            'journeys': 'listing', 'cruises': 'listing', 'articles': 'listing',
        };

        var $panel = $('#aat-preview-panel');
        var $iframe = $('#aat-preview-iframe');
        var $toggle = $('#aat-preview-toggle');
        var $sectionLabel = $('#aat-preview-section');
        var $status = $('#aat-preview-status');
        var isOpen = false;
        var debounceTimer = null;

        /* Show target URL in status bar so we can debug blank iframes. */
        $status.text('Preview URL: ' + baseUrl);

        function openPanel() {
            if (!isOpen) {
                $panel.addClass('is-open');
                $toggle.addClass('is-active');
                isOpen = true;
                if ($iframe.attr('src') === 'about:blank') {
                    $status.text('Loading: ' + baseUrl);
                    $iframe.attr('src', baseUrl);
                }
            }
        }

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
                $iframe[0].contentWindow.postMessage({
                    type: 'aat-live-update',
                    field: fieldName,
                    value: value,
                    selector: mapping.sel,
                    updateType: mapping.type,
                    section: mapping.section
                }, '*');

                $sectionLabel.text('→ #' + mapping.section + ' (' + fieldName + ')');
                $status.text('✏️ Đang cập nhật: ' + fieldName).css('color', '#2271b1');
            } catch (e) {
                /* Cross-origin — can't postMessage. */
                $status.text('⚠ Không gửi được — kiểm tra URL frontend').css('color', '#d63638');
            }
        }

        /**
         * Scroll the iframe to a section.
         */
        function scrollToSection(section) {
            if (!section) return;
            $sectionLabel.text('→ #' + section);

            try {
                $iframe[0].contentWindow.postMessage({
                    type: 'aat-scroll-to',
                    section: section
                }, '*');
            } catch (e) {
                var url = baseUrl + '#' + section;
                $iframe.attr('src', url);
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

            /* Debounce: wait 150ms after the user stops typing. */
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
                sendLiveUpdate(fieldName, value);
            }, 150);
        });

        /* ── Focus on field → scroll preview to section ── */
        $(document).on('focus click', '.acf-field input, .acf-field textarea, .acf-field select, .acf-field .cfr-ui', function() {
            var $field = $(this).closest('.acf-field');
            var fieldName = $field.attr('data-name') || '';

            if (!fieldName) {
                var $repeater = $(this).closest('.custom-free-repeater');
                if ($repeater.length) {
                    var match = ($repeater.attr('class') || '').match(/repeater-type-([a-z0-9-]+)/);
                    if (match) fieldName = match[1];
                }
            }

            var section = (FIELD_MAP[fieldName] || {}).section || FIELD_SECTION[fieldName];
            if (section) {
                openPanel();
                scrollToSection(section);
            }
        });

        /* ── ACF tab clicks ── */
        $(document).on('click', '.acf-tab-button, .acf-tab-group a', function() {
            var label = $(this).text().trim();
            var TAB_SECTIONS = {
                '🖼 Banner đầu trang — Hero & Ticker': 'hero',
                '📊 Câu mở đầu & Số liệu': 'statement',
                '📍 Tab Hành trình — Các thẻ trên trang chủ': 'journeys',
                '🌏 Khám phá, Lưu trú & Du lịch': 'explore',
                '🗺 Bản đồ & Giá trị cốt lõi': 'map',
                '⭐ Tại sao chọn chúng tôi': 'why',
                '💬 Đánh giá & Liên hệ': 'reviews',
                '📜 Câu chuyện — Our Story': 'story',
                'Team': 'team', 'Guarantees': 'pillars',
                'Key Facts': 'hero', 'Overview': 'overview',
                'Itinerary': 'itinerary', 'Stays & Options': 'stays',
                'Inclusions & Dates': 'inclusions',
                'Gallery, Experiences & FAQs': 'gallery',
                'Speak to a Specialist': 'specialist',
                'Country Page': 'overview', 'Directory Cards': 'listing',
            };
            if (TAB_SECTIONS[label]) {
                openPanel();
                scrollToSection(TAB_SECTIONS[label]);
            }
        });
    });
    </script>
    <?php
}
