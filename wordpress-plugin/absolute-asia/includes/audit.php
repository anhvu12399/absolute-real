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

function aat_audit_log($operation, $details) {
    $logs = get_option('aat_migration_audit_log', []);
    if (!is_array($logs)) $logs = [];
    $logs[] = [
        'time' => gmdate(DATE_ATOM),
        'userId' => get_current_user_id(),
        'operation' => sanitize_key($operation),
        'details' => $details,
    ];
    update_option('aat_migration_audit_log', array_slice($logs, -200), false);
}

/** How often each ACF key carries data across a complete result set. */
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

/** Fetch every legacy payload in bounded pages. */
function aat_audit_source_items($route, $limit = 0) {
    if ($route === 'homepage') {
        $home = aat_import_get('/absolute-asia/v1/content?path=/');
        return is_wp_error($home) ? $home : [$home];
    }

    $out = [];
    $page = 1;
    $remaining = max(0, (int) $limit);
    do {
        $per_page = $remaining ? min(100, $remaining) : 100;
        $list = aat_import_get("/wp/v2/$route?per_page=$per_page&page=$page&_fields=id");
        if (is_wp_error($list)) return $list;
        if (!$list) break;
        $ids = array_map(function ($p) { return (int) $p['id']; }, $list);
        foreach (array_chunk($ids, 100) as $chunk) {
            $items = aat_import_get('/absolute-asia/v1/content-batch?include=' . implode(',', $chunk));
            if (is_wp_error($items)) return $items;
            $out = array_merge($out, $items);
        }
        if ($remaining) {
            $remaining -= count($list);
            if ($remaining <= 0) break;
        }
        $page++;
    } while (count($list) === $per_page);
    return $out;
}

function aat_audit_run($route, $limit = 0) {
    $map = aat_field_map();
    if (!isset($map[$route])) return new WP_Error('aat_audit_route', "Không có map cho $route");
    $spec = $map[$route];
    $limit = min(max((int) $limit, 0), 5000);

    /* ── legacy side ── */
    $old_items = aat_audit_source_items($route, $limit);
    if (is_wp_error($old_items)) return $old_items;
    if (!$old_items) return ['route' => $route, 'rows' => [], 'oldTotal' => 0, 'newTotal' => 0];

    /* ── this install ── */
    $new_posts = get_posts([
        'post_type' => $spec['type'],
        'post_status' => 'publish',
        'posts_per_page' => $limit ?: -1,
        'orderby' => 'ID',
        'order' => 'ASC',
        'fields' => 'ids',
        'no_found_rows' => true,
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
    $contract_fields = aat_contract_fields($spec['type']);

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

    $orphan_backend = [];
    foreach ($new_fill as $field => $filled) {
        if (in_array($field, $contract_fields, true)) continue;
        if (strpos($field, 'source_') === 0) continue;
        $orphan_backend[] = ['field' => $field, 'filled' => $filled, 'status' => 'backend_not_in_contract'];
    }

    $missing_contract = [];
    foreach ($contract_fields as $field) {
        if (!array_key_exists($field, $new_fill)) $missing_contract[] = $field;
    }

    $shape_errors = [];
    foreach ($new_posts as $id) {
        $acf = function_exists('get_fields') ? (get_fields($id) ?: []) : [];
        foreach (aat_contract_repeater_errors($spec['type'], $acf) as $error) {
            $shape_errors[] = ['postId' => (int) $id] + $error;
        }
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
        'orphanBackend' => $orphan_backend,
        'missingContract' => $missing_contract,
        'shapeErrors' => $shape_errors,
        'contractVersion' => aat_contract_version(),
    ];
}

function aat_audit_export($offset = 0, $limit = 100) {
    $query = new WP_Query([
        'post_type' => array_merge(aat_public_types(), ['homepage']),
        'post_status' => 'any',
        'posts_per_page' => min(max((int) $limit, 1), 250),
        'offset' => max(0, (int) $offset),
        'orderby' => 'ID',
        'order' => 'ASC',
        'fields' => 'ids',
        'no_found_rows' => false,
    ]);
    $ids = $query->posts;
    $records = [];
    foreach ($ids as $id) {
        $raw = (string) get_post_meta($id, '_aat_source_acf_json', true);
        $records[] = [
            'id' => (int) $id,
            'type' => get_post_type($id),
            'slug' => get_post_field('post_name', $id),
            'sourceId' => (int) get_post_meta($id, '_aat_source_id', true),
            'sourceType' => (string) get_post_meta($id, '_aat_source_type', true),
            'schemaVersion' => (int) get_post_meta($id, '_aat_source_schema_version', true),
            'sourceAcf' => $raw !== '' ? json_decode($raw, true) : (object) [],
            'checksum' => hash('sha256', $raw),
        ];
    }
    return [
        'contractVersion' => aat_contract_version(),
        'offset' => max(0, (int) $offset),
        'count' => count($records),
        'total' => (int) $query->found_posts,
        'manifestChecksum' => hash('sha256', wp_json_encode($records, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)),
        'records' => $records,
    ];
}

function aat_audit_reconcile($route, $offset, $limit, $dry_run, $run_id) {
    $map = aat_import_type_map();
    $is_home = $route === 'homepage';
    if (!$is_home && !isset($map[$route])) return new WP_Error('aat_bad_type', 'Unknown source type', ['status' => 400]);
    $target_type = $is_home ? 'homepage' : $map[$route];
    $limit = min(max((int) $limit, 1), 50);
    $offset = max(0, (int) $offset);
    if ($is_home) {
        $home = $offset === 0 ? aat_import_get('/absolute-asia/v1/content?path=/') : null;
        if (is_wp_error($home)) return $home;
        $list = $home ? [['id' => (int) ($home['id'] ?? 0)]] : [];
        $items = $home ? [$home] : [];
    } else {
        $list = aat_import_get("/wp/v2/$route?per_page=$limit&offset=$offset&_fields=id");
        if (is_wp_error($list)) return $list;
        $ids = array_map(function ($row) { return (int) $row['id']; }, $list);
        $items = $ids ? aat_import_get('/absolute-asia/v1/content-batch?include=' . implode(',', $ids)) : [];
    }
    if (is_wp_error($items)) return $items;

    $actions = [];
    foreach ($items as $item) {
        $source_id = (int) ($item['id'] ?? 0);
        if ($is_home) {
            $homes = get_posts(['post_type' => 'homepage', 'posts_per_page' => 1, 'post_status' => 'any', 'fields' => 'ids']);
            $existing = $homes ? (int) $homes[0] : 0;
        } else {
            $existing = aat_find_by_source($source_id, $target_type);
        }
        $action = $existing ? 'update' : 'create';
        if (!$dry_run) {
            $result = aat_import_item($item, $target_type);
            if (is_wp_error($result)) $actions[] = ['sourceId' => $source_id, 'action' => 'error', 'message' => $result->get_error_message()];
            else $actions[] = ['sourceId' => $source_id, 'postId' => (int) $result, 'action' => $action];
        } else {
            $actions[] = ['sourceId' => $source_id, 'postId' => $existing, 'action' => $action];
        }
    }
    $result = ['runId' => $run_id, 'dryRun' => (bool) $dry_run, 'type' => $route, 'offset' => $offset + count($list), 'done' => count($list) < $limit, 'actions' => $actions];
    update_option('aat_reconcile_' . sanitize_key($run_id), ['updatedAt' => gmdate(DATE_ATOM), 'result' => $result], false);
    aat_audit_log('reconcile', ['runId' => $run_id, 'dryRun' => (bool) $dry_run, 'type' => $route, 'beforeOffset' => $offset, 'afterOffset' => $result['offset'], 'actions' => count($actions)]);
    return $result;
}

add_action('rest_api_init', function () {
    register_rest_route('absolute-asia/v1', '/contract', [
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => function () { return rest_ensure_response(aat_contract_payload()); },
    ]);
    register_rest_route('absolute-asia/v1', '/import/audit', [
        'methods' => 'POST',
        'permission_callback' => function () { return current_user_can('manage_options'); },
        'callback' => function (WP_REST_Request $r) {
            $result = aat_audit_run(sanitize_text_field((string) $r['route']), (int) $r['limit']);
            if (!is_wp_error($result)) aat_audit_log('audit', ['route' => $result['route'], 'oldTotal' => $result['oldTotal'], 'newTotal' => $result['newTotal']]);
            return is_wp_error($result) ? $result : rest_ensure_response($result);
        },
    ]);
    register_rest_route('absolute-asia/v1', '/import/export', [
        'methods' => 'GET',
        'permission_callback' => function () { return current_user_can('manage_options'); },
        'callback' => function (WP_REST_Request $r) { return rest_ensure_response(aat_audit_export((int) $r['offset'], (int) ($r['limit'] ?: 100))); },
    ]);
    register_rest_route('absolute-asia/v1', '/import/reconcile', [
        'methods' => 'POST',
        'permission_callback' => function () { return current_user_can('manage_options'); },
        'callback' => function (WP_REST_Request $r) {
            $result = aat_audit_reconcile(
                sanitize_text_field((string) $r['type']),
                (int) $r['offset'],
                (int) ($r['limit'] ?: 10),
                !isset($r['dry_run']) || rest_sanitize_boolean($r['dry_run']),
                sanitize_key((string) ($r['run_id'] ?: wp_generate_uuid4()))
            );
            return is_wp_error($result) ? $result : rest_ensure_response($result);
        },
    ]);
    register_rest_route('absolute-asia/v1', '/import/cleanup', [
        'methods' => 'POST',
        'permission_callback' => function () { return current_user_can('manage_options'); },
        'callback' => function (WP_REST_Request $r) {
            $contract = aat_content_contract();
            $allowed = [];
            foreach ((array) ($contract['types'] ?? []) as $spec) $allowed = array_merge($allowed, (array) ($spec['deprecated'] ?? []));
            $requested = array_values(array_intersect(array_map('sanitize_key', (array) $r['fields']), array_unique($allowed)));
            $preview = !isset($r['apply']) || !rest_sanitize_boolean($r['apply']);
            $matches = [];
            foreach ($requested as $field) {
                $posts = get_posts(['post_type' => array_merge(aat_public_types(), ['homepage']), 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => $field]);
                $matches[$field] = count($posts);
            }
            $token_payload = wp_json_encode(['version' => aat_contract_version(), 'fields' => $requested, 'matches' => $matches]);
            $approval_token = hash_hmac('sha256', $token_payload, wp_salt('auth'));
            if (!$preview && !hash_equals($approval_token, (string) $r['approval_token'])) {
                return new WP_Error('aat_cleanup_preview_required', 'Run cleanup preview first and submit its approvalToken unchanged.', ['status' => 409]);
            }
            if (!$preview) {
                foreach ($requested as $field) {
                    $posts = get_posts(['post_type' => array_merge(aat_public_types(), ['homepage']), 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => $field]);
                    foreach ($posts as $id) delete_post_meta($id, $field);
                }
                aat_audit_log('cleanup', ['fields' => $requested, 'deleted' => $matches]);
            }
            return rest_ensure_response(['preview' => $preview, 'eligibleFields' => array_values(array_unique($allowed)), 'requestedFields' => $requested, 'matches' => $matches, 'approvalToken' => $preview ? $approval_token : null]);
        },
    ]);
});
