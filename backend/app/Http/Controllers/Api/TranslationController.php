<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Page;
use App\Models\PageSection;
use App\Models\Translation;
use App\Models\Website;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TranslationController extends Controller
{
    private function assertLocale(Website $website, string $locale): void
    {
        $enabled = $website->locales ?? [];

        if ($locale === $website->default_locale || ! in_array($locale, $enabled, true)) {
            throw ValidationException::withMessages([
                'locale' => "Locale '{$locale}' is not an enabled translation language for this website.",
            ]);
        }
    }

    /** Base content + existing translation for one page in one locale. */
    public function show(Website $website, Page $page, string $locale)
    {
        abort_unless($page->website_id === $website->id, 404);
        $this->assertLocale($website, $locale);

        $page->load('sections', 'seo');

        $rows = Translation::where('website_id', $website->id)
            ->where('locale', $locale)
            ->where(function ($q) use ($page) {
                $q->where(fn ($qq) => $qq->where('translatable_type', Page::class)->where('translatable_id', $page->id))
                    ->orWhere(fn ($qq) => $qq->where('translatable_type', PageSection::class)->whereIn('translatable_id', $page->sections->pluck('id')));
            })
            ->get();

        return response()->json([
            'base' => [
                'title' => $page->title,
                'meta_title' => $page->seo?->meta_title,
                'meta_description' => $page->seo?->meta_description,
                'sections' => $page->sections->map(fn ($s) => [
                    'id' => $s->id,
                    'block_type' => $s->block_type,
                    'content' => $s->content,
                    'global_block_id' => $s->global_block_id,
                ])->values(),
            ],
            'translation' => [
                'page' => $rows->first(fn ($r) => $r->translatable_type === Page::class)?->data,
                'sections' => $rows->where('translatable_type', PageSection::class)
                    ->mapWithKeys(fn ($r) => [$r->translatable_id => $r->data]),
            ],
        ]);
    }

    /** Upsert the page + section translations for one locale. */
    public function update(Request $request, Website $website, Page $page, string $locale)
    {
        abort_unless($page->website_id === $website->id, 404);
        $this->assertLocale($website, $locale);

        $data = $request->validate([
            'page' => ['nullable', 'array'],
            'page.title' => ['nullable', 'string', 'max:255'],
            'page.meta_title' => ['nullable', 'string', 'max:255'],
            'page.meta_description' => ['nullable', 'string', 'max:500'],
            'sections' => ['nullable', 'array'],
            'sections.*' => ['array'],
        ]);

        $sectionIds = $page->sections()->pluck('id')->all();

        DB::transaction(function () use ($website, $page, $locale, $data, $sectionIds) {
            $pageData = collect($data['page'] ?? [])->filter(fn ($v) => is_string($v) && trim($v) !== '')->all();

            if ($pageData) {
                Translation::updateOrCreate(
                    ['translatable_type' => Page::class, 'translatable_id' => $page->id, 'locale' => $locale],
                    ['website_id' => $website->id, 'data' => $pageData]
                );
            } else {
                Translation::where('translatable_type', Page::class)
                    ->where('translatable_id', $page->id)->where('locale', $locale)->delete();
            }

            foreach ($data['sections'] ?? [] as $sectionId => $content) {
                if (! in_array((int) $sectionId, $sectionIds, true)) {
                    continue; // sections must belong to this page
                }

                Translation::updateOrCreate(
                    ['translatable_type' => PageSection::class, 'translatable_id' => (int) $sectionId, 'locale' => $locale],
                    ['website_id' => $website->id, 'data' => $content]
                );
            }
        });

        Cache::forget("page:{$website->id}:{$page->slug}:{$locale}");
        if ($page->page_type === 'home' || $page->slug === '') {
            Cache::forget("page:{$website->id}::{$locale}"); // the home page also serves the root path
        }
        AuditLog::record('translation_updated', $page, ['locale' => $locale], $website->id);

        return response()->json(['message' => 'Translation saved.']);
    }
}
