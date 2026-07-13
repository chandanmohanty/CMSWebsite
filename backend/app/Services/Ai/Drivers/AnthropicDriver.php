<?php

namespace App\Services\Ai\Drivers;

use App\Models\AiProvider;
use App\Services\Ai\AiDriverContract;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class AnthropicDriver implements AiDriverContract
{
    public function __construct(private AiProvider $provider)
    {
    }

    public function generateText(string $prompt, array $options = []): array
    {
        $response = Http::withHeaders([
            'x-api-key' => $this->provider->api_key,
            'anthropic-version' => '2023-06-01',
        ])
            ->timeout(120)
            ->post('https://api.anthropic.com/v1/messages', [
                'model' => $options['model'] ?? $this->provider->text_model ?? 'claude-sonnet-5',
                'max_tokens' => $options['max_tokens'] ?? 4096,
                'messages' => [['role' => 'user', 'content' => $prompt]],
            ])->throw()->json();

        $text = collect($response['content'] ?? [])
            ->where('type', 'text')
            ->pluck('text')
            ->implode('');

        return ['text' => $text, 'usage' => $response['usage'] ?? []];
    }

    public function generateImage(string $prompt, array $options = []): array
    {
        throw new RuntimeException('Anthropic does not provide image generation; configure an image-capable provider (OpenAI/Gemini) as the image provider.');
    }
}
