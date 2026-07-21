import { json, readJson, requireAuth, ghGetContent, ghPutContent, validate, CONTENT_PATH } from '../_lib/shared.js';

// GET  /api/admin/content → current content.json (from GitHub)
// PUT  /api/admin/content → validate + commit content.json to GitHub (redeploys)
export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  if (req.method === 'GET') {
    try {
      const { text } = await ghGetContent();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.end(text);
    } catch (e) {
      return json(res, 502, { error: e.message });
    }
  }

  if (req.method === 'PUT') {
    let parsed;
    try {
      parsed = await readJson(req);
    } catch (e) {
      return json(res, 400, { error: `Invalid JSON: ${e.message}` });
    }
    const problem = validate(parsed);
    if (problem) return json(res, 400, { error: problem });
    try {
      const { sha } = await ghGetContent(); // current sha to update in place
      const text = JSON.stringify(parsed, null, 2) + '\n';
      await ghPutContent(CONTENT_PATH, text, 'Update site content via admin panel', sha);
      return json(res, 200, { ok: true, deploying: true });
    } catch (e) {
      return json(res, 502, { error: e.message });
    }
  }

  return json(res, 405, { error: 'Method not allowed' });
}
