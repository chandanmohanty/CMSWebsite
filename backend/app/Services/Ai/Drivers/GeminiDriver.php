<?php

namespace App\Services\Ai\Drivers;

use App\Models\AiProvider;
use App\Services\Ai\AiDriverContract;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiDriver implements AiDriverContract
{
    private const BASE = 'https://generativelanguage.googleapis.com/v1beta';

    public function __construct(private AiProvider $provider)
    {
    }

    public function generateText(string $prompt, array $options = []): array
    {
        $model = $options['model'] ?? $this->provider->text_model ?? 'gemini-2.0-flash';

        $response = Http::timeout(120)
            ->post(self::BASE."/models/{$model}:generateContent?key=".$this->provider->api_key, [
                'contents' => [['parts' => [['text' => $prompt]]]],
            ])->throw()->json();

        return [
            'text' => $response['candidates'][0]['content']['parts'][0]['text'] ?? '',
            'usage' => $response['usageMetadata'] ?? [],
        ];
    }

    public function generateImage(string $prompt, array $options = []): array
    {
        $model = $options['model'] ?? $this->provider->image_model ?? 'imagen-3.0-generate-002';

        $response = Http::timeout(180)
            ->post(self::BASE."/models/{$model}:predict?key=".$this->provider->api_key, [
                'instances' => [['prompt' => $prompt]],
                'parameters' => ['sampleCount' => 1],
            ])->throw()->json();

        $b64 = $response['predictions'][0]['bytesBase64Encoded'] ?? null;

        if (! $b64) {
            throw new RuntimeException('Gemini image generation returned no image data.');
        }

        return ['binary' => base64_decode($b64), 'mime' => 'image/png', 'meta' => ['provider' => 'gemini']];
    }
}
