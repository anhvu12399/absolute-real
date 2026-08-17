<?php
/**
 * Signed revalidation ping to the Next.js frontend.
 *
 * Define in wp-config.php:
 *   define('AAT_REVALIDATE_URL', 'https://example.com/api/revalidate');
 *   define('AAT_REVALIDATE_SECRET', 'same secret as WORDPRESS_REVALIDATE_SECRET');
 */

if (!defined('ABSPATH')) exit;

/**
 * Where to ping, and with what secret.
 *
 * These were constants in wp-config.php only, which means the one setting that
 * decides whether editing this site does anything visible could only be
 * changed over FTP. They are settings now, with the constants still winning
 * when they are defined so existing installs keep working unchanged.
 */
function aat_revalidate_url() {
    if (defined('AAT_REVALIDATE_URL') && AAT_REVALIDATE_URL) return (string) AAT_REVALIDATE_URL;
    return trim((string) get_option('aat_revalidate_url', ''));
}

function aat_revalidate_secret() {
    if (defined('AAT_REVALIDATE_SECRET') && AAT_REVALIDATE_SECRET) return (string) AAT_REVALIDATE_SECRET;
    return trim((string) get_option('aat_revalidate_secret', ''));
}

/** True once both halves are present, whichever way they were supplied. */
function aat_revalidate_ready() {
    return aat_revalidate_url() !== '' && aat_revalidate_secret() !== '';
}

add_action('save_post', 'aat_revalidate_post', 20, 2);
add_action('deleted_post', function ($post_id, $post) {
    if ($post instanceof WP_Post) aat_revalidate_post($post_id, $post);
}, 20, 2);

/* A country's photograph and opening line live on the term, not on a post, so
   editing them fired nothing and the destination pages kept the old picture
   until something else happened to be saved. */
add_action('edited_term', 'aat_revalidate_term', 20, 3);
add_action('created_term', 'aat_revalidate_term', 20, 3);

function aat_revalidate_term($term_id, $tt_id, $taxonomy) {
    if (!in_array($taxonomy, ['country', 'city', 'category'], true)) return;
    if (!aat_revalidate_ready()) return;

    $link = get_term_link((int) $term_id, $taxonomy);
    $path = is_wp_error($link) ? null : wp_parse_url($link, PHP_URL_PATH);

    aat_revalidate_ping([
        'id' => (int) $term_id,
        'type' => 'term:' . $taxonomy,
        'path' => $path,
        'status' => 'publish',
    ]);
}

function aat_revalidate_post($post_id, $post) {
    if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) return;
    if (!$post instanceof WP_Post) return;

    $is_front = $post->post_type === 'homepage';
    if (!$is_front && !in_array($post->post_type, aat_public_types(), true)) return;
    if (!aat_revalidate_ready()) return;

    $path = $is_front ? '/' : wp_parse_url(get_permalink($post_id), PHP_URL_PATH);
    aat_revalidate_ping([
        'id' => $post_id,
        'type' => $post->post_type,
        'path' => $path,
        'status' => $post->post_status,
    ]);
}

/**
 * Send one signed ping, and remember how it went.
 *
 * The result is stored because this fires non-blocking: without a record the
 * admin screen can only say "configured" or "not configured", never "the last
 * one failed", which is exactly the case someone needs to see.
 */
function aat_revalidate_ping(array $payload) {
    if (!aat_revalidate_ready()) return;

    $body = wp_json_encode($payload);
    $response = wp_remote_post(aat_revalidate_url(), [
        'timeout' => 5,
        'headers' => [
            'Content-Type' => 'application/json',
            'X-Absolute-Asia-Signature' => hash_hmac('sha256', $body, aat_revalidate_secret()),
        ],
        'body' => $body,
    ]);

    update_option('aat_revalidate_last', [
        'at' => time(),
        'path' => $payload['path'] ?? '',
        'ok' => !is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200,
        'detail' => is_wp_error($response)
            ? $response->get_error_message()
            : 'HTTP ' . wp_remote_retrieve_response_code($response),
    ], false);
}

/** Whether the revalidate webhook is wired up, and what happened last time. */
function aat_revalidate_status() {
    return [
        'configured' => aat_revalidate_ready(),
        'url' => aat_revalidate_url(),
        'via' => defined('AAT_REVALIDATE_URL') ? 'wp-config.php' : 'ô nhập trong admin',
        'last' => get_option('aat_revalidate_last', null),
    ];
}

add_action('admin_post_aat_save_revalidate', function () {
    if (!current_user_can('manage_options')) wp_die('Không đủ quyền');
    check_admin_referer('aat_save_revalidate');

    update_option('aat_revalidate_url', esc_url_raw(wp_unslash($_POST['aat_revalidate_url'] ?? '')), false);
    update_option('aat_revalidate_secret', sanitize_text_field(wp_unslash($_POST['aat_revalidate_secret'] ?? '')), false);

    /* Send one straight away: a setting that only proves itself the next time
       somebody edits a post is a setting nobody trusts. */
    if (!empty($_POST['aat_revalidate_test']) && aat_revalidate_ready()) {
        aat_revalidate_ping(['id' => 0, 'type' => 'test', 'path' => '/', 'status' => 'publish']);
    }

    wp_safe_redirect(add_query_arg('aat_reval', 'saved', admin_url('admin.php?page=aat-import')));
    exit;
});

/**
 * The one setting that decides whether editing this site changes anything the
 * public can see, with the result of the last attempt printed beside it.
 */
function aat_revalidate_field() {
    $status = aat_revalidate_status();
    $locked = defined('AAT_REVALIDATE_URL') || defined('AAT_REVALIDATE_SECRET');
    $last = $status['last'];
    ?>
    <h2>Đăng từ backend lên frontend</h2>
    <p>Sửa xong bấm <strong>Update</strong> thì web ngoài đổi <strong>ngay</strong>. Để trống hai ô này
       thì vẫn đổi, nhưng phải chờ hết cache — chậm nhất khoảng <strong>15 phút</strong>.</p>
    <p><strong>Địa chỉ</strong> là tên miền web ngoài cộng <code>/api/revalidate</code>.
       <strong>Mã bí mật</strong> phải trùng đúng biến <code>WORDPRESS_REVALIDATE_SECRET</code> đặt trên Vercel.</p>
    <?php if ($locked) : ?>
        <p style="color:#996800">Hai giá trị này đang được khai trong <code>wp-config.php</code> nên ô dưới không có tác dụng.</p>
    <?php endif; ?>
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <input type="hidden" name="action" value="aat_save_revalidate">
        <?php wp_nonce_field('aat_save_revalidate'); ?>
        <p>
            <label style="display:block;margin-bottom:4px">Địa chỉ</label>
            <input type="url" name="aat_revalidate_url" class="large-text" <?php disabled($locked); ?>
                   value="<?php echo esc_attr(get_option('aat_revalidate_url', '')); ?>"
                   placeholder="https://www.absoluteasiatours.com/api/revalidate">
        </p>
        <p>
            <label style="display:block;margin-bottom:4px">Mã bí mật</label>
            <input type="text" name="aat_revalidate_secret" class="large-text" <?php disabled($locked); ?>
                   value="<?php echo esc_attr(get_option('aat_revalidate_secret', '')); ?>"
                   placeholder="dán đúng chuỗi đã đặt trên Vercel">
        </p>
        <p>
            <label><input type="checkbox" name="aat_revalidate_test" value="1" checked> Gửi thử một lần sau khi lưu</label>
        </p>
        <p><button class="button button-primary">Lưu</button></p>
    </form>
    <p style="color:<?php echo $status['configured'] ? '#008a20' : '#b32d2e'; ?>">
        <?php if ($status['configured']) : ?>
            Đang bật — gửi tới <code><?php echo esc_html($status['url']); ?></code>
            (khai ở <?php echo esc_html($status['via']); ?>).
        <?php else : ?>
            Chưa bật. Sửa bài xong web ngoài phải chờ tới 15 phút mới đổi.
        <?php endif; ?>
    </p>
    <?php if (is_array($last)) : ?>
        <p style="color:<?php echo !empty($last['ok']) ? '#008a20' : '#b32d2e'; ?>">
            Lần gửi gần nhất: <?php echo esc_html(human_time_diff((int) $last['at'])); ?> trước —
            <?php echo esc_html($last['detail']); ?>
            <?php if (!empty($last['path'])) : ?> (<?php echo esc_html($last['path']); ?>)<?php endif; ?>
            <?php echo !empty($last['ok']) ? '✓' : '✗'; ?>
        </p>
    <?php endif;
}
