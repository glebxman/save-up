/**
 * One-off i18n audit: extract every t("key") used in the client source and
 * report which keys are missing (or empty) in each locale JSON file.
 *
 * Keys built dynamically via template literals (e.g. `accounts.type.${x}`)
 * cannot be statically resolved, so their static prefix is reported separately
 * and skipped from the "missing" check.
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, "../src");
const localesDir = path.resolve(__dirname, "../src/locales");

/** Recursively collect .ts/.tsx files. */
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "locales") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Static keys: t("a.b.c") or t('a.b.c') with no template interpolation.
const STATIC_KEY = /\bt\(\s*["']([a-zA-Z0-9_.]+)["']/g;
// Dynamic keys: t(`a.b.${...}`) — capture the static prefix before the first ${.
const DYNAMIC_KEY = /\bt\(\s*`([a-zA-Z0-9_.]*)\$\{/g;

const staticKeys = new Set();
const dynamicPrefixes = new Set();

for (const file of walk(srcDir)) {
  const text = fs.readFileSync(file, "utf8");
  let m;
  while ((m = STATIC_KEY.exec(text))) staticKeys.add(m[1]);
  while ((m = DYNAMIC_KEY.exec(text))) dynamicPrefixes.add(m[1]);
}

function getByPath(obj, keyPath) {
  return keyPath.split(".").reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
}

const localeFiles = fs.readdirSync(localesDir).filter((f) => f.endsWith(".json"));
const locales = {};
for (const f of localeFiles) {
  locales[f] = JSON.parse(fs.readFileSync(path.join(localesDir, f), "utf8"));
}

console.log(`Static keys used in code: ${staticKeys.size}`);
console.log(`Dynamic key prefixes (skipped): ${[...dynamicPrefixes].join(", ") || "none"}`);
console.log("");

let totalMissing = 0;
let totalEmpty = 0;
const sortedKeys = [...staticKeys].sort();

for (const f of localeFiles) {
  const data = locales[f];
  const missing = [];
  const empty = [];
  for (const key of sortedKeys) {
    const value = getByPath(data, key);
    if (value === undefined) missing.push(key);
    else if (typeof value === "string" && value.trim() === "") empty.push(key);
  }
  if (missing.length || empty.length) {
    console.log(`=== ${f} ===`);
    if (missing.length) console.log(`  MISSING (${missing.length}): ${missing.join(", ")}`);
    if (empty.length) console.log(`  EMPTY (${empty.length}): ${empty.join(", ")}`);
    console.log("");
  }
  totalMissing += missing.length;
  totalEmpty += empty.length;
}

if (totalMissing === 0 && totalEmpty === 0) {
  console.log("All static translation keys are present and non-empty in every locale.");
} else {
  console.log(`Summary: ${totalMissing} missing, ${totalEmpty} empty across all locales.`);
}

// ── Dynamic keys: explicitly enumerated resolved key sets ──────────────────
const dynamicKeys = [
  // transactionType.${type}
  ...["income", "expense", "transfer_to_savings", "transfer_from_savings", "transfer_between_accounts"].map((k) => `transactionType.${k}`),
  // expenseCategory.${key}
  ...["food", "taxi", "entertainment", "shopping", "utilities", "health", "education", "other"].map((k) => `expenseCategory.${k}`),
  // accounts.type.${type}
  ...["cash", "card", "crypto"].map((k) => `accounts.type.${k}`),
  // report.mode${Mode}
  ...["Income", "Spending", "Analytics", "History"].map((k) => `report.mode${k}`),
  // settings.theme${Theme}
  ...["Auto", "Light", "Dark"].map((k) => `settings.theme${k}`),
  // settings.language${Lang}
  ...["En", "Ru", "Uz", "Kk", "Zh", "Ja", "Ko", "Tr", "Es", "Fr", "De"].map((k) => `settings.language${k}`),
  // notifications.modes.${mode}.{title,description}
  ...["off", "per_day", "every_n_days"].flatMap((m) => [`notifications.modes.${m}.title`, `notifications.modes.${m}.description`]),
  // welcome.highlights.${key}.{title,description}
  ...["balance", "limits", "reports", "reminders"].flatMap((k) => [`welcome.highlights.${k}.title`, `welcome.highlights.${k}.description`]),
  // onboarding.${stepId}.{title,description}
  ...[
    "welcome", "navigation", "balance", "amount-input", "voice-input", "daily-limit", "savings",
    "templates", "report-tabs", "report-month", "report-summary", "report-details", "report-heatmap",
    "report-export", "settings-theme", "settings-language", "settings-currency", "settings-categories",
    "settings-notifications", "settings-security", "done",
  ].flatMap((s) => [`onboarding.${s}.title`, `onboarding.${s}.description`]),
];

console.log("\n── Dynamic (template-literal) key verification ──");
let dynMissing = 0;
let dynEmpty = 0;
for (const f of localeFiles) {
  const data = locales[f];
  const missing = [];
  const empty = [];
  for (const key of dynamicKeys) {
    const value = getByPath(data, key);
    if (value === undefined) missing.push(key);
    else if (typeof value === "string" && value.trim() === "") empty.push(key);
  }
  if (missing.length || empty.length) {
    console.log(`=== ${f} ===`);
    if (missing.length) console.log(`  MISSING (${missing.length}): ${missing.join(", ")}`);
    if (empty.length) console.log(`  EMPTY (${empty.length}): ${empty.join(", ")}`);
  }
  dynMissing += missing.length;
  dynEmpty += empty.length;
}
if (dynMissing === 0 && dynEmpty === 0) {
  console.log(`All ${dynamicKeys.length} resolved dynamic keys are present and non-empty in every locale.`);
} else {
  console.log(`Dynamic summary: ${dynMissing} missing, ${dynEmpty} empty.`);
}
