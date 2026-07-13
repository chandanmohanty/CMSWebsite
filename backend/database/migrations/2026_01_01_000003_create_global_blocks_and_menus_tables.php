<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Reusable content blocks / global components: edit once, updates everywhere.
        Schema::create('global_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('website_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('block_type');
            $table->json('content');
            $table->json('settings')->nullable();
            $table->timestamps();
        });

        Schema::table('page_sections', function (Blueprint $table) {
            $table->foreign('global_block_id')->references('id')->on('global_blocks')->nullOnDelete();
        });

        Schema::create('menus', function (Blueprint $table) {
            $table->id();
            $table->foreignId('website_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('location');                    // header_primary, header_secondary, footer_quick_links, footer_services, mobile
            $table->timestamps();
            $table->unique(['website_id', 'location']);
        });

        Schema::create('menu_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('menu_items')->cascadeOnDelete();
            $table->string('label');
            $table->string('url')->nullable();             // external / custom URL
            $table->foreignId('page_id')->nullable()->constrained()->nullOnDelete(); // internal link
            $table->string('target')->default('_self');
            $table->string('icon')->nullable();
            $table->integer('position')->default(0);       // drag-and-drop ordering
            $table->json('mega_menu')->nullable();         // columns/imagery for mega menu rendering
            $table->timestamps();
            $table->index(['menu_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_items');
        Schema::dropIfExists('menus');
        Schema::table('page_sections', function (Blueprint $table) {
            $table->dropForeign(['global_block_id']);
        });
        Schema::dropIfExists('global_blocks');
    }
};
