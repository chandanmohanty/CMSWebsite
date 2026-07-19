# Multi-Industry AI-Powered CMS

Enterprise CMS that manages many websites (healthcare, real estate, law, travel, corporate, IT, education, manufacturing, finance, restaurants, …) from one platform, with industry templates, a block-based page builder, a centralized media library, and multi-provider AI content/image generation.

**Stack:** Next.js 16 (frontend) · Laravel 12 API (backend) · MySQL 8 (SQLite works for local dev)

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.

```
├── backend/    Laravel 11 REST API (multi-tenant CMS core)
├── frontend/   Next.js site renderer + admin panel
└── docs/       Architecture documentation
```

## Prerequisites

| Tool | Version | Status on this machine |
|---|---|---|
| Node.js | 18+ | ✅ installed |
| PHP | 8.2+ | ❌ install required |
| Composer | 2.x | ❌ install required |
| MySQL | 8.x | ❌ install required |

Easiest on Windows: install [Laragon](https://laragon.org/) (bundles PHP + MySQL + Composer). Alternatively `winget install PHP.PHP.8.3` and `winget install Oracle.MySQL`, then [Composer](https://getcomposer.org/download/).

## Backend setup

```bash
cd backend
composer install
copy .env.example .env          # then set DB_* credentials
                                # (or DB_CONNECTION=sqlite + create database/database.sqlite for local dev)
php artisan key:generate

# Publish package migrations & config (one time)
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"

php artisan migrate --seed      # schema + roles + super admin + demo healthcare template
php artisan storage:link        # expose the media library
php artisan serve               # http://localhost:8000 (use --port if 8000 is taken,
                                # and match NEXT_PUBLIC_API_URL in frontend/.env.local)
```

Seeded super admin: `admin@example.com` / `ChangeMe123!` — **change this immediately.**

## Frontend setup

```bash
cd frontend
npm install                     # already done if node_modules exists
npm run dev                     # http://localhost:3000
```

Then:

1. Log in at `http://localhost:3000/admin/login`.
2. Create a website (`POST /api/websites` — builder UI is on the roadmap) and assign the seeded *Healthcare Classic* template.
3. Put the website's slug into `frontend/.env.local` → `NEXT_PUBLIC_SITE_SLUG`.
4. Create + publish a home page (empty slug) — it renders at `http://localhost:3000`.

## Media uploads (images & video)

The API accepts uploads up to 50 MB per file, but PHP's own limits apply first. For hero background videos raise them in your `php.ini`:

```ini
upload_max_filesize = 64M
post_max_size = 72M
max_execution_time = 120
```

MP4 (H.264) is the safest format for background video; keep clips short, muted and compressed — they autoplay on every page load.

## AI providers

Add providers as super admin via `POST /api/ai/providers` with `driver` = `openai` | `anthropic` | `gemini` | `custom` (any OpenAI-compatible `base_url`). Keys are encrypted at rest. Then:

- `POST /api/ai/generate-text` — rewrite, SEO copy, FAQs, blog articles, meta tags, translations, …
- `POST /api/ai/generate-image` — saved directly into the Media Library.

## API surface (summary)

- `POST /api/auth/login` · `GET /api/auth/me`
- `GET|POST|PUT|DELETE /api/websites` · `POST /api/websites/{id}/switch-template`
- `.../websites/{id}/pages` + `PUT pages/{id}/sections` (builder save) + `publish` / `revisions` / `rollback`
- `.../websites/{id}/menus` + `PUT menus/{id}/items` (drag-and-drop tree save)
- `.../websites/{id}/settings/{header|footer|theme|seo|social|integrations|robots}`
- `.../websites/{id}/global-blocks` · `.../posts` · `.../forms`
- `GET|POST /api/media` (bulk upload, auto-compression, thumbnails) · `media-folders`
- `GET|POST /api/templates` (+ per-page-type layouts) — super admin
- Public renderer: `GET /api/public/site` · `GET /api/public/page` · `GET /api/public/posts` · `POST /api/public/forms/{slug}/submit`
