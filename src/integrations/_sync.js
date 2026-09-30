// Pushing Stratek's inventory to an online store (WooCommerce, Shopify).
// Only items that changed since the last push are sent, at most MAX_PER_RUN per press
// (Cloudflare's free plan allows ~50 outgoing calls per request; an item can take 2); the rest go on the
// next press. The link Stratek item -> store product is kept in the integration memory.

export const MAX_PER_RUN = 20;

const sig = (i) => JSON.stringify([i.name, i.description || '', Number(i.price), !!i.available, i.category || '', i.photo || '']);

/**
 * items: Stratek menu items. push(item, existingRemoteId|null) -> remoteId.
 * -> { created, updated, unchanged, left, errors[] }
 */
export async function syncItems(store, items, push) {
  const out = { created: 0, updated: 0, unchanged: 0, left: 0, errors: [] };
  const map = (await store.get('map')) || {}; // one read, one write (each memory call counts as a request too)
  let budget = MAX_PER_RUN;
  for (const item of items) {
    const known = map[item.id];
    const s = sig(item);
    if (known && known.sig === s) { out.unchanged += 1; continue; }
    if (budget <= 0) { out.left += 1; continue; }
    budget -= 1;
    try {
      const remoteId = await push(item, known?.remoteId || null);
      map[item.id] = { remoteId, sig: s };
      if (known?.remoteId) out.updated += 1; else out.created += 1;
    } catch (err) {
      out.errors.push(`${item.name}: ${err.message}`);
    }
  }
  await store.put('map', map);
  return out;
}

export function syncSummary(name, r) {
  const parts = [`${r.created} added`, `${r.updated} updated`, `${r.unchanged} already up to date`];
  let text = `${name}: ${parts.join(', ')}.`;
  if (r.left) text += ` ${r.left} more to go -- press again.`;
  if (r.errors.length) text += ` Problems: ${r.errors.slice(0, 3).join('; ')}${r.errors.length > 3 ? '...' : ''}`;
  return text;
}

export const menuItems = (context) => {
  const items = context?.menu?.items;
  if (!items) throw new Error('Open this from the Integrations tab (it sends your inventory).');
  return items;
};
