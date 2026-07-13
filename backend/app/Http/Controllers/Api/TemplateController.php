<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Template;
use App\Models\TemplateLayout;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TemplateController extends Controller
{
    public function index(Request $request)
    {
        return Template::withCount('layouts', 'websites')
            ->when($request->filled('industry'), fn ($q) => $q->where('industry', $request->string('industry')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'industry' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'thumbnail_url' => ['nullable', 'string'],
            'design_tokens' => ['nullable', 'array'],
        ]);

        $data['slug'] = Str::slug($data['name']);

        return response()->json(Template::create($data), 201);
    }

    public function show(Template $template)
    {
        return $template->load('layouts');
    }

    public function update(Request $request, Template $template)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'industry' => ['sometimes', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'thumbnail_url' => ['nullable', 'string'],
            'design_tokens' => ['nullable', 'array'],
            'version' => ['sometimes', 'string', 'max:20'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $template->update($data);

        return $template;
    }

    public function destroy(Template $template)
    {
        $template->delete();

        return response()->noContent();
    }

    public function storeLayout(Request $request, Template $template)
    {
        $data = $request->validate([
            'page_type' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:255'],
            'structure' => ['required', 'array'],
            'structure.*.block_type' => ['required', 'string'],
        ]);

        return response()->json($template->layouts()->create($data), 201);
    }

    public function updateLayout(Request $request, Template $template, TemplateLayout $layout)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'structure' => ['sometimes', 'array'],
        ]);

        $layout->update($data);

        return $layout;
    }

    public function destroyLayout(Template $template, TemplateLayout $layout)
    {
        $layout->delete();

        return response()->noContent();
    }
}
