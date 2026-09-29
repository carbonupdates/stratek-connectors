// pages.js -- the few pages a person sees when opening the connector's address.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function page(title, bodyHtml, status = 200, extraHeaders = {}) {
  return new Response(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><meta name="referrer" content="no-referrer">
<title>${esc(title)} -- Stratek connector</title>
<style>
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #fdecec; color: #201414; }
  main { max-width: 520px; margin: 8vh auto; background: #fff; border: 1px solid #e6caca; border-radius: 14px; padding: 32px 28px; box-shadow: 0 10px 30px rgba(92,15,22,.08); }
  .brand { font-weight: 700; color: #c81e2c; letter-spacing: .02em; margin-bottom: 18px; }
  h1 { font-size: 1.4rem; margin: 0 0 10px; }
  p { line-height: 1.55; color: #574646; }
  .btn { display: inline-block; background: #c81e2c; color: #fff; text-decoration: none; font-weight: 700; padding: 12px 22px; border-radius: 999px; margin-top: 8px; }
  .ok { background: #e7f6ec; color: #1e7a3e; border-radius: 8px; padding: 10px 14px; }
  .err { background: #fbeceb; color: #b3261e; border-radius: 8px; padding: 10px 14px; }
  label { display: block; font-weight: 600; margin: 14px 0 4px; }
  input[type=password], input[type=text] { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #e6caca; border-radius: 8px; font: inherit; }
  .hint { font-size: .85rem; color: #574646; margin-top: 4px; }
  .saved { font-size: .85rem; color: #1e7a3e; margin-top: 4px; }
  button.btn { border: 0; cursor: pointer; font: inherit; font-weight: 700; }
  .rm { font-weight: 400; display: inline; margin-left: 8px; font-size: .85rem; }
  code { background: #fdecec; padding: 2px 6px; border-radius: 4px; }
  small { color: #574646; }
</style></head>
<body><main><div class="brand">&#9679; Stratek connector</div>${bodyHtml}</main></body></html>`, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', ...extraHeaders },
  });
}

export function homePage({ pairing, version, stratekUrl }) {
  if (!pairing) {
    return page('Connect', `
      <h1>Connect this connector to Stratek</h1>
      <p>This connector is deployed and running. Connect it to your Stratek account so your integrations (like Pathao) show up in the POS.</p>
      <p><a class="btn" href="/connect">Connect to Stratek</a></p>
      <p><small>You'll be asked to sign in to Stratek and approve. Version ${esc(version)}.</small></p>`);
  }
  const back = pairing.ownerType === 'admin' ? `${stratekUrl}/admin.html#integrations` : `${stratekUrl}/dashboard.html#integrations`;
  return page('Connected', `
    <h1>Connected</h1>
    <p class="ok">This connector belongs to <strong>${esc(pairing.ownerName || pairing.ownerType)}</strong> on Stratek.</p>
    <p>Manage integrations from the <strong>Integrations</strong> tab in Stratek: press <strong>Set up</strong> on an integration and enter its keys. Keys stay in this connector (your Cloudflare account); Stratek never sees them.</p>
    <p><a class="btn" href="${esc(back)}">Open Stratek</a></p>
    <p><small>Version ${esc(version)}.</small></p>`);
}

export function messagePage(title, text, kind = 'err', status = 400) {
  return page(title, `<h1>${esc(title)}</h1><p class="${kind}">${esc(text)}</p>`, status);
}

export function connectedPage(pairing, stratekUrl) {
  // Straight back to Stratek's Integrations tab (step 3: Set up integrations).
  const back = pairing.ownerType === 'admin' ? `${stratekUrl}/admin.html#integrations` : `${stratekUrl}/dashboard.html#integrations`;
  return page('Connected', `
    <h1>All set</h1>
    <p class="ok">Connected to <strong>${esc(pairing.ownerName || pairing.ownerType)}</strong>.</p>
    <p>Taking you back to Stratek &rarr; <strong>Integrations</strong>, where you press <strong>Set up</strong> on the integrations you use&hellip;</p>
    <p><a class="btn" href="${esc(back)}">Back to Stratek now</a></p>`, 200, { Refresh: `3; url=${back}` });
}

/**
 * The "Set up" page for one integration. Opened from Stratek's Integrations
 * tab as <connector>/setup/<id>#pass=<one-hour pass>. The pass travels in the
 * URL fragment (never sent to any server) and is removed from the address bar
 * at once. Keys are sent only to this connector (same origin) -- Stratek's
 * page and servers never see them.
 */
export function setupPage(integration) {
  const csp = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'";
  const t = { support: 'sandbox', note: null, ...(integration.test || {}) };
  const testIntro = t.support === 'none'
    ? `<p class="hint">${esc(t.note || `${integration.name} has no test environment, so it runs with live keys only.`)}</p>`
    : `<p class="hint">Used only where Stratek says "test" (e.g. the online store's test mode, or the "(test keys)" buttons on Stratek's Integrations tab). The till, kiosk and live store always use the live keys.${t.note ? ` ${esc(t.note)}` : ''}</p>`;
  return page(`Set up ${integration.name}`, `
    <h1>Set up ${esc(integration.name)}</h1>
    <p>${esc(integration.description || '')}</p>
    <div id="msg"></div>
    <section class="mode" data-mode="live"><h2>Live keys</h2><p class="hint">Real customers and real money.</p>
      <form id="f_live" hidden autocomplete="off"><div class="fields"></div><p><button class="btn" type="submit">Save live keys</button></p></form></section>
    <section class="mode" data-mode="test"><h2>Test keys ${t.support === 'none' ? '<small>(not available)</small>' : '<small>(optional)</small>'}</h2>${testIntro}
      ${t.support === 'none' ? '' : '<form id="f_test" hidden autocomplete="off"><div class="fields"></div><p><button class="btn btn-alt" type="submit">Save test keys</button></p></form>'}</section>
    <p><small>Keys are stored in this connector, in the shop's own Cloudflare account. Stratek never sees them; saved keys are only shown masked.</small></p>
    <style>.mode{border-top:1px solid #e6caca;margin-top:18px;padding-top:6px}h2{font-size:1.1rem;margin:10px 0 2px}.btn-alt{background:#574646}</style>
    <script>
    (function () {
      var id = ${JSON.stringify(integration.id)};
      var m = location.hash.match(/pass=([A-Za-z0-9._-]+)/);
      var pass = m ? m[1] : '';
      history.replaceState(null, '', location.pathname);
      var msg = document.getElementById('msg');
      function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
      function say(text, kind) { msg.innerHTML = text ? '<p class="' + (kind || 'err') + '">' + esc(text) + '</p>' : ''; msg.scrollIntoView({ block: 'nearest' }); }
      if (!pass) { say('Open this page from Stratek: Integrations -> Set up.'); return; }
      function api(method, mode, body) {
        return fetch('/secrets/' + id + (method === 'GET' ? '?mode=' + mode : ''), { method: method, headers: { Authorization: 'Bearer ' + pass, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
          .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.success) throw new Error((j.error && j.error.message) || ('Error ' + r.status)); return j.data; }); });
      }
      function setup(mode) {
        var form = document.getElementById('f_' + mode); if (!form) return;
        var box = form.querySelector('.fields');
        function render(d) {
          box.innerHTML = d.secrets.map(function (s) {
            var fid = 'k_' + mode + '_' + s.name;
            var saved = s.set ? '<div class="saved">Saved: ' + esc(s.masked) + (s.source === 'cloudflare' ? ' (set in Cloudflare)' : '') + ' -- leave empty to keep</div>' : '';
            var rm = s.set && s.source === 'connector' ? '<label class="rm"><input type="checkbox" data-remove="' + esc(s.name) + '"> remove</label>' : '';
            return '<label for="' + esc(fid) + '">' + esc(s.label) + (s.optional ? ' <small>(optional)</small>' : '') + rm + '</label>' +
              '<input type="password" id="' + esc(fid) + '" data-name="' + esc(s.name) + '" spellcheck="false" autocomplete="new-password">' +
              (s.hint ? '<div class="hint">' + esc(s.hint) + '</div>' : '') + saved;
          }).join('');
          form.hidden = false;
        }
        api('GET', mode).then(render).catch(function (e) { say(e.message); });
        form.addEventListener('submit', function (ev) {
          ev.preventDefault();
          var values = {}, remove = [];
          box.querySelectorAll('input[data-name]').forEach(function (i) { if (i.value.trim()) values[i.dataset.name] = i.value.trim(); });
          box.querySelectorAll('input[data-remove]:checked').forEach(function (i) { remove.push(i.dataset.remove); });
          var btn = form.querySelector('button'); btn.disabled = true;
          var label = mode === 'test' ? 'Test keys' : 'Live keys';
          api('POST', mode, { mode: mode, values: values, remove: remove }).then(function (d) {
            render(d);
            if (!d.ready) say(label + ' saved. Still missing: ' + d.missing.join(', ') + '.', 'err');
            else if (d.warning) say(label + ' saved, but: ' + d.warning, 'err');
            else say(label + ' saved. ' + d.name + ' is ready' + (mode === 'test' ? ' in test mode' : '') + (d.notice ? ' -- ' + d.notice : '') + '. Go back to Stratek, it updates by itself.', 'ok');
          }).catch(function (e) { say(e.message); }).then(function () { btn.disabled = false; });
        });
      }
      setup('live'); setup('test');
    })();
    </script>`, 200, { 'Content-Security-Policy': csp });
}
