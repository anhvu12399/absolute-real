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
            ['key' => 'image_url_2', 'label' => 'Inset Image', 'type' => 'image'],
            ['key' => 'tagline', 'label' => 'Eyebrow (italic)'],
            ['key' => 'title', 'label' => 'Eyebrow (roman)'],
            ['key' => 'description', 'label' => 'Headline (HTML allowed)', 'type' => 'textarea'],
            ['key' => 'subtitle', 'label' => 'Standfirst', 'type' => 'textarea'],
            ['key' => 'meta', 'label' => 'Inset Caption'],
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
            ['key' => 'title', 'label' => 'Title'],
            ['key' => 'text', 'label' => 'Text', 'type' => 'textarea'],
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
});

add_action('admin_footer', 'aat_repeater_admin_ui');

function aat_repeater_admin_ui() {
    $screen = get_current_screen();
    if (!$screen || $screen->base !== 'post') return;
    ?>
    <style>
        .custom-free-repeater > .acf-input > textarea, .custom-free-repeater > textarea { display: none !important; }
        .cfr-ui { margin-top: 6px; }
        .cfr-table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #c3c4c7; }
        .cfr-table th, .cfr-table td { border-bottom: 1px solid #e2e4e7; border-right: 1px solid #e2e4e7; padding: 8px; vertical-align: top; }
        .cfr-table th { background: #f6f7f7; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: #50575e; text-align: left; }
        .cfr-table input[type="text"], .cfr-table textarea, .cfr-table select { width: 100%; min-width: 120px; font-size: 13px; padding: 4px 6px; box-sizing: border-box; }
        .cfr-table textarea { min-height: 70px; }
        .cfr-preview { width: 100%; min-width: 110px; height: 70px; background: #f0f0f1 center/cover no-repeat; border: 1px dashed #c3c4c7; display: flex; align-items: center; justify-content: center; color: #8c8f94; font-size: 11px; cursor: pointer; margin-bottom: 4px; }
        .cfr-preview:hover { border-color: #2271b1; color: #2271b1; }
        .cfr-actions { width: 34px; text-align: center; vertical-align: middle; }
        .cfr-remove-btn { display: inline-flex; width: 22px; height: 22px; border-radius: 50%; border: 1px solid #c3c4c7; align-items: center; justify-content: center; color: #b32d2e; text-decoration: none; font-weight: 700; }
        .cfr-remove-btn:hover { border-color: #b32d2e; }
        .cfr-toolbar { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
        .cfr-add-btn { cursor: pointer; }
        .cfr-count { color: #646970; font-size: 12px; }
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
                    return '<div class="cfr-preview upload-img-btn" style="' + bg + '">' + (value ? '' : 'Upload') + '</div>' +
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
                spec.forEach(function(col) { html += '<th>' + esc(col.label) + '</th>'; });
                html += '<th class="cfr-actions"></th></tr></thead><tbody>';

                data.forEach(function(item, i) {
                    html += '<tr class="cfr-row" data-index="' + i + '">';
                    spec.forEach(function(col) { html += '<td>' + cell(col, item[col.key]) + '</td>'; });
                    html += '<td class="cfr-actions"><a href="#" class="cfr-remove-btn" title="Remove row">&times;</a></td></tr>';
                });

                html += '</tbody></table>';
                html += '<div class="cfr-toolbar"><span class="cfr-count">' + data.length + ' row(s)</span>' +
                    '<a class="button cfr-add-btn">Add Row</a></div>';
                $ui.html(html);
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
                if (!window.confirm('Remove this row?')) return;
                $(this).closest('.cfr-row').remove();
                save();
                render();
            });

            $ui.on('click', '.upload-img-btn', function(e) {
                e.preventDefault();
                var $preview = $(this);
                var $input = $preview.siblings('input');
                frame = frame || wp.media({ title: 'Select Image', button: { text: 'Use Image' }, multiple: false });
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
    });
    </script>
    <?php
}
