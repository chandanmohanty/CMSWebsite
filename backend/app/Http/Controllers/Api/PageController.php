<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Page;
use App\Models\PageRevision;
use App\Models\Website;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PageController extends Controller
{
    /** Bust the public renderer cache for a page path. */
    private function forgetPageCache(Website $website, string $slug): void
    {
        Cache::forget("page:{$website->id}:{$slug}");
    }

    private function assertUniqueSlug(Website $website, string $slug, ?int $ignoreId = null): void
    {
        // withTrashed: the DB unique index also covers soft-deleted pages.
        $exists = $website->pages()->withTrashed()
            ->where('slug', $slug)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages(['slug' => "A page with slug '{$slug}' already exists on this website (possibly in the trash)."]);
        }
    }

    public function index(Request $request, Website $website)
    {
        return $website->pages()
            ->with('seo')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('search'), fn ($q) => $q->where('title', 'like', '%'.$request->string('search').'%'))
            ->orderBy('sort_order')
            ->paginate($request->integer('per_page', 25));
    }

    public function store(Request $request, Website $website)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'page_type' => ['required', 'string', 'max:50'],
            'parent_id' => ['nullable', 'exists:pages,id'],
            'template_layout_id' => ['nullable', 'exists:template_layouts,id'],
        ]);

        $data['slug'] = Str::slug($data['slug'] ?? $data['title']);
        $this->assertUniqueSlug($website, $data['slug']);
        $data['created_by'] = $request->user()->id;

        $page = $website->pages()->create($data);

        // Seed sections from the template layout so the page opens pre-structured in the builder.
        if ($page->template_layout_id) {
            $structure = \App\Models\TemplateLayout::find($page->template_layout_id)?->structure ?? [];

            foreach ($structure as $i => $blockDef) {
                $page->sections()->create([
                    'block_type' => $blockDef['block_type'],
                    'position' => $i,
                    'settings' => $blockDef['default_settings'] ?? null,
                    'content' => $blockDef['default_content'] ?? null,
                ]);
            }
        }

        AuditLog::record('created', $page, $data, $website->id);

        return response()->json($page->load('sections'), 201);
    }

    public function show(Website $website, Page $page)
    {
        abort_unless($page->website_id === $website->id, 404);

        return $page->load('sections.globalBlock', 'seo', 'parent', 'bannerMedia', 'featuredMedia');
    }

    public function update(Request $request, Website $website, Page $page)
    {
        abort_unless($page->website_id === $website->id, 404);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255'],
            'page_type' => ['sometimes', 'string', 'max:50'],
            'parent_id' => ['nullable', 'exists:pages,id'],
            'template_layout_id' => ['nullable', 'exists:template_layouts,id'],
            'visibility' => ['sometimes', 'in:public,private,password'],
            'password' => ['nullable', 'string'],
            'scheduled_at' => ['nullable', 'date'],
            'banner_media_id' => ['nullable', 'exists:media,id'],
            'featured_media_id' => ['nullable', 'exists:media,id'],
            'custom_css' => ['nullable', 'string'],
            'custom_js' => ['nullable', 'string'],
            'sort_order' => ['sometimes', 'integer'],
            'seo' => ['sometimes', 'array'],
        ]);

        if (isset($data['slug'])) {
            $data['slug'] = Str::slug($data['slug']);
            $this->assertUniqueSlug($website, $data['slug'], $page->id);
        }

        $originalSlug = $page->slug;
        $page->update(collect($data)->except('seo')->all());
        $this->forgetPageCache($website, $originalSlug);
        $this->forgetPageCache($website, $page->slug);

        if (isset($data['seo'])) {
            $page->seo()->updateOrCreate([], collect($data['seo'])->only([
                'meta_title', 'meta_description', 'keywords', 'canonical_url',
                'open_graph', 'twitter_card', 'schema_markup', 'robots',
            ])->all());
        }

        AuditLog::record('updated', $page, $data, $website->id);

        return $page->load('sections', 'seo');
    }

    /** Replace the full section stack (called by the drag-and-drop builder on save). */
    public function syncSections(Request $request, Website $website, Page $page)
    {
        abort_unless($page->website_id === $website->id, 404);

        $data = $request->validate([
            'sections' => ['required', 'array'],
            'sections.*.block_type' => ['required', 'string'],
            'sections.*.content' => ['nullable', 'array'],
            'sections.*.settings' => ['nullable', 'array'],
            'sections.*.global_block_id' => ['nullable', 'exists:global_blocks,id'],
            'sections.*.is_visible' => ['nullable', 'boolean'],
        ]);

        DB::transaction(function () use ($request, $page, $data) {
            // Safety snapshot: a bad builder save must never be able to destroy content.
            if ($page->sections()->exists()) {
                $page->snapshot($request->user()->id, 'auto (pre-builder-save)');
            }

            $page->sections()->delete();

            foreach ($data['sections'] as $i => $section) {
                $page->sections()->create([
                    'block_type' => $section['block_type'],
                    'position' => $i,
                    'content' => $section['content'] ?? null,
                    'settings' => $section['settings'] ?? null,
                    'global_block_id' => $section['global_block_id'] ?? null,
                    'is_visible' => $section['is_visible'] ?? true,
                ]);
            }
        });

        $this->forgetPageCache($website, $page->slug);

        return $page->load('sections');
    }

    /** Publish: snapshot a revision, then flip status. */
    public function publish(Request $request, Website $website, Page $page)
    {
        abort_unless($page->website_id === $website->id, 404);

        $page->snapshot($request->user()->id, 'publish');
        $page->update(['status' => 'published', 'published_at' => now()]);
        $this->forgetPageCache($website, $page->slug);

        AuditLog::record('published', $page, null, $website->id);

        return $page;
    }

    public function unpublish(Website $website, Page $page)
    {
        abort_unless($page->website_id === $website->id, 404);
        $page->update(['status' => 'draft']);
        $this->forgetPageCache($website, $page->slug);

        return $page;
    }

    public function revisions(Website $website, Page $page)
    {
        abort_unless($page->website_id === $website->id, 404);

        return $page->revisions()->with('user:id,name')->paginate(20);
    }

    public function rollback(Request $request, Website $website, Page $page, PageRevision $revision)
    {
        abort_unless($page->website_id === $website->id && $revision->page_id === $page->id, 404);

        DB::transaction(function () use ($request, $page, $revision) {
            $page->snapshot($request->user()->id, 'pre-rollback'); // safety point before rolling back

            $snap = $revision->snapshot;
            $page->update($snap['page'] ?? []);
            $page->sections()->delete();

            foreach ($snap['sections'] ?? [] as $section) {
                $page->sections()->create($section);
            }
        });

        $this->forgetPageCache($website, $page->slug);
        AuditLog::record('rolled_back', $page, ['revision_id' => $revision->id], $website->id);

        return $page->load('sections');
    }

    public function destroy(Website $website, Page $page)
    {
        abort_unless($page->website_id === $website->id, 404);
        AuditLog::record('deleted', $page, null, $website->id);
        $this->forgetPageCache($website, $page->slug);
        $page->delete();

        return response()->noContent();
    }
}
