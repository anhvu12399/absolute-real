<?php
/**
 * Keep the backend out of search results.
 *
 * On a headless install this host serves the same articles, tours and hotels
 * as the public site — full pages, 200, no robots tag — so a crawler that
 * finds it has a second copy of the whole catalogue to index. Left alone it
 * competes with the site it exists to feed.
 *
 * Crawling stays ALLOWED on purpose. `Disallow: /` would stop a crawler
 * reading the noindex below, and a URL that is blocked but linked can still be
 * listed with no description. Letting it read the page and be told "do not
 * index" is what actually removes it.
 *
 * Never applied to wp-admin, the REST API, or files under /wp-content/uploads:
 * the public site proxies uploads through its own domain, and an X-Robots-Tag
 * on those would take the photographs out of Google Images along with them.
 */

if (!defined('ABSPATH')) exit;

/** On by default: a headless backend has no reason to appear in search. */
function aat_backend_noindex_enabled() {
    return (bool) get_option('aat_backend_noindex', 1);
}

/** True for a normal front-end page view of this WordPress install. */
function aat_is_frontend_request() {
    if (is_admin() || wp_doing_ajax() || wp_doing_cron()) return false;
    if (defined('REST_REQUEST') && REST_REQUEST) return false;
    if (defined('XMLRPC_REQUEST') && XMLRPC_REQUEST) return false;

    $path = (string) wp_parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
    if ($path !== '' && preg_match('#^/(wp-content|wp-includes|wp-json)/#', $path)) return false;

    return true;
}

/** The header carries further than the meta tag - it covers non-HTML too. */
add_action('send_headers', function () {
    if (!aat_backend_noindex_enabled() || !aat_is_frontend_request()) return;
    header('X-Robots-Tag: noindex, nofollow', true);
});

/** Belt and braces for anything that reads the markup rather than the headers. */
add_action('wp_head', function () {
    if (!aat_backend_noindex_enabled() || !aat_is_frontend_request()) return;
    echo '<meta name="robots" content="noindex, nofollow">' . "\n";
}, 1);

/**
 * RankMath and friends write their own robots meta, and theirs wins by
 * running later. Overriding the value they compute is what makes this stick.
 */
add_filter('rank_math/frontend/robots', function ($robots) {
    if (!aat_backend_noindex_enabled() || !aat_is_frontend_request()) return $robots;
    return ['index' => 'noindex', 'follow' => 'nofollow'];
}, 99);

add_filter('wpseo_robots', function ($robots) {
    if (!aat_backend_noindex_enabled() || !aat_is_frontend_request()) return $robots;
    return 'noindex, nofollow';
}, 99);

/** Says out loud what the header already does, without blocking the crawl. */
add_filter('robots_txt', function ($output) {
    if (!aat_backend_noindex_enabled()) return $output;
    return $output . "\n# Headless backend: pages carry X-Robots-Tag: noindex.\n"
        . "# Crawling stays allowed so that tag can be read.\n";
}, 99);

add_action('admin_post_aat_save_noindex', function () {
    if (!current_user_can('manage_options')) wp_die('Không đủ quyền');
    check_admin_referer('aat_save_noindex');
    update_option('aat_backend_noindex', isset($_POST['aat_backend_noindex']) ? 1 : 0, false);
    wp_safe_redirect(add_query_arg('aat_noindex', 'saved', admin_url('admin.php?page=aat-import')));
    exit;
});

/** The switch, on the import screen beside the other site-wide settings. */
function aat_backend_noindex_field() {
    $on = aat_backend_noindex_enabled();
    ?>
    <h2>Ẩn backend khỏi Google</h2>
    <p>Địa chỉ backend này phục vụ <strong>đúng nội dung</strong> của web chính — bài viết, tour,
       khách sạn, đủ 200 và không chặn gì. Nếu Google index nó thì bạn có hai bản giống hệt trên
       hai tên miền, tự cạnh tranh nhau, và khách có thể bấm vào bản backend trần không có giao diện.</p>
    <p>Bật ô này thì mỗi trang backend gửi <code>X-Robots-Tag: noindex</code>.
       <strong>Không</strong> chặn crawl — chặn crawl thì Google không đọc được lệnh noindex.
       Ảnh trong <code>/wp-content/uploads/</code> vẫn được index bình thường.</p>
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <input type="hidden" name="action" value="aat_save_noindex">
        <?php wp_nonce_field('aat_save_noindex'); ?>
        <label>
            <input type="checkbox" name="aat_backend_noindex" value="1" <?php checked($on); ?>>
            Ẩn backend khỏi kết quả tìm kiếm
        </label>
        <p>
            <button class="button button-primary">Lưu</button>
            <?php if (isset($_GET['aat_noindex'])) : ?><span style="color:#008a20;margin-left:8px">Đã lưu</span><?php endif; ?>
        </p>
    </form>
    <p style="color:<?php echo $on ? '#008a20' : '#b32d2e'; ?>">
        Hiện tại: <?php echo $on ? 'backend đang được ẩn khỏi Google.' : 'backend ĐANG cho Google index.'; ?>
    </p>
    <?php
}
