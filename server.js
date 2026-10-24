// Link Shrinker server. (c) GaryM
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SECRET_KEY, ADMIN_PASSWORD } = process.env;
const PORT = process.env.PORT || 3000;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Add them as environment variables.');
  process.exit(1);
}
if (!ADMIN_PASSWORD) {
  console.warn('WARNING: ADMIN_PASSWORD is not set, so anyone can create and delete links.');
}

const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const RESERVED = new Set(['api', 'health', 'index', 'favicon.ico', 'robots.txt']);
const CODE_RE = /^[a-z0-9_-]{1,24}$/;
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

function randomCode(len = 6) {
  const bytes = crypto.randomBytes(len);
  let s = '';
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
}

function cleanUrl(input) {
  let u = String(input || '').trim();
  if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
  try {
    const x = new URL(u);
    if (x.protocol === 'http:' || x.protocol === 'https:') return x.toString();
  } catch (e) {}
  return null;
}

function requireAdmin(req, res, next) {
  if (!ADMIN_PASSWORD) return next();
  const given = Buffer.from(req.get('x-admin-password') || '');
  const real = Buffer.from(ADMIN_PASSWORD);
  if (given.length === real.length && crypto.timingSafeEqual(given, real)) return next();
  res.status(401).json({ error: 'Wrong or missing password.' });
}

app.get('/qrcode.js', (req, res) => res.sendFile(require.resolve('qrcode-generator/qrcode.js')));
app.get('/health', (req, res) => res.send('ok'));

// List links
app.get('/api/links', requireAdmin, async (req, res) => {
  const { data, error } = await db
    .from('links')
    .select('code,url,clicks,created_at')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create a link
app.post('/api/links', requireAdmin, async (req, res) => {
  const url = cleanUrl(req.body && req.body.url);
  if (!url) {
    return res.status(400).json({ error: 'That does not look like a web address. Try something like https://example.com' });
  }
  const custom = String((req.body && req.body.code) || '').trim().toLowerCase();
  if (custom) {
    if (!CODE_RE.test(custom)) {
      return res.status(400).json({ error: 'Custom codes can use letters, numbers, dashes and underscores only (max 24).' });
    }
    if (RESERVED.has(custom)) {
      return res.status(400).json({ error: `"${custom}" is reserved. Pick another.` });
    }
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = custom || randomCode();
    const { data, error } = await db
      .from('links')
      .insert({ code, url })
      .select('code,url,clicks,created_at')
      .single();
    if (!error) return res.status(201).json(data);
    if (error.code === '23505') {
      if (custom) return res.status(409).json({ error: `The code "${custom}" is already taken. Pick another.` });
      continue; // random clash, try again
    }
    return res.status(500).json({ error: error.message });
  }
  res.status(500).json({ error: 'Could not make a unique code. Try again.' });
});

// Delete a link
app.delete('/api/links/:code', requireAdmin, async (req, res) => {
  const { error } = await db.from('links').delete().eq('code', req.params.code.toLowerCase());
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// The redirect itself: yoursite.onrender.com/<code>
app.get('/:code', async (req, res, next) => {
  const code = req.params.code.toLowerCase();
  if (!CODE_RE.test(code) || RESERVED.has(code)) return next();
  const { data, error } = await db.from('links').select('url').eq('code', code).maybeSingle();
  if (error) return res.status(500).send('Something went wrong looking up that link. Try again in a moment.');
  if (!data) return res.status(404).send(notFoundPage(code));
  db.rpc('increment_clicks', { link_code: code }).then(() => {}, () => {});
  res.set('Cache-Control', 'no-store');
  res.redirect(302, data.url);
});

function notFoundPage(code) {
  const safe = code.replace(/[^a-z0-9_-]/g, '');
  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Link not found</title>
<style>body{font-family:system-ui,sans-serif;background:#f2f4f1;color:#1b2420;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px;box-sizing:border-box}
@media (prefers-color-scheme:dark){body{background:#121815;color:#e6ece8}}
main{max-width:420px}a{color:#1f7a5a}code{font-family:ui-monospace,monospace}</style></head>
<body><main><h1>Link not found</h1><p>Nothing is saved under <code>/${safe}</code>. It may have been deleted, or the link was typed wrong.</p><p><a href="/">Go to Link Shrinker</a></p></main></body></html>`;
}

app.listen(PORT, () => console.log(`Link Shrinker running on port ${PORT}`));
