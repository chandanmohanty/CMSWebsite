<?php

namespace App\Services\Ai;

interface AiDriverContract
{
    /**
     * Generate text from a prompt.
     *
     * @return array{text: string, usage: array}
     */
    public function generateText(string $prompt, array $options = []): array;

    /**
     * Generate an image from a prompt.
     *
     * @return array{binary: string, mime: string, meta: array} raw image bytes
     */
    public function generateImage(string $prompt, array $options = []): array;
}
