<?php

namespace App\Services\Ai;

use App\Models\AiProvider;
use App\Services\Ai\Drivers\AnthropicDriver;
use App\Services\Ai\Drivers\GeminiDriver;
use App\Services\Ai\Drivers\OpenAiDriver;
use InvalidArgumentException;

/**
 * Resolves the configured AiProvider row into a concrete driver.
 * Adding a new LLM vendor = one new driver class, zero changes elsewhere.
 */
class AiManager
{
    public function driver(?AiProvider $provider = null): AiDriverContract
    {
        $provider ??= AiProvider::where('is_active', true)->orderByDesc('is_default')->firstOrFail();

        return match ($provider->driver) {
            'openai' => new OpenAiDriver($provider),
            'anthropic' => new AnthropicDriver($provider),
            'gemini' => new GeminiDriver($provider),
            'custom' => new OpenAiDriver($provider), // custom = any OpenAI-compatible endpoint via base_url
            default => throw new InvalidArgumentException("Unknown AI driver [{$provider->driver}]"),
        };
    }

    /**
     * Task-specific system prompts so the admin UI can expose one-click actions
     * (rewrite, SEO copy, FAQs, meta description, ...) without prompt engineering.
     */
    public static function taskPrompt(string $task, string $input, array $context = []): string
    {
        $industry = $context['industry'] ?? 'general business';
        $tone = $context['tone'] ?? 'professional';

        $instruction = match ($task) {
            'rewrite' => 'Rewrite the following content, preserving its meaning while improving clarity and flow.',
            'improve_grammar' => 'Fix grammar, spelling and readability of the following content. Keep the original voice.',
            'seo_copy' => 'Write SEO-optimized website copy based on the following brief. Use natural keyword placement.',
            'faq' => 'Generate a list of FAQs (question + concise answer) based on the following topic. Return JSON: [{"question","answer"}].',
            'blog_article' => 'Write a complete, well-structured blog article (headings, intro, body, conclusion) on the following topic.',
            'service_description' => 'Write a compelling service description for a website based on the following brief.',
            'product_description' => 'Write a persuasive product description based on the following details.',
            'landing_page' => 'Write complete landing page content (headline, subheadline, benefit sections, CTA) for the following offer.',
            'cta' => 'Write 5 short, high-converting call-to-action button/text options for the following context. Return JSON array of strings.',
            'meta' => 'Write an SEO meta title (max 60 chars) and meta description (max 155 chars) for the following page. Return JSON: {"meta_title","meta_description"}.',
            'translate' => 'Translate the following website content into '.($context['target_language'] ?? 'Spanish').'. Preserve formatting and HTML tags.',
            'accessibility' => 'Review the following content for accessibility issues and suggest improvements.',
            'suggest_improvements' => 'Suggest concrete improvements to the following website content (structure, persuasion, clarity).',
            default => 'Complete the following task for website content.',
        };

        return "You are a content specialist for a {$industry} website. Tone: {$tone}.\n\n{$instruction}\n\n---\n{$input}";
    }
}
