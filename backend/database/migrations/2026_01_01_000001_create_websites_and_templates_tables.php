<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Industry-specific templates created by the Super Admin.
        Schema::create('templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('industry')->index();          // healthcare, real-estate, law, travel, corporate, it, education, manufacturing, finance, restaurant, ...
            $table->text('description')->nullable();
            $table->string('thumbnail_url')->nullable();
            $table->string('version')->default('1.0.0');
            $table->json('design_tokens')->nullable();    // default colors, typography, spacing for this template
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Predefined layouts per page type (home, about, services, ...).
        // `structure` holds an ordered list of block definitions: which blocks,
        // in what order, with which default settings. Content itself never lives here,
        // which is what makes templates swappable without touching stored content.
        Schema::create('template_layouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained()->cascadeOnDelete();
            $table->string('page_type');                  // home, about, services, products, team, portfolio, testimonials, blog, contact, landing, custom
            $table->string('name');
            $table->json('structure');                    // [{block_type, default_settings, content_slots}, ...]
            $table->timestamps();
            $table->unique(['template_id', 'page_type', 'name']);
        });

        // A managed website (tenant). One CMS instance manages many of these.
        Schema::create('websites', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('domain')->nullable()->unique();   // production domain for multi-domain routing
            $table->string('industry')->index();
            $table->foreignId('template_id')->nullable()->constrained()->nullOnDelete();
            $table->string('default_locale', 10)->default('en');
            $table->json('locales')->nullable();              // enabled languages
            $table->string('status')->default('active');      // active, maintenance, disabled
            $table->timestamps();
        });

        // Grouped key-value settings per website: header, footer, theme, seo, social, integrations.
        Schema::create('website_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('website_id')->constrained()->cascadeOnDelete();
            $table->string('group');                      // header, footer, theme, seo, social, integrations, robots
            $table->json('value');
            $table->timestamps();
            $table->unique(['website_id', 'group']);
        });

        // Which users may manage which websites (RBAC roles come from spatie/laravel-permission).
        Schema::create('website_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('website_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['website_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('website_user');
        Schema::dropIfExists('website_settings');
        Schema::dropIfExists('websites');
        Schema::dropIfExists('template_layouts');
        Schema::dropIfExists('templates');
    }
};
