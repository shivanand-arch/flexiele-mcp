#!/usr/bin/env node
/*
 * Flexiele static API endpoint extractor
 * Usage: node extract-endpoints.mjs
 * Outputs: ~/flexiele-api-catalog.json
 *
 * No auth needed — parses the public JS bundles.
 */
import { writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const BASE = 'https://feexotel.flexiele.com';
const OUT  = join(homedir(), 'flexiele-api-catalog.json');

async function get(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

console.log('[1/4] Fetching app HTML...');
const html = await get(BASE);

// Extract all <script src="..."> bundle URLs
const scriptRe = /<script[^>]+src="([^"]+\.js(?:\?[^"]*)?)"[^>]*>/g;
const bundleUrls = [];
let m;
while ((m = scriptRe.exec(html)) !== null) {
  const src = m[1];
  bundleUrls.push(src.startsWith('http') ? src : `${BASE}${src}`);
}
console.log(`[2/4] Found ${bundleUrls.length} script bundles`);

// Fetch bundles and extract /api/ paths
const apiPathRe = /[`'"/]((\/api\/[a-zA-Z0-9_\-/.{}:]+))[`'"]/g;
const allPaths = new Set();
let processed = 0;

for (const url of bundleUrls) {
  try {
    const src = await get(url);
    let pm;
    while ((pm = apiPathRe.exec(src)) !== null) {
      const path = pm[1].split('?')[0].replace(/\/:[^/]+/g, '/:param').replace(/\/\{[^}]+\}/g, '/:param');
      if (path.length > 4 && path.length < 120) allPaths.add(path);
    }
    processed++;
    process.stdout.write(`\r[3/4] Parsed ${processed}/${bundleUrls.length} bundles (${allPaths.size} endpoints so far)...`);
  } catch (e) {
    // skip bundles that 404 / are external
  }
}
console.log('\n');

// Group by module (segment after /api/)
const grouped = {};
for (const path of [...allPaths].sort()) {
  const parts = path.split('/').filter(Boolean); // ['api', 'module', ...]
  const module = parts[1] || 'unknown';
  grouped[module] = grouped[module] || [];
  grouped[module].push(path);
}

const summary = Object.entries(grouped)
  .sort((a, b) => b[1].length - a[1].length)
  .map(([m, paths]) => `  ${m.padEnd(30)} ${paths.length} endpoints`);

console.log('[4/4] Summary:\n');
console.log(summary.join('\n'));
console.log(`\nTotal: ${allPaths.size} unique endpoints across ${Object.keys(grouped).length} modules`);

writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), totalEndpoints: allPaths.size, modules: grouped }, null, 2));
console.log(`\nSaved → ${OUT}`);
