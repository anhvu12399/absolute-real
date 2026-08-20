<?php
/**
 * Who is reading the site, right now and lately.
 *
 * The frontend is served from Cloudflare's edge and most page views never
 * reach WordPress at all, so nothing here can be counted server-side — the
 * browser has to say so itself. A ~700 byte beacon in the page posts to
 * /absolute-asia/v1/beacon, and that is the only source of these rows.
 *
 * Location comes from Cloudflare rather than from an IP lookup service: the
 * edge already knows the country, city and region of the connection and hands
 * them to the Worker, which forwards them as X-AAT-Geo. No third party sees a
 * visitor, and there is no lookup to pay for or rate-limit.
 *
 * On personal data: an IP address is personal data in the EU and California,
 * and this site sells to both. `aat_store_full_ip` decides whether the last
 * octet is kept or zeroed — off by default, which is the answer that needs no
 * disclosure. Turn it on only with a line in the privacy policy to match.
 */

if (!defined('ABSPATH')) exit;

/** Rows older than this are deleted by the daily job. */
const AAT_VISIT_RETENTION_DAYS = 30;

/** A visitor with a hit inside this window counts as "on the site now". */
const AAT_ONLINE_WINDOW_MINUTES = 5;

function aat_visits_table() {
    global $wpdb;
    return $wpdb->prefix . 'aat_visits';
}

/**
 * Create or migrate the table.
 *
 * Called on activation and whenever the stored schema version is behind, so an
 * upgrade over FTP still lands the table without a deactivate/reactivate.
 */
function aat_visits_install() {
    global $wpdb;

    $installed = get_option('aat_visits_schema', '0');
    if ($installed === '2') return;

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    $table   = aat_visits_table();
    $collate = $wpdb->get_charset_collate();

    /* One row per page view. Rolling a per-visitor state row instead would be
       smaller, but then "which pages did this person read" — the question that
       makes the screen worth opening — is unanswerable. */
    dbDelta("CREATE TABLE {$table} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        visitor CHAR(32) NOT NULL DEFAULT '',
        ip VARCHAR(45) NOT NULL DEFAULT '',
        country CHAR(2) NOT NULL DEFAULT '',
        region VARCHAR(64) NOT NULL DEFAULT '',
        city VARCHAR(64) NOT NULL DEFAULT '',
        path VARCHAR(255) NOT NULL DEFAULT '',
        referrer VARCHAR(255) NOT NULL DEFAULT '',
        ua VARCHAR(255) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL,
        PRIMARY KEY (id),
        KEY created_at (created_at),
        KEY visitor_time (visitor, created_at)
    ) {$collate};");

    update_option('aat_visits_schema', '2', false);
}
add_action('admin_init', 'aat_visits_install');

/**
 * The address the request really came from.
 *
 * Behind Cloudflare, REMOTE_ADDR is a Cloudflare machine — the visitor is in
 * CF-Connecting-IP. Both are read in that order, and the result is validated
 * rather than trusted, because either header can be forged by anyone who can
 * reach the origin directly.
 */
function aat_visitor_ip() {
    $candidates = [];
    /* A lead arrives through the Worker, not from the visitor's browser, so on
       that path the only trace of the person is what the Worker chose to pass
       along. Read first, or every enquiry records Cloudflare's address. */
    if (!empty($_SERVER['HTTP_X_AAT_CLIENT_IP']))  $candidates[] = wp_unslash($_SERVER['HTTP_X_AAT_CLIENT_IP']);
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) $candidates[] = wp_unslash($_SERVER['HTTP_CF_CONNECTING_IP']);
    if (!empty($_SERVER['REMOTE_ADDR']))           $candidates[] = wp_unslash($_SERVER['REMOTE_ADDR']);

    foreach ($candidates as $raw) {
        $ip = filter_var(trim((string) $raw), FILTER_VALIDATE_IP);
        if ($ip) return aat_maybe_mask_ip($ip);
    }
    return '';
}

/** Zero the last octet unless the site has opted into keeping it. */
function aat_maybe_mask_ip($ip) {
    if (get_option('aat_store_full_ip', '0') === '1') return $ip;

    if (strpos($ip, ':') !== false) {
        /* IPv6: keep the /48 the ISP routes, drop the rest. */
        $parts = explode(':', $ip);
        return implode(':', array_slice($parts, 0, 3)) . '::';
    }
    $parts = explode('.', $ip);
    if (count($parts) === 4) { $parts[3] = '0'; return implode('.', $parts); }
    return $ip;
}

/**
 * Location, as Cloudflare already knows it.
 *
 * CF-IPCountry is set by Cloudflare on every proxied request. City and region
 * live in `request.cf` inside the Worker, which is not a header, so the Worker
 * forwards them as JSON in X-AAT-Geo.
 */
function aat_visitor_geo() {
    $geo = ['country' => '', 'region' => '', 'city' => ''];

    if (!empty($_SERVER['HTTP_CF_IPCOUNTRY'])) {
        $cc = strtoupper(substr(sanitize_text_field(wp_unslash($_SERVER['HTTP_CF_IPCOUNTRY'])), 0, 2));
        if (ctype_alpha($cc)) $geo['country'] = $cc;
    }

    if (!empty($_SERVER['HTTP_X_AAT_GEO'])) {
        $decoded = json_decode(wp_unslash($_SERVER['HTTP_X_AAT_GEO']), true);
        if (is_array($decoded)) {
            foreach (['country', 'region', 'city'] as $key) {
                if (!empty($decoded[$key])) {
                    $geo[$key] = sanitize_text_field((string) $decoded[$key]);
                }
            }
            $geo['country'] = strtoupper(substr($geo['country'], 0, 2));
        }
    }

    return $geo;
}

/** Crawlers are not readers, and logging them buries the people. */
function aat_is_bot_ua($ua) {
    return (bool) preg_match(
        '/bot|crawler|spider|crawling|slurp|facebookexternalhit|preview|monitor|curl|wget|python-requests|headless/i',
        (string) $ua
    );
}

/**
 * Record one page view.
 *
 * Deliberately forgiving: a beacon is fire-and-forget from a browser that has
 * usually already navigated away, so anything unusable is dropped quietly
 * rather than answered with an error nobody will ever read.
 */
function aat_rest_beacon(WP_REST_Request $request) {
    global $wpdb;

    $ua = isset($_SERVER['HTTP_USER_AGENT'])
        ? sanitize_text_field(wp_unslash($_SERVER['HTTP_USER_AGENT']))
        : '';

    if (aat_is_bot_ua($ua)) {
        return rest_ensure_response(['ok' => true, 'skipped' => 'bot']);
    }

    $path = (string) $request->get_param('path');
    if ($path === '' || strlen($path) > 255 || $path[0] !== '/') {
        return rest_ensure_response(['ok' => true, 'skipped' => 'path']);
    }

    /* An id the browser keeps for the session. Not tied to a person, and never
       used to look one up — it only groups a visit into a readable trail. */
    $visitor = preg_replace('/[^a-f0-9]/', '', strtolower((string) $request->get_param('v')));
    if (strlen($visitor) !== 32) $visitor = '';

    $referrer = esc_url_raw((string) $request->get_param('ref'));
    $geo      = aat_visitor_geo();

    $wpdb->insert(aat_visits_table(), [
        'visitor'    => $visitor,
        'ip'         => aat_visitor_ip(),
        'country'    => $geo['country'],
        'region'     => $geo['region'],
        'city'       => $geo['city'],
        'path'       => substr($path, 0, 255),
        'referrer'   => substr($referrer, 0, 255),
        'ua'         => substr($ua, 0, 255),
        'created_at' => current_time('mysql', true),
    ]);

    return rest_ensure_response(['ok' => true]);
}

/** Delete what is past the retention window. Daily. */
function aat_visits_prune() {
    global $wpdb;
    $table  = aat_visits_table();
    $cutoff = gmdate('Y-m-d H:i:s', time() - (AAT_VISIT_RETENTION_DAYS * DAY_IN_SECONDS));
    $wpdb->query($wpdb->prepare("DELETE FROM {$table} WHERE created_at < %s", $cutoff));
}
add_action('aat_visits_prune_event', 'aat_visits_prune');

add_action('init', function () {
    if (!wp_next_scheduled('aat_visits_prune_event')) {
        wp_schedule_event(time() + HOUR_IN_SECONDS, 'daily', 'aat_visits_prune_event');
    }
});

/* ── Admin screen ───────────────────────────────────────────────────────── */

add_action('admin_menu', function () {
    add_menu_page(
        'Visitors',
        'Visitors',
        'edit_posts',
        'aat-visitors',
        'aat_visitors_screen',
        'dashicons-visibility',
        26
    );
});

/** People with a hit inside the online window, most recent first. */
function aat_visitors_online() {
    global $wpdb;
    $table  = aat_visits_table();
    $cutoff = gmdate('Y-m-d H:i:s', time() - (AAT_ONLINE_WINDOW_MINUTES * MINUTE_IN_SECONDS));

    return $wpdb->get_results($wpdb->prepare(
        "SELECT visitor,
                MAX(created_at) AS last_seen,
                MIN(created_at) AS first_seen,
                COUNT(*)        AS views,
                SUBSTRING_INDEX(GROUP_CONCAT(path ORDER BY created_at DESC), ',', 1) AS current_path,
                SUBSTRING_INDEX(GROUP_CONCAT(ip ORDER BY created_at DESC), ',', 1)      AS ip,
                SUBSTRING_INDEX(GROUP_CONCAT(country ORDER BY created_at DESC), ',', 1) AS country,
                SUBSTRING_INDEX(GROUP_CONCAT(city ORDER BY created_at DESC), ',', 1)    AS city,
                SUBSTRING_INDEX(GROUP_CONCAT(region ORDER BY created_at DESC), ',', 1)  AS region
           FROM {$table}
          WHERE created_at >= %s AND visitor <> ''
       GROUP BY visitor
       ORDER BY last_seen DESC
          LIMIT 100",
        $cutoff
    ));
}

/** The last N page views, whoever they belong to. */
function aat_visitors_recent($limit = 200) {
    global $wpdb;
    $table = aat_visits_table();
    return $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$table} ORDER BY created_at DESC LIMIT %d",
        $limit
    ));
}

/** Counts for the summary row. */
function aat_visitors_totals() {
    global $wpdb;
    $table = aat_visits_table();
    $since = static function ($seconds) {
        return gmdate('Y-m-d H:i:s', time() - $seconds);
    };

    return [
        'views_today'    => (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE created_at >= %s", $since(DAY_IN_SECONDS))),
        'people_today'   => (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(DISTINCT visitor) FROM {$table} WHERE created_at >= %s AND visitor <> ''", $since(DAY_IN_SECONDS))),
        'people_week'    => (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(DISTINCT visitor) FROM {$table} WHERE created_at >= %s AND visitor <> ''", $since(7 * DAY_IN_SECONDS))),
        'countries_week' => (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(DISTINCT country) FROM {$table} WHERE created_at >= %s AND country <> ''", $since(7 * DAY_IN_SECONDS))),
    ];
}

/** "3 minutes ago", without the "ago" — the column header already says when. */
function aat_visitors_ago($mysql_gmt) {
    $seconds = max(0, time() - strtotime($mysql_gmt . ' UTC'));
    if ($seconds < 60)   return $seconds . 's';
    if ($seconds < 3600) return floor($seconds / 60) . 'm';
    if ($seconds < 86400) return floor($seconds / 3600) . 'h';
    return floor($seconds / 86400) . 'd';
}

/** A flag from a country code, so the table scans at a glance. */
function aat_country_flag($cc) {
    $cc = strtoupper((string) $cc);
    if (strlen($cc) !== 2 || !ctype_alpha($cc)) return '';
    $flag = '';
    for ($i = 0; $i < 2; $i++) {
        $flag .= mb_convert_encoding('&#' . (127397 + ord($cc[$i])) . ';', 'UTF-8', 'HTML-ENTITIES');
    }
    return $flag;
}

function aat_visitors_place($row) {
    $bits = array_filter([$row->city, $row->region]);
    $place = implode(', ', array_unique($bits));
    $flag  = aat_country_flag($row->country);
    if ($place === '') $place = $row->country ?: '—';
    return trim($flag . ' ' . $place);
}

function aat_visitors_screen() {
    if (!current_user_can('edit_posts')) return;

    /* The privacy toggle, saved from this screen so the decision and its
       consequence sit next to each other. */
    if (isset($_POST['aat_ip_mode']) && check_admin_referer('aat_visitors_settings')) {
        update_option('aat_store_full_ip', $_POST['aat_ip_mode'] === 'full' ? '1' : '0', false);
        echo '<div class="notice notice-success is-dismissible"><p>Đã lưu.</p></div>';
    }

    $online = aat_visitors_online();
    $recent = aat_visitors_recent();
    $totals = aat_visitors_totals();
    $full   = get_option('aat_store_full_ip', '0') === '1';

    echo '<div class="wrap"><h1>Visitors</h1>';

    printf(
        '<p style="font-size:15px;margin:.6em 0 1.4em">
           <strong style="font-size:26px;color:#1d7a4c">%d</strong> đang xem ngay bây giờ
           &nbsp;·&nbsp; %d lượt xem hôm nay, %d người
           &nbsp;·&nbsp; %d người trong 7 ngày, từ %d quốc gia
         </p>',
        count($online),
        $totals['views_today'],
        $totals['people_today'],
        $totals['people_week'],
        $totals['countries_week']
    );

    /* ── Online now ── */
    echo '<h2>Đang trên site <span style="font-weight:400;color:#666">(' . AAT_ONLINE_WINDOW_MINUTES . ' phút gần nhất)</span></h2>';
    if (!$online) {
        echo '<p style="color:#666">Không có ai đang xem.</p>';
    } else {
        echo '<table class="widefat striped"><thead><tr>'
           . '<th>Nơi</th><th>IP</th><th>Đang xem</th><th>Số trang</th><th>Vào lúc</th><th>Hoạt động cuối</th>'
           . '</tr></thead><tbody>';
        foreach ($online as $row) {
            printf(
                '<tr><td>%s</td><td><code>%s</code></td><td>%s</td><td>%d</td><td>%s trước</td><td>%s trước</td></tr>',
                esc_html(aat_visitors_place($row)),
                esc_html($row->ip ?: '—'),
                '<a href="' . esc_url(home_url($row->current_path)) . '" target="_blank" rel="noopener">' . esc_html($row->current_path) . '</a>',
                (int) $row->views,
                esc_html(aat_visitors_ago($row->first_seen)),
                esc_html(aat_visitors_ago($row->last_seen))
            );
        }
        echo '</tbody></table>';
    }

    /* ── History ── */
    echo '<h2 style="margin-top:2em">Gần đây</h2>';
    if (!$recent) {
        echo '<p style="color:#666">Chưa có dữ liệu. Tín hiệu chỉ được ghi khi có người mở site bằng trình duyệt thật.</p>';
    } else {
        echo '<table class="widefat striped"><thead><tr>'
           . '<th>Khi nào</th><th>Nơi</th><th>IP</th><th>Trang</th><th>Đến từ</th>'
           . '</tr></thead><tbody>';
        foreach ($recent as $row) {
            printf(
                '<tr><td>%s trước</td><td>%s</td><td><code>%s</code></td><td>%s</td><td>%s</td></tr>',
                esc_html(aat_visitors_ago($row->created_at)),
                esc_html(aat_visitors_place($row)),
                esc_html($row->ip ?: '—'),
                esc_html($row->path),
                $row->referrer ? esc_html(wp_parse_url($row->referrer, PHP_URL_HOST) ?: $row->referrer) : '—'
            );
        }
        echo '</tbody></table>';
    }

    /* ── Privacy ── */
    echo '<h2 style="margin-top:2em">Địa chỉ IP</h2>';
    echo '<form method="post" style="background:#fff;border:1px solid #ccd0d4;padding:1em 1.2em;max-width:760px">';
    wp_nonce_field('aat_visitors_settings');
    echo '<p style="margin-top:0;color:#444">Địa chỉ IP là dữ liệu cá nhân theo GDPR và luật California. Site này bán cho khách ở cả hai nơi.</p>';
    printf(
        '<p><label><input type="radio" name="aat_ip_mode" value="masked" %s> <strong>Che số cuối</strong> — lưu <code>203.0.113.0</code> thay vì <code>203.0.113.47</code>. Vẫn biết nhà mạng và khu vực, không truy ngược được một người. Không cần khai báo.</label></p>',
        $full ? '' : 'checked'
    );
    printf(
        '<p><label><input type="radio" name="aat_ip_mode" value="full" %s> <strong>Lưu đầy đủ</strong> — chỉ bật kèm một dòng tương ứng trong chính sách riêng tư.</label></p>',
        $full ? 'checked' : ''
    );
    echo '<p style="color:#666;margin-bottom:0">Dữ liệu tự xoá sau ' . AAT_VISIT_RETENTION_DAYS . ' ngày.</p>';
    submit_button('Lưu');
    echo '</form>';

    echo '</div>';
}
