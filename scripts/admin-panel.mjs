// Dev-only admin panel for editing src/data/content.json.
// Registered as a Vite plugin in astro.config.mjs; `apply: 'serve'` means it
// exists only in `astro dev` — nothing admin-related ships in the build.
//
// Routes:
//   GET  /admin              → the admin UI (scripts/admin/index.html)
//   GET  /api/admin/status   → { setup } — whether an admin account exists
//   POST /api/admin/setup    → first run: create the admin account
//   POST /api/admin/login    → { token } session token (12 h, in-memory)
//   POST /api/admin/logout   → invalidate the session token
//   POST /api/admin/delete-account → remove the admin account (password re-check)
//   GET  /api/admin/content  → current content.json           (auth required)
//   PUT  /api/admin/content  → validate + write content.json  (auth required)
//   POST /api/admin/upload   → save image to public/images/uploads/ (auth req.)
//
// Credentials live in admin.auth.json (project root, gitignored) as a salted
// scrypt hash. To reset a forgotten password, delete that file and reload
// /admin — the panel will ask you to create a new account.

import { readFile, writeFile, copyFile, mkdir, access, unlink } from 'node:fs/promises';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.resolve(here, '../src/data/content.json');
const BACKUP = path.resolve(here, '../src/data/content.backup.json');
const UI = path.resolve(here, 'admin/index.html');
const UPLOADS = path.resolve(here, '../public/images/uploads');
const AUTH = path.resolve(here, '../admin.auth.json');
const MAX_BODY = 1024 * 1024; // 1 MB
const MAX_IMAGE = 8 * 1024 * 1024; // 8 MB
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
const SESSION_TTL = 12 * 60 * 60 * 1000; // 12 h

const sessions = new Map(); // token → expiry (ms). In-memory: restart = re-login.

function send(res, status, body, type = 'application/json') {
  res.statusCode = status;
  res.setHeader('Content-Type', `${type}; charset=utf-8`);
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) reject(new Error('Body too large'));
      else chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ---------- auth ----------
const hash = (password, salt) => scryptSync(password, salt, 64).toString('hex');

async function readAuth() {
  try {
    return JSON.parse(await readFile(AUTH, 'utf8'));
  } catch {
    return null;
  }
}

function startSession() {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL);
  return token;
}

function isLoggedIn(req) {
  const token = req.headers['x-admin-token'];
  const expiry = token && sessions.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function checkCredentials(input) {
  const username = String(input?.username ?? '').trim();
  const password = String(input?.password ?? '');
  if (username.length < 3) return { error: 'Username must be at least 3 characters' };
  if (password.length < 6) return { error: 'Password must be at least 6 characters' };
  return { username, password };
}

// ---------- upload helpers ----------
// "Chicken Momo (1).JPG" → "chicken-momo-1.jpg"; dedupes with -2, -3, …
async function freeUploadPath(rawName) {
  const ext = path.extname(rawName).toLowerCase();
  if (!IMAGE_EXT.has(ext)) throw new Error(`Only image files are allowed (${[...IMAGE_EXT].join(', ')})`);
  const base =
    path.basename(rawName, path.extname(rawName))
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
  for (let n = 1; ; n++) {
    const name = n === 1 ? `${base}${ext}` : `${base}-${n}${ext}`;
    try {
      await access(path.join(UPLOADS, name));
    } catch {
      return name;
    }
  }
}

// ---------- content validation ----------
// Minimal shape validation so a bad save can't break the site build.
function validate(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return 'Root must be an object';
  for (const key of ['site', 'pillars', 'products', 'awards', 'videos', 'faqs']) {
    if (!(key in c)) return `Missing "${key}" section`;
  }
  if (!c.site.shortName || !c.site.email) return 'Site name and email are required';
  if (!Array.isArray(c.site.phones) || c.site.phones.length === 0) return 'At least one phone is required';
  if (!Array.isArray(c.products)) return '"products" must be a list';
  const slugs = new Set();
  for (const p of c.products) {
    if (!p.name?.trim()) return 'Every product needs a name';
    if (!p.slug?.trim() || !/^[a-z0-9-]+$/.test(p.slug)) {
      return `Product "${p.name}": slug must be lowercase letters, numbers and dashes`;
    }
    if (slugs.has(p.slug)) return `Duplicate product slug "${p.slug}"`;
    slugs.add(p.slug);
    if (typeof p.veg !== 'boolean') return `Product "${p.name}": veg/non-veg not set`;
    if (!p.desc?.trim()) return `Product "${p.name}" needs a description`;
    if (p.image != null && (typeof p.image !== 'string' || !p.image.startsWith('/'))) {
      return `Product "${p.name}": image must be a site path like /images/uploads/…`;
    }
  }
  for (const a of c.awards) {
    if (!a.title?.trim()) return 'Every award needs a title';
  }
  for (const f of c.faqs) {
    if (!f.q?.trim() || !f.a?.trim()) return 'Every FAQ needs a question and an answer';
  }
  for (const v of c.videos) {
    if (!v.id?.trim()) return 'Every video needs a YouTube ID';
  }
  return null;
}

// ---------- plugin ----------
export default function adminPanel() {
  return {
    name: 'yumme-admin-panel',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0];

        if (url === '/admin' || url === '/admin/') {
          try {
            send(res, 200, await readFile(UI, 'utf8'), 'text/html');
          } catch {
            send(res, 500, { error: 'Admin UI file missing (scripts/admin/index.html)' });
          }
          return;
        }

        if (!url.startsWith('/api/admin/')) return next();

        // --- public auth routes ---
        if (url === '/api/admin/status') {
          return send(res, 200, { setup: !!(await readAuth()) });
        }

        if (url === '/api/admin/setup' && req.method === 'POST') {
          if (await readAuth()) return send(res, 409, { error: 'An admin account already exists' });
          let creds;
          try {
            creds = checkCredentials(JSON.parse(await readBody(req)));
          } catch {
            return send(res, 400, { error: 'Invalid request' });
          }
          if (creds.error) return send(res, 400, { error: creds.error });
          const salt = randomBytes(16).toString('hex');
          await writeFile(
            AUTH,
            JSON.stringify({ username: creds.username, salt, hash: hash(creds.password, salt) }, null, 2) + '\n',
            'utf8'
          );
          return send(res, 200, { ok: true, token: startSession() });
        }

        if (url === '/api/admin/login' && req.method === 'POST') {
          const auth = await readAuth();
          if (!auth) return send(res, 409, { error: 'No admin account yet — reload the page to create one' });
          let input;
          try {
            input = JSON.parse(await readBody(req));
          } catch {
            return send(res, 400, { error: 'Invalid request' });
          }
          const candidate = Buffer.from(hash(String(input?.password ?? ''), auth.salt));
          const expected = Buffer.from(auth.hash);
          const ok =
            String(input?.username ?? '').trim().toLowerCase() === auth.username.toLowerCase() &&
            candidate.length === expected.length &&
            timingSafeEqual(candidate, expected);
          if (!ok) {
            await new Promise((r) => setTimeout(r, 600)); // slow brute-force
            return send(res, 401, { error: 'Wrong username or password' });
          }
          return send(res, 200, { ok: true, token: startSession() });
        }

        if (url === '/api/admin/logout' && req.method === 'POST') {
          sessions.delete(req.headers['x-admin-token']);
          return send(res, 200, { ok: true });
        }

        // --- everything below requires a logged-in session ---
        if (!isLoggedIn(req)) return send(res, 401, { error: 'Not logged in' });

        if (url === '/api/admin/delete-account' && req.method === 'POST') {
          const auth = await readAuth();
          if (!auth) return send(res, 409, { error: 'No admin account exists' });
          let input;
          try {
            input = JSON.parse(await readBody(req));
          } catch {
            return send(res, 400, { error: 'Invalid request' });
          }
          const candidate = Buffer.from(hash(String(input?.password ?? ''), auth.salt));
          const expected = Buffer.from(auth.hash);
          if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) {
            await new Promise((r) => setTimeout(r, 600));
            return send(res, 401, { error: 'Wrong password — account not deleted' });
          }
          try {
            await unlink(AUTH);
          } catch (e) {
            return send(res, 500, { error: `Could not delete account: ${e.message}` });
          }
          sessions.clear(); // every open session is invalid once the account is gone
          return send(res, 200, { ok: true });
        }

        if (url === '/api/admin/upload') {
          if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
          try {
            const rawName = decodeURIComponent(req.headers['x-filename'] || 'image.jpg');
            const body = await readBody(req, MAX_IMAGE);
            if (!body.length) return send(res, 400, { error: 'Empty upload' });
            await mkdir(UPLOADS, { recursive: true });
            const name = await freeUploadPath(rawName);
            await writeFile(path.join(UPLOADS, name), body);
            send(res, 200, { ok: true, path: `/images/uploads/${name}` });
          } catch (e) {
            send(res, 400, { error: e.message });
          }
          return;
        }

        if (url === '/api/admin/content') {
          if (req.method === 'GET') {
            try {
              send(res, 200, await readFile(CONTENT, 'utf8'));
            } catch {
              send(res, 500, { error: 'Could not read content.json' });
            }
            return;
          }
          if (req.method === 'PUT') {
            let parsed;
            try {
              parsed = JSON.parse(await readBody(req));
            } catch (e) {
              return send(res, 400, { error: `Invalid JSON: ${e.message}` });
            }
            const problem = validate(parsed);
            if (problem) return send(res, 400, { error: problem });
            try {
              await copyFile(CONTENT, BACKUP).catch(() => {});
              await writeFile(CONTENT, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
              send(res, 200, { ok: true });
            } catch (e) {
              send(res, 500, { error: `Could not write content.json: ${e.message}` });
            }
            return;
          }
          return send(res, 405, { error: 'Method not allowed' });
        }

        send(res, 404, { error: 'Unknown admin route' });
      });
    },
  };
}
