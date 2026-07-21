import { json, requireAuth, ghPutContent, env } from '../_lib/shared.js';
import path from 'node:path';

export const config = { api: { bodyParser: false } }; // we read the raw image bytes

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
const MAX_IMAGE = 8 * 1024 * 1024; // 8 MB

function slugName(rawName) {
  const ext = path.extname(rawName).toLowerCase();
  if (!IMAGE_EXT.has(ext)) throw new Error(`Only image files are allowed (${[...IMAGE_EXT].join(', ')})`);
  const base = path.basename(rawName, path.extname(rawName))
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
  return `${base}-${Date.now().toString(36)}${ext}`; // timestamp keeps it unique
}

async function readRaw(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('Image too large (max 8 MB)');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// POST /api/admin/upload (raw image body, X-Filename header) → { path }
// Commits the image to public/images/uploads/ on GitHub.
export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const rawName = decodeURIComponent(req.headers['x-filename'] || 'image.jpg');
    const name = slugName(rawName);
    const bytes = await readRaw(req, MAX_IMAGE);
    if (!bytes.length) return json(res, 400, { error: 'Empty upload' });
    const repoPath = `public/images/uploads/${name}`;
    await ghPutContent(repoPath, bytes.toString('base64'), `Upload image ${name} via admin panel`, undefined, true);
    return json(res, 200, { ok: true, path: `/images/uploads/${name}`, deploying: true });
  } catch (e) {
    return json(res, 400, { error: e.message });
  }
}
