// =============================================================================
// Production server for Hostinger (or any Node host).
//
//   npm run build   → generates dist/ (the static site)
//   npm start       → runs THIS server: serves dist/ + the live admin panel
//
// The admin panel writes src/data/content.json and uploaded images, then
// rebuilds dist/ in the background (a few seconds) so the fast static site
// stays static. Content edits go live once the rebuild finishes.
//
// Login uses environment variables (set these in Hostinger's Node app panel):
//   ADMIN_USER, ADMIN_PASSWORD   admin credentials
//   ADMIN_SECRET                 long random string, signs login sessions
//   PORT                         provided by Hostinger automatically
// If ADMIN_* are unset, /admin shows a "not configured" message (site still works).
// =============================================================================

import { createServer } from 'node:http';
import { readFile, writeFile, copyFile, mkdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const CONTENT = path.join(__dirname, 'src', 'data', 'content.json');
const BACKUP = path.join(__dirname, 'src', 'data', 'content.backup.json');
const UPLOADS = path.join(__dirname, 'public', 'images', 'uploads');
const PANEL = path.join(__dirname, 'scripts', 'admin', 'index.html');
const PORT = process.env.PORT || 4321;
const SESSION_TTL = 12 * 60 * 60 * 1000;
const MAX_BODY = 1024 * 1024;
const MAX_IMAGE = 8 * 1024 * 1024;
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

// ---------- helpers ----------
const send = (res, status, body, type = 'application/json') => {
  res.statusCode = status;
  res.setHeader('Content-Type', `${type}; charset=utf-8`);
  res.setHeader('Cache-Control', 'no-store');
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

const readBody = (req, limit = MAX_BODY) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) reject(new Error('Body too large'));
      else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

// ---------- auth (env-based, stateless HMAC tokens) ----------
const configured = () => !!(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD && process.env.ADMIN_SECRET);
const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a)), bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};
const issueToken = () => {
  const payload = `${Date.now() + SESSION_TTL}.${randomBytes(8).toString('hex')}`;
  const sig = createHmac('sha256', process.env.ADMIN_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
};
const verifyToken = (token) => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [exp, nonce, sig] = parts;
  const expected = createHmac('sha256', process.env.ADMIN_SECRET).update(`${exp}.${nonce}`).digest('hex');
  return safeEqual(sig, expected) && Date.now() < Number(exp);
};
const checkLogin = (u, p) =>
  safeEqual(String(u).trim().toLowerCase(), process.env.ADMIN_USER.trim().toLowerCase()) &&
  safeEqual(p, process.env.ADMIN_PASSWORD);

// ---------- content validation (mirrors admin-panel.mjs) ----------
function validate(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return 'Root must be an object';
  for (const key of ['site', 'pillars', 'products', 'awards', 'videos', 'faqs'])
    if (!(key in c)) return `Missing "${key}" section`;
  if (!c.site.shortName || !c.site.email) return 'Site name and email are required';
  if (!Array.isArray(c.site.phones) || !c.site.phones.length) return 'At least one phone is required';
  const slugs = new Set();
  for (const p of c.products) {
    if (!p.name?.trim()) return 'Every product needs a name';
    if (!p.slug?.trim() || !/^[a-z0-9-]+$/.test(p.slug)) return `Product "${p.name}": bad slug`;
    if (slugs.has(p.slug)) return `Duplicate product slug "${p.slug}"`;
    slugs.add(p.slug);
    if (typeof p.veg !== 'boolean') return `Product "${p.name}": veg/non-veg not set`;
    if (!p.desc?.trim()) return `Product "${p.name}" needs a description`;
    if (p.image != null && (typeof p.image !== 'string' || !p.image.startsWith('/')))
      return `Product "${p.name}": image must be a site path`;
  }
  for (const a of c.awards) if (!a.title?.trim()) return 'Every award needs a title';
  for (const f of c.faqs) if (!f.q?.trim() || !f.a?.trim()) return 'Every FAQ needs a question and answer';
  for (const v of c.videos) if (!v.id?.trim()) return 'Every video needs a YouTube ID';
  return null;
}

// ---------- background rebuild (debounced) ----------
let building = false, rebuildQueued = false, lastBuildOk = true, lastBuildMsg = '';
function rebuild() {
  if (building) { rebuildQueued = true; return; }
  building = true;
  // Run the local Astro binary directly (avoids npm and Windows .cmd spawn quirks).
  const astroBin = path.join(__dirname, 'node_modules', 'astro', 'astro.js');
  const child = spawn(process.execPath, [astroBin, 'build'], { cwd: __dirname, env: process.env });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (out += d));
  child.on('close', (code) => {
    building = false;
    lastBuildOk = code === 0;
    lastBuildMsg = lastBuildOk ? 'ok' : out.slice(-500);
    if (!lastBuildOk) console.error('[rebuild] failed:\n', out.slice(-1000));
    else console.log('[rebuild] done');
    if (rebuildQueued) { rebuildQueued = false; rebuild(); }
  });
}

async function freeUploadName(rawName) {
  const ext = path.extname(rawName).toLowerCase();
  if (!IMAGE_EXT.has(ext)) throw new Error(`Only image files are allowed (${[...IMAGE_EXT].join(', ')})`);
  const base = path.basename(rawName, path.extname(rawName))
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
  return `${base}-${Date.now().toString(36)}${ext}`;
}

// ---------- static file serving ----------
async function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  let file = path.join(DIST, rel);
  // prevent path traversal
  if (!file.startsWith(DIST)) return send(res, 403, 'Forbidden', 'text/plain');
  try {
    let s = await stat(file).catch(() => null);
    if (s && s.isDirectory()) { file = path.join(file, 'index.html'); s = await stat(file); }
    if (!s) {
      // try extensionless → /foo → /foo/index.html (Astro's dir-style routes)
      const alt = path.join(DIST, rel, 'index.html');
      if (await stat(alt).catch(() => null)) file = alt;
      else {
        const notFound = path.join(DIST, '404.html');
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return createReadStream(notFound).on('error', () => res.end('Not found')).pipe(res);
      }
    }
    const ext = path.extname(file).toLowerCase();
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    if (ext !== '.html') res.setHeader('Cache-Control', 'public, max-age=3600');
    createReadStream(file).pipe(res);
  } catch {
    send(res, 500, 'Server error', 'text/plain');
  }
}

// ---------- request router ----------
const server = createServer(async (req, res) => {
  const url = (req.url || '/').split('?')[0];

  // ---- admin panel UI ----
  if (url === '/admin' || url === '/admin/') {
    try { send(res, 200, await readFile(PANEL, 'utf8'), 'text/html'); }
    catch { send(res, 500, { error: 'Admin panel file missing' }); }
    return;
  }

  // ---- admin API ----
  if (url.startsWith('/api/admin/')) {
    if (url === '/api/admin/status')
      return send(res, 200, { setup: configured(), mode: 'server', configured: configured() });

    if (url === '/api/admin/login' && req.method === 'POST') {
      if (!configured()) return send(res, 503, { error: 'Admin not configured on this server' });
      let b;
      try { b = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'Invalid request' }); }
      if (!checkLogin(b.username ?? '', b.password ?? '')) {
        await new Promise((r) => setTimeout(r, 600));
        return send(res, 401, { error: 'Wrong username or password' });
      }
      return send(res, 200, { ok: true, token: issueToken() });
    }

    if (url === '/api/admin/logout' && req.method === 'POST') return send(res, 200, { ok: true });

    // everything below requires auth
    if (!verifyToken(req.headers['x-admin-token'])) return send(res, 401, { error: 'Not logged in' });

    if (url === '/api/admin/content') {
      if (req.method === 'GET') {
        try { return send(res, 200, await readFile(CONTENT, 'utf8')); }
        catch { return send(res, 500, { error: 'Could not read content' }); }
      }
      if (req.method === 'PUT') {
        let parsed;
        try { parsed = JSON.parse(await readBody(req)); }
        catch (e) { return send(res, 400, { error: `Invalid JSON: ${e.message}` }); }
        const problem = validate(parsed);
        if (problem) return send(res, 400, { error: problem });
        try {
          await copyFile(CONTENT, BACKUP).catch(() => {});
          await writeFile(CONTENT, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
          rebuild();
          return send(res, 200, { ok: true, rebuilding: true });
        } catch (e) { return send(res, 500, { error: e.message }); }
      }
      return send(res, 405, { error: 'Method not allowed' });
    }

    if (url === '/api/admin/upload' && req.method === 'POST') {
      try {
        const rawName = decodeURIComponent(req.headers['x-filename'] || 'image.jpg');
        const bytes = await readBody(req, MAX_IMAGE);
        if (!bytes.length) return send(res, 400, { error: 'Empty upload' });
        await mkdir(UPLOADS, { recursive: true });
        const name = await freeUploadName(rawName);
        await writeFile(path.join(UPLOADS, name), bytes);
        rebuild(); // so the new image is copied into dist/
        return send(res, 200, { ok: true, path: `/images/uploads/${name}`, rebuilding: true });
      } catch (e) { return send(res, 400, { error: e.message }); }
    }

    if (url === '/api/admin/build-status')
      return send(res, 200, { building, ok: lastBuildOk, message: lastBuildMsg });

    return send(res, 404, { error: 'Unknown admin route' });
  }

  // ---- static site ----
  return serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`Yumme Momos server running on port ${PORT}`);
  console.log(`  site  → http://localhost:${PORT}/`);
  console.log(`  admin → http://localhost:${PORT}/admin  (${configured() ? 'configured' : 'NOT configured — set ADMIN_* env vars'})`);
});
