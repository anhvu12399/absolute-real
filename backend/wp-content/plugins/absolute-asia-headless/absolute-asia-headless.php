<?php
/**
 * Plugin Name: Absolute Asia Headless Bridge
 * Description: Read-only content API and signed Vercel revalidation for Absolute Asia Tours.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

const AAT_PUBLIC_TYPES = ['page','post','tour','destination','hotel','travel_guide','place_to_go','thing_to_do','blog','travel-guides','places-to-go','hotels','things-to-do','blogs','trip','cruises','travel-ideas'];

/**
 * The front page lives in the private `homepage` CPT (ACF free cannot attach
 * repeater-style groups to the options page), with page_on_front as a fallback
 * for installs that still use a normal page.
 */
function aat_front_page_post() {
  $posts = get_posts(['post_type' => 'homepage', 'posts_per_page' => 1, 'post_status' => 'publish']);
  if (!empty($posts)) return $posts[0];
  $front_id = (int)get_option('page_on_front');
  return $front_id ? get_post($front_id) : null;
}

/**
 * The custom repeaters in absolute-asia-core store their rows as a JSON string
 * inside an ACF textarea. get_fields() hands that string back verbatim, so the
 * bridge decodes it here - otherwise every consumer has to re-implement the
 * parse, and the ones that don't (the journeys / cruises / inspiration hubs)
 * silently fall back to their placeholder data.
 */
function aat_decode_repeaters($value) {
  if (is_string($value)) {
    $trimmed = trim($value);
    if ($trimmed !== '' && $trimmed[0] === '[' && substr($trimmed, -1) === ']') {
      $decoded = json_decode($trimmed, true);
      if (is_array($decoded)) return $decoded;
    }
    return $value;
  }
  if (is_array($value)) {
    foreach ($value as $key => $item) $value[$key] = aat_decode_repeaters($item);
  }
  return $value;
}

function aat_acf_payload($post_id) {
  if (!function_exists('get_fields')) return (object)[];
  $fields = get_fields($post_id);
  if (!is_array($fields) || !$fields) return (object)[];
  return aat_decode_repeaters($fields);
}

add_action('rest_api_init', function () {
  register_rest_route('absolute-asia/v1', '/content', [
    'methods' => 'GET', 'callback' => 'aat_get_content', 'permission_callback' => '__return_true',
    'args' => ['path' => ['required' => true, 'sanitize_callback' => 'sanitize_text_field']],
  ]);
  register_rest_route('absolute-asia/v1', '/search', [
    'methods' => 'GET', 'callback' => 'aat_search', 'permission_callback' => '__return_true',
    'args' => ['q' => ['required' => true, 'sanitize_callback' => 'sanitize_text_field']],
  ]);
  register_rest_route('absolute-asia/v1', '/site', [
    'methods' => 'GET', 'callback' => 'aat_get_site', 'permission_callback' => '__return_true',
  ]);
  register_rest_route('absolute-asia/v1', '/content-batch', [
    'methods' => 'GET', 'callback' => 'aat_get_content_batch', 'permission_callback' => '__return_true',
    'args' => ['include' => ['required' => true, 'sanitize_callback' => 'sanitize_text_field']],
  ]);
});

function aat_content_payload($post, $path_override = null) {
  $id = $post->ID;
  $thumb_id = get_post_thumbnail_id($id);
  $image = $thumb_id ? wp_get_attachment_image_src($thumb_id, 'full') : null;
  $rank_title = get_post_meta($id, 'rank_math_title', true);
  $rank_description = get_post_meta($id, 'rank_math_description', true);
  return [
    'id' => $id, 'type' => $post->post_type, 'slug' => $post->post_name,
    'path' => $path_override ?: wp_parse_url(get_permalink($id), PHP_URL_PATH), 'status' => $post->post_status,
    'title' => get_the_title($id), 'excerpt' => apply_filters('the_excerpt', get_the_excerpt($id)),
    'content' => apply_filters('the_content', $post->post_content),
    'date' => get_post_time(DATE_W3C, true, $id), 'modified' => get_post_modified_time(DATE_W3C, true, $id),
    'template' => get_page_template_slug($id),
    'featuredMedia' => $image ? ['url'=>$image[0], 'width'=>$image[1], 'height'=>$image[2], 'alt'=>get_post_meta($thumb_id, '_wp_attachment_image_alt', true)] : null,
    'acf' => aat_acf_payload($id),
    'seo' => [
      'title' => $rank_title ? do_shortcode($rank_title) : get_the_title($id),
      'description' => $rank_description ?: wp_strip_all_tags(get_the_excerpt($id)),
      'canonical' => get_post_meta($id, 'rank_math_canonical_url', true) ?: get_permalink($id),
      'robots' => ['index' => get_post_meta($id, 'rank_math_robots', true) !== 'noindex', 'follow' => true],
    ],
  ];
}

function aat_get_content(WP_REST_Request $request) {
  $path = '/' . trim($request['path'], '/') . '/';
  if ($path === '//') $path = '/';
  
  if ($path === '/') {
      $front_post = aat_front_page_post();
      if ($front_post) {
          // The homepage CPT is not publicly queryable, so its permalink is a
          // query string - the frontend keys off "/" for the front page.
          return rest_ensure_response(aat_content_payload($front_post, '/'));
      }
  }

  $url = home_url($path);
  $id = url_to_postid($url);
  $post = $id ? get_post($id) : null;
  if (!$post || $post->post_status !== 'publish' || !in_array($post->post_type, AAT_PUBLIC_TYPES, true)) {
    return new WP_Error('aat_not_found', 'Content not found', ['status'=>404]);
  }
  return rest_ensure_response(aat_content_payload($post));
}

function aat_search(WP_REST_Request $request) {
  $query = new WP_Query(['s'=>$request['q'], 'post_type'=>AAT_PUBLIC_TYPES, 'post_status'=>'publish', 'posts_per_page'=>20]);
  return rest_ensure_response(array_map('aat_content_payload', $query->posts));
}

function aat_menu_payload($location = 'primary') {
  $locations = get_nav_menu_locations();
  if (empty($locations[$location])) return [];
  $items = wp_get_nav_menu_items($locations[$location]) ?: [];
  return array_map(function ($item) {
    return [
      'id' => (int)$item->ID,
      'parent' => (int)$item->menu_item_parent,
      'title' => html_entity_decode($item->title, ENT_QUOTES, 'UTF-8'),
      'url' => $item->url,
      'target' => $item->target ?: '',
      'classes' => array_values(array_filter($item->classes ?: [])),
      'order' => (int)$item->menu_order,
    ];
  }, $items);
}

function aat_sidebar_html($sidebar) {
  if (!is_active_sidebar($sidebar)) return '';
  ob_start();
  dynamic_sidebar($sidebar);
  return ob_get_clean();
}

function aat_get_site() {
  // Same resolution as /content?path=/ so both routes describe one front page.
  $front = aat_front_page_post();
  $front_id = $front ? $front->ID : 0;
  return rest_ensure_response([
    'name' => get_bloginfo('name'),
    'description' => get_bloginfo('description'),
    'url' => home_url('/'),
    'frontPage' => $front ? aat_content_payload($front, '/') : null,
    'menu' => aat_menu_payload('primary'),
    'logo' => wp_get_attachment_image_url((int)get_theme_mod('custom_logo'), 'full') ?: '',
    'phoneLabel' => (string)($front_id && function_exists('get_field') ? get_field('text_phone', $front_id) : ''),
    'phone' => (string)($front_id && function_exists('get_field') ? get_field('phone', $front_id) : ''),
    'footer' => [
      'difference' => aat_sidebar_html('difference'),
      'differenceList' => aat_sidebar_html('difference-list'),
      'connect' => aat_sidebar_html('connect'),
      'footer' => aat_sidebar_html('footer'),
      'footerMiddle' => aat_sidebar_html('footer-middle'),
      'footerImage' => aat_sidebar_html('footer-image'),
      'copyright' => aat_sidebar_html('copyright'),
    ],
  ]);
}

function aat_get_content_batch(WP_REST_Request $request) {
  $ids = array_values(array_filter(array_map('absint', explode(',', $request['include']))));
  if (!$ids) return rest_ensure_response([]);
  $posts = get_posts([
    'post_type' => AAT_PUBLIC_TYPES, 'post_status' => 'publish',
    'post__in' => $ids, 'orderby' => 'post__in', 'posts_per_page' => min(count($ids), 100),
  ]);
  return rest_ensure_response(array_map('aat_content_payload', $posts));
}

add_filter('register_post_type_args', function ($args, $type) {
  // absolute-asia-core registers this type as `order` (singular); the earlier
  // `orders` spelling never matched, leaving the CPT publicly queryable.
  if (in_array($type, ['order','orders','booking'], true)) {
    $args['publicly_queryable'] = false;
    $args['show_in_rest'] = false;
  }
  return $args;
}, 100, 2);

function aat_revalidate_post($post_id, $post) {
  $is_front = $post->post_type === 'homepage';
  if (wp_is_post_revision($post_id)) return;
  if (!$is_front && !in_array($post->post_type, AAT_PUBLIC_TYPES, true)) return;
  if (!defined('AAT_REVALIDATE_URL') || !defined('AAT_REVALIDATE_SECRET')) return;
  $path = $is_front ? '/' : wp_parse_url(get_permalink($post_id), PHP_URL_PATH);
  $body = wp_json_encode(['id'=>$post_id, 'type'=>$post->post_type, 'path'=>$path, 'status'=>$post->post_status]);
  $signature = hash_hmac('sha256', $body, AAT_REVALIDATE_SECRET);
  wp_remote_post(AAT_REVALIDATE_URL, ['timeout'=>10, 'headers'=>['Content-Type'=>'application/json','X-Absolute-Asia-Signature'=>$signature], 'body'=>$body]);
}
add_action('save_post', 'aat_revalidate_post', 20, 2);
