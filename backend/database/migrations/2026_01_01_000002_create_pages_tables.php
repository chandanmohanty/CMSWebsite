<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('website_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('pages')->nullOnDelete();
            $table->string('title');
            $table->string('slug');                        // full path segment; '' for home
            $table->string('page_type')->default('custom');
            $table->foreignId('template_layout_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status')->default('draft');    // draft, published, scheduled, archived
            $table->string('visibility')->default('public'); // public, private, password
            $table->string('password')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->unsignedBigInteger('banner_media_id')->nullable();
            $table->unsignedBigInteger('featured_media_id')->nullable();
            $table->text('custom_css')->nullable();
            $table->text('custom_js')->nullable();
            $table->integer('sort_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['website_id', 'slug']);
        });

        // The actual content of a page: an ordered stack of sections.
        // `block_type` maps to a renderer component in the Next.js block registry.
        // `content` is pure data (text, media ids, links) - design-agnostic, so it
        // survives template switches untouched.
        Schema::create('page_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('page_id')->constrained()->cascadeOnDelete();
            $table->string('block_type');                  // hero, rich_text, services_grid, team_grid, testimonials, faq, pricing, gallery, cta, form_embed, custom_html, ...
            $table->integer('position')->default(0);
            $table->json('content')->nullable();           // block data (null when referencing a global block)
            $table->json('settings')->nullable();          // per-instance design overrides (spacing, background, variant)
            $table->unsignedBigInteger('global_block_id')->nullable(); // FK added after global_blocks exists
            $table->boolean('is_visible')->default(true);
            $table->timestamps();
            $table->index(['page_id', 'position']);
        });

        // Draft/publish workflow + version history with rollback:
        // every publish (and manual save point) snapshots the page and its sections.
        Schema::create('page_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('page_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('label')->nullable();
            $table->json('snapshot');                      // full page + sections payload
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_revisions');
        Schema::dropIfExists('page_sections');
        Schema::dropIfExists('pages');
    }
};
