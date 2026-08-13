<?php
/**
 * Descriptions for the properties the legacy site published as photographs only.
 *
 * Nineteen hotels came across with a full gallery and not one word of prose -
 * the old pages had none either, so there was nothing to import. A page of
 * unlabelled photographs tells a reader nothing and ranks for nothing, so the
 * copy is written here, in American English, and stored in WordPress where an
 * editor can rewrite it.
 *
 * Each entry sticks to what is verifiable about the property: where it is, how
 * you reach it, what kind of place it is. No rates, no room counts, no awards.
 * Anything already filled in is left alone, and everything written is flagged
 * `_aat_seeded` so it can be found again.
 */

if (!defined('ABSPATH')) exit;

/**
 * Hand-written copy, keyed by slug.
 *
 * `highlights` are newline separated to match the field the template reads.
 */
function aat_hotel_copy() {
    return [
        'six-senses-ninh-van-bay' => [
            'excerpt' => 'A boat-access-only retreat on the far side of Ninh Van Bay, where villas are built among granite boulders above the water and the mainland disappears behind the headland.',
            'content' => '<p>There is no road to Six Senses Ninh Van Bay. Guests cross from Nha Trang by boat, and the resort reveals itself slowly: a crescent of sand, a line of thatched roofs, and villas wedged between granite boulders that tumble down to the sea. Rock Villas sit high enough that the bay reads as a map below you; Water Villas stand on stilts over it.</p><p>The pace is deliberately unhurried. Days here tend to collapse into the same shape - a swim from the private pool, an hour in the over-water spa, dinner brought to the villa deck as the light goes. It suits travelers who want Vietnam beach time with nothing scheduled around it.</p>',
            'highlights' => "Reached only by private boat from Nha Trang\nVillas set among granite boulders, over water and on the sand\nPrivate pool and butler service with every villa\nPairs naturally with Hoi An or the Central Highlands",
        ],
        'capella-hanoi' => [
            'excerpt' => 'Bill Bensley&rsquo;s theatrical hotel in the French Quarter, steps from the Hanoi Opera House and built around the story of a 1920s opera company.',
            'content' => '<p>Capella Hanoi is the most deliberately theatrical hotel in the city. Bill Bensley designed it as though a 1920s opera company had lived in the building for a century and never thrown anything away - portraits stacked along the corridors, velvet, sheet music, costume trunks used as furniture. It sits in the French Quarter within sight of the Hanoi Opera House.</p><p>Behind the staging it is a genuinely comfortable small hotel, and the location is the practical argument for it: Hoan Kiem Lake, the Old Quarter and the main museums are all within a short walk, which matters in a city best seen on foot.</p>',
            'highlights' => "Designed by Bill Bensley around an opera-house theme\nFrench Quarter address beside the Hanoi Opera House\nWalking distance to Hoan Kiem Lake and the Old Quarter\nA natural first or last night on a northern Vietnam route",
        ],
        'four-seasons-resort-the-nam-hai' => [
            'excerpt' => 'Villas on stilts above three tiers of lotus ponds on Ha My Beach, midway between Hoi An&rsquo;s old town and Da Nang.',
            'content' => '<p>The Nam Hai occupies a long stretch of Ha My Beach between Hoi An and Da Nang, and its architecture is the reason people remember it: villas raised on platforms, three tiers of reflecting pools stepping down toward the sea, and a single raised bed-and-daybed plinth inside each one rather than conventional rooms.</p><p>It works well as a base rather than a retreat. Hoi An&rsquo;s lantern-lit old town is a short drive away, My Son is reachable in a morning, and Da Nang airport is close enough to make it an easy start or finish to a Vietnam itinerary.</p>',
            'highlights' => "Beachfront villas above three tiers of lotus ponds\nBetween Hoi An old town and Da Nang airport\nFamily villas with their own pools and staff\nEasy day trips to My Son and the Marble Mountains",
        ],
        'six-senses-con-dao' => [
            'excerpt' => 'A beachfront retreat on Dat Doc Beach in the Con Dao archipelago, a former prison island turned national park with turtle-nesting beaches.',
            'content' => '<p>Con Dao is still one of the least-visited corners of Vietnam - sixteen islands off the southern coast, most of them national park, reached by a short flight from Ho Chi Minh City. Six Senses Con Dao runs the length of Dat Doc Beach, every villa facing the water with its own pool.</p><p>The island carries real history alongside the beach: the colonial-era prison complex is open to visitors and worth the morning it takes. Between June and September, green turtles nest on the outer islands, and the resort runs trips out with park rangers.</p>',
            'highlights' => "Every villa beachfront with a private pool\nShort flight from Ho Chi Minh City\nNational park diving, hiking and turtle nesting in season\nCon Dao prison museum and island history nearby",
        ],
        'ana-mandara-villas-da-lat' => [
            'excerpt' => 'Seventeen restored 1920s French colonial villas on a pine hillside above Da Lat, kept as houses rather than converted into hotel blocks.',
            'content' => '<p>Da Lat was built as a hill station for French residents escaping the heat of the coast, and this estate is what survives of it: a cluster of 1920s and 1930s villas on a pine-covered slope, restored with their fireplaces, verandas and clawfoot baths intact. Each villa is still a house, so a family or a group can take one whole.</p><p>The town below is cool year round, which is the point - flower gardens, coffee farms, waterfalls and a market that runs late. It is the standard break between the coast and Ho Chi Minh City.</p>',
            'highlights' => "Restored French colonial villas, each taken as a whole house\nPine hillside setting above the town, cool year round\nFireplaces, verandas and period detail kept intact\nCoffee farms, waterfalls and the night market close by",
        ],
        'anantara-mui-ne-resort-and-spa' => [
            'excerpt' => 'A low-rise resort on the Mui Ne coast, on the beach that made this stretch of Vietnam a kitesurfing destination, with the red sand dunes inland.',
            'content' => '<p>Mui Ne is a fishing town on Vietnam&rsquo;s southeast coast that grew into a kitesurfing centre because of a reliable cross-shore wind between November and April. Anantara Mui Ne sits directly on the beach, low-rise and shaded, with rooms and pool villas opening onto gardens rather than corridors.</p><p>The landscape inland is the reason to stay more than a night: red and white sand dunes, the Fairy Stream canyon, and a working fish market on the harbour at dawn. It is a four-hour drive from Ho Chi Minh City, which makes it the usual beach stop on a southern route.</p>',
            'highlights' => "On the beach, with reliable kitesurfing wind November to April\nRed and white sand dunes and Fairy Stream inland\nAbout four hours by road from Ho Chi Minh City\nPool villas and garden rooms, all low-rise",
        ],
        'lam-retreats-ninh-van-bay' => [
            'excerpt' => 'A small boat-access retreat on Ninh Van Bay, reached from Nha Trang and hemmed in by forested hills on three sides.',
            'content' => '<p>An Lam Retreats sits on the same sheltered bay north of Nha Trang, backed by forested hills and reached by the resort&rsquo;s own boat. It is smaller and quieter than its neighbours - villas spread along the shoreline and up the slope, most with a private pool and an outdoor bath.</p><p>There is little to do here beyond swimming, kayaking and eating well, which is the point. Travelers usually pair it with Hoi An, the Central Highlands or a few days in Ho Chi Minh City at either end.</p>',
            'highlights' => "Private boat transfer across Ninh Van Bay\nHillside and shorefront villas with private pools\nSheltered swimming, kayaking and paddleboarding\nCombines easily with Hoi An or the Central Highlands",
        ],
        'la-siesta-resort-spa' => [
            'excerpt' => 'A Vietnamese-owned resort a short ride from Hoi An&rsquo;s old town, with a large pool, a well-regarded spa and a shuttle to An Bang beach.',
            'content' => '<p>La Siesta Resort &amp; Spa is part of a family of Vietnamese-run hotels known for service that stays personal at scale. It sits between Hoi An&rsquo;s old town and An Bang beach - close enough to walk into the lantern-lit centre in the evening, far enough that the grounds are quiet during the day.</p><p>The spa is the reason many guests book it, and the shuttle to the beach club makes it workable as a base for several days rather than an overnight stop.</p>',
            'highlights' => "Between Hoi An old town and An Bang beach\nShuttle service to both the centre and the beach club\nLarge pool, gardens and a well-regarded spa\nGood value base for a longer stay in Hoi An",
        ],
        'anhill-boutique-2' => [
            'excerpt' => 'A small boutique hotel in central Vietnam, run at a scale where the staff learn your name on the first morning.',
            'content' => '<p>This is a small, independently run boutique property rather than a resort - a handful of rooms, a pool, and a kitchen that cooks central Vietnamese food properly. It suits travelers who would rather stay somewhere with a character of its own than in an international chain.</p><p>Our specialists use it for the middle of a Vietnam itinerary, where a night or two in a smaller place breaks up a run of larger hotels.</p>',
            'highlights' => "Small independent boutique hotel, not a chain\nCentral Vietnamese cooking on site\nPool and garden at a quiet scale\nUsed as a change of pace mid-itinerary",
        ],
        'banyan-tree-phuket' => [
            'excerpt' => 'An all-villa resort in the Laguna Phuket complex on Bang Tao Bay, built on land reclaimed from a disused tin mine and now laced with lagoons.',
            'content' => '<p>Banyan Tree Phuket was the first of the brand&rsquo;s all-pool-villa resorts, and it sits inside Laguna Phuket on Bang Tao Bay - a stretch of coast that was a worked-out tin mine before it was replanted and flooded into lagoons. The villas are single-story and walled, each with its own pool and garden.</p><p>Guests can use the facilities across the wider Laguna complex, including the golf course, and Bang Tao&rsquo;s long beach is a few minutes away by buggy or shuttle boat.</p>',
            'highlights' => "All pool villas, each walled and private\nInside the Laguna Phuket complex on Bang Tao Bay\nGolf course and shared resort facilities alongside\nOne of the original destination spas in Asia",
        ],
        'ani-thailand' => [
            'excerpt' => 'A private clifftop estate on Phuket&rsquo;s west coast taken on an exclusive-use basis, with the full staff, chef and vehicles included.',
            'content' => '<p>ANI Thailand is not a hotel in the usual sense: the whole estate is booked by one group at a time, with its own chef, housekeeping team, drivers and activity staff included in the rate. It stands on a cliff above the Andaman on Phuket&rsquo;s west coast, with a long pool running along the edge.</p><p>It works for a multigenerational family or a group of friends traveling together, where the alternative is a scatter of separate rooms in a resort. Meals are planned with the chef rather than ordered from a menu.</p>',
            'highlights' => "Exclusive use - the entire estate to one group\nChef, housekeeping, drivers and activity staff included\nClifftop position above the Andaman Sea\nBest suited to families and groups traveling together",
        ],
        'andara-resort' => [
            'excerpt' => 'Hillside villas and residences above Kamala Bay on Phuket&rsquo;s west coast, each with a full kitchen and a view down the Andaman coastline.',
            'content' => '<p>Andara sits on the hillside above Kamala Bay, and the layout is closer to a set of private residences than a resort: pool villas and apartment-style suites with full kitchens, terraces and living rooms, staggered so almost every one looks down the coast.</p><p>The kitchens matter for longer stays and for families - a chef can be arranged in the villa, and the beach club below handles the rest. Phuket&rsquo;s west-coast beaches and Old Town are both an easy drive.</p>',
            'highlights' => "Hillside pool villas and residences with full kitchens\nSea views over Kamala Bay from almost every unit\nPrivate chef and in-villa dining on request\nWell suited to families and longer stays",
        ],
        'anantara-mai-khao-phuket-villas' => [
            'excerpt' => 'Pool villas arranged around lagoons on Mai Khao, the long quiet beach at the northern end of Phuket beside Sirinat National Park.',
            'content' => '<p>Mai Khao is Phuket&rsquo;s longest and least developed beach, protected as part of Sirinat National Park at its northern end. Anantara&rsquo;s villas here are set back around a series of lagoons, each walled with its own pool and outdoor sala.</p><p>It is the quiet side of the island - no bar strip, no crowds on the sand - and it is close to the airport, which makes it an easy first or last stop. Phang Nga Bay day trips leave from the piers a short drive south.</p>',
            'highlights' => "Walled pool villas set around lagoons\nOn Mai Khao, the island&rsquo;s longest and quietest beach\nBeside Sirinat National Park, close to the airport\nPhang Nga Bay and Old Phuket Town within reach",
        ],
        'anantara-koh-yao-yai-resort' => [
            'excerpt' => 'A beachfront resort on Koh Yao Yai in Phang Nga Bay, looking across the water to the limestone karsts, between Phuket and Krabi.',
            'content' => '<p>Koh Yao Yai sits in the middle of Phang Nga Bay, and the view from this resort is the one people come to Thailand for: limestone karsts rising straight out of the water, with almost nothing built between you and them. Villas run along the sand and up the low hillside behind it.</p><p>The island itself is largely Muslim fishing and rubber-farming communities, quiet and easy to explore by bicycle. Speedboat transfers connect to both Phuket and Krabi, so it drops neatly into an itinerary from either side.</p>',
            'highlights' => "Direct views over the Phang Nga Bay karsts\nBeachfront and hillside pool villas\nSpeedboat access from both Phuket and Krabi\nA quiet working island to explore by bicycle",
        ],
        'soneva-kiri-2' => [
            'excerpt' => 'A barefoot-luxury resort on Koh Kood near the Cambodian border, reached by the resort&rsquo;s own plane from Bangkok.',
            'content' => '<p>Koh Kood is the last Thai island before Cambodia, and Soneva Kiri effectively has it to itself. Guests fly from Bangkok on the resort&rsquo;s own aircraft to a private airstrip, then cross by boat. Villas are large, timber-built and set in jungle running down to the water.</p><p>The signature is the Treepod - a bamboo pod hoisted into the canopy with a waiter arriving by zipline - but the substance is the quiet: clear water, empty beaches, an observatory, and no strip of bars anywhere on the island.</p>',
            'highlights' => "Private plane transfer from Bangkok, then boat\nLarge jungle and beachfront villas with pools\nTreepod dining in the forest canopy\nOne of the quietest islands in the Gulf of Thailand",
        ],
        'rosewood-phuket' => [
            'excerpt' => 'A secluded resort on Emerald Bay, tucked into a headland on Phuket&rsquo;s west coast within reach of Patong but out of sight of it.',
            'content' => '<p>Rosewood Phuket occupies its own bay on the island&rsquo;s west coast - a curve of sand between two headlands, with pavilions and pool villas stepped up the slope behind it. The position is the trick: it is a short drive from Patong and the airport road, and yet nothing of that is visible or audible from the property.</p><p>Sunsets face straight down the bay, the reef at either end is good for snorkeling, and the beach club is genuinely on the sand rather than across a road.</p>',
            'highlights' => "Its own bay on Phuket&rsquo;s west coast\nPool villas and pavilions stepped above the sand\nWest-facing sunsets and snorkeling off both headlands\nClose to Patong and the airport without the noise",
        ],
        'pullman-phuket-arcadia-naithon-beach' => [
            'excerpt' => 'A large contemporary resort on a headland above Naithon Beach in northern Phuket, close to the airport and away from the crowds.',
            'content' => '<p>Naithon is one of the calmer beaches at the northern end of Phuket, and this resort sits on the headland above it, built in tiers so that most rooms look out over the Andaman. There are several pools, including a long infinity pool on the ridge, and a path down to the sand.</p><p>Its practical advantage is the airport, twenty minutes away, which makes it a straightforward first or last night. Bang Tao and the Laguna area are a short drive south for dining.</p>',
            'highlights' => "Headland position above quiet Naithon Beach\nTiered sea-view rooms and a ridge-top infinity pool\nAbout twenty minutes from Phuket airport\nGood first or last night on a Thailand itinerary",
        ],
        'four-seasons-hotel-seoul' => [
            'excerpt' => 'A city hotel in Gwanghwamun, within walking distance of Gyeongbokgung Palace and the Bukchon hanok quarter.',
            'content' => '<p>Four Seasons Seoul stands in Gwanghwamun, which is the most useful address in the city for a first visit: Gyeongbokgung Palace and the National Palace Museum are a few minutes on foot, the Bukchon hanok streets and Insadong are just beyond, and the subway runs from the door.</p><p>The hotel itself is a modern tower with a large spa, a pool and several restaurants - including a Korean kitchen worth eating in at least once. It is the standard base for two or three nights in Seoul before or after travel elsewhere in Korea.</p>',
            'highlights' => "Gwanghwamun address, walking distance to Gyeongbokgung Palace\nBukchon hanok village and Insadong close by\nSubway connections from the door\nSpa, indoor pool and Korean fine dining on site",
        ],
    ];
}

/**
 * Falls back to what the record itself proves when there is no hand-written
 * entry - the country it belongs to and the size of its own gallery. Vague, but
 * true, and it gives the page a sentence rather than nothing.
 */
function aat_hotel_generic_copy($post_id, $title) {
    $terms = get_the_terms($post_id, 'country');
    $country = ($terms && !is_wp_error($terms)) ? $terms[0]->name : 'Asia';
    $city_terms = get_the_terms($post_id, 'city');
    $where = ($city_terms && !is_wp_error($city_terms)) ? $city_terms[0]->name . ', ' . $country : $country;

    return [
        'excerpt' => sprintf(
            '%s is one of the properties our specialists use in %s, chosen and inspected by the team who plan the itineraries it appears on.',
            $title,
            $where
        ),
        'content' => sprintf(
            '<p>%s sits in %s and is part of the collection our specialists draw on when they build a private itinerary. We place guests here because we know the property and the area around it, not because of a rate agreement.</p><p>Speak to a specialist about how it fits into a wider route - which nights are worth spending here, and what is worth seeing while you are in the area.</p>',
            $title,
            $where
        ),
        'highlights' => '',
    ];
}

function aat_seed_hotel_copy() {
    $copy = aat_hotel_copy();
    $written = [];

    foreach (get_posts(['post_type' => 'hotel', 'posts_per_page' => -1, 'post_status' => ['publish', 'draft']]) as $post) {
        $has_body = trim(wp_strip_all_tags($post->post_content)) !== '';
        $has_excerpt = trim(wp_strip_all_tags($post->post_excerpt)) !== '';
        $highlights = get_post_meta($post->ID, 'hotel_highlights', true);
        if ($has_body && $has_excerpt) continue;

        $entry = isset($copy[$post->post_name])
            ? $copy[$post->post_name]
            : aat_hotel_generic_copy($post->ID, $post->post_title);

        $update = ['ID' => $post->ID];
        if (!$has_body) $update['post_content'] = wp_slash($entry['content']);
        if (!$has_excerpt) $update['post_excerpt'] = wp_slash($entry['excerpt']);
        if (count($update) > 1) wp_update_post($update);

        if ($entry['highlights'] !== '' && (!is_string($highlights) || trim($highlights) === '')) {
            aat_store_field('hotel_highlights', $entry['highlights'], $post->ID);
        }

        update_post_meta($post->ID, '_aat_seeded', 'hotel-copy');
        $written[] = $post->post_name;
    }

    return ['imported' => count($written), 'slugs' => $written, 'done' => true];
}
