/**
 * Switch which WordPress backend the dev server talks to.
 *
 *   npm run site            → which site is active
 *   npm run site vietnam    → point .env.local at sites/vietnam.env
 *
 * Each site keeps its own file under sites/ so a brand's settings are never
 * half-merged with another's; this only copies the chosen one into
 * `.env.local`, which is what Next reads and what git ignores.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIR = "sites";
const TARGET = ".env.local";

const available = existsSync(DIR)
  ? readdirSync(DIR).filter((f) => f.endsWith(".env")).map((f) => f.replace(/\.env$/, ""))
  : [];

const wanted = process.argv[2];

const brandOf = (file) =>
  (readFileSync(file, "utf8").match(/^NEXT_PUBLIC_BRAND_NAME=(.*)$/m) || [])[1] || "";

if (!wanted) {
  const current = existsSync(TARGET) ? brandOf(TARGET) : "";
  console.log(current ? `Đang chạy: ${current}` : "Chưa chọn site nào (không có .env.local)");
  console.log("\nCó sẵn:");
  for (const name of available) {
    console.log(`  ${name.padEnd(14)} ${brandOf(join(DIR, `${name}.env`))}`);
  }
  console.log("\n  npm run site <tên>");
  process.exit(0);
}

const source = join(DIR, `${wanted}.env`);
if (!existsSync(source)) {
  console.error(`Không có sites/${wanted}.env. Đang có: ${available.join(", ")}`);
  process.exit(1);
}

writeFileSync(TARGET, readFileSync(source, "utf8"));
console.log(`→ ${brandOf(source)}`);
console.log("Khởi động lại dev server để nạp cấu hình mới.");
