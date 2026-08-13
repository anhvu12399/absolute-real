<?php
/**
 * Pre-flight check against a source site.
 *
 * This plugin was written against one legacy install. Pointed at a different
 * one — a sister site built from the same theme, say — most of it will work,
 * but "most" is not an answer anyone can act on. So instead of asserting
 * compatibility, this asks the source directly and reports what it finds:
 * which post types exist, how many posts each holds, which taxonomies are
 * there, and which ACF fields carry data that the field map does not yet know
 * about.
 *
 * Run it before importing. Nothing here writes anything.
 */

if (!defined('ABSPATH')) exit;

/** GET against the source site being tested, not the saved one. */
function aat_compat_get($source, $path) {
    $response = wp_remote_get(untrailingslashit($source) . '/wp-json' . $path, [
        'timeout' => 25,
        'headers' => ['Accept' => 'application/json'],
    ]);
    if (is_wp_error($response)) return $response;
    if (wp_remote_retrieve_response_code($response) !== 200) {
        return new WP_Error('aat_http', 'HTTP ' . wp_remote_retrieve_response_code($response));
    }
    $body = json_decode(wp_remote_retrieve_body($response), true);
    return is_array($body) ? $body : new WP_Error('aat_json', 'Không đọc được JSON');
}

/**
 * Everything the importer needs, checked against one source.
 *
 * Returns a structure the admin screen renders; no judgement is made here
 * beyond "found" or "not found".
 */
function aat_compat_report($source) {
    $report = ['source' => $source, 'reachable' => false, 'types' => [], 'taxonomies' => [], 'fields' => []];

    $types = aat_compat_get($source, '/wp/v2/types');
    if (is_wp_error($types)) {
        $report['error'] = $types->get_error_message();
        return $report;
    }
    $report['reachable'] = true;

    /* Post types. `rest_base` is what the importer actually requests. */
    $available = [];
    foreach ($types as $key => $meta) {
        $available[$meta['rest_base'] ?? $key] = true;
    }

    foreach (aat_import_type_map() as $rest_base => $new_type) {
        $row = ['from' => $rest_base, 'to' => $new_type, 'exists' => isset($available[$rest_base]), 'count' => 0];
        if ($row['exists']) {
            $probe = wp_remote_get(untrailingslashit($source) . "/wp-json/wp/v2/$rest_base?per_page=1&_fields=id", ['timeout' => 20]);
            if (!is_wp_error($probe)) {
                $row['count'] = (int) wp_remote_retrieve_header($probe, 'x-wp-total');
            }
        }
        $report['types'][] = $row;
    }

    /* Taxonomies. */
    $tax = aat_compat_get($source, '/wp/v2/taxonomies');
    $tax_available = [];
    if (!is_wp_error($tax)) {
        foreach ($tax as $key => $meta) $tax_available[$meta['rest_base'] ?? $key] = true;
    }
    foreach (aat_import_taxonomy_map() as $rest_base => $new_tax) {
        $report['taxonomies'][] = [
            'from' => $rest_base,
            'to' => $new_tax,
            'exists' => isset($tax_available[$rest_base]),
        ];
    }

    /* ACF fields: what the source carries versus what the map knows.
       Sampling a few posts per type is enough - an unmapped field that appears
       on none of the first few posts is not carrying the site's content. */
    $map = aat_field_map();
    foreach ($report['types'] as $row) {
        if (!$row['exists'] || !$row['count']) continue;

        $sample = aat_compat_get($source, "/wp/v2/{$row['from']}?per_page=4&_fields=acf");
        if (is_wp_error($sample)) continue;

        $known = array_keys($map[$row['from']]['fields'] ?? []);
        $skipped = array_keys($map[$row['from']]['skip'] ?? []);
        $unmapped = [];

        foreach ($sample as $post) {
            foreach (($post['acf'] ?? []) as $field => $value) {
                $has = is_array($value) ? count($value) > 0 : (is_string($value) ? trim($value) !== '' : !empty($value));
                if (!$has) continue;
                if (in_array($field, $known, true) || in_array($field, $skipped, true)) continue;
                $unmapped[$field] = true;
            }
        }

        $report['fields'][] = [
            'type' => $row['from'],
            'mapped' => count($known),
            'unmapped' => array_keys($unmapped),
        ];
    }

    return $report;
}

add_action('admin_post_aat_compat', function () {
    if (!current_user_can('manage_options')) wp_die('Không đủ quyền');
    check_admin_referer('aat_compat');

    $source = isset($_POST['aat_compat_source']) ? esc_url_raw(wp_unslash($_POST['aat_compat_source'])) : '';
    set_transient('aat_compat_report', aat_compat_report($source), 10 * MINUTE_IN_SECONDS);

    wp_safe_redirect(admin_url('admin.php?page=aat-import&aat_compat=1#compat'));
    exit;
});

/** The form and the last report, rendered on the import screen. */
function aat_compat_field() {
    $report = get_transient('aat_compat_report');
    ?>
    <h2 id="compat">Kiểm tra tương thích</h2>
    <p>Trước khi import, hỏi thẳng web cũ xem plugin có đọc được không: có đủ kiểu bài,
       taxonomy và trường ACF mà bảng ánh xạ đang mong đợi hay không. Chỉ đọc, không ghi gì.</p>
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <input type="hidden" name="action" value="aat_compat">
        <?php wp_nonce_field('aat_compat'); ?>
        <input type="url" name="aat_compat_source" class="large-text" required
               value="<?php echo esc_attr(function_exists('aat_configured_source') ? aat_configured_source() : ''); ?>"
               placeholder="https://web-cu-can-kiem-tra.com">
        <p><button class="button button-primary">Kiểm tra</button></p>
    </form>

    <?php if (!is_array($report)) return; ?>

    <?php if (!$report['reachable']) : ?>
        <p style="color:#b32d2e"><strong>Không kết nối được:</strong>
           <?php echo esc_html($report['error'] ?? 'không rõ lý do'); ?></p>
        <p class="description">Web cũ phải mở <code>/wp-json/wp/v2/</code> công khai.</p>
        <?php return; ?>
    <?php endif; ?>

    <h3>Kiểu bài</h3>
    <table class="widefat striped" style="max-width:640px">
        <thead><tr><th>Bên web cũ</th><th>Sẽ thành</th><th>Số bài</th><th></th></tr></thead>
        <tbody>
        <?php foreach ($report['types'] as $row) : ?>
            <tr>
                <td><code><?php echo esc_html($row['from']); ?></code></td>
                <td><code><?php echo esc_html($row['to']); ?></code></td>
                <td><?php echo $row['exists'] ? number_format_i18n($row['count']) : '—'; ?></td>
                <td><?php echo $row['exists']
                    ? '<span style="color:#008a20">có</span>'
                    : '<span style="color:#b32d2e">KHÔNG CÓ</span>'; ?></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>

    <h3>Taxonomy</h3>
    <p>
    <?php foreach ($report['taxonomies'] as $row) : ?>
        <code><?php echo esc_html($row['from']); ?></code>
        <?php echo $row['exists']
            ? '<span style="color:#008a20">✓</span>'
            : '<span style="color:#b32d2e">✗</span>'; ?>&nbsp;&nbsp;
    <?php endforeach; ?>
    </p>
    <p class="description">Taxonomy thiếu thì bài vẫn import, chỉ là không được gán nhãn đó.</p>

    <h3>Trường ACF chưa có trong bảng ánh xạ</h3>
    <?php
    $any = false;
    foreach ($report['fields'] as $row) {
        if (!$row['unmapped']) continue;
        $any = true;
        printf(
            '<p><code>%s</code> — đã map %d trường, <strong style="color:#b32d2e">chưa map %d</strong>: %s</p>',
            esc_html($row['type']),
            (int) $row['mapped'],
            count($row['unmapped']),
            '<code>' . esc_html(implode('</code>, <code>', $row['unmapped'])) . '</code>'
        );
    }
    if (!$any) {
        echo '<p style="color:#008a20">Không có trường nào bị bỏ sót — bảng ánh xạ dùng lại được nguyên vẹn.</p>';
    } else {
        echo '<p class="description">Những trường này vẫn được import vào ' .
             '<code>source_*</code> nên không mất dữ liệu, nhưng frontend chưa biết đọc. ' .
             'Muốn hiện ra thì thêm chúng vào <code>includes/field-map.php</code>.</p>';
    }
}
