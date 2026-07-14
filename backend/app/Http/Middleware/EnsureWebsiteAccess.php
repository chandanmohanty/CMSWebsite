<?php

namespace App\Http\Middleware;

use App\Models\Website;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tenant isolation: a request touching /websites/{website}/... is only allowed
 * when the user is a super admin or is assigned to that website (website_user).
 */
class EnsureWebsiteAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $website = $request->route('website');

        if ($website instanceof Website && ! $request->user()->canManageWebsite($website->id)) {
            abort(403, 'You do not have access to this website.');
        }

        return $next($request);
    }
}
