<?php
// backend/migrate.php
// This script runs from inside the WP container

require_once('/var/www/html/wp-load.php');
require_once(ABSPATH . 'wp-admin/includes/media.php');
require_once(ABSPATH . 'wp-admin/includes/file.php');
require_once(ABSPATH . 'wp-admin/includes/image.php');

$source_url = 'https://www.absoluteasiatours.com/wp-json/wp/v2';

echo "Fetching categories...\n";
$categories_json = @file_get_contents("$source_url/categories?per_page=100");
if (!$categories_json) {
    die("Failed to fetch categories. Make sure the source site is accessible.\n");
}

$categories = json_decode($categories_json, true);
$category_map = [];

foreach ($categories as $cat) {
    if ($cat['slug'] === 'uncategorized') continue;
    
    $term = wp_insert_term(
        $cat['name'],
        'category',
        array(
            'description' => $cat['description'],
            'slug'        => $cat['slug']
        )
    );
    
    if (!is_wp_error($term)) {
        $category_map[$cat['id']] = $term['term_id'];
        echo "Created category: {$cat['name']}\n";
    } else {
        $existing = get_term_by('slug', $cat['slug'], 'category');
        if ($existing) {
            $category_map[$cat['id']] = $existing->term_id;
            echo "Category exists: {$cat['name']}\n";
        }
    }
}

echo "Fetching posts...\n";
$posts_json = @file_get_contents("$source_url/posts?per_page=50");
if (!$posts_json) {
    die("Failed to fetch posts.\n");
}
$posts = json_decode($posts_json, true);

foreach ($posts as $post) {
    echo "Processing post: {$post['title']['rendered']}\n";
    
    // Check if post already exists (by slug)
    $existing_post = get_page_by_path($post['slug'], OBJECT, 'post');
    if ($existing_post) {
        echo "Post already exists, skipping.\n";
        continue;
    }

    // Create post
    $post_data = array(
        'post_title'    => $post['title']['rendered'],
        'post_content'  => $post['content']['rendered'],
        'post_excerpt'  => $post['excerpt']['rendered'],
        'post_status'   => 'publish',
        'post_author'   => 1,
        'post_name'     => $post['slug'],
        'post_date'     => $post['date'],
    );
    
    $post_id = wp_insert_post($post_data);
    
    if (is_wp_error($post_id)) {
        echo "Error creating post: " . $post_id->get_error_message() . "\n";
        continue;
    }
    
    // Assign categories
    if (!empty($post['categories'])) {
        $new_cats = [];
        foreach ($post['categories'] as $old_cat_id) {
            if (isset($category_map[$old_cat_id])) {
                $new_cats[] = $category_map[$old_cat_id];
            }
        }
        if (!empty($new_cats)) {
            wp_set_post_categories($post_id, $new_cats);
        }
    }
    
    // Featured Image
    $media_id = $post['featured_media'];
    if ($media_id) {
        $media_json = @file_get_contents("$source_url/media/$media_id");
        if ($media_json) {
            $media = json_decode($media_json, true);
            $image_url = $media['source_url'];
            echo "Downloading featured image: $image_url\n";
            
            // Sideload image
            $attach_id = media_sideload_image($image_url, $post_id, $post['title']['rendered'], 'id');
            if (!is_wp_error($attach_id)) {
                set_post_thumbnail($post_id, $attach_id);
                echo "Attached image ID: $attach_id\n";
            } else {
                echo "Error downloading image: " . $attach_id->get_error_message() . "\n";
            }
        }
    }
}

echo "Migration complete.\n";
