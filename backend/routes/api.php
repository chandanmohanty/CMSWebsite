<?php

use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FormController;
use App\Http\Controllers\Api\GlobalBlockController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\PageController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\TemplateController;
use App\Http\Controllers\Api\WebsiteController;
use App\Http\Controllers\Public\SiteController;
use Illuminate\Support\Facades\Route;

// ---------- Public (consumed by the Next.js site renderer) ----------
Route::prefix('public')->middleware('throttle:240,1')->group(function () {
    Route::get('site', [SiteController::class, 'site']);
    Route::get('page', [SiteController::class, 'page']);
    Route::get('posts', [SiteController::class, 'posts']);
    Route::get('posts/{slug}', [SiteController::class, 'post']);
    Route::post('forms/{slug}/submit', [SiteController::class, 'submitForm'])->middleware('throttle:20,1');
});

// ---------- Auth ----------
Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);

    // ---------- Templates (super admin) ----------
    // Note: the guard argument ('sanctum') is required - without it spatie's
    // middleware resolves the user from the default web guard and always 403s.
    Route::middleware('role:super_admin,sanctum')->group(function () {
        Route::apiResource('templates', TemplateController::class);
        Route::post('templates/{template}/layouts', [TemplateController::class, 'storeLayout']);
        Route::put('templates/{template}/layouts/{layout}', [TemplateController::class, 'updateLayout']);
        Route::delete('templates/{template}/layouts/{layout}', [TemplateController::class, 'destroyLayout']);

        // AI provider management
        Route::get('ai/providers', [AiController::class, 'providers']);
        Route::post('ai/providers', [AiController::class, 'storeProvider']);
        Route::put('ai/providers/{provider}', [AiController::class, 'updateProvider']);
        Route::delete('ai/providers/{provider}', [AiController::class, 'destroyProvider']);
    });

    // Read-only template browsing for site admins picking a template
    Route::get('template-catalog', [TemplateController::class, 'index']);
    Route::get('template-catalog/{template}', [TemplateController::class, 'show']);

    // ---------- Websites (tenant-scoped via website.access) ----------
    Route::apiResource('websites', WebsiteController::class)->middleware('website.access');
    Route::post('websites/{website}/switch-template', [WebsiteController::class, 'switchTemplate'])->middleware('website.access');

    Route::prefix('websites/{website}')->middleware('website.access')->group(function () {
        // Pages + builder
        Route::apiResource('pages', PageController::class)->except('index');
        Route::get('pages', [PageController::class, 'index']);
        Route::put('pages/{page}/sections', [PageController::class, 'syncSections']);
        Route::post('pages/{page}/publish', [PageController::class, 'publish']);
        Route::post('pages/{page}/unpublish', [PageController::class, 'unpublish']);
        Route::get('pages/{page}/revisions', [PageController::class, 'revisions']);
        Route::post('pages/{page}/revisions/{revision}/rollback', [PageController::class, 'rollback']);

        // Navigation
        Route::get('menus', [MenuController::class, 'index']);
        Route::post('menus', [MenuController::class, 'store']);
        Route::put('menus/{menu}/items', [MenuController::class, 'syncItems']);
        Route::delete('menus/{menu}', [MenuController::class, 'destroy']);

        // Header / footer / theme / seo / social settings
        Route::get('settings', [SettingController::class, 'index']);
        Route::get('settings/{group}', [SettingController::class, 'show']);
        Route::put('settings/{group}', [SettingController::class, 'update']);

        // Reusable global blocks
        Route::apiResource('global-blocks', GlobalBlockController::class)->except('show');

        // Blog
        Route::apiResource('posts', PostController::class);
        Route::post('posts/{post}/publish', [PostController::class, 'publish']);

        // Forms
        Route::apiResource('forms', FormController::class);
        Route::get('forms/{form}/submissions', [FormController::class, 'submissions']);
    });

    // ---------- Media library (cross-website) ----------
    Route::get('media', [MediaController::class, 'index']);
    Route::post('media', [MediaController::class, 'store']);
    Route::put('media/{media}', [MediaController::class, 'update']);
    Route::delete('media/{media}', [MediaController::class, 'destroy']);
    Route::get('media-folders', [MediaController::class, 'folders']);
    Route::post('media-folders', [MediaController::class, 'storeFolder']);
    Route::delete('media-folders/{folder}', [MediaController::class, 'destroyFolder']);

    // ---------- AI ----------
    Route::post('ai/generate-text', [AiController::class, 'generateText'])->middleware('throttle:30,1');
    Route::post('ai/generate-image', [AiController::class, 'generateImage'])->middleware('throttle:10,1');
    Route::get('ai/history', [AiController::class, 'history']);
});
