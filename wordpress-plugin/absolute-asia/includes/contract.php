<?php
/**
 * Versioned content contract shared with the Next.js application.
 *
 * The JSON file ships inside the plugin and is imported directly by the
 * frontend. Keeping names here prevents the ACF UI, importer and templates
 * from silently drifting apart.
 */

if (!defined('ABSPATH')) exit;

function aat_content_contract() {
    static $contract = null;
    if (is_array($contract)) return $contract;

    $path = AAT_PATH . 'content-contract.json';
    $decoded = file_exists($path) ? json_decode((string) file_get_contents($path), true) : null;
    $contract = is_array($decoded) ? $decoded : ['version' => 0, 'types' => [], 'repeaterSchemas' => []];
    return $contract;
}

/** REST view also exposes the exact source mapping used by the importer. */
function aat_contract_payload() {
    $contract = aat_content_contract();
    $contract['pluginVersion'] = AAT_VERSION;
    $contract['sourceMaps'] = function_exists('aat_field_map') ? aat_field_map() : [];
    return $contract;
}

function aat_contract_version() {
    return (int) (aat_content_contract()['version'] ?? 0);
}

/** Resolve the logical contract group for a WordPress post type. */
function aat_contract_type($post_type) {
    $types = aat_content_contract()['types'] ?? [];
    if (isset($types[$post_type])) return $post_type;
    foreach ($types as $name => $spec) {
        if (in_array($post_type, (array) ($spec['postTypes'] ?? []), true)) return $name;
    }
    return null;
}

function aat_contract_spec($post_type) {
    $name = aat_contract_type($post_type);
    return $name ? (aat_content_contract()['types'][$name] ?? []) : [];
}

function aat_contract_fields($post_type) {
    $spec = aat_contract_spec($post_type);
    $fields = (array) ($spec['fields'] ?? []);
    foreach ((array) ($spec['retained'] ?? []) as $entry) {
        if (!empty($entry['field'])) $fields[] = $entry['field'];
    }
    return array_values(array_unique(array_map('sanitize_key', $fields)));
}

function aat_contract_relationships($post_type = '') {
    if ($post_type !== '') return (array) (aat_contract_spec($post_type)['relationships'] ?? []);
    $out = [];
    foreach ((array) (aat_content_contract()['types'] ?? []) as $spec) {
        $out = array_merge($out, (array) ($spec['relationships'] ?? []));
    }
    return array_values(array_unique($out));
}

function aat_contract_repeaters($post_type = '') {
    if ($post_type !== '') return (array) (aat_contract_spec($post_type)['repeaters'] ?? []);
    return array_keys((array) (aat_content_contract()['repeaterSchemas'] ?? []));
}

/** Validate decoded repeater rows without mutating them. */
function aat_contract_repeater_errors($post_type, $acf) {
    $errors = [];
    $schemas = (array) (aat_content_contract()['repeaterSchemas'] ?? []);
    foreach (aat_contract_repeaters($post_type) as $field) {
        if (empty($acf[$field])) continue;
        $value = aat_decode_repeaters($acf[$field]);
        if (!is_array($value)) {
            $errors[] = ['field' => $field, 'error' => 'not_array'];
            continue;
        }
        $allowed = (array) ($schemas[$field] ?? []);
        foreach ($value as $index => $row) {
            if (!is_array($row)) {
                $errors[] = ['field' => $field, 'row' => $index, 'error' => 'row_not_object'];
                continue;
            }
            $unknown = array_values(array_diff(array_keys($row), $allowed));
            if ($unknown) $errors[] = ['field' => $field, 'row' => $index, 'error' => 'unknown_keys', 'keys' => $unknown];
        }
    }
    return $errors;
}
