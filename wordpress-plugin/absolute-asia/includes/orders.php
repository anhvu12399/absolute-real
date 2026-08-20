<?php
/**
 * Enquiries, as records rather than as a log line.
 *
 * The `order` post type has existed since the site was built but nothing ever
 * wrote to it: /absolute-asia/v1/lead appended to an option capped at 300, so
 * the 301st enquiry deleted the first, and none of them could be searched,
 * assigned or counted. This writes each one as a post — dated, listable,
 * commentable, and permanent.
 *
 * Location is recorded alongside the enquiry because it is the first thing
 * anyone asks about a new lead, and the edge already knows it: no lookup, no
 * third party.
 */

if (!defined('ABSPATH')) exit;

/**
 * Store one enquiry and return its post id.
 *
 * Returns 0 rather than throwing if the insert fails — the caller has already
 * emailed the enquiry, and losing the copy is not a reason to answer the
 * visitor's form with an error.
 *
 * `$capture_request` is the difference between a record and a fiction. The
 * address and location come from the HTTP request being served, which is only
 * the visitor's when a form is actually being submitted. Importing old records
 * runs inside an administrator's page load, so capturing there stamps every
 * historical enquiry with the administrator's own address — a wrong value that
 * looks authoritative, which is worse than an empty column. Callers that are
 * not serving the visitor pass false.
 */
function aat_store_order(array $lead, $capture_request = true) {
    $name        = (string) ($lead['name'] ?? '');
    $email       = (string) ($lead['email'] ?? '');
    $destination = (string) ($lead['destination'] ?? '');

    $title = trim($name . ($destination !== '' ? ' — ' . $destination : ''));
    if ($title === '') $title = $email !== '' ? $email : 'Enquiry';

    $post_id = wp_insert_post([
        'post_type'    => 'order',
        'post_status'  => 'publish',
        'post_title'   => $title,
        'post_content' => (string) ($lead['message'] ?? ''),
    ], true);

    if (is_wp_error($post_id) || !$post_id) return 0;

    $geo = ['country' => '', 'region' => '', 'city' => ''];
    $ip  = '';
    if ($capture_request) {
        if (function_exists('aat_visitor_geo')) $geo = aat_visitor_geo();
        if (function_exists('aat_visitor_ip'))  $ip  = aat_visitor_ip();
    }

    $meta = [
        /* Records where the address came from, so a later reader can tell an
           observed value from an inherited one. Only a request that is
           actually serving the visitor earns 'visitor'; everything else stays
           blank and is treated as unknown. */
        'aat_geo_source'  => $capture_request && $ip !== '' ? 'visitor' : '',
        'aat_name'        => $name,
        'aat_email'       => $email,
        'aat_phone'       => (string) ($lead['phone'] ?? ''),
        'aat_destination' => $destination,
        'aat_source_path' => (string) ($lead['source_path'] ?? '/'),
        'aat_email_sent'  => !empty($lead['email_sent']) ? '1' : '0',
        'aat_status'      => 'new',
        'aat_ip'          => $ip,
        'aat_country'     => $geo['country'],
        'aat_region'      => $geo['region'],
        'aat_city'        => $geo['city'],
    ];
    foreach ($meta as $key => $value) update_post_meta($post_id, $key, $value);

    /* The extra form fields vary by which form was used, so they are kept
       whole rather than flattened into columns that would be empty for most
       enquiries. */
    $details = $lead['details'] ?? [];
    if (is_array($details) && $details) {
        update_post_meta($post_id, 'aat_details', wp_json_encode($details));
    }

    return (int) $post_id;
}

/**
 * Move anything still in the old option into posts.
 *
 * Runs once. Older records have no IP or location — that data was never
 * collected — so those columns stay empty rather than being guessed.
 */
function aat_migrate_legacy_leads() {
    if (get_option('aat_orders_migrated') === '1') return 0;

    $leads = get_option('aat_received_leads', []);
    if (!is_array($leads) || !$leads) {
        update_option('aat_orders_migrated', '1', false);
        return 0;
    }

    $moved = 0;
    /* Oldest first, so post dates come out in the order they arrived. */
    foreach (array_reverse($leads) as $lead) {
        if (!is_array($lead)) continue;

        $post_id = aat_store_order([
            'name'        => $lead['name'] ?? '',
            'email'       => $lead['email'] ?? '',
            'phone'       => $lead['phone'] ?? '',
            'destination' => $lead['destination'] ?? '',
            'message'     => $lead['message'] ?? '',
            'source_path' => $lead['source_path'] ?? '/',
            'details'     => $lead['details'] ?? [],
            'email_sent'  => !empty($lead['email_sent']),
        ], false);
        if (!$post_id) continue;

        if (!empty($lead['date'])) {
            $stamp = strtotime($lead['date']);
            if ($stamp) {
                wp_update_post([
                    'ID'            => $post_id,
                    'post_date'     => get_date_from_gmt(gmdate('Y-m-d H:i:s', $stamp)),
                    'post_date_gmt' => gmdate('Y-m-d H:i:s', $stamp),
                ]);
            }
        }
        update_post_meta($post_id, 'aat_legacy_id', (string) ($lead['id'] ?? ''));
        $moved++;
    }

    update_option('aat_orders_migrated', '1', false);
    return $moved;
}
add_action('admin_init', 'aat_migrate_legacy_leads');

/**
 * Clear addresses that cannot be shown to have come from the visitor.
 *
 * Version 3.11.0 captured the serving request's IP for every record it
 * imported, so historical enquiries — real customers among them — carry the
 * address of whichever administrator triggered the import. A US customer with
 * a Vietnamese IP is how it shows up.
 *
 * Written as SQL after four attempts through get_posts() matched nothing on
 * the server while looking correct in the source. Two of those built the
 * selection from `meta_query`, including an OR that mixed `NOT EXISTS` with a
 * comparison on the same key — a shape WordPress compiles into joins that
 * cannot all be satisfied, so it returns no rows and reports no error. Direct
 * SQL has no such gap between what is written and what runs.
 *
 * An address survives only if `aat_geo_source` says a request serving the
 * visitor wrote it. That marker starts with this version, so everything older
 * is unprovable and cleared — including form submissions between 3.11.0 and
 * 3.11.4, where WordPress was seeing the Worker rather than the visitor and
 * the value was wrong too.
 */
function aat_repair_imported_order_ips() {
    global $wpdb;

    $keys = "'aat_ip','aat_country','aat_region','aat_city'";

    /* Which order posts still hold an address they cannot account for. */
    $ids = $wpdb->get_col(
        "SELECT DISTINCT pm.post_id
           FROM {$wpdb->postmeta} pm
           JOIN {$wpdb->posts} p ON p.ID = pm.post_id AND p.post_type = 'order'
          WHERE pm.meta_key IN ({$keys})
            AND pm.meta_value <> ''
            AND pm.post_id NOT IN (
                  SELECT post_id FROM {$wpdb->postmeta}
                   WHERE meta_key = 'aat_geo_source' AND meta_value = 'visitor'
                )"
    );

    if (!$ids) return 0;

    $in = implode(',', array_map('intval', $ids));

    $wpdb->query(
        "UPDATE {$wpdb->postmeta}
            SET meta_value = ''
          WHERE meta_key IN ({$keys})
            AND post_id IN ({$in})"
    );

    foreach ($ids as $post_id) {
        /* The UPDATE went round the back of the object cache, so anything read
           earlier in this request is stale until the post's meta is dropped —
           clean_post_cache() does exactly that. The marker is written through
           the API so the cache learns about it the normal way. */
        update_post_meta((int) $post_id, 'aat_geo_unknown', '1');
        clean_post_cache((int) $post_id);
    }

    return count($ids);
}

/**
 * Which build is actually running.
 *
 * Added because a fix appeared not to work and there was no way to tell,
 * without SSH, whether the file on the server was the fixed one. A version
 * string on the screen answers that in a glance.
 */
add_action('admin_notices', function () {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->post_type !== 'order' || $screen->base !== 'edit') return;
    global $wpdb;
    $total   = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type='order' AND post_status!='trash'");
    $with_ip = (int) $wpdb->get_var("SELECT COUNT(DISTINCT post_id) FROM {$wpdb->postmeta} WHERE meta_key='aat_ip' AND meta_value<>''");
    $proved  = (int) $wpdb->get_var("SELECT COUNT(DISTINCT post_id) FROM {$wpdb->postmeta} WHERE meta_key='aat_geo_source' AND meta_value='visitor'");

    /* Printed rather than logged: the last three attempts at the IP repair
       each looked correct in the source and did nothing on the server, and
       there was no way to see which of the two was true. These four numbers
       say what the repair is actually looking at. */
    printf(
        '<p style="color:#666;margin:.6em 0 0">Absolute Asia plugin <code>%s</code> · %d yêu cầu · %d còn lưu IP · %d có nguồn xác thực</p>',
        esc_html(defined('AAT_VERSION') ? AAT_VERSION : 'không rõ'),
        $total,
        $with_ip,
        $proved
    );
});

/* Runs wherever an administrator lands, not only on the Orders screen. The
   query is its own guard, so once there is nothing left to fix this costs one
   indexed lookup — cheap enough not to need a special place to live, and it
   cannot be missed by never opening the right page. */
add_action('admin_init', 'aat_repair_imported_order_ips');

add_action('load-edit.php', function () {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->post_type !== 'order') return;

    $fixed = aat_repair_imported_order_ips();
    if (!$fixed) return;

    add_action('admin_notices', function () use ($fixed) {
        printf(
            '<div class="notice notice-success"><p>Đã xoá địa chỉ IP ghi nhầm trên <strong>%d</strong> yêu cầu nhập từ dữ liệu cũ. Những bản ghi đó chưa bao giờ lưu IP thật.</p></div>',
            $fixed
        );
    });
});

/* ── The list screen ────────────────────────────────────────────────────── */

add_filter('manage_order_posts_columns', function ($columns) {
    return [
        'cb'             => $columns['cb'] ?? '',
        'title'          => 'Khách',
        'aat_contact'    => 'Liên hệ',
        'aat_where'      => 'Nơi gửi',
        'aat_page'       => 'Gửi từ trang',
        'aat_status_col' => 'Trạng thái',
        'date'           => 'Nhận lúc',
    ];
});

add_action('manage_order_posts_custom_column', function ($column, $post_id) {
    switch ($column) {
        case 'aat_contact':
            $email = get_post_meta($post_id, 'aat_email', true);
            $phone = get_post_meta($post_id, 'aat_phone', true);
            if ($email) printf('<a href="mailto:%s">%s</a>', esc_attr($email), esc_html($email));
            if ($phone) printf('<br><a href="tel:%s">%s</a>', esc_attr($phone), esc_html($phone));
            if (!$email && !$phone) echo '—';
            break;

        case 'aat_where':
            $city    = get_post_meta($post_id, 'aat_city', true);
            $region  = get_post_meta($post_id, 'aat_region', true);
            $country = get_post_meta($post_id, 'aat_country', true);
            $ip      = get_post_meta($post_id, 'aat_ip', true);

            if (get_post_meta($post_id, 'aat_geo_unknown', true) === '1') {
                /* Imported from before any of this was recorded. Saying so is
                   more useful than a dash that looks like a lookup failure. */
                echo '<span style="color:#999">không ghi nhận</span>';
                break;
            }

            $place = implode(', ', array_filter(array_unique([$city, $region])));
            $flag  = function_exists('aat_country_flag') ? aat_country_flag($country) : '';
            if ($place === '') $place = $country ?: '—';
            echo esc_html(trim($flag . ' ' . $place));
            if ($ip) echo '<br><code style="font-size:11px;color:#666">' . esc_html($ip) . '</code>';
            break;

        case 'aat_page':
            $path = get_post_meta($post_id, 'aat_source_path', true);
            if (!$path) { echo '—'; break; }
            printf('<a href="%s" target="_blank" rel="noopener">%s</a>', esc_url(home_url($path)), esc_html($path));
            break;

        case 'aat_status_col':
            $status = get_post_meta($post_id, 'aat_status', true) ?: 'new';
            $colours = ['new' => '#b45309', 'contacted' => '#1d4ed8', 'quoted' => '#6d28d9', 'won' => '#15803d', 'lost' => '#6b7280'];
            printf(
                '<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:12px;background:%s;color:#fff">%s</span>',
                esc_attr($colours[$status] ?? '#6b7280'),
                esc_html($status)
            );
            break;
    }
}, 10, 2);

/** Everything about an enquiry, on the edit screen where it is worked. */
add_action('add_meta_boxes', function () {
    add_meta_box('aat_order_detail', 'Chi tiết yêu cầu', 'aat_order_metabox', 'order', 'normal', 'high');
});

function aat_order_metabox($post) {
    wp_nonce_field('aat_order_status', 'aat_order_nonce');

    $rows = [
        'Tên'         => get_post_meta($post->ID, 'aat_name', true),
        'Email'       => get_post_meta($post->ID, 'aat_email', true),
        'Điện thoại'  => get_post_meta($post->ID, 'aat_phone', true),
        'Điểm đến'    => get_post_meta($post->ID, 'aat_destination', true),
        'Gửi từ'      => get_post_meta($post->ID, 'aat_source_path', true),
        'IP'          => get_post_meta($post->ID, 'aat_ip', true),
        'Nơi'         => implode(', ', array_filter([
            get_post_meta($post->ID, 'aat_city', true),
            get_post_meta($post->ID, 'aat_region', true),
            get_post_meta($post->ID, 'aat_country', true),
        ])),
        'Email đã gửi' => get_post_meta($post->ID, 'aat_email_sent', true) === '1' ? 'rồi' : 'chưa',
    ];

    echo '<table class="widefat striped" style="margin-bottom:1em">';
    foreach ($rows as $label => $value) {
        printf('<tr><th style="width:150px">%s</th><td>%s</td></tr>', esc_html($label), esc_html($value !== '' ? $value : '—'));
    }
    echo '</table>';

    $details = json_decode((string) get_post_meta($post->ID, 'aat_details', true), true);
    if (is_array($details) && $details) {
        echo '<h4 style="margin:.6em 0">Trường thêm</h4><table class="widefat striped" style="margin-bottom:1em">';
        foreach ($details as $key => $value) {
            printf(
                '<tr><th style="width:150px">%s</th><td>%s</td></tr>',
                esc_html($key),
                esc_html(is_scalar($value) ? (string) $value : wp_json_encode($value))
            );
        }
        echo '</table>';
    }

    $status  = get_post_meta($post->ID, 'aat_status', true) ?: 'new';
    $options = ['new' => 'Mới', 'contacted' => 'Đã liên hệ', 'quoted' => 'Đã báo giá', 'won' => 'Chốt', 'lost' => 'Không thành'];
    echo '<p><label for="aat_status"><strong>Trạng thái</strong></label><br><select name="aat_status" id="aat_status">';
    foreach ($options as $value => $label) {
        printf('<option value="%s"%s>%s</option>', esc_attr($value), selected($status, $value, false), esc_html($label));
    }
    echo '</select></p>';
}

add_action('save_post_order', function ($post_id) {
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!isset($_POST['aat_order_nonce']) || !wp_verify_nonce($_POST['aat_order_nonce'], 'aat_order_status')) return;
    if (!current_user_can('edit_post', $post_id)) return;
    if (!isset($_POST['aat_status'])) return;

    $allowed = ['new', 'contacted', 'quoted', 'won', 'lost'];
    $status  = sanitize_text_field(wp_unslash($_POST['aat_status']));
    if (in_array($status, $allowed, true)) update_post_meta($post_id, 'aat_status', $status);
});

/** A count beside the menu item, so a new enquiry is noticed. */
add_filter('add_menu_classes', function ($menu) {
    $new = get_posts([
        'post_type'      => 'order',
        'posts_per_page' => 50,
        'fields'         => 'ids',
        'meta_query'     => [['key' => 'aat_status', 'value' => 'new']],
    ]);
    if (!$new) return $menu;

    foreach ($menu as $index => $item) {
        if (isset($item[2]) && $item[2] === 'edit.php?post_type=order') {
            $menu[$index][0] .= sprintf(
                ' <span class="awaiting-mod"><span class="pending-count">%d</span></span>',
                count($new)
            );
            break;
        }
    }
    return $menu;
});
