# Deploying to Hostinger (Business — Node.js app)

This site runs on Hostinger as a **Node.js application**: a small server
(`server.mjs`) serves the fast static site **and** hosts the admin content
studio at `/admin`. When you save an edit in the panel, the server rewrites the
content and rebuilds the site automatically (a few seconds), so changes go live
without you touching any files.

---

## A. One-time setup in hPanel

### 1. Get the code onto Hostinger

Either connect the GitHub repo or upload the project files. In **hPanel →
Websites → your site → Advanced → Node.js** (sometimes "Setup Node.js App"):

- **Create application**
- **Application root:** the folder holding this project (where `package.json` is)
- **Application startup file:** `server.mjs`
- **Node.js version:** **20 or newer** (the build tools require Node 20+; Node 18
  will fail with a `styleText` / `vite` error)

### 2. Add environment variables

In the same Node.js app screen, add these variables:

| Variable         | Value                                                    |
|------------------|----------------------------------------------------------|
| `ADMIN_USER`     | the username you'll log in with                          |
| `ADMIN_PASSWORD` | the password you'll log in with                          |
| `ADMIN_SECRET`   | a long random string (signs login sessions)              |

Generate `ADMIN_SECRET` on your computer with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

(Don't set `PORT` — Hostinger provides it automatically.)

### 3. Install & build

In the Node.js app screen click **Run NPM Install**. This installs
dependencies and — via the `postinstall` script — builds the static site into
`dist/` automatically.

If your panel has a separate **Run NPM Script** box, you can also run `build`
manually. To confirm it built, check that a `dist/` folder now exists.

### 4. Start it

Click **Start** (or Restart) on the Node.js app. Visit your domain — the site
should load. Visit `your-domain/admin` — you should get a login screen.

---

## B. Everyday use

1. Go to `your-domain/admin` on any device (phone included).
2. Log in with `ADMIN_USER` / `ADMIN_PASSWORD`.
3. Edit products, awards, FAQs, photos, contact details — with a live preview.
4. Click **Save changes**. The panel shows "rebuilding…", then "Published".
5. Refresh the public site to see the update (usually 3–10 seconds).

---

## C. Updating the code later

When the site's code (not just content) changes:

1. Pull/upload the new files.
2. **Run NPM Install** again (rebuilds `dist/` via `postinstall`).
3. **Restart** the Node.js app.

---

## Notes & troubleshooting

- **Security:** credentials live only in Hostinger's env vars, never in the
  browser or the repo. Logins are rate-limited and sessions expire after 12h.
- **Backups:** every content save first copies the previous version to
  `src/data/content.backup.json`, and (if the folder is a git repo) history is
  preserved. Uploaded images live in `public/images/uploads/`.
- **"Admin is not configured" on /admin:** the `ADMIN_*` env vars aren't set (or
  the app wasn't restarted after setting them). Add them and restart.
- **Edits don't appear after saving:** the rebuild may have failed. Check the
  Node app's logs in hPanel. The site keeps serving the last good build.
- **Local development is unchanged:** on your computer, `npm run admin` still
  opens the panel against local files (no env vars needed).

### Alternative: static-only hosting

If you ever move to plain static hosting (no Node), just run `npm run build`
locally and upload the contents of `dist/` to `public_html`. The site works
fully; only the live `/admin` editing is unavailable (edit locally + re-upload).
