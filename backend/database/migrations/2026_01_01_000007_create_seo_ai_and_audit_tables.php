<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Polymorphic SEO metadata: attaches to pages, posts, or any future content type.
        Schema::create('seo_meta', function (Blueprint $table) {
            $table->id();
            $table->morphs('metable');
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->text('keywords')->nullable();
            $table->string('canonical_url')->nullable();
            $table->json('open_graph')->nullable();
            $table->json('twitter_card')->nullable();
            $table->json('schema_markup')->nullable();     // structured Schema.org JSON-LD
            $table->string('robots')->nullable();          // index,follow overrides
            $table->timestamps();
        });

        // Configured AI providers (OpenAI, Anthropic, Gemini, custom). Keys are encrypted at rest.
        Schema::create('ai_providers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('driver');                      // openai, anthropic, gemini, custom
            $table->text('api_key')->nullable();           // encrypted via model cast
            $table->string('base_url')->nullable();        // for custom/self-hosted LLMs
            $table->string('text_model')->nullable();
            $table->string('image_model')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Audit trail of every AI generation for cost tracking and review.
        Schema::create('ai_generations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('website_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('ai_provider_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type');                        // text, image, seo, translation
            $table->string('task')->nullable();            // rewrite, blog_article, meta_description, hero_banner, ...
            $table->text('prompt');
            $table->longText('result')->nullable();
            $table->foreignId('media_id')->nullable()->constrained('media')->nullOnDelete();
            $table->json('usage')->nullable();             // token counts
            $table->string('status')->default('completed'); // completed, failed
            $table->timestamps();
        });

        // Activity tracking / audit logs for enterprise security requirements.
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('website_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action');                      // created, updated, deleted, published, rolled_back, logged_in
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('changes')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
            $table->index(['subject_type', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('ai_generations');
        Schema::dropIfExists('ai_providers');
        Schema::dropIfExists('seo_meta');
    }
};
