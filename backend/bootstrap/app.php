<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Pure bearer-token API: statefulApi() is intentionally NOT enabled -
        // it would subject admin requests from the SPA origin to CSRF checks.

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'website.access' => \App\Http\Middleware\EnsureWebsiteAccess::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // API routes always render JSON errors - never redirects to a login page,
        // even when a client forgets the Accept: application/json header.
        $exceptions->shouldRenderJsonWhen(fn ($request) => $request->is('api/*') || $request->expectsJson());
    })->create();
