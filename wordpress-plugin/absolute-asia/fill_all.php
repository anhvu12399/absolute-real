<?php
require_once 'wp-load.php';

function aat_fill_all_fields_script() {
    $types = ['tour', 'hotel', 'place_to_go', 'travel_guide', 'thing_to_do', 'blog'];
    
    foreach ($types as $type) {
        $posts = get_posts(['post_type' => $type, 'post_status' => 'any', 'posts_per_page' => -1]);
        foreach ($posts as $post) {
            aat_auto_fill_post_fields_script($post->ID);
            echo "Filled $type: " . $post->ID . "\n";
        }
    }
}
