import { json, readJson, checkLogin, issueToken, isConfigured } from '../_lib/shared.js';

// POST /api/admin/login { username, password } → { token }
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!isConfigured()) return json(res, 503, { error: 'Live admin is not configured on this deployment' });

  let body;
  try {
    body = await readJson(req);
  } catch {
    return json(res, 400, { error: 'Invalid request' });
  }
  const ok = checkLogin(body.username ?? '', body.password ?? '');
  if (!ok) {
    await new Promise((r) => setTimeout(r, 600)); // slow brute-force
    return json(res, 401, { error: 'Wrong username or password' });
  }
  return json(res, 200, { ok: true, token: issueToken() });
}
