<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Form;
use App\Models\FormSubmission;
use App\Models\Page;
use App\Models\Post;
use App\Models\Website;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Read-only endpoints consumed by the Next.js renderer.
 * The website is resolved by domain (production) or slug (preview),
 * and responses are cached for fast page rendering.
 */
class SiteController extends Controller
{
    private function resolveWebsite(Request $request): Website
    {
        $domain = $request->string('domain')->toString();
        $slug = $request->string('site')->toString();

        return Website::with('template')
            ->when($domain, fn ($q) => $q->where('domain', $domain))
            ->when(! $domain && $slug, fn ($q) => $q->where('slug', $slug))
            ->firstOrFail();
    }

    /** Everything the frontend layout needs: site info, theme, header/footer config, menus. */
    public function site(Request $request)
    {
        $website = $this->resolveWebsite($request);
        $preview = $request->boolean('preview');

        $payload = fn () => [
            'website' => $website->only(['id', 'name', 'slug', 'domain', 'industry', 'default_locale', 'locales']),
            'template' => $website->template?->only(['slug', 'design_tokens', 'version']),
            'settings' => $website->settings()->get()->pluck('value', 'group'),
            'menus' => $website->menus()->with('items.children.children')->get()
                ->mapWithKeys(fn ($menu) => [$menu->location => $this->serializeItems($menu->items)]),
        ];

        return $preview ? $payload() : Cache::remember("site:{$website->id}", 300, $payload);
    }

    /** Resolve a page by path and return its renderable section stack + SEO. */
    public function page(Request $request)
    {
        $website = $this->resolveWebsite($request);
        $path = trim($request->string('path')->toString(), '/');
        $preview = $request->boolean('preview'); // preview mode shows drafts (admin-triggered live preview)

        $page = Page::where('website_id', $website->id)
            ->where('slug', $path === '' ? '' : $path)
            ->when(! $preview, fn ($q) => $q->where('status', 'published')->where('visibility', 'public'))
            ->with('sections.globalBlock', 'seo', 'bannerMedia', 'featuredMedia')
            ->firstOrFail();

        $payload = fn () => [
            'page' => $page->only(['id', 'title', 'slug', 'page_type', 'custom_css', 'custom_js', 'published_at']),
            'banner' => $page->bannerMedia?->only(['url', 'alt', 'width', 'height']),
            'seo' => $page->seo,
            'sections' => $page->sections->where('is_visible', true)->values()->map(fn ($s) => [
                'id' => $s->id,
                'block_type' => $s->block_type,
                'content' => $s->resolvedContent(),
                'settings' => $s->settings,
            ]),
        ];

        return $preview ? $payload() : Cache::remember("page:{$website->id}:{$path}", 300, $payload);
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

        $submission = FormSubmission::create([
            'form_id' => $form->id,
            'data' => $validated['data'],
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);

        return response()->json(['message' => 'Submission received.', 'id' => $submission->id], 201);
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
