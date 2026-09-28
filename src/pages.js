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
  const back = pairing.ownerType === 'admin' ? `${stratekUrl}/admin.html` : `${stratekUrl}/dashboard.html`;
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
  const back = pairing.ownerType === 'admin' ? `${stratekUrl}/admin.html` : `${stratekUrl}/dashboard.html`;
  return page('Connected', `
    <h1>All set</h1>
    <p class="ok">Connected to <strong>${esc(pairing.ownerName || pairing.ownerType)}</strong>.</p>
    <p>Go back to Stratek &rarr; <strong>Integrations</strong> and press <strong>Set up</strong> on the integrations you use.</p>
    <p><a class="btn" href="${esc(back)}">Back to Stratek</a></p>`);
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
  return page(`Set up ${integration.name}`, `
    <h1>Set up ${esc(integration.name)}</h1>
    <p>${esc(integration.description || '')}</p>
    <div id="msg"></div>
    <form id="f" hidden autocomplete="off"><div id="fields"></div>
      <p><button class="btn" type="submit" id="save">Save keys</button></p>
    </form>
    <p><small>Keys are stored in this connector, in the shop's own Cloudflare account. Stratek never sees them; saved keys are only shown masked.</small></p>
    <script>
    (function () {
      var id = ${JSON.stringify(integration.id)};
      var m = location.hash.match(/pass=([A-Za-z0-9._-]+)/);
      var pass = m ? m[1] : '';
      history.replaceState(null, '', location.pathname);
      var msg = document.getElementById('msg'), form = document.getElementById('f'), box = document.getElementById('fields');
      function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
      function say(text, kind) { msg.innerHTML = text ? '<p class="' + (kind || 'err') + '">' + esc(text) + '</p>' : ''; }
      if (!pass) { say('Open this page from Stratek: Integrations -> Set up.'); return; }
      function api(method, body) {
        return fetch('/secrets/' + id, { method: method, headers: { Authorization: 'Bearer ' + pass, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
          .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.success) throw new Error((j.error && j.error.message) || ('Error ' + r.status)); return j.data; }); });
      }
      function render(d) {
        box.innerHTML = d.secrets.map(function (s) {
          var saved = s.set ? '<div class="saved">Saved: ' + esc(s.masked) + (s.source === 'cloudflare' ? ' (set in Cloudflare)' : '') + ' -- leave empty to keep</div>' : '';
          var rm = s.set && s.source === 'connector' ? '<label class="rm"><input type="checkbox" data-remove="' + esc(s.name) + '"> remove</label>' : '';
          return '<label for="k_' + esc(s.name) + '">' + esc(s.label) + (s.optional ? ' <small>(optional)</small>' : '') + rm + '</label>' +
            '<input type="password" id="k_' + esc(s.name) + '" data-name="' + esc(s.name) + '" spellcheck="false" autocomplete="new-password">' +
            (s.hint ? '<div class="hint">' + esc(s.hint) + '</div>' : '') + saved;
        }).join('');
        form.hidden = false;
      }
      api('GET').then(render).catch(function (e) { say(e.message); });
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var values = {}, remove = [];
        box.querySelectorAll('input[data-name]').forEach(function (i) { if (i.value.trim()) values[i.dataset.name] = i.value.trim(); });
        box.querySelectorAll('input[data-remove]:checked').forEach(function (i) { remove.push(i.dataset.remove); });
        var btn = document.getElementById('save'); btn.disabled = true;
        api('POST', { values: values, remove: remove }).then(function (d) {
          render(d);
          say(d.ready ? 'Saved. ' + d.name + ' is ready -- go back to Stratek, it updates by itself.' : 'Saved. Still missing: ' + d.missing.join(', ') + '.', d.ready ? 'ok' : 'err');
        }).catch(function (e) { say(e.message); }).then(function () { btn.disabled = false; });
      });
    })();
    </script>`, 200, { 'Content-Security-Policy': csp });
}
