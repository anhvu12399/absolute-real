import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const candidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const chromePath = candidates.find((path) => existsSync(path));
if (!chromePath) {
  console.error("Chrome was not found. Set CHROME_PATH before running Lighthouse CI.");
  process.exit(1);
}
const result = spawnSync("lhci", ["autorun"], {
  stdio: "inherit",
  env: { ...process.env, CHROME_PATH: chromePath },
});
process.exit(result.status ?? 1);
