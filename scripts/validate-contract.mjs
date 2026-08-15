import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const contract = JSON.parse(readFileSync("wordpress-plugin/absolute-asia/content-contract.json", "utf8"));
const known = new Set(Object.values(contract.types).flatMap((type) => [
  ...type.fields,
  ...(type.retained || []).map((entry) => entry.field),
]));
const files = execFileSync("rg", ["--files", "components", "app", "lib", "-g", "*.tsx", "-g", "*.ts"], { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

const used = new Map();
for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/\b(?:acf|acfData)\??\.([A-Za-z0-9_]+)/g)) {
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

const fieldMapSource = readFileSync("wordpress-plugin/absolute-asia/includes/field-map.php", "utf8");
const mappedTargets = [...fieldMapSource.matchAll(/'to'\s*=>\s*(?:\[(.*?)\]|'([^']+)')/gs)]
  .flatMap((match) => match[2] ? [match[2]] : [...match[1].matchAll(/'([^']+)'/g)].map((part) => part[1]));
const undocumentedTargets = [...new Set(mappedTargets.filter((field) => !known.has(field)))].sort();
if (undocumentedTargets.length) {
  console.error(`Importer targets missing from the contract: ${undocumentedTargets.join(", ")}`);
  process.exit(1);
}

console.log(`Contract v${contract.version}: ${used.size} frontend ACF fields validated.`);
