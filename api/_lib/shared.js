// Shared helpers for the live (Vercel serverless) admin API.
// These functions run ON Vercel, not in the browser and not in the local dev
// server. Storage is the project's own GitHub repo: reads/writes go through the
// GitHub Contents API, and each save is a commit that triggers a redeploy.
//
// Required environment variables (set in Vercel → Project → Settings → Env):
//   GITHUB_TOKEN   fine-grained PAT with Contents: read & write on this repo
//   GITHUB_REPO    "owner/name", e.g. "Ankitofficil/Yummemomos"
//   GITHUB_BRANCH  branch to commit to (default "main")
//   ADMIN_USER     admin username
//   ADMIN_PASSWORD admin password (plain; compared constant-time)
//   ADMIN_SECRET   long random string used to sign session tokens
//
// Sessions are stateless: a signed, expiring token (HMAC) — no DB needed.

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

export const CONTENT_PATH = 'src/data/content.json';
const SESSION_TTL = 12 * 60 * 60 * 1000; // 12h

export function env(name, fallback = undefined) {
  const v = process.env[name];
  return v == null || v === '' ? fallback : v;
}

export function isConfigured() {
  return !!(env('GITHUB_TOKEN') && env('GITHUB_REPO') && env('ADMIN_USER') && env('ADMIN_PASSWORD') && env('ADMIN_SECRET'));
}

// ---------- JSON body / responses ----------
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body; // Vercel pre-parses JSON
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

// ---------- constant-time string compare ----------
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// ---------- stateless session tokens (HMAC-signed) ----------
export function issueToken() {
  const payload = `${Date.now() + SESSION_TTL}.${randomBytes(8).toString('hex')}`;
  const sig = createHmac('sha256', env('ADMIN_SECRET')).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [exp, nonce, sig] = parts;
  const expected = createHmac('sha256', env('ADMIN_SECRET')).update(`${exp}.${nonce}`).digest('hex');
  if (!safeEqual(sig, expected)) return false;
  return Date.now() < Number(exp);
}

export function checkLogin(username, password) {
  return safeEqual(String(username).trim().toLowerCase(), env('ADMIN_USER').trim().toLowerCase())
    && safeEqual(password, env('ADMIN_PASSWORD'));
}

export function requireAuth(req, res) {
  const token = req.headers['x-admin-token'];
  if (!verifyToken(token)) {
    json(res, 401, { error: 'Not logged in' });
    return false;
  }
  return true;
}

// ---------- GitHub Contents API ----------
function ghHeaders() {
  return {
    Authorization: `Bearer ${env('GITHUB_TOKEN')}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'yumme-admin',
  };
}

const repo = () => env('GITHUB_REPO');
const branch = () => env('GITHUB_BRANCH', 'main');

// Returns { content (parsed JSON), sha }. sha is needed to update the file.
export async function ghGetContent(path = CONTENT_PATH) {
  const url = `https://api.github.com/repos/${repo()}/contents/${path}?ref=${branch()}`;
  const r = await fetch(url, { headers: ghHeaders() });
  if (!r.ok) throw new Error(`GitHub read failed (${r.status})`);
  const data = await r.json();
  const text = Buffer.from(data.content, 'base64').toString('utf8');
  return { text, sha: data.sha };
}

// `alreadyBase64` = content is raw base64 (binary uploads); otherwise it's utf8 text.
export async function ghPutContent(path, content, message, sha, alreadyBase64 = false) {
  const url = `https://api.github.com/repos/${repo()}/contents/${path}`;
  const body = {
    message,
    content: alreadyBase64 ? content : Buffer.from(content, 'utf8').toString('base64'),
    branch: branch(),
  };
  if (sha) body.sha = sha;
  const r = await fetch(url, { method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body) });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error(`GitHub write failed (${r.status}): ${detail.slice(0, 200)}`);
  }
  return r.json();
}

// ---------- content validation (mirrors the local dev middleware) ----------
export function validate(c) {
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
  for (const a of c.awards) if (!a.title?.trim()) return 'Every award needs a title';
  for (const f of c.faqs) if (!f.q?.trim() || !f.a?.trim()) return 'Every FAQ needs a question and an answer';
  for (const v of c.videos) if (!v.id?.trim()) return 'Every video needs a YouTube ID';
  return null;
}
