<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Form;
use App\Models\Website;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class FormController extends Controller
{
    public function index(Website $website)
    {
        return $website->hasMany(Form::class)->getQuery()->withCount('submissions')->get();
    }

    public function store(Request $request, Website $website)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:contact,lead,appointment,inquiry,custom'],
            'schema' => ['required', 'array'],
            'schema.fields' => ['required', 'array'],
            'notifications' => ['nullable', 'array'],
            'notifications.emails' => ['nullable', 'array', 'max:10'],
            'notifications.emails.*' => ['email', 'max:255'],
            'integrations' => ['nullable', 'array'],
            'spam_protection' => ['sometimes', 'boolean'],
        ]);

        $data['website_id'] = $website->id;
        $data['slug'] = Str::slug($data['name']);

        return response()->json(Form::create($data), 201);
    }

    public function show(Website $website, Form $form)
    {
        abort_unless($form->website_id === $website->id, 404);

        return $form;
    }

    public function update(Request $request, Website $website, Form $form)
    {
        abort_unless($form->website_id === $website->id, 404);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'schema' => ['sometimes', 'array'],
            'notifications' => ['nullable', 'array'],
            'notifications.emails' => ['nullable', 'array', 'max:10'],
            'notifications.emails.*' => ['email', 'max:255'],
            'integrations' => ['nullable', 'array'],
            'spam_protection' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $form->update($data);

        return $form;
    }

    public function submissions(Request $request, Website $website, Form $form)
    {
        abort_unless($form->website_id === $website->id, 404);

        return $form->submissions()
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->latest()
            ->paginate($request->integer('per_page', 25));
    }

    public function destroy(Website $website, Form $form)
    {
        abort_unless($form->website_id === $website->id, 404);
        $form->delete();

        return response()->noContent();
    }
}
