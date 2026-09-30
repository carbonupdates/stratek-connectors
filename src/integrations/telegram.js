// telegram -- Stratek alerts to the owner's Telegram, and chat with the AI
// employee from Telegram (v0.13.0).
//
// Setup: make a bot with @BotFather (/newbot), paste its token in Set up.
// Saving the token registers this connector with Telegram (setWebhook with a
// secret only Telegram and this connector know). Then the owner presses
// "Link my Telegram" on Stratek's Integrations tab: that opens the bot with a
// one-time code; pressing Start links THAT Telegram account (private chat
// only). Only the linked account is listened to.
//
// - Alerts: Stratek decides when an alert is due (approval request, paid
//   online order, delivery problem, daily summary) and runs the hidden `alert`
//   action with a server pass. The bot token never leaves this connector.
// - Chat: messages from the linked account go to the AI employee (same loop,
//   same limits as its card in Stratek). Approvals still happen in the
//   dashboard -- alerts only link there.
// - "Post sale to Telegram" (sale details) sends a short sale summary.
// Live only: Telegram has no test environment. Alerts from Test mode say TEST.

import { runAgentTurn, clearHistory, agentKey } from '../agent.js';

const MAX_TEXT = 3900; // Telegram allows 4096 characters per message

function stratek(env) { return String(env.STRATEK_URL || 'https://strateknepal.com').replace(/\/+$/, ''); }
const dashboard = (env, tab = 'integrations') => `${stratek(env)}/dashboard.html#${tab}`;
const hex = (n = 16) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
const clip = (s) => { s = String(s || ''); return s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT - 1)}…` : s; };

async function tg(env, method, body) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error('Paste your bot token in Set up first.');
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}),
  });
  const j = await res.json().catch(() => null);
  if (res.status === 401 || res.status === 404) throw new Error('Telegram did not accept the bot token. Copy it again from @BotFather into Set up.');
  if (!j?.ok) throw Object.assign(new Error(`Telegram: ${j?.description || `error ${res.status}`}`), { status: res.status === 403 ? 409 : 502 });
  return j.result;
}

/** Checks the token and registers this connector for the bot's messages. */
async function ensureBot(env, store, origin, force = false) {
  const have = await store.get('bot');
  if (have && !force && have.token4 === String(env.TELEGRAM_BOT_TOKEN).slice(-4)) return have;
  const me = await tg(env, 'getMe');
  const secret = hex(24);
  await tg(env, 'setWebhook', { url: `${origin}/webhooks/telegram`, secret_token: secret, allowed_updates: ['message'], drop_pending_updates: true });
  const bot = { id: me.id, username: me.username, name: me.first_name, token4: String(env.TELEGRAM_BOT_TOKEN).slice(-4), secret, at: new Date().toISOString() };
  await store.put('bot', bot);
  return bot;
}

async function send(env, chatId, text, button) {
  const body = { chat_id: chatId, text: clip(text), disable_web_page_preview: true };
  if (button?.url) body.reply_markup = { inline_keyboard: [[{ text: String(button.label || 'Open Stratek').slice(0, 40), url: button.url }]] };
  return tg(env, 'sendMessage', body);
}

async function owner(store) { return (await store.get('owner')) || null; }

const HELP = 'This bot sends you Stratek alerts. You can also message it to give your AI employee a task, for example "Which paid online orders still need settling?".\n\nReply "continue" when it says it has more to do. /new starts a new conversation. Approvals always happen in the Stratek dashboard.';

function sameText(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || !a) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function chatWithAiEmployee(env, aiStore, chatId, who, text) {
  const ready = env.AI_PROVIDER && env.AI_API_KEY && env.AI_MODEL;
  if (!ready || !(await agentKey(aiStore))) {
    return send(env, chatId, 'Your AI employee is off. Switch it on in Stratek (Integrations -> AI employee) to give it tasks here.', { label: 'Open Integrations', url: dashboard(env) });
  }
  await tg(env, 'sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {});
  let r;
  try { r = await runAgentTurn(env, aiStore, { message: /^continue\.?$/i.test(text) ? '__continue__' : text, by: `telegram:${who}` }); }
  catch (err) { return send(env, chatId, `The AI employee couldn't do that: ${err.message}`); }
  let reply = r.reply || 'Done.';
  if (r.needsContinue) reply += '\n\nReply "continue" and I will carry on.';
  const asked = (r.steps || []).some((s) => s.tool === 'request_integration_action' && s.ok !== false);
  return send(env, chatId, reply, asked ? { label: 'Approve in Stratek', url: dashboard(env) } : null);
}

export default {
  id: 'telegram',
  name: 'Telegram',
  category: 'messaging',
  status: 'available',
  color: '#229ED9',
  description: 'Stratek alerts on your Telegram (approvals, paid orders, delivery problems, daily summary) -- and chat with your AI employee there.',
  docsUrl: 'https://github.com/carbonupdates/stratek-connectors#telegram',
  test: { support: 'none', note: 'Telegram has no test environment. Alerts from Test mode are marked TEST.' },
  secrets: [
    { name: 'TELEGRAM_BOT_TOKEN', label: 'Telegram bot token', hint: 'In Telegram, message @BotFather, send /newbot, pick a name and a username ending in "bot", and paste the token it gives you. Then press "Link my Telegram" on the Integrations tab.' },
  ],
  async onKeysSaved({ env, store, origin }) {
    const bot = await ensureBot(env, store, origin, true);
    return `bot @${bot.username} is ready -- now press "Link my Telegram" on the Integrations tab`;
  },

  /** POST /webhooks/telegram -- Telegram sends the bot's messages here (with our secret header). */
  async webhook({ request, rawBody, env, store, mode, storeFor }) {
    if (mode === 'test') throw Object.assign(new Error('Not found.'), { status: 404 });
    const bot = await store.get('bot');
    if (!bot || !sameText(request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '', bot.secret)) throw Object.assign(new Error('Not allowed.'), { status: 403 });
    let u; try { u = JSON.parse(rawBody); } catch { return { ignored: 'bad json' }; }
    // Telegram retries if we are slow: handle each update once.
    const last = Number(await store.get('last_update')) || 0;
    if (!Number.isInteger(u?.update_id) || u.update_id <= last) return { duplicate: true };
    await store.put('last_update', u.update_id);
    const m = u.message;
    if (!m || typeof m.text !== 'string' || m.chat?.type !== 'private' || !m.from) return { ignored: true };
    const text = m.text.trim().slice(0, 4000);
    const who = m.from.username ? `@${m.from.username}` : (m.from.first_name || 'owner');
    const linked = await owner(store);

    const start = text.match(/^\/start(?:\s+([0-9a-f]{32}))?$/);
    if (start && start[1]) {
      const link = await store.get('link');
      if (!link || !sameText(start[1], link.code) || Date.now() > link.exp) return send(env, m.chat.id, 'This link has expired. Press "Link my Telegram" in Stratek again.');
      await store.delete('link');
      await store.put('owner', { chatId: m.chat.id, userId: m.from.id, name: [m.from.first_name, m.from.last_name].filter(Boolean).join(' ') || who, username: m.from.username || null, at: new Date().toISOString() });
      await send(env, m.chat.id, `Linked. Stratek alerts for this shop will come here.\n\n${HELP}`);
      return { linked: true };
    }
    // Everyone else is ignored (no reply, so the bot doesn't reveal anything).
    if (!linked || linked.userId !== m.from.id || linked.chatId !== m.chat.id) return { ignored: 'not the linked account' };
    if (text === '/start' || text === '/help') { await send(env, m.chat.id, HELP); return { help: true }; }
    const aiStore = storeFor('ai_employee');
    if (text === '/new') { await clearHistory(aiStore); await send(env, m.chat.id, 'New conversation started. What should I do?'); return { reset: true }; }
    await chatWithAiEmployee(env, aiStore, m.chat.id, who, text);
    return { handled: true };
  },

  actions: [
    {
      id: 'test',
      label: 'Send test message',
      placement: ['settings'],
      fields: [],
      async run({ env, store, origin }) {
        const bot = await ensureBot(env, store, origin);
        const o = await owner(store);
        if (!o) return { type: 'message', title: `Bot @${bot.username} is ready`, text: 'Now press "Link my Telegram" on the Telegram card to link your account.' };
        await send(env, o.chatId, 'Hello from Stratek. Alerts for your shop will arrive here.');
        return { type: 'message', title: 'Sent', text: `Check Telegram (${o.name}).` };
      },
    },
    {
      id: 'notify',
      label: 'Post sale to Telegram',
      placement: ['transaction'],
      fields: [],
      async run({ env, store, context, mode }) {
        const o = await owner(store);
        if (!o) throw Object.assign(new Error('Link your Telegram first (Integrations tab -> Telegram).'), { status: 409 });
        const tx = context?.transaction || {};
        if (!tx.id) throw new Error('Open this from a sale.');
        const line = `${mode === 'test' || tx.isTest ? 'TEST · ' : ''}Sale #${tx.id}: ${tx.currency || 'NPR'} ${Number(tx.amount || 0).toLocaleString('en-IN')}${tx.reference ? ` (${String(tx.reference).slice(0, 60)})` : ''}`;
        await send(env, o.chatId, line, { label: 'Open Transactions', url: dashboard(env, 'transactions') });
        return { type: 'message', title: 'Posted to Telegram', text: line };
      },
    },
    {
      // Hidden: Stratek's Telegram card. A person only.
      id: 'link',
      label: 'Link my Telegram',
      placement: ['agent'],
      fields: [],
      async run({ env, store, origin, claims }) {
        if (claims?.src !== 'session') throw Object.assign(new Error('Only a person signed in to Stratek can link Telegram.'), { status: 403 });
        const bot = await ensureBot(env, store, origin);
        const code = hex(16);
        await store.put('link', { code, exp: Date.now() + 15 * 60 * 1000 });
        return { type: 'link', url: `https://t.me/${bot.username}?start=${code}`, bot: `@${bot.username}`, expiresInMinutes: 15 };
      },
    },
    {
      id: 'status',
      label: 'Telegram status',
      placement: ['agent'],
      fields: [],
      async run({ store, claims }) {
        if (claims?.src !== 'session' && claims?.src !== 'server') throw Object.assign(new Error('Dashboard only.'), { status: 403 });
        const bot = await store.get('bot'); const o = await owner(store);
        return { type: 'telegram', bot: bot ? `@${bot.username}` : null, linked: o ? { name: o.name, username: o.username, at: o.at } : null };
      },
    },
    {
      id: 'unlink',
      label: 'Unlink Telegram',
      placement: ['agent'],
      fields: [],
      async run({ env, store, claims }) {
        if (claims?.src !== 'session') throw Object.assign(new Error('Only a person signed in to Stratek can unlink Telegram.'), { status: 403 });
        const o = await owner(store);
        if (o) await send(env, o.chatId, 'This Telegram account was unlinked from Stratek. No more alerts or AI employee chat here.').catch(() => {});
        await store.delete('owner'); await store.delete('link');
        return { type: 'telegram', linked: null };
      },
    },
    {
      // Hidden: Stratek's server sends alerts (it decides when; the token stays here).
      id: 'alert',
      label: 'Send an alert',
      placement: ['agent'],
      fields: [{ name: 'text', label: 'Text', type: 'text', required: true }],
      async run({ env, store, fields, claims }) {
        if (claims?.src !== 'server') throw Object.assign(new Error('Only Stratek sends alerts.'), { status: 403 });
        const o = await owner(store);
        if (!o) throw Object.assign(new Error('Telegram is not linked yet.'), { status: 409 });
        const url = String(fields.buttonUrl || '');
        const button = url.startsWith(`${stratek(env)}/`) ? { label: fields.buttonLabel, url } : null;
        await send(env, o.chatId, String(fields.text), button);
        return { type: 'message', title: 'Sent', text: 'Alert sent.' };
      },
    },
  ],
};
