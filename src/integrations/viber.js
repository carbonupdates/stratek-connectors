// viber -- sale updates to the owner on Viber, through your own Viber bot.
// Create a bot at partners.viber.com, paste its token. Saving registers this connector
// for the bot's events (set_webhook to <connector>/webhooks/viber). Then press
// "Link my Viber" -- it opens your bot with a one-time code; send the bot any message to
// finish (Viber only lets a bot write to people who have messaged it).
//   API: https://chatapi.viber.com/pa/{set_webhook,get_account_info,send_message}
//   Events are signed: X-Viber-Content-Signature = hex HMAC-SHA256(token, body).
// Buttons: Link my Viber, Send test message (Integrations tab); Post sale to Viber (sale details).
// Receipts to customers need the customer to message your bot first, so this starts with the owner.

import { sale } from './_util.js';
import { money, itemsLine } from './_hooks.js';
import { randomToken, resultPage, linkPage } from './_nepal.js';

async function viber(env, path, body) {
  const res = await fetch(`https://chatapi.viber.com/pa/${path}`, { method: 'POST', headers: { 'X-Viber-Auth-Token': String(env.VIBER_BOT_TOKEN).trim(), 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const j = await res.json().catch(() => null);
  if (!j || j.status !== 0) {
    if (j?.status === 2) throw new Error('Viber did not accept the bot token.');
    throw new Error(`Viber: ${j?.status_message || `error ${res.status}`}`);
  }
  return j;
}
const send = (env, receiver, text, name) => viber(env, 'send_message', { receiver, type: 'text', text: String(text).slice(0, 7000), sender: { name: String(name || 'Stratek').slice(0, 28) } });

async function hmacHex(key, text) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(text)))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function ensureHook(env, store, origin) {
  const have = await store.get('bot');
  if (have && have.token4 === String(env.VIBER_BOT_TOKEN).slice(-4)) return have;
  await viber(env, 'set_webhook', { url: `${origin}/webhooks/viber`, event_types: ['conversation_started', 'message', 'unsubscribed'], send_name: true, send_photo: false });
  const info = await viber(env, 'get_account_info', {});
  const bot = { uri: info.uri, name: info.name, token4: String(env.VIBER_BOT_TOKEN).slice(-4), at: new Date().toISOString() };
  await store.put('bot', bot);
  return bot;
}

export default {
  id: 'viber',
  name: 'Viber',
  category: 'messaging',
  status: 'available',
  color: '#7360F2',
  description: 'Sale updates to you on Viber, through your own Viber bot.',
  docsUrl: 'https://developers.viber.com/docs/api/rest-bot-api/',
  test: { support: 'none', note: 'Viber has no test mode.' },
  secrets: [
    { name: 'VIBER_BOT_TOKEN', label: 'Viber bot token', hint: 'partners.viber.com -> create a bot account -> copy its token. Then press "Link my Viber" on the Integrations tab.' },
  ],
  async onKeysSaved({ env, store, origin }) {
    const bot = await ensureHook(env, store, origin);
    return `bot "${bot.name}" is ready -- now press "Link my Viber"`;
  },
  /** GET /pay/viber/start/live/:code -- a page with the viber:// link that carries the one-time code. */
  async payPage({ token, store }) {
    const link = await store.get('link'); const bot = await store.get('bot');
    if (!link || link.code !== token || Date.now() > link.exp || !bot) return resultPage(false, 'This link has expired. Press "Link my Viber" in Stratek again.');
    const deep = `viber://pa?chatURI=${encodeURIComponent(bot.uri)}&context=${encodeURIComponent(token)}`;
    return linkPage('Link Viber to Stratek', `Open your bot "${bot.name}" in Viber, then send it any message.`, deep, 'Open Viber');
  },
  /** POST /webhooks/viber -- signed Viber events. */
  async webhook({ request, rawBody, env, store, mode }) {
    if (mode === 'test') throw Object.assign(new Error('Not found.'), { status: 404 });
    const sig = request.headers.get('X-Viber-Content-Signature') || '';
    if (!sig || sig !== (await hmacHex(String(env.VIBER_BOT_TOKEN).trim(), rawBody))) throw Object.assign(new Error('Bad signature.'), { status: 403 });
    let e; try { e = JSON.parse(rawBody); } catch { return { ignored: true }; }
    if (e.event === 'webhook') return { ok: true };
    const link = await store.get('link');
    if (e.event === 'conversation_started' && e.user?.id) {
      if (link && e.context === link.code && Date.now() < link.exp) {
        await store.put('link', { ...link, userId: e.user.id, name: e.user.name || 'owner' });
        return new Response(JSON.stringify({ sender: { name: 'Stratek' }, type: 'text', text: 'Almost done: send me any message to finish linking your Stratek shop.' }), { headers: { 'Content-Type': 'application/json' } });
      }
      return { ignored: 'no link code' };
    }
    if (e.event === 'message' && e.sender?.id && link?.userId === e.sender.id && Date.now() < link.exp) {
      await store.put('owner', { userId: e.sender.id, name: link.name, at: new Date().toISOString() });
      await store.delete('link');
      await send(env, e.sender.id, 'Linked. Stratek sale updates for this shop will come here.');
      return { linked: true };
    }
    if (e.event === 'unsubscribed' && (await store.get('owner'))?.userId === e.user_id) { await store.delete('owner'); return { unlinked: true }; }
    return { ignored: true };
  },
  actions: [
    {
      id: 'link', label: 'Link my Viber', placement: ['settings'], fields: [],
      async run({ env, store, origin, claims }) {
        if (claims?.src !== 'session') throw Object.assign(new Error('Only a person signed in to Stratek can link Viber.'), { status: 403 });
        const bot = await ensureHook(env, store, origin);
        const code = randomToken(12); // 24 hex characters
        await store.put('link', { code, exp: Date.now() + 15 * 60 * 1000 });
        return { type: 'link', title: 'Link my Viber', text: `Open this on the phone that has Viber: it opens your bot "${bot.name}". Then send the bot any message. The link works for 15 minutes.`, url: `${origin}/pay/viber/start/live/${code}`, linkLabel: 'Open Viber link' };
      },
    },
    {
      id: 'test', label: 'Send test message', placement: ['settings'], fields: [],
      async run({ env, store, origin }) {
        const bot = await ensureHook(env, store, origin);
        const o = await store.get('owner');
        if (!o) return { type: 'message', title: `Bot "${bot.name}" is ready`, text: 'Press "Link my Viber" to link your account first.' };
        await send(env, o.userId, 'Hello from Stratek. Sale updates for your shop will arrive here.');
        return { type: 'message', title: 'Sent', text: `Check Viber (${o.name}).` };
      },
    },
    {
      id: 'send_receipt', label: 'Post sale to Viber', placement: ['transaction'], fields: [],
      async run({ env, store, context, mode, claims }) {
        const o = await store.get('owner');
        if (!o) throw Object.assign(new Error('Link your Viber first (Integrations tab -> Viber -> Link my Viber).'), { status: 409 });
        const tx = sale(context);
        const items = itemsLine(tx.items);
        await send(env, o.userId, `${mode === 'test' ? 'TEST · ' : ''}Sale #${tx.id}: ${money(tx.amount, tx.currency)}${items ? `\n${items.slice(0, 500)}` : ''}`, claims?.owner_name);
        return { type: 'message', title: 'Posted to Viber', text: `Sale #${tx.id}.` };
      },
    },
  ],
};
