# Live Admin Panel — setup

The content studio can now run **on the live Vercel site** (edit from your phone
or any browser), in addition to running locally with `npm run admin`.

On the live site, saving an edit commits `src/data/content.json` to GitHub, and
Vercel automatically redeploys — so changes appear on the site about a minute
after you hit **Save**.

To turn it on, add five environment variables in Vercel. Until they're set,
`/admin` on the live site shows a "not configured yet" message (and the local
`npm run admin` flow keeps working regardless).

## 1. Create a GitHub token

1. Go to **GitHub → Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
2. **Repository access:** Only select repositories → `Ankitofficil/Yummemomos`.
3. **Permissions → Repository permissions → Contents: Read and write.**
4. Generate, and copy the token (starts with `github_pat_…`). You won't see it
   again.

## 2. Add environment variables in Vercel

**Vercel → your project → Settings → Environment Variables.** Add each of these
(Production, Preview, and Development all checked):

| Name             | Value                                                        |
|------------------|-------------------------------------------------------------|
| `GITHUB_TOKEN`   | the token from step 1                                       |
| `GITHUB_REPO`    | `Ankitofficil/Yummemomos`                                   |
| `GITHUB_BRANCH`  | `main`                                                      |
| `ADMIN_USER`     | the username you want to log in with                        |
| `ADMIN_PASSWORD` | the password you want to log in with                        |
| `ADMIN_SECRET`   | a long random string (used to sign login sessions)          |

For `ADMIN_SECRET`, use any long random value — e.g. run this and paste the output:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Redeploy

Trigger a redeploy (Vercel → Deployments → ⋯ → Redeploy, or just push any
commit). Env vars only take effect on a new deployment.

## 4. Use it

Open `https://your-site/admin`, log in with `ADMIN_USER` / `ADMIN_PASSWORD`,
edit, and **Save**. Each save is a commit; the live site updates on the next
auto-deploy (~1 minute).

---

### Notes

- **Security:** the token stays server-side in Vercel — it's never sent to the
  browser. Login is rate-limited with a delay, and sessions are signed and
  expire after 12 hours. Keep `ADMIN_PASSWORD` and `GITHUB_TOKEN` private.
- **To change your password:** update `ADMIN_PASSWORD` in Vercel and redeploy.
- **Local editing still works** exactly as before: `npm run admin` edits the
  files on your computer (no GitHub token needed locally).
- **Rollback:** because every save is a git commit, you can always revert a bad
  edit from GitHub's history.
