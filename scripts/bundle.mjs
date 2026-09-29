// bundle.mjs -- builds dist/connector.json, the file the Stratek POS uploads
// into a shop's Cloudflare account when someone presses "Activate connector"
// (or "Update connector"). It is just the source files in src/ plus the few
// settings from wrangler.jsonc that the Cloudflare API needs.
//
//   npm run bundle        (run before every commit that changes src/;
//                          `npm test` fails if dist/ is out of date)

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BUNDLE_PATH = join(root, 'dist', 'connector.json');
export const CATALOGUE_PATH = join(root, 'dist', 'catalogue.json');

/** dist/catalogue.json -- the integration list Stratek's admin panel reads (Availability for merchants). */
export async function buildCatalogue() {
  const { INTEGRATIONS, CATEGORIES } = await import('../src/registry.js');
  const { CONNECTOR_VERSION } = await import('../src/version.js');
  return {
    version: CONNECTOR_VERSION,
    categories: CATEGORIES,
    integrations: INTEGRATIONS.map((i) => ({
      id: i.id, name: i.name, category: i.category || 'system', status: i.status || 'available',
      description: i.description, docsUrl: i.docsUrl || null,
      actions: (i.actions || []).map((a) => a.label),
      secrets: (i.secrets || []).map((x) => x.label),
    })),
  };
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out.sort();
}

export async function buildBundle() {
  const src = join(root, 'src');
  const modules = {};
  for (const file of await walk(src)) modules[relative(src, file).split(sep).join('/')] = await readFile(file, 'utf8');
  const version = /CONNECTOR_VERSION\s*=\s*'([^']+)'/.exec(modules['version.js'])?.[1];
  const wrangler = await readFile(join(root, 'wrangler.jsonc'), 'utf8');
  const compatibilityDate = /"compatibility_date"\s*:\s*"([^"]+)"/.exec(wrangler)?.[1];
  if (!version || !compatibilityDate || !modules['index.js']) throw new Error('bundle: missing version, compatibility_date or src/index.js');
  return {
    format: 1,
    name: 'stratek-connector',
    version,
    mainModule: 'index.js',
    compatibilityDate,
    // Durable Object the connector keeps its pairing in, and its migrations
    // (same as wrangler.jsonc). Add new steps at the end, never edit old ones.
    durableObjects: [{ name: 'STATE', className: 'ConnectorState' }],
    migrations: [{ tag: 'v1', new_sqlite_classes: ['ConnectorState'] }],
    modules,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const bundle = await buildBundle();
  await mkdir(dirname(BUNDLE_PATH), { recursive: true });
  await writeFile(BUNDLE_PATH, JSON.stringify(bundle, null, 1) + '\n');
  const catalogue = await buildCatalogue();
  await writeFile(CATALOGUE_PATH, JSON.stringify(catalogue, null, 1) + '\n');
  console.log(`dist/connector.json: v${bundle.version}, ${Object.keys(bundle.modules).length} files; dist/catalogue.json: ${catalogue.integrations.length} integrations`);
}
