<?php
/**
 * Field-by-field audit: legacy site vs this install.
 *
 * Reads the same table the importer runs on, so the report can never describe a
 * mapping that is not actually in force. For each legacy field it shows how
 * often the old site fills it, where it lands here, and how full that target is
 * now. A legacy field that is neither mapped nor listed under `skip` is
 * reported as CHƯA MAP - that is the signal something was forgotten.
 */

if (!defined('ABSPATH')) exit;

function aat_audit_is_empty($value) {
    if ($value === false || $value === null || $value === '') return true;
    if (is_array($value)) return count($value) === 0;
    if (is_object($value)) return count(get_object_vars($value)) === 0;
    return false;
}

/** How often each ACF key carries data across a sample. */
function aat_audit_fill($items, $getter) {
    $stats = [];
    foreach ($items as $item) {
        $acf = $getter($item);
        if (!is_array($acf)) continue;
        foreach ($acf as $key => $value) {
            if (!isset($stats[$key])) $stats[$key] = 0;
            if (!aat_audit_is_empty($value)) $stats[$key]++;
        }
    }
    return $stats;
}

function aat_audit_run($route, $sample = 30) {
    $map = aat_field_map();
    if (!isset($map[$route])) return new WP_Error('aat_audit_route', "Không có map cho $route");
    $spec = $map[$route];
    $sample = min(max((int) $sample, 5), 60);

    /* ── legacy side ── */
    $old_items = [];
    if ($route === 'homepage') {
        $home = aat_import_get('/absolute-asia/v1/content?path=/');
        if (is_wp_error($home)) return $home;
        $old_items = [$home];
    } else {
        $list = aat_import_get("/wp/v2/$route?per_page=$sample&_fields=id");
        if (is_wp_error($list)) return $list;
        if (!$list) return ['route' => $route, 'rows' => [], 'oldTotal' => 0, 'newTotal' => 0];
        $ids = array_map(function ($p) { return (int) $p['id']; }, $list);
        $old_items = aat_import_get('/absolute-asia/v1/content-batch?include=' . implode(',', $ids));
        if (is_wp_error($old_items)) return $old_items;
    }

    /* ── this install ── */
    /* Random order: the newest N posts are not representative - a field the old
       site fills on 10% of pages can be absent from any one date-ordered slice
       and look like it never imported. */
    $new_posts = get_posts([
        'post_type' => $spec['type'],
        'post_status' => 'publish',
        'posts_per_page' => $sample,
        'orderby' => 'rand',
        'fields' => 'ids',
    ]);
    $new_items = [];
    foreach ($new_posts as $id) {
        $fields = function_exists('get_fields') ? (get_fields($id) ?: []) : [];
        // source_* are bookkeeping stored as plain meta, so get_fields() misses
        // them and they would be reported as never imported.
        foreach (get_post_meta($id) as $key => $values) {
            if (strpos($key, 'source_') === 0) $fields[$key] = $values[0] ?? '';
        }
        $new_items[] = $fields;
    }

    $old_fill = aat_audit_fill($old_items, function ($item) { return $item['acf'] ?? []; });
    $new_fill = aat_audit_fill($new_items, function ($acf) { return $acf; });

    $old_total = max(count($old_items), 1);
    $new_total = max(count($new_items), 1);

    $rows = [];
    foreach ($old_fill as $legacy => $filled) {
        if (!$filled) continue;

        $entry = $spec['fields'][$legacy] ?? null;
        if (!$entry) {
            $rows[] = [
                'legacy' => $legacy,
                'oldPct' => round($filled / $old_total * 100),
                'target' => $spec['skip'][$legacy] ?? '',
                'newPct' => null,
                'status' => isset($spec['skip'][$legacy]) ? 'skip' : 'unmapped',
            ];
            continue;
        }

        $targets = (array) $entry['to'];
        $best = 0;
        foreach ($targets as $target) {
            $best = max($best, $new_fill[$target] ?? 0);
        }
        $new_pct = round($best / $new_total * 100);

        $rows[] = [
            'legacy' => $legacy,
            'oldPct' => round($filled / $old_total * 100),
            'target' => implode(' + ', $targets) . (($entry['as'] ?? '') ? "  [{$entry['as']}]" : ''),
            'newPct' => $new_pct,
            'status' => $new_pct > 0 ? 'ok' : 'missing',
        ];
    }

    // Worst first: unmapped, then mapped-but-empty, then the rest by fill rate.
    usort($rows, function ($a, $b) {
        $rank = ['unmapped' => 0, 'missing' => 1, 'ok' => 2, 'skip' => 3];
        $cmp = $rank[$a['status']] <=> $rank[$b['status']];
        return $cmp !== 0 ? $cmp : $b['oldPct'] <=> $a['oldPct'];
    });

    return [
        'route' => $route,
        'type' => $spec['type'],
        'oldTotal' => count($old_items),
        'newTotal' => count($new_items),
        'rows' => $rows,
    ];
}

add_action('rest_api_init', function () {
    register_rest_route('absolute-asia/v1', '/import/audit', [
        'methods' => 'POST',
        'permission_callback' => function () { return current_user_can('manage_options'); },
        'callback' => function (WP_REST_Request $r) {
            $result = aat_audit_run(sanitize_text_field((string) $r['route']), (int) $r['sample']);
            return is_wp_error($result) ? $result : rest_ensure_response($result);
        },
    ]);
});
