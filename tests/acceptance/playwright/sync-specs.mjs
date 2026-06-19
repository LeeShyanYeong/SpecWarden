// Sync SSOT specs into this lane's generated `features/` folder — the analog of
// stage-cucumber.sh copying specs/ into the Reqnroll Features/ folder.
//
// Routing by tag keeps each runner owning only the specs it can execute. This
// lane hosts the browser levels: a feature using any of the tags below is owned
// here, and per-scenario the driver runs against a real browser
// (@e2e -> live backend, @component -> stubbed backend). See dsl/. The @api
// level goes to the Reqnroll lane instead (scripts/stage-cucumber.sh).
// A file with none of these tags is ignored here.

import { readdirSync, readFileSync, writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const specsDir = join(here, '..', '..', '..', 'specs');
const featuresDir = join(here, 'features');

const OWNED_TAGS = ['@e2e', '@component'];

if (!existsSync(featuresDir)) {
  mkdirSync(featuresDir, { recursive: true });
}

// Clear previously generated features (everything except the .gitignore).
for (const entry of readdirSync(featuresDir)) {
  if (entry !== '.gitignore') {
    rmSync(join(featuresDir, entry), { recursive: true, force: true });
  }
}

const copied = [];
for (const file of readdirSync(specsDir)) {
  if (!file.endsWith('.feature')) continue;
  const content = readFileSync(join(specsDir, file), 'utf8');
  if (OWNED_TAGS.some((tag) => content.includes(tag))) {
    writeFileSync(join(featuresDir, file), content);
    copied.push(file);
  }
}

console.log(
  copied.length
    ? `[playwright] Synced ${copied.length} spec(s): ${copied.join(', ')}`
    : '[playwright] No @e2e/@component specs found in specs/ — nothing to run.',
);
