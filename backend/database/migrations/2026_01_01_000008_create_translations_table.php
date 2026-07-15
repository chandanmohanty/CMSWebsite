<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Per-locale content overlays. Base content stays untouched in its own
        // tables; a translation row shadows it for one locale and is merged at
        // render time. Missing translations gracefully fall back to the base.
        Schema::create('translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('website_id')->constrained()->cascadeOnDelete();
            $table->morphs('translatable');              // Page, PageSection, (later: MenuItem, Post, ...)
            $table->string('locale', 10);
            $table->json('data');                        // translated fields, same shape as the base
            $table->timestamps();
            $table->unique(['translatable_type', 'translatable_id', 'locale'], 'translations_entity_locale_unique');
            $table->index(['website_id', 'locale']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('translations');
    }
};
