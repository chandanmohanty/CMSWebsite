<?php

namespace App\Services\Ai\Drivers;

use App\Models\AiProvider;
use App\Services\Ai\AiDriverContract;
use Illuminate\Support\Facades\Http;

class OpenAiDriver implements AiDriverContract
{
    public function __construct(private AiProvider $provider)
    {
    }

    private function baseUrl(): string
    {
        return rtrim($this->provider->base_url ?: 'https://api.openai.com/v1', '/');
    }

    public function generateText(string $prompt, array $options = []): array
    {
        $response = Http::withToken($this->provider->api_key)
            ->timeout(120)
            ->post($this->baseUrl().'/chat/completions', [
                'model' => $options['model'] ?? $this->provider->text_model ?? 'gpt-4o',
                'messages' => [['role' => 'user', 'content' => $prompt]],
                'max_tokens' => $options['max_tokens'] ?? 4096,
            ])->throw()->json();

        return [
            'text' => $response['choices'][0]['message']['content'] ?? '',
            'usage' => $response['usage'] ?? [],
        ];
    }

    public function generateImage(string $prompt, array $options = []): array
    {
        $response = Http::withToken($this->provider->api_key)
            ->timeout(180)
            ->post($this->baseUrl().'/images/generations', [
                'model' => $options['model'] ?? $this->provider->image_model ?? 'gpt-image-1',
                'prompt' => $prompt,
                'size' => $options['size'] ?? '1024x1024',
                'n' => 1,
            ])->throw()->json();

        $data = $response['data'][0] ?? [];
        $binary = isset($data['b64_json'])
            ? base64_decode($data['b64_json'])
            : Http::timeout(60)->get($data['url'])->throw()->body();

        return ['binary' => $binary, 'mime' => 'image/png', 'meta' => ['provider' => 'openai']];
    }
}
