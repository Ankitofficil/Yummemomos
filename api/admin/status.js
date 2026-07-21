import { json, isConfigured } from '../_lib/shared.js';

// GET /api/admin/status — tells the panel whether the live admin is available.
// `mode: "live"` signals the browser panel to use username/password login
// against Vercel env vars (no first-run account setup on the live site).
export default function handler(req, res) {
  if (!isConfigured()) {
    return json(res, 200, { setup: false, mode: 'live', configured: false });
  }
  return json(res, 200, { setup: true, mode: 'live', configured: true });
}
