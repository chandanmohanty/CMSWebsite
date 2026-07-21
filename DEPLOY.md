# Deploying to Hostinger Cloud Startup (athithi24.com)

Both parts of the app run on the Cloud Startup plan:

| Part | Where | URL |
|---|---|---|
| Laravel API (PHP + MySQL) | PHP website, doc-root at `public/` | `https://api.athithi24.com` |
| Next.js frontend (Node SSR) | Node.js application | `https://athithi24.com` |

Prerequisites on the plan: SSH access (Cloud plans include it), PHP 8.2+, MySQL, and the Node.js app feature (Node 20 recommended).

---

## 1. Connect the domain & subdomain (hPanel or Hostinger tools)

1. Connect `athithi24.com` to the Cloud Startup account (hPanel → Websites → *Connect domain*).
2. Add a subdomain `api.athithi24.com` (doc root `/domains/api.athithi24.com/public_html`).
3. Create a MySQL database + user, note the name/user/password.

---

## 2. Backend — Laravel API on `api.athithi24.com`

SSH in, then:

```bash
cd ~/domains/api.athithi24.com
rm -rf public_html
git clone https://github.com/chandanmohanty/CMSWebsite.git repo
ln -s repo/backend/public public_html      # doc root serves Laravel's public/
cd repo/backend

composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
```

Edit `.env`:

```ini
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.athithi24.com
FRONTEND_URL=https://athithi24.com

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=<db_name>
DB_USERNAME=<db_user>
DB_PASSWORD=<db_pass>

CACHE_STORE=file
SESSION_DRIVER=file
QUEUE_CONNECTION=database
FILESYSTEM_DISK=public

# Real SMTP so form notifications send (Hostinger email or any provider)
MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_USERNAME=<mailbox>
MAIL_PASSWORD=<mailbox_pass>
MAIL_FROM_ADDRESS=<mailbox>

# AI providers (optional) — add keys in the admin UI instead if preferred
```

Then:

```bash
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate --seed --force
php artisan storage:link
php artisan config:cache && php artisan route:cache
```

- CORS is already restricted to `FRONTEND_URL` (config/cors.php).
- **Change the seeded super-admin password** (`admin@example.com` / `ChangeMe123!`) immediately after first login.
- Set `upload_max_filesize=64M`, `post_max_size=72M` in hPanel → PHP config (for video uploads).
- Queue worker for emails: add a cron running every minute — `php ~/domains/api.athithi24.com/repo/backend/artisan queue:work --stop-when-empty`.

---

## 3. Frontend — Next.js on `athithi24.com` (Node.js app)

The app is configured for `output: "standalone"`, so the server is self-contained.

**Build** (locally or on the server if it has enough RAM):

```bash
cd repo/frontend
npm ci
npm run build
```

Assemble the runtime bundle (standalone needs static + public copied in):

```bash
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

Configure the Node.js app in hPanel:
- **Application root**: the folder containing `.next/standalone`
- **Startup file**: `.next/standalone/server.js`
- **Node version**: 20
- **Environment variables**:

```ini
NODE_ENV=production
PORT=3000                       # Hostinger sets/maps this; match its expected port
NEXT_PUBLIC_API_URL=https://api.athithi24.com
NEXT_PUBLIC_SITE_DOMAIN=athithi24.com
```

`NEXT_PUBLIC_SITE_DOMAIN` makes the frontend resolve the website by its production domain — no per-site slug needed. Start/restart the Node app from hPanel.

> Note: the app must be **rebuilt** whenever `NEXT_PUBLIC_*` values change (they are inlined at build time), then re-uploaded.

---

## 4. In the CMS admin, after first deploy

1. Log in at `https://athithi24.com/admin/login`, change the admin password, enable 2FA.
2. Create the website (or activate a template) and set its **domain** to `athithi24.com` so the public renderer resolves it.
3. Configure header, footer, menus, and the floating buttons.

---

## Automatic deployment (GitHub Actions)

`.github/workflows/deploy.yml` builds both apps in the CI runner and deploys
them over SSH on every push to `main`. This keeps npm/composer off the server
and works with the private repo (CI checks it out with its own token).

### One-time setup

**1. SSH key for the deploy.** On your machine:

```bash
ssh-keygen -t ed25519 -f athithi24_deploy -C "github-actions" -N ""
```

- Add the **public** key (`athithi24_deploy.pub`) to Hostinger: hPanel → Advanced → **SSH Access** → *Manage SSH keys* → Import.
- Note the SSH **host** and **port** shown on that SSH Access page (Hostinger shared/cloud usually uses port **65002**).

**2. GitHub repository secrets** (repo → Settings → Secrets and variables → Actions → *New repository secret*):

| Secret | Value |
|---|---|
| `SSH_HOST` | the SSH host from hPanel |
| `SSH_PORT` | `65002` (or whatever hPanel shows) |
| `SSH_USER` | `u778726719` |
| `SSH_KEY`  | the **private** key file contents (`athithi24_deploy`) |

**3. Bootstrap the server once** (the workflow assumes `.env`, the DB schema,
and the symlinks already exist — it never touches `.env` or `storage/`). Run the
**backend block** above once over SSH to create `.env`, run `migrate --seed`, and
create the `public_html → repo/backend/public` + `public/storage` symlinks. Then
create the **Node.js app** in hPanel pointing at `domains/athithi24.com/nextapp`
(the first workflow run fills that folder).

### After that

Every `git push` to `main` deploys the **Laravel API** automatically: composer
install in the runner → rsync the code (preserving `.env`, `storage/` and the
bootstrap cache) → `migrate --force` + config/route cache. Watch it under the
repo's **Actions** tab; trigger manually anytime with *Run workflow*.

### Frontend releases (manual, by design)

Hostinger's Node.js build system owns the frontend — it installs dependencies and
runs `next build` on the server from an uploaded source archive, then serves it
under Passenger. A second deploy path (CI rsync) would fight it, so the frontend
is deliberately not in the workflow.

This matters far less than it sounds: **all CMS content is fetched from the API at
runtime**, so editing pages, templates, menus or media never needs a redeploy. Only
frontend *code* changes do.

To release frontend code:

```powershell
pwsh ./scripts/package-frontend.ps1
```

That produces a source-only `.tar.gz`. Upload it via hPanel → **Advanced → Node.js**
(or the Hostinger deploy API). The script encodes three things that each broke a
real deployment:

- **excludes `.env.local`** — it outranks `.env.production` even in production
  builds, so shipping it points the live site at `localhost`
- **uses `.tar.gz`, not `.zip`** — `Compress-Archive` writes Windows attributes
  instead of Unix mode bits, and the extracted `[[...slug]]` route folder loses its
  traverse permission (`EACCES: scandir …`)
- **keeps entries at the archive root** — Hostinger's settings resolver looks for
  `package.json` at the top level and 500s if it's nested under `./`

## Caveats on shared Cloud hosting

- **ISR caching** writes to `.next/cache`; on shared hosting the Node process may recycle and drop it. Pages still render correctly (the Laravel API caches server-side for 5 minutes and busts on publish) — worst case is an occasional slower first load. For strict freshness, lower the `revalidate` value in `src/lib/api.ts`.
- The Node SSR server competes for CPU/RAM with the other sites on the plan. If the site is busy, the VPS (KVM 2) is the more robust home for the frontend.
- Media uploads live on the `public` disk under `storage/`. Keep them on the same account; for scale, switch `FILESYSTEM_DISK` to S3 (no code change — Laravel filesystem config only).
