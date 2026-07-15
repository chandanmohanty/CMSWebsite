<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Mail\FormSubmissionReceived;
use App\Models\Form;
use App\Models\FormSubmission;
use App\Models\Page;
use App\Models\PageSection;
use App\Models\Post;
use App\Models\Translation;
use App\Models\Website;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Read-only endpoints consumed by the Next.js renderer.
 * The website is resolved by domain (production) or slug (preview),
 * and responses are cached for fast page rendering.
 */
class SiteController extends Controller
{
    /** Settings groups safe to expose publicly. `integrations` (CRM keys, webhooks) is deliberately excluded. */
    private const PUBLIC_SETTING_GROUPS = ['header', 'footer', 'theme', 'seo', 'social', 'robots'];

    private function resolveWebsite(Request $request): Website
    {
        $domain = $request->string('domain')->toString();
        $slug = $request->string('site')->toString();

        return Website::with('template')
            ->where('status', '!=', 'disabled')
            ->when($domain, fn ($q) => $q->where('domain', $domain))
            ->when(! $domain && $slug, fn ($q) => $q->where('slug', $slug))
            ->firstOrFail();
    }

    /** Preview (drafts, cache bypass) requires a valid admin token - never available anonymously. */
    private function isPreview(Request $request): bool
    {
        return $request->boolean('preview') && auth('sanctum')->check();
    }

    /** Everything the frontend layout needs: site info, theme, header/footer config, menus. */
    public function site(Request $request)
    {
        $website = $this->resolveWebsite($request);
        $preview = $this->isPreview($request);

        $payload = fn () => [
            'website' => $website->only(['id', 'name', 'slug', 'domain', 'industry', 'default_locale', 'locales']),
            'template' => $website->template?->only(['slug', 'design_tokens', 'version']),
            'settings' => $website->settings()->whereIn('group', self::PUBLIC_SETTING_GROUPS)->get()->pluck('value', 'group'),
            // Eager-load each level's page to avoid N+1 in resolvedUrl().
            'menus' => $website->menus()->with('items.page', 'items.children.page', 'items.children.children.page')->get()
                ->mapWithKeys(fn ($menu) => [$menu->location => $this->serializeItems($menu->items)]),
        ];

        return $preview ? $payload() : Cache::remember("site:{$website->id}", 300, $payload);
    }

    /** A requested locale is honored only when it is an enabled non-default language. */
    private function resolveLocale(Request $request, Website $website): string
    {
        $locale = $request->string('locale')->toString();

        if ($locale && $locale !== $website->default_locale && in_array($locale, $website->locales ?? [], true)) {
            return $locale;
        }

        return '';
    }

    /** Resolve a page by path and return its renderable section stack + SEO, merged with locale translations. */
    public function page(Request $request)
    {
        $website = $this->resolveWebsite($request);
        $path = trim($request->string('path')->toString(), '/');
        $preview = $this->isPreview($request);
        $locale = $this->resolveLocale($request, $website);

        $page = Page::where('website_id', $website->id)
            // The root path matches an explicit empty slug or the designated home page.
            ->where(function ($q) use ($path) {
                $path === ''
                    ? $q->where('slug', '')->orWhere('page_type', 'home')
                    : $q->where('slug', $path);
            })
            ->when(! $preview, fn ($q) => $q->where('status', 'published')->where('visibility', 'public'))
            ->with('sections.globalBlock', 'seo', 'bannerMedia', 'featuredMedia')
            ->firstOrFail();

        $payload = function () use ($website, $page, $locale) {
            $pageOverride = [];
            $sectionOverrides = collect();

            if ($locale) {
                $rows = Translation::where('website_id', $website->id)
                    ->where('locale', $locale)
                    ->where(function ($q) use ($page) {
                        $q->where(fn ($qq) => $qq->where('translatable_type', Page::class)->where('translatable_id', $page->id))
                            ->orWhere(fn ($qq) => $qq->where('translatable_type', PageSection::class)->whereIn('translatable_id', $page->sections->pluck('id')));
                    })
                    ->get();

                $pageOverride = $rows->first(fn ($r) => $r->translatable_type === Page::class)?->data ?? [];
                $sectionOverrides = $rows->where('translatable_type', PageSection::class)->keyBy('translatable_id');
            }

            $seo = $page->seo?->toArray();

            if ($seo && $pageOverride) {
                $seo['meta_title'] = $pageOverride['meta_title'] ?? $seo['meta_title'];
                $seo['meta_description'] = $pageOverride['meta_description'] ?? $seo['meta_description'];
            }

            return [
                'page' => array_merge(
                    $page->only(['id', 'title', 'slug', 'page_type', 'custom_css', 'custom_js', 'published_at']),
                    ['title' => $pageOverride['title'] ?? $page->title, 'locale' => $locale ?: $website->default_locale]
                ),
                'banner' => $page->bannerMedia?->only(['url', 'alt', 'width', 'height']),
                'seo' => $seo,
                'sections' => $page->sections->where('is_visible', true)->values()->map(fn ($s) => [
                    'id' => $s->id,
                    'block_type' => $s->block_type,
                    'content' => $sectionOverrides[$s->id]->data ?? $s->resolvedContent(),
                    'settings' => $s->settings,
                ]),
            ];
        };

        return $preview ? $payload() : Cache::remember("page:{$website->id}:{$path}:{$locale}", 300, $payload);
    }

    public function posts(Request $request)
    {
        $website = $this->resolveWebsite($request);

        return Post::where('website_id', $website->id)
            ->where('status', 'published')
            ->with('categories', 'tags', 'author:id,name', 'featuredMedia')
            ->when($request->filled('category'), fn ($q) => $q->whereHas('categories', fn ($c) => $c->where('slug', $request->string('category'))))
            ->latest('published_at')
            ->paginate($request->integer('per_page', 12));
    }

    public function post(Request $request, string $slug)
    {
        $website = $this->resolveWebsite($request);

        return Post::where('website_id', $website->id)
            ->where('slug', $slug)
            ->where('status', 'published')
            ->with('categories', 'tags', 'author:id,name', 'seo', 'featuredMedia')
            ->firstOrFail();
    }

    /** Absolute-URL base for sitemap/robots links: the caller's origin, falling back to the website domain. */
    private function baseUrl(Request $request, Website $website): string
    {
        $base = rtrim($request->string('base')->toString(), '/');

        if ($base && filter_var($base, FILTER_VALIDATE_URL)) {
            return $base;
        }

        return 'https://'.($website->domain ?? 'localhost');
    }

    /** XML sitemap: published public pages (minus noindex) + posts under the blog page, if any. */
    public function sitemap(Request $request)
    {
        $website = $this->resolveWebsite($request);
        $base = $this->baseUrl($request, $website);

        $xml = Cache::remember("sitemap:{$website->id}:{$base}", 600, function () use ($website, $base) {
            $pages = Page::where('website_id', $website->id)
                ->where('status', 'published')
                ->where('visibility', 'public')
                ->with('seo:id,metable_id,metable_type,robots')
                ->get(['id', 'slug', 'page_type', 'updated_at']);

            $urls = [];

            foreach ($pages as $page) {
                if (str_contains(strtolower($page->seo->robots ?? ''), 'noindex')) {
                    continue;
                }
                $urls[] = [
                    'loc' => $base.'/'.ltrim($page->slug, '/'),
                    'lastmod' => $page->updated_at?->toAtomString(),
                ];
            }

            // Posts are addressable once the site has a published blog page: /{blog-slug}/{post-slug}
            $blogPage = $pages->firstWhere('page_type', 'blog');

            if ($blogPage) {
                $posts = Post::where('website_id', $website->id)
                    ->where('status', 'published')
                    ->get(['slug', 'updated_at']);

                foreach ($posts as $post) {
                    $urls[] = [
                        'loc' => $base.'/'.trim($blogPage->slug, '/').'/'.$post->slug,
                        'lastmod' => $post->updated_at?->toAtomString(),
                    ];
                }
            }

            $body = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
            $body .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";

            foreach ($urls as $url) {
                $body .= '  <url><loc>'.e($url['loc']).'</loc>';
                if ($url['lastmod']) {
                    $body .= '<lastmod>'.e($url['lastmod']).'</lastmod>';
                }
                $body .= "</url>\n";
            }

            return $body.'</urlset>';
        });

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }

    /** robots.txt: custom content from the `robots` settings group, or a safe default. Always advertises the sitemap. */
    public function robots(Request $request)
    {
        $website = $this->resolveWebsite($request);
        $base = $this->baseUrl($request, $website);

        $custom = $website->setting('robots')['content'] ?? null;

        $content = is_string($custom) && trim($custom) !== ''
            ? trim($custom)
            : "User-agent: *\nAllow: /\nDisallow: /admin";

        if (! str_contains($content, 'Sitemap:')) {
            $content .= "\n\nSitemap: {$base}/sitemap.xml";
        }

        return response($content."\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    /** Public form definition for the site renderer. Only safe fields - never notifications/integrations. */
    public function form(Request $request, string $slug)
    {
        $website = $this->resolveWebsite($request);

        $form = Form::where('website_id', $website->id)
            ->where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        return $form->only(['name', 'slug', 'type', 'schema', 'spam_protection']);
    }

    /** Public form submission with schema-driven validation + honeypot spam protection. */
    public function submitForm(Request $request, string $slug)
    {
        $website = $this->resolveWebsite($request);

        $form = Form::where('website_id', $website->id)
            ->where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        // Honeypot: bots fill the invisible field.
        if ($form->spam_protection && $request->filled('_hp')) {
            return response()->json(['message' => 'Submission received.']); // silently drop
        }

        $rules = [];
        foreach ($form->schema['fields'] ?? [] as $field) {
            $fieldRules = $field['rules'] ?? [];
            if ($field['required'] ?? false) {
                array_unshift($fieldRules, 'required');
            }
            $rules['data.'.$field['name']] = $fieldRules ?: ['nullable'];
        }

        $validated = $request->validate($rules + ['data' => ['required', 'array']]);

        // Persist only fields declared in the form schema - arbitrary extra keys are dropped.
        $declared = collect($form->schema['fields'] ?? [])->pluck('name')->filter()->all();

        $submission = FormSubmission::create([
            'form_id' => $form->id,
            'data' => collect($validated['data'])->only($declared)->all(),
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);

        $this->notifyRecipients($form, $submission);

        return response()->json(['message' => 'Submission received.', 'id' => $submission->id], 201);
    }

    /** Email the form's configured recipients. Failures are logged - they never break the visitor's submission. */
    private function notifyRecipients(Form $form, FormSubmission $submission): void
    {
        $recipients = collect($form->notifications['emails'] ?? [])
            ->filter(fn ($email) => is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL))
            ->unique()
            ->values();

        if ($recipients->isEmpty()) {
            return;
        }

        try {
            Mail::to($recipients->all())->send(new FormSubmissionReceived($form, $submission));
        } catch (\Throwable $e) {
            Log::warning('Form notification email failed', [
                'form_id' => $form->id,
                'submission_id' => $submission->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function serializeItems($items): array
    {
        return $items->map(fn ($item) => [
            'label' => $item->label,
            'url' => $item->resolvedUrl(),
            'target' => $item->target,
            'icon' => $item->icon,
            'mega_menu' => $item->mega_menu,
            'children' => $this->serializeItems($item->children),
        ])->all();
    }
}
