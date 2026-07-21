// Serves the real content-studio panel at /admin on the built (live) site.
// The same panel HTML is used locally, where the dev middleware
// (scripts/admin-panel.mjs) intercepts /admin before this ever runs.
//
// On the live site the panel talks to the Vercel serverless functions in
// /api/admin/* (GitHub-backed). If those env vars aren't set yet, the panel
// shows a "not configured" message instead of a broken login.
import panelHtml from '../../scripts/admin/index.html?raw';

export const prerender = true;

export function GET() {
  return new Response(panelHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
