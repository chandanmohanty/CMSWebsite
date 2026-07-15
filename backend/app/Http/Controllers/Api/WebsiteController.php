<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Form;
use App\Models\Page;
use App\Models\Template;
use App\Models\Website;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WebsiteController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Website::with('template')->withCount('pages');

        // Super admins see everything; others only their assigned websites.
        if (! $user->hasRole('super_admin')) {
            $query->whereHas('users', fn ($q) => $q->where('users.id', $user->id));
        }

        return $query->orderBy('name')->paginate($request->integer('per_page', 25));
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->can('manage_websites'), 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'domain' => ['nullable', 'string', 'max:255', 'unique:websites,domain'],
            'industry' => ['required', 'string', 'max:100'],
            'template_id' => ['nullable', 'exists:templates,id'],
            'default_locale' => ['nullable', 'string', 'max:10'],
        ]);

        $data['slug'] = Str::slug($data['name']).'-'.Str::lower(Str::random(4));

        $website = Website::create($data);

        // The creator manages the website they created (super admins already see everything).
        $website->users()->attach($request->user()->id);

        AuditLog::record('created', $website, $data, $website->id);

        return response()->json($website, 201);
    }

    public function show(Website $website)
    {
        return $website->load('template.layouts', 'settings', 'menus.allItems');
    }

    public function update(Request $request, Website $website)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'domain' => ['nullable', 'string', 'max:255', 'unique:websites,domain,'.$website->id],
            'industry' => ['sometimes', 'string', 'max:100'],
            'default_locale' => ['sometimes', 'string', 'max:10'],
            'locales' => ['sometimes', 'array', 'max:20'],
            'locales.*' => ['string', 'max:10'],
            'status' => ['sometimes', 'in:active,maintenance,disabled'],
        ]);

        $website->update($data);
        Cache::forget("site:{$website->id}");
        AuditLog::record('updated', $website, $data, $website->id);

        return $website;
    }

    /**
     * Switch template. Content (pages/sections) is untouched by design -
     * only the design layer changes, per the template/content separation.
     */
    public function switchTemplate(Request $request, Website $website)
    {
        $data = $request->validate(['template_id' => ['required', 'exists:templates,id']]);

        $website->update($data);
        Cache::forget("site:{$website->id}");
        AuditLog::record('template_switched', $website, $data, $website->id);

        return $website->load('template.layouts');
    }

    /**
     * WordPress-style template activation: applies the template's design AND
     * scaffolds the site from its layouts - pages with starter content
     * (published, ready to edit in the builder), a header menu, and a contact
     * form when the template embeds one. Existing pages/menus are never touched.
     */
    public function applyTemplate(Request $request, Website $website)
    {
        $data = $request->validate(['template_id' => ['required', 'exists:templates,id']]);

        $template = Template::with('layouts')->findOrFail($data['template_id']);

        $created = [];

        DB::transaction(function () use ($request, $website, $template, &$created) {
            $website->update(['template_id' => $template->id]);

            // Template design tokens should shine through: drop theme overrides.
            $website->settings()->where('group', 'theme')->delete();

            // Adopt the settings groups the template ships with (header, footer, ...).
            foreach ($template->default_settings ?? [] as $group => $value) {
                if (in_array($group, SettingController::GROUPS, true) && is_array($value)) {
                    $website->settings()->updateOrCreate(['group' => $group], ['value' => $value]);
                }
            }

            // Scaffold in natural site order so the starter menu reads Home first.
            $order = ['home', 'about', 'services', 'products', 'team', 'portfolio', 'testimonials', 'blog', 'landing', 'contact'];
            $layouts = $template->layouts
                ->sortBy(fn ($l) => (($i = array_search($l->page_type, $order)) === false ? 98 : $i))
                ->values();

            foreach ($layouts as $layout) {
                $slug = $layout->page_type === 'home' ? 'home' : Str::slug($layout->page_type);

                $exists = $website->pages()->withTrashed()
                    ->where(fn ($q) => $q->where('slug', $slug)->orWhere('page_type', $layout->page_type))
                    ->exists();

                if ($exists) {
                    continue; // never overwrite the admin's existing pages
                }

                $page = $website->pages()->create([
                    'title' => $layout->name,
                    'slug' => $slug,
                    'page_type' => $layout->page_type,
                    'template_layout_id' => $layout->id,
                    'status' => 'published',
                    'published_at' => now(),
                    'created_by' => $request->user()->id,
                ]);

                foreach ($layout->structure as $i => $blockDef) {
                    $page->sections()->create([
                        'block_type' => $blockDef['block_type'],
                        'position' => $i,
                        'settings' => $blockDef['default_settings'] ?? null,
                        'content' => $blockDef['default_content'] ?? null,
                    ]);

                    // A form_embed block needs a form behind it - create a starter contact form once.
                    $formSlug = $blockDef['default_content']['form_slug'] ?? null;
                    if ($formSlug && ! Form::where('website_id', $website->id)->where('slug', $formSlug)->exists()) {
                        Form::create([
                            'website_id' => $website->id,
                            'name' => Str::headline($formSlug),
                            'slug' => $formSlug,
                            'type' => 'contact',
                            'schema' => [
                                'fields' => [
                                    ['name' => 'name', 'label' => 'Your name', 'type' => 'text', 'required' => true, 'rules' => ['string', 'max:255']],
                                    ['name' => 'email', 'label' => 'Email address', 'type' => 'email', 'required' => true, 'rules' => ['email', 'max:255']],
                                    ['name' => 'phone', 'label' => 'Phone', 'type' => 'phone', 'required' => false, 'rules' => ['string', 'max:50']],
                                    ['name' => 'message', 'label' => 'How can we help?', 'type' => 'textarea', 'required' => true, 'rules' => ['string', 'max:10000']],
                                ],
                                'submit_label' => 'Send message',
                                'success_message' => 'Thank you! We will get back to you shortly.',
                            ],
                        ]);
                    }
                }

                $created[] = $page;
            }

            // Starter navigation linking the scaffolded pages, if the site has none yet.
            if ($created !== [] && ! $website->menus()->where('location', 'header_primary')->exists()) {
                $menu = $website->menus()->create(['name' => 'Main navigation', 'location' => 'header_primary']);

                foreach ($created as $i => $page) {
                    $menu->allItems()->create([
                        'label' => $page->page_type === 'home' ? 'Home' : $page->title,
                        'page_id' => $page->id,
                        'target' => '_self',
                        'position' => $i,
                    ]);
                }
            }
        });

        Cache::forget("site:{$website->id}");
        foreach ($created as $page) {
            Cache::forget("page:{$website->id}:{$page->slug}:");
            Cache::forget("page:{$website->id}::");
        }

        AuditLog::record('template_applied', $website, ['template_id' => $template->id, 'pages_created' => count($created)], $website->id);

        return response()->json([
            'website' => $website->fresh()->load('template'),
            'pages_created' => collect($created)->map(fn (Page $p) => $p->only(['id', 'title', 'slug'])),
        ]);
    }

    public function destroy(Request $request, Website $website)
    {
        // Deleting a website cascades to all its content - super admin only.
        abort_unless($request->user()->hasRole('super_admin'), 403);

        AuditLog::record('deleted', $website, null, $website->id);
        Cache::forget("site:{$website->id}");
        $website->delete();

        return response()->noContent();
    }
}
