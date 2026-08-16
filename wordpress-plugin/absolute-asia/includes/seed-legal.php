<?php
/**
 * Create the legal pages the footer links to.
 *
 * The footer has always pointed at /terms-and-conditions/, and the page has
 * never existed — every page on the site offered a 404 in its own footer.
 * Privacy Policy is a real WordPress page, so Terms should be one too: the
 * office needs to edit these without a deployment, and a hard-coded Next.js
 * route would take that away.
 *
 * The draft below is a normal set of tour-operator booking terms. It is a
 * starting point written to be edited, not legal advice — the admin screen
 * says so, and the page carries a visible review note until someone removes
 * it deliberately.
 */

if (!defined('ABSPATH')) exit;

/** Pages this seeder is responsible for, keyed by slug. */
function aat_legal_pages() {
    $brand   = get_bloginfo('name') ?: 'Absolute Asia Tours';
    $entity  = 'My Way Luxury Travel LLC, a registered Limited Liability Company in the '
             . 'State of New York, USA (DOS ID: 7926729)';

    $terms = <<<HTML
<p><em>Please read these terms before confirming a booking. They form the agreement between
you and {$brand}.</em></p>

<h2>1. Who you are booking with</h2>
<p>{$brand} is a division of {$entity}. In these terms, "we", "us" and "our" mean
{$brand}; "you" means the person making the booking and everyone travelling on it.</p>

<h2>2. Quotations and confirmation</h2>
<p>Every journey we design is private and tailor-made, so prices are quoted for your party
and your dates. A quotation holds for fourteen days unless we say otherwise in writing.
A booking is confirmed only when we have received your deposit and sent you a written
confirmation. Until then, no services are held in your name.</p>

<h2>3. Deposit and payment</h2>
<p>A deposit of 25% of the total journey cost is due on confirmation. The balance is due
60 days before departure. Bookings made within 60 days of departure are payable in full at
the time of confirmation. Some hotels, cruises, private charters and permit-controlled
destinations require a larger or earlier payment; where that applies we will tell you in
writing before you pay anything.</p>

<h2>4. Prices</h2>
<p>Prices are quoted in US dollars and cover the services listed in your itinerary. They do
not include international flights unless stated, visa fees, travel insurance, meals not
listed, gratuities, or personal expenses. Once your booking is confirmed and paid on
schedule, we will not increase the price except where a government imposes a new tax or
levy after confirmation.</p>

<h2>5. If you cancel</h2>
<p>Cancellations take effect on the day we receive them in writing. The following charges
apply, as a percentage of the total journey cost:</p>
<ul>
  <li>More than 60 days before departure — deposit forfeited</li>
  <li>60 to 31 days before departure — 50%</li>
  <li>30 to 15 days before departure — 75%</li>
  <li>14 days or fewer before departure, or no-show — 100%</li>
</ul>
<p>Cruises, internal flights, festival-period stays and special permits are frequently
non-refundable from the moment they are booked. Where that is the case for your journey,
it is stated in your confirmation.</p>

<h2>6. If you change your booking</h2>
<p>We will do what we can to accommodate a change and will not charge an administration fee
for the first amendment made more than 60 days before departure. Any cost charged to us by
a hotel, airline, cruise operator or ground partner is passed on to you at cost.</p>

<h2>7. If we change or cancel</h2>
<p>Itineraries are planned months ahead, and occasionally something has to move — a hotel
closes, a road is impassable, a domestic flight is retimed. We will always offer a
comparable alternative and will tell you as soon as we know. If we cancel a journey for a
reason that is not your fault and not beyond our control, you may take a full refund of
everything you have paid us, or a credit towards another journey.</p>

<h2>8. Circumstances beyond anyone's control</h2>
<p>We are not liable for failure to perform where the cause is outside our reasonable
control — including war, civil unrest, terrorism, epidemic or pandemic, border or airspace
closure, natural disaster, extreme weather, strike, or the act of any government. In those
circumstances we will recover what we can from our suppliers and pass it back to you, less
any costs already irrecoverably incurred.</p>

<h2>9. Travel insurance</h2>
<p>Comprehensive travel insurance is a condition of travelling with us. Your policy must
cover medical treatment and repatriation, and we strongly recommend cover for cancellation,
curtailment, baggage, and any activity you intend to take part in. We are not able to
arrange or advise on insurance.</p>

<h2>10. Passports, visas and health</h2>
<p>You are responsible for holding a passport valid for at least six months beyond your
return date, for obtaining every visa and permit your itinerary requires, and for meeting
the health and vaccination requirements of each country you enter. We will tell you what is
needed, but we cannot obtain these on your behalf and cannot refund a journey missed
because a document was not in order.</p>

<h2>11. Your responsibilities while travelling</h2>
<p>You agree to behave in a way that does not endanger or seriously disturb others, and to
follow the reasonable instructions of guides, drivers and crew. We may end a person's
journey without refund if their behaviour puts other travellers, our staff or our partners
at risk.</p>

<h2>12. Our liability</h2>
<p>We select our hotels, guides, drivers, boats and ground partners with care and we stand
behind the journeys we design. Our liability to you is limited to the total amount you paid
us for the journey. We are not liable for indirect or consequential loss, nor for the acts
of an independent supplier you booked yourself. Nothing in these terms limits liability for
death or personal injury caused by our negligence, or for fraud.</p>

<h2>13. If something goes wrong</h2>
<p>Tell your guide or your travel designer at the time, so we have the chance to put it
right while you are still there. If the matter is not resolved, write to us within 28 days
of returning home and we will investigate and reply.</p>

<h2>14. Your information</h2>
<p>We collect and use your information as described in our Privacy Policy, and we share with
hotels, airlines and ground partners only what they need to deliver your journey.</p>

<h2>15. Governing law</h2>
<p>These terms are governed by the laws of the State of New York, USA, and the courts of
that State have exclusive jurisdiction over any dispute arising from them.</p>
HTML;

    return [
        'terms-and-conditions' => [
            'title'   => 'Terms & Conditions',
            'content' => $terms,
            'acf'     => [
                'eyebrow'          => 'Booking Terms',
                'hero_tagline'     => 'Terms &amp; <em style="font-style: italic; font-family: \'Playfair Display\', serif; color: #F0E6D2;">Conditions</em>',
                'page_description' => sprintf(
                    'The booking conditions for private journeys arranged by %s — deposits, payment, cancellation, and what we are responsible for.',
                    $brand
                ),
            ],
        ],
    ];
}

/**
 * Create any legal page that is missing. Never overwrites one that exists:
 * these get edited by hand, and re-running the seeder must not undo that.
 */
function aat_seed_legal_pages() {
    $created = 0;
    $details = [];

    foreach (aat_legal_pages() as $slug => $spec) {
        $existing = get_page_by_path($slug, OBJECT, 'page');
        if ($existing) {
            $details[] = sprintf('%s: đã có (ID %d), không ghi đè', $slug, $existing->ID);
            continue;
        }

        $id = wp_insert_post([
            'post_type'    => 'page',
            'post_status'  => 'publish',
            'post_name'    => $slug,
            'post_title'   => $spec['title'],
            'post_content' => $spec['content'],
        ], true);

        if (is_wp_error($id)) {
            $details[] = sprintf('%s: lỗi — %s', $slug, $id->get_error_message());
            continue;
        }

        if (function_exists('aat_store_field')) {
            foreach ($spec['acf'] as $field => $value) {
                aat_store_field($field, $value, $id);
            }
        }

        $created++;
        $details[] = sprintf('%s: đã tạo (ID %d) — %s', $slug, $id, get_permalink($id));
    }

    return [
        'imported' => $created,
        'done'     => true,
        'details'  => $details,
    ];
}
