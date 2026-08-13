<?php
// backend/populate-demo-data.php
require_once('/var/www/html/wp-load.php');

echo "Populating complete demo data...\n";

// 1. Create Sample Hotels
$hotel1_id = wp_insert_post(array(
    'post_title'   => 'The Nguyen Residence',
    'post_status'  => 'publish',
    'post_type'    => 'hotel',
));
update_field('hotel_location', 'Hue · Colonial villa on the Perfume River', $hotel1_id);
update_field('hotel_highlights', 'Colonial villa, Perfume River views', $hotel1_id);

$hotel2_id = wp_insert_post(array(
    'post_title'   => 'Lantern Quarter House',
    'post_status'  => 'publish',
    'post_type'    => 'hotel',
));
update_field('hotel_location', 'Hoi An · Restored merchant home, Old Town', $hotel2_id);
update_field('hotel_highlights', 'Restored merchant home', $hotel2_id);

$hotel3_id = wp_insert_post(array(
    'post_title'   => 'Saigon Metropole',
    'post_status'  => 'publish',
    'post_type'    => 'hotel',
));
update_field('hotel_location', 'Ho Chi Minh City · District 1', $hotel3_id);
update_field('hotel_highlights', 'Rooftop pool, District 1', $hotel3_id);

echo "Created 3 Hotels.\n";

// 2. Create Sample Destination
$dest_id = wp_insert_post(array(
    'post_title'   => 'Vietnam',
    'post_status'  => 'publish',
    'post_type'    => 'destination',
));
update_field('hero_tagline', 'A Single Thread From North to South', $dest_id);
update_field('destination_overview', 'Forward-looking cities give way to rice terraces and quiet fishing villages...', $dest_id);
update_field('best_time_to_visit', 'October to April', $dest_id);

echo "Created Destination: Vietnam.\n";

// 3. Create Sample Tour
$tour_id = wp_insert_post(array(
    'post_title'   => 'Vietnam, End to End',
    'post_name'    => 'vietnam-end-to-end',
    'post_status'  => 'publish',
    'post_type'    => 'tour',
));

// Basic ACF Stats
update_field('duration_days', 12, $tour_id);
update_field('destinations_count', 5, $tour_id);
update_field('min_guests', 2, $tour_id);
update_field('starting_price', '$6,200', $tour_id);
update_field('overview_text', 'A single thread from north to south: Halong Bay by private junk, Hue\'s imperial tombs, and Saigon after dark. Forward-looking cities give way to rice terraces and quiet fishing villages, with a private guide and driver throughout.', $tour_id);

// Highlights
$highlights = "Experience the contrast of Vietnam's two largest cities: traditional Hanoi and modern Ho Chi Minh City.\nCruise overnight among the karst islands of Halong Bay aboard a private wooden junk.\nWalk the imperial tombs of Hue at dawn, before the day's heat and the tour buses arrive.\nTake a lantern-making workshop in Hoi An's UNESCO-listed Ancient Town.\nMeet Mekong Delta farmers whose orchards supply Ho Chi Minh City's markets.";
update_field('highlights_list', $highlights, $tour_id);

// Itinerary Repeater
$itinerary = array(
    array('day_num' => 'Day 1', 'group_tag' => 'Hanoi', 'title' => 'Arrive Hanoi, Vietnam', 'description' => 'Land in Hanoi and settle into the Old Quarter. Welcome dinner.'),
    array('day_num' => 'Day 2', 'group_tag' => 'Hanoi', 'title' => 'Hanoi — Legacies and Landmarks', 'description' => 'Ho Chi Minh\'s Mausoleum, Temple of Literature, and French Quarter.'),
    array('day_num' => 'Day 3', 'group_tag' => 'Hanoi', 'title' => 'Hanoi — Charms of the Old Quarter', 'description' => 'Morning market walk and free afternoon to wander 36 Streets.'),
    array('day_num' => 'Day 4', 'group_tag' => 'Halong Bay', 'title' => 'Halong Bay — Cruising Among the Karsts', 'description' => 'Board private wooden junk for overnight cruise.'),
    array('day_num' => 'Day 5', 'group_tag' => 'Hue', 'title' => 'Halong Bay to Hue', 'description' => 'Sunrise deck breakfast before flying south to Hue.'),
    array('day_num' => 'Day 6', 'group_tag' => 'Hue', 'title' => 'Hue — Imperial Tombs', 'description' => 'Nguyen dynasty tombs at first light and Perfume River boat ride.'),
    array('day_num' => 'Day 7', 'group_tag' => 'Hoi An', 'title' => 'Hoi An — Ancient Town', 'description' => 'Hai Van Pass drive to Hoi An, lantern-making workshop.'),
    array('day_num' => 'Day 8', 'group_tag' => 'Hoi An', 'title' => 'Hoi An — Cooking Class', 'description' => 'Market-to-table cooking class, afternoon on An Bang Beach.'),
    array('day_num' => 'Day 9', 'group_tag' => 'Ho Chi Minh City', 'title' => 'Arrival and War Remnants', 'description' => 'Fly to Ho Chi Minh City; afternoon War Remnants Museum.'),
    array('day_num' => 'Day 10', 'group_tag' => 'Ho Chi Minh City', 'title' => 'Cu Chi Tunnels', 'description' => 'Cu Chi Tunnels and evening Vespa food tour.'),
    array('day_num' => 'Day 11', 'group_tag' => 'Ho Chi Minh City', 'title' => 'Mekong Delta Day Trip', 'description' => 'Full day on the Mekong, floating market, and orchard visit.'),
    array('day_num' => 'Day 12', 'group_tag' => 'Ho Chi Minh City', 'title' => 'Depart Ho Chi Minh City', 'description' => 'Final breakfast before airport transfer.')
);
update_field('itinerary', $itinerary, $tour_id);

// Linked Stays
update_field('featured_stays', array($hotel1_id, $hotel2_id, $hotel3_id), $tour_id);

// Departure Dates Repeater
$dates = array(
    array('date_range' => 'Oct 22 – Nov 2', 'price_info' => 'Price from $6,200 per person', 'availability_status' => 'Available'),
    array('date_range' => 'Nov 5 – Nov 16', 'price_info' => 'Price from $6,450 per person', 'availability_status' => 'Available'),
    array('date_range' => 'Dec 10 – Dec 21', 'price_info' => 'Price from $6,950 per person', 'availability_status' => 'Call for Availability'),
    array('date_range' => 'Jan 14 – Jan 25, 2027', 'price_info' => 'Price from $6,200 per person', 'availability_status' => 'Available'),
);
update_field('departure_dates', $dates, $tour_id);

// Inclusions
$inclusions = "A dedicated English-speaking guide and private driver throughout\nAirport meet-and-greet with private transfers at every stop\nBag transfer service between hotels\nDaily breakfast, along with meals noted in the itinerary\nAll entrance fees, taxes and gratuities for guides and drivers\nRound-the-clock, on-call support from your travel designer\nInternal flights, Hanoi–Hue and Hue–Ho Chi Minh City";
update_field('inclusions_list', $inclusions, $tour_id);
update_field('special_offer_text', 'Save $500 per person on this itinerary when booked at least 6 months before departure.', $tour_id);

echo "Successfully populated Tour ID {$tour_id} (Vietnam, End to End) with ALL ACF fields!\n";
