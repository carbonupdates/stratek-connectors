// pages.js -- the few pages a person sees when opening the connector's address.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function page(title, bodyHtml, status = 200) {
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
  code { background: #fdecec; padding: 2px 6px; border-radius: 4px; }
  small { color: #574646; }
</style></head>
<body><main><div class="brand">&#9679; Stratek connector</div>${bodyHtml}</main></body></html>`, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' },
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
    <p>Manage integrations from the <strong>Integrations</strong> tab in Stratek. To add one, put its keys in Cloudflare:
      Workers &amp; Pages &rarr; this Worker &rarr; Settings &rarr; Variables and Secrets.</p>
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
    <p>Go back to Stratek &rarr; <strong>Integrations</strong> to see what's ready. New integrations appear there as soon as their keys are added in Cloudflare.</p>
    <p><a class="btn" href="${esc(back)}">Back to Stratek</a></p>`);
}
