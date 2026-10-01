// postiz -- outbound social posts through the shop's own Postiz account
// (v0.25.0). Postiz (postiz.com, or self-hosted) holds the logins to Facebook,
// Instagram, LinkedIn, TikTok, YouTube, Reddit and more; this connector only
// keeps the Postiz API key.
//
// Human in the loop:
// - draft_post (AI employee / API) creates DRAFTS only -- nothing is published.
// - schedule_post is outbound (it publishes in public): an agent can only ask
//   for it with request_integration_action; a person approves in Stratek.
// - The owner can also open the drafts in Postiz, edit, add media, schedule.
// No test environment at Postiz: live keys only.

const DEFAULT_BASE = 'https://api.postiz.com/public/v1';
const NPT_MS = (5 * 60 + 45) * 60000;
const NAME = 'Postiz';

function base(env) {
  const b = String(env.POSTIZ_API_URL || DEFAULT_BASE).trim().replace(/\/+$/, '');
  if (!/^https:\/\//.test(b)) throw new Error('Postiz API address must start with https://');
  return b;
}

async function pz(env, method, path, body) {
  if (!env.POSTIZ_API_KEY) throw new Error('Paste your Postiz API key in Set up (Postiz -> Settings -> Public API).');
  const res = await fetch(`${base(env)}${path}`, {
    method,
    headers: { Authorization: String(env.POSTIZ_API_KEY).trim(), 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => null);
  if (res.status === 401 || res.status === 403) throw Object.assign(new Error('Postiz did not accept the API key. Copy it again from Postiz -> Settings -> Public API.'), { status: 409 });
  if (res.status === 429) throw Object.assign(new Error('Postiz rate limit reached (about 90 new posts and 30 channel lists an hour). Try again later.'), { status: 429 });
  if (!res.ok) throw Object.assign(new Error(`${NAME}: ${j?.message || j?.error || `error ${res.status}`}`), { status: 502 });
  return j;
}

const channelsOf = async (env) => (await pz(env, 'GET', '/integrations')).filter?.((c) => !c.disabled) || [];
const label = (c) => `${c.name || c.profile || c.id} (${c.identifier})`;

/** "all" | "instagram, tiktok" | names / @profiles / ids -> Postiz channels. */
function pickChannels(all, want) {
  const w = String(want || 'all').toLowerCase().split(',').map((s) => s.trim().replace(/^@/, '')).filter(Boolean);
  if (!w.length || w.includes('all')) return all;
  const out = all.filter((c) => w.some((x) => [c.id, c.identifier, String(c.name || '').toLowerCase(), String(c.profile || '').toLowerCase()].includes(x) || String(c.identifier || '').startsWith(x)));
  if (!out.length) throw new Error(`No Postiz channel matches "${want}". Channels: ${all.map(label).join(', ') || 'none connected in Postiz yet'}.`);
  return out;
}

/** "2026-10-05 18:30" (Nepal time) or an ISO time -> ISO UTC. Blank -> tomorrow 10:00 Nepal time. */
export function postizDate(when, now = Date.now()) {
  const s = String(when || '').trim();
  if (!s) { const d = new Date(now + NPT_MS + 86400000); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 10, 0) - NPT_MS).toISOString(); }
  if (/[zZ]|[+-]\d\d:?\d\d$/.test(s)) { const t = Date.parse(s); if (Number.isNaN(t)) throw new Error('Time not understood.'); return new Date(t).toISOString(); }
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/);
  if (!m) throw new Error('Write the time like 2026-10-05 18:30 (Nepal time).');
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - NPT_MS).toISOString();
}

/** Minimal settings each network needs. */
function settingsFor(c, f, hasMedia) {
  const id = String(c.identifier || '');
  const title = String(f.title || f.content || '').replace(/\s+/g, ' ').trim().slice(0, 95);
  if (id.startsWith('youtube')) { if (!hasMedia) throw new Error('YouTube needs a video (media_url).'); return { __type: id, title, type: 'public' }; }
  if (id.startsWith('tiktok')) {
    if (!hasMedia) throw new Error('TikTok needs a video or photos (media_url).');
    return { __type: id, privacy_level: 'PUBLIC_TO_EVERYONE', duet: false, stitch: false, comment: true, autoAddMusic: 'no', brand_content_toggle: false, brand_organic_toggle: false, content_posting_method: 'DIRECT_POST' };
  }
  if (id.startsWith('instagram')) { if (!hasMedia) throw new Error('Instagram needs a photo or video (media_url).'); return { __type: id, post_type: 'post' }; }
  if (id.startsWith('reddit')) {
    const sub = String(f.subreddit || '').replace(/^\/?r\//i, '').trim();
    if (!sub) throw new Error('Reddit needs a subreddit (subreddit field) -- check its rules on self-promotion first.');
    return { __type: id, subreddit: [{ value: { subreddit: sub, title, type: hasMedia ? 'link' : 'self', url: '', is_flair_required: false } }] };
  }
  return { __type: id };
}

export default {
  id: 'postiz',
  name: 'Postiz',
  category: 'marketing',
  status: 'available',
  description: 'Social posts on Facebook, Instagram, LinkedIn, TikTok, YouTube, Reddit and more through your Postiz account: your AI employee prepares drafts, a person schedules.',
  docsUrl: 'https://docs.postiz.com/public-api/introduction',
  test: { support: 'none', note: 'Postiz has no test environment. Drafts never publish; scheduling needs a person.' },
  secrets: [
    { name: 'POSTIZ_API_KEY', label: 'Postiz API key', hint: 'In Postiz: Settings -> Public API -> copy the API key. Connect your social accounts inside Postiz first.' },
    { name: 'POSTIZ_API_URL', label: 'Postiz API address (only if self-hosted)', optional: true, hint: `Leave empty for postiz.com. Self-hosted: https://your-postiz-backend/public/v1` },
  ],
  actions: [
    {
      id: 'test', label: 'Test Postiz', placement: ['settings'], fields: [],
      async run({ env }) {
        const all = await channelsOf(env);
        return { type: 'message', title: 'Postiz is connected', text: all.length ? `Channels: ${all.map(label).join(', ')}.` : 'No channels yet -- connect your social accounts inside Postiz.' };
      },
    },
    {
      id: 'channels', label: 'Postiz channels', placement: ['agent'], fields: [],
      async run({ env }) {
        const all = await channelsOf(env);
        return { type: 'list', title: 'Postiz channels', items: all.map((c) => ({ id: c.id, name: c.name || null, profile: c.profile || null, network: c.identifier })) };
      },
    },
    {
      id: 'draft_post', label: 'Draft a social post (Postiz)', placement: ['agent'],
      fields: [
        { name: 'content', label: 'Post text', type: 'text', required: true },
        { name: 'channels', label: 'Channels ("all", or e.g. "instagram, tiktok")', type: 'text' },
        { name: 'when', label: 'Planned time (e.g. 2026-10-05 18:30, Nepal time)', type: 'text' },
        { name: 'media_url', label: 'Photo or video link (public https)', type: 'text' },
        { name: 'title', label: 'Title (YouTube / Reddit)', type: 'text' },
        { name: 'subreddit', label: 'Subreddit (Reddit only)', type: 'text' },
      ],
      async run({ env, store, fields }) {
        const f = fields || {};
        const content = String(f.content || '').trim();
        if (!content) throw new Error('Write the post text.');
        if (content.length > 5000) throw new Error('Post text is too long (5,000 characters max).');
        const chans = pickChannels(await channelsOf(env), f.channels);
        const date = postizDate(f.when);
        let image = [];
        if (f.media_url) {
          if (!/^https:\/\//.test(String(f.media_url))) throw new Error('The media link must be a public https:// address.');
          const up = await pz(env, 'POST', '/upload-from-url', { url: String(f.media_url) });
          image = [{ id: up.id, path: up.path }];
        }
        const posts = chans.map((c) => ({ integration: { id: c.id }, value: [{ content, image }], settings: settingsFor(c, { ...f, content }, image.length > 0) }));
        const r = await pz(env, 'POST', '/posts', { type: 'draft', date, shortLink: false, tags: [], posts });
        const ids = (Array.isArray(r) ? r : []).map((x) => x.postId).filter(Boolean);
        const drafts = (await store.get('drafts')) || [];
        drafts.unshift({ ids, channels: chans.map(label), date, preview: content.slice(0, 80), at: new Date().toISOString() });
        await store.put('drafts', drafts.slice(0, 20));
        return { type: 'message', title: 'Draft ready in Postiz', text: `Draft for ${chans.map(label).join(', ')} at ${date} (UTC). Nothing is published. To schedule it, ask for "schedule_post" with post_ids ${ids.join(',') || '(see Postiz)'} -- a person approves.`, postIds: ids };
      },
    },
    {
      id: 'list_posts', label: 'Postiz posts (next 30 days)', placement: ['agent'], fields: [],
      async run({ env }) {
        const now = Date.now();
        const q = `?startDate=${encodeURIComponent(new Date(now - 86400000).toISOString())}&endDate=${encodeURIComponent(new Date(now + 30 * 86400000).toISOString())}`;
        const r = await pz(env, 'GET', `/posts${q}`);
        const posts = (r?.posts || []).slice(0, 40).map((p) => ({ id: p.id, state: p.state, at: p.publishDate, network: p.integration?.providerIdentifier || p.integration?.identifier || null, channel: p.integration?.name || null, text: String(p.content || '').replace(/<[^>]+>/g, '').slice(0, 120), url: p.releaseURL || null }));
        return { type: 'list', title: 'Postiz posts', items: posts };
      },
    },
    {
      // Publishes in public at the planned time: a person runs or approves it.
      id: 'schedule_post', outbound: true, label: 'Schedule Postiz draft', placement: ['agent'],
      fields: [{ name: 'post_ids', label: 'Postiz post ids (comma-separated)', type: 'text', required: true }],
      async run({ env, fields }) {
        const ids = String(fields?.post_ids || '').split(',').map((s) => s.trim()).filter((s) => /^[A-Za-z0-9_-]{1,64}$/.test(s)).slice(0, 20);
        if (!ids.length) throw new Error('Give the Postiz post ids to schedule.');
        const done = [];
        for (const id of ids) { await pz(env, 'PUT', `/posts/${encodeURIComponent(id)}/status`, { status: 'schedule' }); done.push(id); }
        return { type: 'message', title: 'Scheduled in Postiz', text: `${done.length} post(s) will publish at their planned time: ${done.join(', ')}.` };
      },
    },
  ],
};
