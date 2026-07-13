<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Website;
use Illuminate\Http\Request;

/**
 * Grouped website settings: header, footer, theme, seo, social, integrations, robots.
 * Each group is a free-form JSON document the admin UI renders as a visual editor
 * (header builder, footer builder, theme customizer, ...).
 */
class SettingController extends Controller
{
    public const GROUPS = ['header', 'footer', 'theme', 'seo', 'social', 'integrations', 'robots'];

    public function index(Website $website)
    {
        return $website->settings->pluck('value', 'group');
    }

    public function show(Website $website, string $group)
    {
        abort_unless(in_array($group, self::GROUPS), 404);

        return response()->json($website->setting($group) ?? (object) []);
    }

    public function update(Request $request, Website $website, string $group)
    {
        abort_unless(in_array($group, self::GROUPS), 404);

        $data = $request->validate(['value' => ['required', 'array']]);

        $setting = $website->settings()->updateOrCreate(['group' => $group], ['value' => $data['value']]);
        AuditLog::record('settings_updated', $setting, ['group' => $group], $website->id);

        return response()->json($setting->value);
    }
}
