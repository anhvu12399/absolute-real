<?php
/**
 * Editing UI for the JSON-backed repeaters.
 *
 * Every repeater is one ACF textarea holding a JSON array. This file hides that
 * textarea and renders a table whose columns come from a per-type spec, so the
 * keys the editor produces are exactly the keys the Next.js templates read.
 */

if (!defined('ABSPATH')) exit;

/**
 * Column specs. `key` is the JSON key handed to the frontend.
 * Types: text (default), textarea, image, list (newline -> array), select.
 */
function aat_repeater_specs() {
    return [
        'home-banner' => [
            ['key' => 'image_url', 'label' => 'Large Image', 'type' => 'image'],
            ['key' => 'tagline', 'label' => 'Country / Destination'],
            ['key' => 'description', 'label' => 'Headline', 'type' => 'textarea'],
            ['key' => 'subtitle', 'label' => 'Standfirst', 'type' => 'textarea'],
            ['key' => 'link', 'label' => 'Button Link'],
            ['key' => 'link_text', 'label' => 'Button Text'],
        ],
        'home-cards' => [
            ['key' => 'image_url', 'label' => 'Image', 'type' => 'image'],
            ['key' => 'badge', 'label' => 'Badge'],
            ['key' => 'title', 'label' => 'Title'],
            ['key' => 'meta', 'label' => 'Meta'],
            ['key' => 'description', 'label' => 'Description', 'type' => 'textarea'],
            ['key' => 'link', 'label' => 'Link URL'],
            ['key' => 'link_text', 'label' => 'Link Text'],
        ],
        'home-values' => [
            ['key' => 'title', 'label' => 'Title'],
            ['key' => 'description', 'label' => 'Description', 'type' => 'textarea'],
        ],
        'testimonials' => [
            ['key' => 'avatar', 'label' => 'Avatar', 'type' => 'image'],
            ['key' => 'user_name', 'label' => 'Name'],
            ['key' => 'date', 'label' => 'Date'],
            ['key' => 'vote', 'label' => 'Rating'],
            ['key' => 'content', 'label' => 'Review', 'type' => 'textarea'],
        ],
        'itinerary' => [
            ['key' => 'day_num', 'label' => 'Day #'],
            ['key' => 'group_tag', 'label' => 'Region / City'],
            ['key' => 'title', 'label' => 'Day Title'],
            ['key' => 'description', 'label' => 'Day Description', 'type' => 'textarea'],
            ['key' => 'image_url', 'label' => 'Image', 'type' => 'image'],
            ['key' => 'latitude', 'label' => 'Latitude'],
            ['key' => 'longitude', 'label' => 'Longitude'],
        ],
        'dates' => [
            ['key' => 'date_range', 'label' => 'Date Range'],
            ['key' => 'price_info', 'label' => 'Price Info'],
            ['key' => 'availability_status', 'label' => 'Status', 'type' => 'select', 'options' => ['Available', 'Call for Availability', 'Sold Out']],
        ],
        'faqs' => [
            ['key' => 'question', 'label' => 'Question'],
            ['key' => 'answer', 'label' => 'Answer', 'type' => 'textarea'],
        ],
        'gallery' => [
            ['key' => 'image_url', 'label' => 'Image', 'type' => 'image'],
            ['key' => 'caption', 'label' => 'Caption'],
        ],
        'options' => [
            ['key' => 'title', 'label' => 'Option Title'],
            ['key' => 'nights', 'label' => 'Nights / Days'],
            ['key' => 'description', 'label' => 'Description', 'type' => 'textarea'],
            ['key' => 'link', 'label' => 'Link'],
        ],
        'experiences' => [
            ['key' => 'image_url', 'label' => 'Image', 'type' => 'image'],
            ['key' => 'title', 'label' => 'Title'],
            ['key' => 'description', 'label' => 'Description', 'type' => 'textarea'],
            ['key' => 'link', 'label' => 'Link'],
        ],
        'months' => [
            ['key' => 'month', 'label' => 'Month'],
            ['key' => 'image_url', 'label' => 'Image', 'type' => 'image'],
            ['key' => 'description', 'label' => 'What to Expect', 'type' => 'textarea'],
            ['key' => 'places_title', 'label' => 'Best Places Heading'],
        ],
        'nearby' => [
            ['key' => 'name', 'label' => 'Place Name'],
            ['key' => 'location_map', 'label' => 'Map Label'],
            ['key' => 'latitude', 'label' => 'Latitude'],
            ['key' => 'longitude', 'label' => 'Longitude'],
        ],
        'trust' => [
            ['key' => 'text', 'label' => 'Trust Badge Text'],
        ],
        'reasons' => [
            ['key' => 'icon', 'label' => 'Icon (guide/chat/gem/key/car/clock)'],
            ['key' => 'text', 'label' => 'Text', 'type' => 'textarea'],
        ],
        'pillars' => [
            ['key' => 'kicker', 'label' => 'Kicker (01 · Specialists)'],
            ['key' => 'title', 'label' => 'Title'],
            ['key' => 'text', 'label' => 'Text', 'type' => 'textarea'],
        ],
        'milestones' => [
            ['key' => 'year', 'label' => 'Year'],
            ['key' => 'title', 'label' => 'Headline'],
            ['key' => 'text', 'label' => 'What happened', 'type' => 'textarea'],
        ],
        'team' => [
            ['key' => 'photo', 'label' => 'Photo', 'type' => 'image'],
            ['key' => 'name', 'label' => 'Name'],
            ['key' => 'role', 'label' => 'Role'],
            ['key' => 'bio', 'label' => 'Short bio', 'type' => 'textarea'],
        ],
        'hub-journeys' => [
            ['key' => 'photo', 'label' => 'Photo', 'type' => 'image'],
            ['key' => 'tag', 'label' => 'Badge'],
            ['key' => 'days', 'label' => 'Duration Label'],
            ['key' => 'title', 'label' => 'Title'],
            ['key' => 'desc', 'label' => 'Description', 'type' => 'textarea'],
            ['key' => 'price', 'label' => 'Price Label'],
            ['key' => 'link', 'label' => 'Link'],
            ['key' => 'slug', 'label' => 'Slug (unique)'],
            ['key' => 'category', 'label' => 'Filter Key'],
        ],
        'hub-cruises' => [
            ['key' => 'photo', 'label' => 'Photo', 'type' => 'image'],
            ['key' => 'tag', 'label' => 'Badge'],
            ['key' => 'duration', 'label' => 'Duration Label'],
            ['key' => 'title', 'label' => 'Title'],
            ['key' => 'desc', 'label' => 'Description', 'type' => 'textarea'],
            ['key' => 'highlights', 'label' => 'Highlights (one per line)', 'type' => 'list'],
            ['key' => 'link', 'label' => 'Link'],
            ['key' => 'slug', 'label' => 'Slug (unique)'],
            ['key' => 'category', 'label' => 'Filter Key'],
        ],
        'hub-articles' => [
            ['key' => 'photo', 'label' => 'Photo', 'type' => 'image'],
            ['key' => 'tag', 'label' => 'Badge'],
            ['key' => 'readTime', 'label' => 'Read Time'],
            ['key' => 'title', 'label' => 'Title'],
            ['key' => 'desc', 'label' => 'Description', 'type' => 'textarea'],
            ['key' => 'link', 'label' => 'Link'],
            ['key' => 'slug', 'label' => 'Slug (unique)'],
            ['key' => 'category', 'label' => 'Filter Key'],
        ],
    ];
}

add_action('admin_enqueue_scripts', function () {
    wp_enqueue_media();
    /* jQuery UI Sortable is bundled with WordPress. */
    wp_enqueue_script('jquery-ui-sortable');
});

add_action('admin_footer', 'aat_repeater_admin_ui');

function aat_repeater_admin_ui() {
    $screen = get_current_screen();
    if (!$screen || !in_array($screen->base, ['post', 'term'], true)) return;

    /* The frontend URL for preview buttons. */
    $frontend = defined('NEXT_PUBLIC_SITE_URL')
        ? NEXT_PUBLIC_SITE_URL
        : (get_option('aat_frontend_url', '') ?: rtrim(home_url(), '/'));
    ?>
    <style>
        .custom-free-repeater > .acf-input > textarea, .custom-free-repeater > textarea { display: none !important; }
        .cfr-ui { margin-top: 6px; }
        .cfr-table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #c3c4c7; }
        .cfr-table th, .cfr-table td { border-bottom: 1px solid #e2e4e7; border-right: 1px solid #e2e4e7; padding: 8px; vertical-align: top; }
        .cfr-table th { background: #f6f7f7; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: #50575e; text-align: left; }
        .cfr-table input[type="text"], .cfr-table textarea, .cfr-table select { width: 100%; min-width: 120px; font-size: 13px; padding: 4px 6px; box-sizing: border-box; }
        .cfr-table textarea { min-height: 70px; }
        .cfr-preview { width: 100%; min-width: 130px; height: 90px; background: #f0f0f1 center/cover no-repeat; border: 1px dashed #c3c4c7; display: flex; align-items: center; justify-content: center; color: #8c8f94; font-size: 11px; cursor: pointer; margin-bottom: 4px; border-radius: 4px; transition: border-color .15s; }
        .cfr-preview:hover { border-color: #2271b1; color: #2271b1; }
        .cfr-actions { width: 56px; text-align: center; vertical-align: middle; white-space: nowrap; }
        .cfr-remove-btn { display: inline-flex; width: 22px; height: 22px; border-radius: 50%; border: 1px solid #c3c4c7; align-items: center; justify-content: center; color: #b32d2e; text-decoration: none; font-weight: 700; }
        .cfr-remove-btn:hover { border-color: #b32d2e; }
        .cfr-drag { cursor: grab; color: #c3c4c7; font-size: 16px; user-select: none; display: inline-block; margin-right: 4px; }
        .cfr-drag:active { cursor: grabbing; }
        .cfr-row-num { display: inline-block; width: 18px; height: 18px; border-radius: 50%; background: #e2e4e7; text-align: center; line-height: 18px; font-size: 10px; font-weight: 700; color: #50575e; margin-right: 4px; }
        .cfr-toolbar { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; gap: 8px; }
        .cfr-add-btn { cursor: pointer; }
        .cfr-count { color: #646970; font-size: 12px; }
        .cfr-row.ui-sortable-helper { background: #fffbe6; box-shadow: 0 2px 8px rgba(0,0,0,.12); }
        .cfr-row.cfr-collapsed td:not(.cfr-actions) { display: none; }
        .cfr-row.cfr-collapsed td.cfr-actions { border-right: 0; }
        .cfr-collapse-btn { display: inline-flex; width: 22px; height: 22px; border-radius: 50%; border: 1px solid #c3c4c7; align-items: center; justify-content: center; color: #50575e; text-decoration: none; font-size: 11px; cursor: pointer; margin-left: 2px; }
        .cfr-collapse-btn:hover { border-color: #2271b1; color: #2271b1; }
        /* Preview button in ACF tab area */
        .aat-preview-bar { background: #f0f6fc; border: 1px solid #c3c4c7; border-radius: 4px; padding: 6px 12px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; font-size: 12px; color: #50575e; }
        .aat-preview-bar a { color: #2271b1; text-decoration: none; font-weight: 600; }
        .aat-preview-bar a:hover { text-decoration: underline; }
    </style>
    <script>
    jQuery(function($) {
        var SPECS = <?php echo wp_json_encode(aat_repeater_specs()); ?>;
        var frame;

        function esc(v) { return $('<div>').text(v == null ? '' : v).html(); }

        function initRepeater($wrapper, type) {
            var spec = SPECS[type];
            var $textarea = $wrapper.find('textarea').first();
            if (!spec || !$textarea.length) return;

            var data = [];
            try { var raw = $textarea.val(); if (raw) data = JSON.parse(raw); } catch (e) { data = []; }
            if (!Array.isArray(data)) data = [];

            var $ui = $('<div class="cfr-ui"></div>');
            $wrapper.append($ui);

            function cell(col, value) {
                if (col.type === 'image') {
                    var bg = value ? 'background-image:url(' + value + ');' : '';
                    return '<div class="cfr-preview upload-img-btn" style="' + bg + '">' + (value ? '' : '📷 Upload') + '</div>' +
                        '<input type="hidden" data-key="' + col.key + '" value="' + esc(value) + '" />';
                }
                if (col.type === 'textarea') {
                    return '<textarea data-key="' + col.key + '">' + esc(value) + '</textarea>';
                }
                if (col.type === 'list') {
                    var text = Array.isArray(value) ? value.join('\n') : (value || '');
                    return '<textarea data-key="' + col.key + '" data-list="1">' + esc(text) + '</textarea>';
                }
                if (col.type === 'select') {
                    var out = '<select data-key="' + col.key + '">';
                    col.options.forEach(function(opt) {
                        out += '<option value="' + esc(opt) + '"' + (value === opt ? ' selected' : '') + '>' + esc(opt) + '</option>';
                    });
                    return out + '</select>';
                }
                return '<input type="text" data-key="' + col.key + '" value="' + esc(value) + '" />';
            }

            function render() {
                var html = '<table class="cfr-table"><thead><tr>';
                html += '<th style="width:30px">#</th>';
                spec.forEach(function(col) { html += '<th>' + esc(col.label) + '</th>'; });
                html += '<th class="cfr-actions"></th></tr></thead><tbody class="cfr-sortable">';

                data.forEach(function(item, i) {
                    var summary = esc(item.title || item.name || item.question || item.month || item.year || ('Row ' + (i + 1)));
                    html += '<tr class="cfr-row" data-index="' + i + '">';
                    html += '<td style="text-align:center;vertical-align:middle"><span class="cfr-drag" title="Drag to reorder">☰</span><span class="cfr-row-num">' + (i + 1) + '</span></td>';
                    spec.forEach(function(col) { html += '<td>' + cell(col, item[col.key]) + '</td>'; });
                    html += '<td class="cfr-actions">' +
                        '<a href="#" class="cfr-collapse-btn" title="Toggle collapse">▾</a>' +
                        '<a href="#" class="cfr-remove-btn" title="Delete row">&times;</a>' +
                        '</td></tr>';
                });

                html += '</tbody></table>';
                html += '<div class="cfr-toolbar"><span class="cfr-count">' + data.length + ' rows</span>' +
                    '<div style="display:flex;gap:6px">' +
                    '<a class="button cfr-collapse-all-btn" title="Toggle collapse all">▾ Collapse All</a>' +
                    '<a class="button cfr-add-btn">+ Add Row</a>' +
                    '</div></div>';
                $ui.html(html);

                /* Enable drag-to-reorder */
                $ui.find('.cfr-sortable').sortable({
                    handle: '.cfr-drag',
                    axis: 'y',
                    containment: 'parent',
                    tolerance: 'pointer',
                    update: function() {
                        save();
                        render();
                    }
                });
            }

            function save() {
                var rows = [];
                $ui.find('.cfr-row').each(function() {
                    var obj = {};
                    $(this).find('input, textarea, select').each(function() {
                        var key = $(this).attr('data-key');
                        if (!key) return;
                        if ($(this).attr('data-list')) {
                            obj[key] = String($(this).val()).split('\n')
                                .map(function(line) { return line.trim(); })
                                .filter(function(line) { return line !== ''; });
                        } else {
                            obj[key] = $(this).val();
                        }
                    });
                    rows.push(obj);
                });
                data = rows;
                $textarea.val(JSON.stringify(data));
            }

            $ui.on('click', '.cfr-add-btn', function(e) {
                e.preventDefault();
                save();
                data.push({});
                render();
                save();
            });

            $ui.on('click', '.cfr-remove-btn', function(e) {
                e.preventDefault();
                if (!window.confirm('Xóa dòng này?')) return;
                $(this).closest('.cfr-row').remove();
                save();
                render();
            });

            /* Collapse / expand individual rows */
            $ui.on('click', '.cfr-collapse-btn', function(e) {
                e.preventDefault();
                $(this).closest('.cfr-row').toggleClass('cfr-collapsed');
            });

            /* Collapse / expand all */
            $ui.on('click', '.cfr-collapse-all-btn', function(e) {
                e.preventDefault();
                var $rows = $ui.find('.cfr-row');
                var allCollapsed = $rows.filter('.cfr-collapsed').length === $rows.length;
                $rows.toggleClass('cfr-collapsed', !allCollapsed);
                $(this).text(allCollapsed ? '▾ Thu gọn' : '▸ Mở rộng');
            });

            $ui.on('click', '.upload-img-btn', function(e) {
                e.preventDefault();
                var $preview = $(this);
                var $input = $preview.siblings('input');
                frame = frame || wp.media({ title: 'Chọn ảnh', button: { text: 'Dùng ảnh này' }, multiple: false });
                frame.off('select').on('select', function() {
                    var attachment = frame.state().get('selection').first().toJSON();
                    $input.val(attachment.url);
                    $preview.css('background-image', 'url(' + attachment.url + ')').text('');
                    save();
                });
                frame.open();
            });

            $ui.on('change keyup', 'input, textarea, select', save);

            render();
        }

        $('.custom-free-repeater').each(function() {
            var $this = $(this);
            var match = ($this.attr('class') || '').match(/repeater-type-([a-z0-9-]+)/);
            if (match) initRepeater($this, match[1]);
        });

        /* ── Preview button in each ACF tab ── */
        var frontendUrl = <?php echo wp_json_encode(rtrim($frontend, '/')); ?>;
        var postSlug = $('#post_name').val() || '';
        var postType = $('#post_type').val() || '';
        var previewPath = '/';

        /* Derive the preview path from what we know about the post. */
        if (postType === 'homepage') previewPath = '/';
        else if (postType === 'tour' || postType === 'hotel' || postType === 'place_to_go' || postType === 'travel_guide' || postType === 'thing_to_do' || postType === 'blog') {
            previewPath = '/' + postSlug + '/';
        } else if (postType === 'page') {
            previewPath = '/' + postSlug + '/';
        }

        /* Insert a preview bar after each ACF tab that has a matching section. */
        var TAB_SECTIONS = {
            'Hero & Ticker': '', '🖼 Banner đầu trang': '',
            'Statement & Stats': 'statement', 'Journey Tabs': 'journeys',
            'Explore, Stay & Travel': 'explore', 'Map & Values': 'map',
            'Why Choose Us': 'why', 'Reviews & Contact': 'reviews',
            'Key Facts': '', 'Overview': 'overview', 'Itinerary': 'itinerary',
            'Stays & Options': 'stays', 'Inclusions & Dates': 'inclusions',
            'Gallery, Experiences & FAQs': 'gallery',
            '📜 Câu chuyện — Our Story': 'story', 'Team': 'team',
            'Guarantees': 'pillars', 'Country Page': '',
            'Speak to a Specialist': 'specialist',
        };

        $('.acf-tab-wrap .acf-tab-button, .acf-tab-group li a').each(function() {
            var label = $(this).text().trim();
            if (TAB_SECTIONS.hasOwnProperty(label)) {
                var section = TAB_SECTIONS[label];
                var url = frontendUrl + previewPath + (section ? '#' + section : '');
                var $bar = $('<div class="aat-preview-bar">' +
                    '👁 <a href="' + url + '" target="_blank">Xem trên trang</a>' +
                    '<span style="color:#8c8f94">— phần "' + esc(label) + '" hiện ở đâu trên frontend</span>' +
                    '</div>');
                /* Place the bar after the tab's content panel rather than after the
                   tab button, because ACF switches visibility on the panel. */
            }
        });
    });
    </script>
    <?php
}
