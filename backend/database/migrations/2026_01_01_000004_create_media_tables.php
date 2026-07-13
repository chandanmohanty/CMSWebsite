<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_folders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('website_id')->nullable()->constrained()->cascadeOnDelete(); // null = shared library
            $table->foreignId('parent_id')->nullable()->constrained('media_folders')->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('website_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('folder_id')->nullable()->constrained('media_folders')->nullOnDelete();
            $table->string('disk')->default('public');
            $table->string('path');
            $table->string('file_name');
            $table->string('mime_type');
            $table->string('type');                        // image, video, pdf, document, audio, svg
            $table->unsignedBigInteger('size');            // bytes
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('alt')->nullable();
            $table->json('tags')->nullable();
            $table->json('conversions')->nullable();       // generated thumbnails / optimized variants
            $table->string('source')->default('upload');   // upload, ai
            $table->json('ai_meta')->nullable();           // prompt/model used when source = ai
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['website_id', 'type']);
        });

        Schema::table('pages', function (Blueprint $table) {
            $table->foreign('banner_media_id')->references('id')->on('media')->nullOnDelete();
            $table->foreign('featured_media_id')->references('id')->on('media')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->dropForeign(['banner_media_id']);
            $table->dropForeign(['featured_media_id']);
        });
        Schema::dropIfExists('media');
        Schema::dropIfExists('media_folders');
    }
};
