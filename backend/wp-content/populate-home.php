<?php
// Script to populate Homepage with mock data from V2 HTML
require_once('wp-load.php');

$page_id = 110;

update_field('hero_tagline', 'Travel Inspiration', $page_id);
update_field('hero_headline', 'Vietnam: The <em>Slow Gold</em> of the Mekong at Dawn', $page_id);
update_field('ticker_text', 'Bhutan: A Private Audience with the Himalaya', $page_id);

update_field('statement_text', 'For more than twenty years, we have been turning a single idea for a trip into an itinerary that could belong to no one else. A journey through Asia should never feel arranged — it should feel like it was always <em>composed, not booked.</em>', $page_id);

update_field('stat_1_num', '20', $page_id);
update_field('stat_1_label', 'Years in Asia', $page_id);
update_field('stat_2_num', '6', $page_id);
update_field('stat_2_label', 'Countries, One Itinerary', $page_id);
update_field('stat_3_num', '24', $page_id);
update_field('stat_3_label', 'Hour Concierge', $page_id);

// HOME CARDS ARRAYS
$tab_destinations = [
    ['badge' => 'Destination', 'title' => 'Vietnam', 'desc' => 'Halong Bay by private junk, imperial Hue, and Saigon after dark.', 'link' => '/vietnam/', 'link_text' => 'Explore Vietnam', 'ph' => 'ph-vn'],
    ['badge' => 'Destination', 'title' => 'Bhutan', 'desc' => 'The last Himalayan kingdom, entered by invitation only.', 'link' => '/bhutan/', 'link_text' => 'Explore Bhutan', 'ph' => 'ph-bt'],
    ['badge' => 'Destination', 'title' => 'Cambodia', 'desc' => "Angkor at first light, and the Mekong's quiet dignity beyond it.", 'link' => '/cambodia/', 'link_text' => 'Explore Cambodia', 'ph' => 'ph-kh']
];
update_field('home_tab_destinations', $tab_destinations, $page_id);

$tab_journeys = [
    ['badge' => 'Journey', 'title' => 'The Grand Indochine', 'meta' => '16 Days · From $8,900 pp', 'desc' => "Hanoi's old quarter, Angkor at sunrise, and the slow gold of the Mekong.", 'link' => '#plan', 'link_text' => 'View Journey', 'ph' => 'ph-la'],
    ['badge' => 'Journey', 'title' => 'Kingdoms of Fire & Silk', 'meta' => '14 Days · From $11,400 pp', 'desc' => "Bangkok's temples, Chiang Mai's hill country, and an audience with the Himalaya.", 'link' => '#plan', 'link_text' => 'View Journey', 'ph' => 'ph-th'],
    ['badge' => 'Journey', 'title' => 'Java, Bali & the Ring of Fire', 'meta' => '11 Days · From $7,300 pp', 'desc' => 'Borobudur before the crowds, volcanic highlands, and a villa above the Bali Sea.', 'link' => '#plan', 'link_text' => 'View Journey', 'ph' => 'ph-id']
];
update_field('home_tab_journeys', $tab_journeys, $page_id);

$tab_offers = [
    ['badge' => 'Offer', 'title' => 'Save $1,500 Per Person', 'desc' => 'On private journeys of 10 nights or more, booked by December 2026.', 'link' => '#plan', 'link_text' => 'View Offer', 'ph' => 'ph-vn'],
    ['badge' => 'Offer', 'title' => 'Complimentary Upgrade', 'desc' => 'Business class upgrades on select Vietnam itineraries booked this quarter.', 'link' => '#plan', 'link_text' => 'View Offer', 'ph' => 'ph-th'],
    ['badge' => 'Offer', 'title' => 'Third Traveler Stays Free', 'desc' => 'On family journeys to Thailand of 7 nights or more.', 'link' => '#plan', 'link_text' => 'View Offer', 'ph' => 'ph-th']
];
update_field('home_tab_offers', $tab_offers, $page_id);

$tab_new = [
    ['badge' => 'New', 'title' => 'A New Villa Collection in Ubud', 'desc' => 'Full-staff private villas above the rice terraces of central Bali.', 'link' => '#plan', 'link_text' => 'Discover', 'ph' => 'ph-id'],
    ['badge' => 'New', 'title' => 'Now Venturing Into Sri Lanka', 'desc' => 'Our seventh country: tea hills, ancient citadels, and the southern coast.', 'link' => '/sri-lanka/', 'link_text' => 'Discover', 'ph' => 'ph-bt'],
    ['badge' => 'New', 'title' => '2027 Bhutan Festival Departures', 'desc' => "A first look at next year's tsechu festival itineraries.", 'link' => '/bhutan/', 'link_text' => 'Discover', 'ph' => 'ph-bt']
];
update_field('home_tab_new', $tab_new, $page_id);

$ways_to_explore = [
    ['title' => 'Honeymoons & Romance', 'desc' => 'Private dinners on the sand and villas built for two.', 'ph' => 'ph-th'],
    ['title' => 'Multi-Generational Family', 'desc' => 'Adventures wide enough for grandparents and grandchildren alike.', 'ph' => 'ph-vn'],
    ['title' => 'Wellness & Slow Travel', 'desc' => 'Fewer stops, longer stays, mornings with nothing on the agenda.', 'ph' => 'ph-id'],
    ['title' => 'Active & Trekking', 'desc' => 'Himalayan passes, jungle trails, and a guide who knows every switchback.', 'ph' => 'ph-bt'],
    ['title' => 'Photography Journeys', 'desc' => 'Golden-hour access to the temples everyone else sees at noon.', 'ph' => 'ph-kh']
];
update_field('home_ways_to_explore', $ways_to_explore, $page_id);

$stay_with = [
    ['title' => 'Heritage Hotels', 'desc' => 'Restored colonial villas and century-old shophouses, chosen for character over chain.', 'link' => '#plan', 'link_text' => 'Discover', 'ph' => 'ph-kh'],
    ['title' => 'Private Villas', 'desc' => 'Full-staff villas in Bali and Phuket, with a kitchen team of your own.', 'link' => '#plan', 'link_text' => 'Discover', 'ph' => 'ph-id'],
    ['title' => 'River & Bay Cruises', 'desc' => 'Wake up moored somewhere new — the Mekong, the Irrawaddy, Halong Bay.', 'link' => '#plan', 'link_text' => 'Discover', 'ph' => 'ph-vn']
];
update_field('home_stay_with', $stay_with, $page_id);

update_field('map_headline', 'Your journey, <em>charted</em> by hand', $page_id);
update_field('map_description', 'Cross a border without feeling the seam. Our specialists route each leg together — flights, drivers, and guides handed off quietly between countries — so a journey through the Mekong, the Himalaya, or the Indonesian archipelago reads as one continuous story.', $page_id);

$ways_to_travel = [
    ['title' => 'Private Travel', 'desc' => 'Go wherever you want, however you want — the itinerary bends to you.', 'ph' => 'ph-vn'],
    ['title' => 'Small Group Journeys', 'desc' => 'A shared departure with a handful of like-minded travelers, never a crowd.', 'ph' => 'ph-la'],
    ['title' => 'River Cruises', 'desc' => 'Slow mornings on deck, watching a country go by at six miles an hour.', 'ph' => 'ph-th'],
    ['title' => 'Trekking & Wellness', 'desc' => 'From Himalayan base camps to silent retreats in the hills of Bali.', 'ph' => 'ph-bt'],
    ['title' => 'Culinary Journeys', 'desc' => 'Market tours, home kitchens, and a table with the people who cook for you.', 'ph' => 'ph-kh']
];
update_field('home_ways_to_travel', $ways_to_travel, $page_id);

update_field('quote_text', "We don't plan trips. We compose, in advance, the version of Asia you didn't know you were looking for.", $page_id);
update_field('quote_citation', 'The Founders, Absolute Asia', $page_id);

update_field('responsibly_headline', 'The Absolute Asia <em>Foundation</em>', $page_id);
update_field('responsibly_text', 'We work only with guides, drivers, and artisans native to the places we visit, and a share of every journey supports craft schools and heritage preservation across the six countries we call home.', $page_id);

$home_values = [
    ['title' => 'Twenty Years of Back Roads', 'description' => "Two decades finding the route that isn't in the guidebook yet."],
    ['title' => 'A Concierge Who Never Sleeps', 'description' => 'Someone reachable at 2am in Hanoi, not just 9 to 5 in an office overseas.'],
    ['title' => 'Guides Who Call It Home', 'description' => "Not contractors — specialists who've lived in the place you're visiting."],
    ['title' => 'Trips That Leave a Trace', 'description' => 'Every itinerary supports the communities and crafts we ask you to admire.']
];
update_field('home_values', $home_values, $page_id);

echo "Homepage successfully populated.\n";
