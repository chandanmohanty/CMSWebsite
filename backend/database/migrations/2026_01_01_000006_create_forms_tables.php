<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('forms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('website_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('type')->default('contact');    // contact, lead, appointment, inquiry, custom
            $table->json('schema');                        // fields, validation rules, conditional logic, file upload config
            $table->json('notifications')->nullable();     // email recipients, templates
            $table->json('integrations')->nullable();      // CRM/webhook targets
            $table->boolean('spam_protection')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['website_id', 'slug']);
        });

        Schema::create('form_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained()->cascadeOnDelete();
            $table->json('data');
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->string('status')->default('new');      // new, read, spam, archived
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_submissions');
        Schema::dropIfExists('forms');
    }
};
