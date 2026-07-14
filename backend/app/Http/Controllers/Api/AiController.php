<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiGeneration;
use App\Models\AiProvider;
use App\Models\Media;
use App\Models\Website;
use App\Services\Ai\AiManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AiController extends Controller
{
    public function __construct(private AiManager $ai)
    {
    }

    // --- Provider management (super admin) ---

    public function providers()
    {
        return AiProvider::all();
    }

    public function storeProvider(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'driver' => ['required', 'in:openai,anthropic,gemini,custom'],
            'api_key' => ['required', 'string'],
            'base_url' => ['nullable', 'url'],
            'text_model' => ['nullable', 'string'],
            'image_model' => ['nullable', 'string'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        if ($data['is_default'] ?? false) {
            AiProvider::query()->update(['is_default' => false]);
        }

        return response()->json(AiProvider::create($data), 201);
    }

    public function updateProvider(Request $request, AiProvider $provider)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'api_key' => ['sometimes', 'string'],
            'base_url' => ['nullable', 'url'],
            'text_model' => ['nullable', 'string'],
            'image_model' => ['nullable', 'string'],
            'is_default' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if ($data['is_default'] ?? false) {
            AiProvider::where('id', '!=', $provider->id)->update(['is_default' => false]);
        }

        $provider->update($data);

        return $provider;
    }

    public function destroyProvider(AiProvider $provider)
    {
        $provider->delete();

        return response()->noContent();
    }

    // --- Generation endpoints ---

    /**
     * Text generation for any supported task:
     * rewrite, improve_grammar, seo_copy, faq, blog_article, service_description,
     * product_description, landing_page, cta, meta, translate, accessibility, suggest_improvements.
     */
    public function generateText(Request $request)
    {
        $data = $request->validate([
            'task' => ['required', 'string', 'max:50'],
            'input' => ['required', 'string', 'max:20000'],
            'website_id' => ['nullable', 'exists:websites,id'],
            'provider_id' => ['nullable', 'exists:ai_providers,id'],
            'context' => ['nullable', 'array'], // tone, target_language, ...
        ]);

        abort_unless($request->user()->canManageWebsite($data['website_id'] ?? null), 403);

        $provider = isset($data['provider_id']) ? AiProvider::find($data['provider_id']) : null;
        $website = isset($data['website_id']) ? Website::find($data['website_id']) : null;

        $context = ($data['context'] ?? []) + ['industry' => $website?->industry];
        $prompt = AiManager::taskPrompt($data['task'], $data['input'], $context);

        try {
            $result = $this->ai->driver($provider)->generateText($prompt);
        } catch (\Throwable $e) {
            AiGeneration::create([
                'website_id' => $website?->id,
                'user_id' => $request->user()->id,
                'ai_provider_id' => $provider?->id,
                'type' => 'text', 'task' => $data['task'], 'prompt' => $prompt,
                'status' => 'failed', 'result' => $e->getMessage(),
            ]);

            return response()->json(['message' => 'AI generation failed: '.$e->getMessage()], 502);
        }

        AiGeneration::create([
            'website_id' => $website?->id,
            'user_id' => $request->user()->id,
            'ai_provider_id' => $provider?->id,
            'type' => 'text',
            'task' => $data['task'],
            'prompt' => $prompt,
            'result' => $result['text'],
            'usage' => $result['usage'],
        ]);

        return response()->json(['text' => $result['text'], 'usage' => $result['usage']]);
    }

    /**
     * Image generation: the result is stored straight into the Media Library
     * so it's immediately usable anywhere on the website.
     */
    public function generateImage(Request $request)
    {
        $data = $request->validate([
            'prompt' => ['required', 'string', 'max:4000'],
            'purpose' => ['nullable', 'string', 'max:100'], // hero_banner, service_illustration, blog_image, icon, ...
            'size' => ['nullable', 'string'],
            'website_id' => ['nullable', 'exists:websites,id'],
            'provider_id' => ['nullable', 'exists:ai_providers,id'],
            'folder_id' => ['nullable', 'exists:media_folders,id'],
        ]);

        abort_unless($request->user()->canManageWebsite($data['website_id'] ?? null), 403);

        $provider = isset($data['provider_id']) ? AiProvider::find($data['provider_id']) : null;

        try {
            $image = $this->ai->driver($provider)->generateImage($data['prompt'], ['size' => $data['size'] ?? '1024x1024']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'AI image generation failed: '.$e->getMessage()], 502);
        }

        $path = 'media/ai/'.date('Y/m').'/'.Str::random(20).'.png';
        Storage::disk('public')->put($path, $image['binary']);

        $media = Media::create([
            'website_id' => $data['website_id'] ?? null,
            'folder_id' => $data['folder_id'] ?? null,
            'disk' => 'public',
            'path' => $path,
            'file_name' => Str::slug($data['purpose'] ?? 'ai-image').'-'.time().'.png',
            'mime_type' => $image['mime'],
            'type' => 'image',
            'size' => strlen($image['binary']),
            'source' => 'ai',
            'ai_meta' => ['prompt' => $data['prompt'], 'purpose' => $data['purpose'] ?? null] + $image['meta'],
            'uploaded_by' => $request->user()->id,
        ]);

        AiGeneration::create([
            'website_id' => $data['website_id'] ?? null,
            'user_id' => $request->user()->id,
            'ai_provider_id' => $provider?->id,
            'type' => 'image',
            'task' => $data['purpose'] ?? 'image',
            'prompt' => $data['prompt'],
            'media_id' => $media->id,
        ]);

        return response()->json($media, 201);
    }

    public function history(Request $request)
    {
        $user = $request->user();

        return AiGeneration::with('provider:id,name,driver', 'media')
            // Non-super-admins see only their own generations and their websites' history.
            ->when(! $user->hasRole('super_admin'), fn ($q) => $q->where(
                fn ($qq) => $qq->whereIn('website_id', $user->accessibleWebsiteIds())->orWhere('user_id', $user->id)
            ))
            ->when($request->filled('website_id'), fn ($q) => $q->where('website_id', $request->integer('website_id')))
            ->latest()
            ->paginate($request->integer('per_page', 25));
    }
}
