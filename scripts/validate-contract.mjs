import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const contract = JSON.parse(readFileSync("wordpress-plugin/absolute-asia/content-contract.json", "utf8"));
const known = new Set(Object.values(contract.types).flatMap((type) => [
  ...type.fields,
  ...(type.retained || []).map((entry) => entry.field),
]));

function getFiles(dir) {
  const results = [];
  try {
    const list = readdirSync(dir);
    for (const file of list) {
      const fullPath = join(dir, file);
      const stat = statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results.push(...getFiles(fullPath));
      } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

const files = ["components", "app", "lib"].flatMap(getFiles);

const used = new Map();
for (const file of files) {
  const source = readFileSync(file, "utf8");
  const matches = [
    ...source.matchAll(/\b(?:acf|acfData)\??\.([A-Za-z0-9_]+)/g),
    ...source.matchAll(/\b(?:str|label)\(["']([A-Za-z0-9_]+)["']/g),
  ];
  for (const match of matches) {
    if (!used.has(match[1])) used.set(match[1], new Set());
    used.get(match[1]).add(file);
  }
}

const missing = [...used].filter(([field]) => !known.has(field));
if (missing.length) {
  console.error("Frontend ACF fields missing from content-contract.json:");
  for (const [field, consumers] of missing) console.error(`- ${field}: ${[...consumers].join(", ")}`);
  process.exit(1);
}

for (const [name, type] of Object.entries(contract.types)) {
  const duplicates = type.fields.filter((field, index) => type.fields.indexOf(field) !== index);
  if (duplicates.length) throw new Error(`${name}: duplicate contract fields: ${[...new Set(duplicates)].join(", ")}`);
  for (const retained of type.retained || []) {
    if (!retained.consumer || !retained.reason) throw new Error(`${name}.${retained.field}: retained field requires consumer and reason`);
  }
}

/* A global known-field set used to let a field from one post type mask a
   missing field on another. Check the active contract against the ACF groups
   that are actually shown for that type as well. Retained snapshot/importer
   meta is intentionally allowed to remain hidden from the editor. */
const fieldsSource = readFileSync("wordpress-plugin/absolute-asia/includes/fields.php", "utf8");
const groupMatches = [...fieldsSource.matchAll(/'key'\s*=>\s*'(group_aat_[^']+)'/g)];
const fieldsByGroup = new Map();
for (let index = 0; index < groupMatches.length; index += 1) {
  const current = groupMatches[index];
  const chunk = fieldsSource.slice(current.index, groupMatches[index + 1]?.index || fieldsSource.length);
  const names = new Set([
    ...[...chunk.matchAll(/aat_[a-z_]+\(\s*'[^']+'\s*,\s*'[^']*'\s*,\s*'([^']+)'/g)].map((match) => match[1]),
    ...[...chunk.matchAll(/'name'\s*=>\s*'([^']+)'/g)].map((match) => match[1]),
  ]);
  fieldsByGroup.set(current[1].replace("group_aat_", ""), names);
}

const backendGroups = {
  homepage: ["homepage"],
  tour: ["tour"],
  place_to_go: ["place", "guide"],
  hotel: ["hotel"],
  editorial: ["editorial"],
  page: ["page", "guide"],
  trip: ["editorial"],
};

for (const [name, groups] of Object.entries(backendGroups)) {
  const spec = contract.types[name];
  if (!spec) continue;
  const registered = new Set(groups.flatMap((group) => [...(fieldsByGroup.get(group) || [])]));
  const missingBackend = spec.fields.filter((field) => !registered.has(field));
  if (missingBackend.length) {
    console.error(`${name}: active contract fields missing from its ACF UI: ${missingBackend.join(", ")}`);
    process.exit(1);
  }
}

for (const [name, spec] of Object.entries(contract.types)) {
  for (const postType of spec.postTypes || []) {
    if (postType !== name && contract.types[postType]) {
      console.error(`${postType}: explicit contract shadows membership in ${name}`);
      process.exit(1);
    }
  }
}

const fieldMapSource = readFileSync("wordpress-plugin/absolute-asia/includes/field-map.php", "utf8");
const mappedTargets = [...fieldMapSource.matchAll(/'to'\s*=>\s*(?:\[(.*?)\]|'([^']+)')/gs)]
  .flatMap((match) => match[2] ? [match[2]] : [...match[1].matchAll(/'([^']+)'/g)].map((part) => part[1]));
const undocumentedTargets = [...new Set(mappedTargets.filter((field) => !known.has(field)))].sort();
if (undocumentedTargets.length) {
  console.error(`Importer targets missing from the contract: ${undocumentedTargets.join(", ")}`);
  process.exit(1);
}

console.log(`Contract v${contract.version}: ${used.size} frontend ACF fields validated.`);
