# Multi-Industry AI-Powered CMS — Architecture

## Stack

| Layer | Technology |
|---|---|
| Frontend (public sites + admin) | Next.js 16 (App Router, TypeScript, Tailwind 4) |
| Backend API | Laravel 11 (PHP 8.2+, Sanctum, spatie/laravel-permission) |
| Database | MySQL 8 |
| Media processing | Intervention Image (compression, thumbnails) |
| AI | Pluggable driver layer: OpenAI, Anthropic, Gemini, any OpenAI-compatible custom LLM |

## Core design decision: design is separated from content

The single most important requirement — *switch templates without affecting stored content* — is enforced by the data model, not by convention:

- **Templates** (`templates`, `template_layouts`) define *design*: which block types appear on each page type, in what order, with what default settings, plus design tokens (colors, typography, radius).
- **Content** (`pages`, `page_sections`) is *pure data*: a `page_section` row stores `block_type` + a JSON `content` document (headings, text, media IDs, links). It contains no styling.
- The Next.js **block registry** (`frontend/src/components/blocks`) is the design layer at render time: it maps `block_type` → React component and applies the active template's design tokens as CSS variables.

Switching a website's template (`POST /api/websites/{id}/switch-template`) changes only the design tokens and available layouts. Every section's content renders unchanged under the new design.

## Multi-tenancy

One CMS instance manages many **websites** (row-level tenancy on `website_id`). Websites are resolved:

- by **domain** in production (`/api/public/site?domain=...`) — multi-domain support,
- by **slug** in development/preview.

Users are attached to websites via `website_user`; `super_admin` sees everything. Roles/permissions come from spatie/laravel-permission (`super_admin`, `admin`, `editor`, `author` seeded).

## Request flow (public site)

```
Browser ──> Next.js  [[...slug]] route (ISR, 60s revalidate)
              │  GET /api/public/site   (site info, theme, header/footer config, menus)
              │  GET /api/public/page   (section stack + SEO, cached 5 min server-side)
              ▼
            BlockRenderer maps block_type -> component
```

Draft preview: the same endpoints accept `?preview=1` (bypasses cache, shows drafts) — this powers live preview before publishing.

## Domain map (MySQL schema)

| Domain | Tables |
|---|---|
| Tenancy & templates | `websites`, `website_settings` (header/footer/theme/seo/social JSON groups), `website_user`, `templates`, `template_layouts` |
| Pages & builder | `pages` (hierarchy, scheduling, visibility, custom CSS/JS), `page_sections` (ordered block stack), `global_blocks` (reusable components), `page_revisions` (version history + rollback) |
| Navigation | `menus` (per location), `menu_items` (nested, ordered, mega-menu JSON) |
| Media library | `media_folders`, `media` (type, dimensions, tags, AI provenance, generated conversions) |
| Blog | `posts`, `post_categories`, `post_tags`, pivots, `comments` |
| Forms | `forms` (JSON schema: fields, rules, conditional logic), `form_submissions` |
| SEO | `seo_meta` (polymorphic: pages, posts; OG/Twitter/Schema.org JSON) |
| AI | `ai_providers` (encrypted keys), `ai_generations` (audit + cost log) |
| Security | `users` (2FA columns), spatie role/permission tables, `audit_logs`, `sessions` |

## AI layer

`AiManager` resolves a configured `AiProvider` row to a driver implementing `AiDriverContract` (`generateText`, `generateImage`). Adding a vendor = one driver class.

- **Text** (`POST /api/ai/generate-text`): task-based prompts — rewrite, improve_grammar, seo_copy, faq, blog_article, service_description, product_description, landing_page, cta, meta, translate, accessibility, suggest_improvements. Industry context is injected automatically from the website.
- **Images** (`POST /api/ai/generate-image`): generated images are written straight into the Media Library (`source = 'ai'`, prompt kept in `ai_meta`) and are immediately usable.
- Every generation is logged in `ai_generations` with token usage.

## Draft / publish / versions

- Pages carry `status` (draft/published/scheduled/archived), `scheduled_at`, `visibility`.
- `POST .../publish` snapshots the full page + section stack into `page_revisions`, then flips status.
- `POST .../revisions/{id}/rollback` restores a snapshot (taking a safety snapshot first).

## Security

- Sanctum token auth for the admin API; public endpoints are read-only and rate-limited.
- RBAC via spatie; super-admin-only routes for templates and AI providers.
- AI API keys encrypted at rest (Laravel Crypt attribute cast).
- `audit_logs` records logins, CRUD, publishes, rollbacks, template switches with IP.
- Form submissions: schema-driven validation, honeypot spam protection, throttling.
- Two-factor authentication (TOTP via pragmarx/google2fa): QR enrollment with confirmation, encrypted secrets, 8 single-use recovery codes, password-gated disable. Login for 2FA accounts returns a 5-minute encrypted challenge that `POST /auth/2fa/challenge` exchanges (code or recovery code) for the API token.

## Scalability

- Server-side response caching (5 min) on public payloads + ISR (60 s) in Next.js.
- Stateless API → horizontal scaling behind a load balancer; swap cache/session drivers to Redis via `.env`.
- Media on the `public` disk locally; swap to S3 + CDN via Laravel filesystem config, zero code changes.

## Roadmap (not yet implemented)

1. Drag-and-drop builder UI (backend contract is ready: `PUT pages/{id}/sections` accepts the full ordered stack).
2. Menu editor UI (`PUT menus/{id}/items` accepts the nested tree).
3. Theme customizer UI over `website_settings.theme`.
4. Form renderer component + email notifications/CRM webhooks on submission.
5. XML sitemap + robots.txt endpoints (data already modeled).
6. Webhooks, GraphQL facade, plugin/module system.
7. Translations/multi-language content tables.
