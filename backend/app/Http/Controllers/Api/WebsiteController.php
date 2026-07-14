<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Website;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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
            'locales' => ['sometimes', 'array'],
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
