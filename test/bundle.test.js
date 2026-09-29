// dist/connector.json must match src/ -- it is what Stratek installs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildBundle, buildCatalogue, BUNDLE_PATH, CATALOGUE_PATH } from '../scripts/bundle.mjs';

test('dist/connector.json is up to date (run: npm run bundle)', async () => {
  const built = await buildBundle();
  const onDisk = JSON.parse(await readFile(BUNDLE_PATH, 'utf8'));
  assert.deepEqual(onDisk, built);
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.version, built.version, 'package.json version must match src/version.js');
  assert.deepEqual(JSON.parse(await readFile(CATALOGUE_PATH, 'utf8')), await buildCatalogue(), 'dist/catalogue.json out of date (npm run bundle)');
});
