<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            // Website settings groups (header, footer, ...) a template ships with;
            // copied onto the website when the template is activated.
            $table->json('default_settings')->nullable()->after('design_tokens');
        });
    }

    public function down(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            $table->dropColumn('default_settings');
        });
    }
};
