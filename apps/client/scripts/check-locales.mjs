/**
 * CI-friendly locale sanity check.
 *
 * What it catches:
 *  1. JSON parse errors.
 *  2. Mojibake (UTF-8 → cp1251/cp1252 round-trip) — the exact failure mode that
 *     turned "Русский" into "Р СѓСЃСЃРєРёР№" in uz.json.
 *  3. U+FFFD replacement characters, which mean the file lost data already.
 *  4. UTF-8 BOM at the start of the file (bundlers tolerate it but it leaks
 *     through `JSON.parse` sometimes).
 *
 * Exits non-zero on any failure so it slots cleanly into a `prebuild` step.
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const localesDir = path.resolve(__dirname, "../src/locales");

// Multi-byte UTF-8 sequences mis-decoded as cp1251 / cp1252 produce
// recognizable two-letter chunks. We list a conservative set so we don't
// accidentally flag legitimate Cyrillic / Latin-with-diacritics text.
const MOJIBAKE_PATTERNS = [
  /вЂ[ўЂ\s\-—]/u, // smart-quote / dash mangled via cp1251
  /Р[А-Я]С[А-Я]/u, // "ХХХ" cp1251 noise
  /Г[§©±¶ЁЃЇ]/u, // cp1252 noise: ç/é/ñ/...
  /д[её][­­\u00ad]/u, // mangled CJK
  /ТљР/u, // Қ in cp1251 noise
  /[\uFFFD]/u, // explicit replacement char
];

const issues = [];

for (const entry of fs.readdirSync(localesDir)) {
  if (!entry.endsWith(".json")) continue;
  const file = path.join(localesDir, entry);
  const buffer = fs.readFileSync(file);

  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    issues.push(`${entry}: file starts with UTF-8 BOM; please save as UTF-8 without BOM`);
  }

  let raw;
  try {
    raw = buffer.toString("utf8");
  } catch (err) {
    issues.push(`${entry}: cannot read as UTF-8 (${err.message})`);
    continue;
  }

  try {
    JSON.parse(raw);
  } catch (err) {
    issues.push(`${entry}: invalid JSON (${err.message})`);
    continue;
  }

  for (const pattern of MOJIBAKE_PATTERNS) {
    const match = pattern.exec(raw);
    if (match) {
      const start = Math.max(0, match.index - 20);
      const end = Math.min(raw.length, match.index + match[0].length + 20);
      const before = raw.slice(0, match.index);
      const line = before.split("\n").length;
      issues.push(
        `${entry}:${line}: looks like mojibake near "${raw.slice(start, end).replace(/\s+/g, " ")}" (matched /${pattern.source}/)`,
      );
    }
  }
}

if (issues.length === 0) {
  console.log("Locales OK");
  process.exit(0);
}

for (const message of issues) {
  console.error(`✗ ${message}`);
}
process.exit(1);
