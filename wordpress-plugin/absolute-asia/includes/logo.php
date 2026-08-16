<?php
/**
 * The site logo, on a headless install.
 *
 * WordPress keeps the logo in `custom_logo`, which is a *theme* mod: it only
 * exists if the active theme declares support for it, and it is wiped when the
 * theme changes. A headless site usually runs whatever blank theme is
 * installed, so the Customizer often shows no Logo control at all - the file
 * gets uploaded to the Media Library and nothing ever reads it.
 *
 * So: declare the support ourselves, keep our own copy of the choice in an
 * option that survives a theme switch, and give it a plain field in the admin
 * that does not depend on the Customizer at all.
 */

if (!defined('ABSPATH')) exit;

/** Makes the Customizer's Site Identity → Logo control appear on any theme. */
add_action('after_setup_theme', function () {
    add_theme_support('custom-logo', ['flex-width' => true, 'flex-height' => true]);
});

/**
 * Resolved logo URL, in order of how deliberate the choice was.
 *
 * The plugin's own setting wins: it is the field the site owner was shown.
 */
function aat_site_logo() {
    $own = trim((string) get_option('aat_logo_url', ''));
    if ($own !== '') return $own;

    $attachment = (int) get_option('aat_logo_id', 0);
    if ($attachment) {
        $url = wp_get_attachment_image_url($attachment, 'full');
        if ($url) return $url;
    }

    $theme_logo = (int) get_theme_mod('custom_logo');
    if ($theme_logo) {
        $url = wp_get_attachment_image_url($theme_logo, 'full');
        if ($url) return $url;
    }

    return '';
}

/**
 * True when the logo is hosted somewhere this WordPress does not control.
 *
 * This matters on the day the main domain is pointed at the Next.js site. The
 * logo was imported as an absolute URL on www.absoluteasiatours.com, which is
 * the legacy WordPress today and will be the new frontend tomorrow — and the
 * new frontend serves no /wp-content/. The moment DNS moves, the logo 404s in
 * the header and the footer of every page at once, which is the most visible
 * thing on the site.
 */
function aat_logo_is_offsite($url) {
    $url = trim((string) $url);
    if ($url === '') return false;

    $host = strtolower((string) wp_parse_url($url, PHP_URL_HOST));
    $here = strtolower((string) wp_parse_url(home_url(), PHP_URL_HOST));
    if ($host === '' || $here === '') return false;

    /* www and the bare domain are the same place for this purpose. */
    $strip = function ($h) { return preg_replace('/^www\./', '', $h); };
    return $strip($host) !== $strip($here);
}

/**
 * Copy an off-site logo into this install's Media Library.
 *
 * Runs once and records the attachment, so the URL the API hands out is one
 * this WordPress will keep serving no matter where the main domain points.
 */
function aat_localise_logo() {
    $url = trim((string) get_option('aat_logo_url', ''));
    if ($url === '' || !aat_logo_is_offsite($url)) {
        return ['moved' => false, 'reason' => 'Logo đã nằm trên chính backend này, không cần chuyển.'];
    }

    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';

    $id = media_sideload_image($url, 0, get_bloginfo('name') . ' logo', 'id');
    if (is_wp_error($id)) {
        return ['moved' => false, 'reason' => 'Tải về không được: ' . $id->get_error_message()];
    }

    $local = wp_get_attachment_image_url((int) $id, 'full');
    if (!$local) {
        return ['moved' => false, 'reason' => 'Đã tải về nhưng không đọc được URL của ảnh.'];
    }

    update_option('aat_logo_id', (int) $id, false);
    /* Cleared, or aat_site_logo() would keep preferring the off-site copy. */
    update_option('aat_logo_url', '', false);

    return ['moved' => true, 'from' => $url, 'to' => $local, 'attachment' => (int) $id];
}

/**
 * Self-heal on the next admin page load rather than waiting to be asked.
 *
 * Deliberately not on the REST path: /site is on the critical path of every
 * page render and must not stop to download a file.
 */
add_action('admin_init', function () {
    if (!current_user_can('manage_options')) return;
    if (get_option('aat_logo_localised', '') === 'done') return;

    $url = trim((string) get_option('aat_logo_url', ''));
    if ($url === '' || !aat_logo_is_offsite($url)) return;

    $result = aat_localise_logo();
    if (!empty($result['moved'])) {
        update_option('aat_logo_localised', 'done', false);
    }
});

/**
 * The legacy install this site imports from.
 *
 * Hard-coded until now, which meant a second site built on this plugin could
 * only ever pull from the first one's source. It is a setting.
 */
function aat_configured_source() {
    return untrailingslashit((string) get_option('aat_source_url', AAT_SOURCE_DEFAULT));
}

add_action('admin_post_aat_save_source', function () {
    if (!current_user_can('manage_options')) wp_die('Không đủ quyền');
    check_admin_referer('aat_save_source');

    $url = isset($_POST['aat_source_url']) ? esc_url_raw(wp_unslash($_POST['aat_source_url'])) : '';
    update_option('aat_source_url', untrailingslashit($url), false);

    wp_safe_redirect(add_query_arg('aat_source', 'saved', admin_url('admin.php?page=aat-import')));
    exit;
});

/** Where the importer reads from, as a field rather than a constant. */
function aat_source_field() {
    $current = aat_configured_source();
    ?>
    <h2>Nguồn import</h2>
    <p>Địa chỉ web WordPress <strong>cũ</strong> mà plugin sẽ đọc dữ liệu về. Phải mở được
       <code>/wp-json/wp/v2/</code> công khai. Đổi ô này là dùng lại được bộ plugin cho một site khác.</p>
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <input type="hidden" name="action" value="aat_save_source">
        <?php wp_nonce_field('aat_save_source'); ?>
        <input type="url" name="aat_source_url" value="<?php echo esc_attr($current); ?>"
               class="large-text" placeholder="https://vi-du.com">
        <p>
            <button class="button button-primary">Lưu nguồn</button>
            <?php if (isset($_GET['aat_source'])) : ?>
                <span style="color:#008a20;margin-left:8px">Đã lưu</span>
            <?php endif; ?>
        </p>
    </form>
    <?php
    $probe = wp_remote_get($current . '/wp-json/wp/v2/types', ['timeout' => 12]);
    if (is_wp_error($probe)) {
        printf('<p style="color:#b32d2e">Không kết nối được: %s</p>', esc_html($probe->get_error_message()));
    } else {
        $code = wp_remote_retrieve_response_code($probe);
        $types = json_decode(wp_remote_retrieve_body($probe), true);
        if ($code === 200 && is_array($types)) {
            printf('<p style="color:#008a20">Kết nối được — nguồn có %d kiểu bài.</p>', count($types));
        } else {
            printf('<p style="color:#b32d2e">Nguồn trả về mã %s, chưa đọc được REST API.</p>', esc_html((string) $code));
        }
    }
}

add_action('admin_post_aat_save_founded', function () {
    if (!current_user_can('manage_options')) wp_die('Không đủ quyền');
    check_admin_referer('aat_save_founded');
    update_option('aat_founded_year', (int) ($_POST['aat_founded_year'] ?? 0), false);
    wp_safe_redirect(add_query_arg('aat_founded', 'saved', admin_url('admin.php?page=aat-import')));
    exit;
});

/**
 * The year the company was founded.
 *
 * Several seeded sentences count from it - "36 years planning Asia", "shaped by
 * 36 years of local knowledge". Left at another site's default it publishes a
 * wrong number in the company's own voice, so it is asked for outright.
 */
function aat_founded_field() {
    $year = (int) get_option('aat_founded_year', 0);
    ?>
    <p><strong>Năm thành lập</strong> — vài câu trong nội dung tự soạn đếm từ năm này
       ("36 years planning Asia"). Để trống thì plugin lấy năm sớm nhất mà chính bài
       About của site nhắc tới.</p>
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <input type="hidden" name="action" value="aat_save_founded">
        <?php wp_nonce_field('aat_save_founded'); ?>
        <input type="number" name="aat_founded_year" min="1900" max="<?php echo esc_attr(gmdate('Y')); ?>"
               value="<?php echo $year ? esc_attr($year) : ''; ?>" placeholder="1989" style="width:120px">
        <button class="button">Lưu</button>
        <?php if (isset($_GET['aat_founded'])) : ?><span style="color:#008a20;margin-left:8px">Đã lưu</span><?php endif; ?>
        <?php if ($year) : ?>
            <span style="margin-left:12px;color:#646970">= <?php echo esc_html(max(1, (int) gmdate('Y') - $year)); ?> năm</span>
        <?php endif; ?>
    </form>
    <?php
}

/** Saves the logo field from the import screen. */
add_action('admin_post_aat_save_logo', function () {
    if (!current_user_can('manage_options')) wp_die('Không đủ quyền');
    check_admin_referer('aat_save_logo');

    $url = isset($_POST['aat_logo_url']) ? esc_url_raw(wp_unslash($_POST['aat_logo_url'])) : '';
    update_option('aat_logo_url', $url, false);

    /* A URL pasted from the Media Library is enough on its own, but recording
       the attachment id too means the logo survives a domain change. */
    $attachment = $url ? attachment_url_to_postid($url) : 0;
    update_option('aat_logo_id', (int) $attachment, false);

    wp_safe_redirect(add_query_arg('aat_logo', 'saved', admin_url('admin.php?page=aat-import')));
    exit;
});

/** The field itself, rendered inside the import screen. */
function aat_logo_field() {
    $url = aat_site_logo();
    ?>
    <h2>Logo</h2>
    <p>Dán link ảnh logo từ <strong>Media Library</strong> (mở ảnh, copy dòng “File URL”).
       Frontend lấy ngay, không cần import lại.</p>
    <p><em>Nên cắt chỉ lấy phần biểu tượng — tên thương hiệu đã được web in ra bằng chữ bên cạnh rồi.</em></p>
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <input type="hidden" name="action" value="aat_save_logo">
        <?php wp_nonce_field('aat_save_logo'); ?>
        <input type="url" name="aat_logo_url" value="<?php echo esc_attr(get_option('aat_logo_url', '')); ?>"
               class="large-text" placeholder="https://backend.absoluteasiatours.com/wp-content/uploads/…/logo.png">
        <p>
            <button class="button button-primary">Lưu logo</button>
            <?php if (isset($_GET['aat_logo'])) : ?>
                <span style="color:#008a20;margin-left:8px">Đã lưu</span>
            <?php endif; ?>
        </p>
    </form>
    <?php if ($url) : ?>
        <p style="background:#1E2A3D;display:inline-block;padding:14px 18px;border-radius:4px">
            <img src="<?php echo esc_url($url); ?>" alt="Logo" style="height:48px;display:block">
        </p>
        <p class="description">Xem thử trên đúng nền xanh của thanh menu.</p>
        <?php if (aat_logo_is_offsite($url)) : ?>
            <div class="notice notice-error inline" style="margin:12px 0;padding:10px 14px">
                <p><strong>Logo đang nằm ngoài backend này.</strong>
                   Nó được lưu ở <code><?php echo esc_html((string) wp_parse_url($url, PHP_URL_HOST)); ?></code>,
                   là chính tên miền bạn sắp trỏ sang web mới. Khi đổi DNS, tên miền đó không còn phục vụ
                   <code>/wp-content/</code> nữa, nên logo sẽ mất ở header và footer của <em>mọi trang</em>.</p>
                <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                    <input type="hidden" name="action" value="aat_localise_logo">
                    <?php wp_nonce_field('aat_localise_logo'); ?>
                    <button class="button button-primary">Chép logo về backend này</button>
                </form>
            </div>
        <?php endif; ?>
        <?php if (isset($_GET['aat_logo_moved'])) : ?>
            <p style="color:<?php echo $_GET['aat_logo_moved'] === 'ok' ? '#008a20' : '#b32d2e'; ?>">
                <?php echo esc_html((string) get_transient('aat_logo_move_note')); ?>
            </p>
        <?php endif; ?>
    <?php else : ?>
        <p class="description">Chưa có logo — frontend đang hiện hình tròn vàng tạm.</p>
    <?php endif;
}

add_action('admin_post_aat_localise_logo', function () {
    if (!current_user_can('manage_options')) wp_die('Không đủ quyền');
    check_admin_referer('aat_localise_logo');

    $result = aat_localise_logo();
    $note = !empty($result['moved'])
        ? 'Đã chép logo về backend: ' . $result['to']
        : 'Chưa chép được — ' . ($result['reason'] ?? 'không rõ lý do');
    set_transient('aat_logo_move_note', $note, 60);
    if (!empty($result['moved'])) update_option('aat_logo_localised', 'done', false);

    wp_safe_redirect(add_query_arg(
        'aat_logo_moved', !empty($result['moved']) ? 'ok' : 'fail',
        admin_url('admin.php?page=aat-import')
    ));
    exit;
});
